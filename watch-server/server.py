"""TCP server for "3G"-protocol smart watches.

Env:
  WATCH_HOST (0.0.0.0)  WATCH_PORT (8899)  WATCH_DB (watch.db)
  WATCH_ALLOWED_IDS  comma-separated device IDs; empty = accept all (new IDs are logged)
  WATCH_STILL_EVERY  seconds between position requests to a watch that is not moving (600);
                     a moving watch is kept locating all the time. 0 = watches are never asked.
Commands to devices are queued in the `commands` table (see send_command.py).
"""
from __future__ import annotations

import asyncio
import ipaddress
import json
import logging
import os
import sqlite3
import time

from motion import Motion, Seen
from protocol import Frame, build_frame, extract_frames, parse_location

log = logging.getLogger("watch")

# Messages of the power-on burst. The firmware wants each one acknowledged with "<name>,1"
# (1 = success) and otherwise drops the connection 30 s after the burst and reconnects
# (supplier, 2026-11-14). RYIMEI is also repeated on every boot until it has been acknowledged.
# appcontacttel is part of the burst too, but its reply carries data ("appcontacttel,num,accounts")
# whose format for a watch without contacts is not known yet, so it is not answered.
ACK_WITH_SUCCESS = frozenset({"CONFIG", "ICCID", "RYIMEI", "APPANDFNREPORT", "DEVPWDCHECKBIND", "eicard"})

# The watch reports its position by itself only at power-on, on an alarm and, per the vendor
# document, "in vibration state"; the HongMi sample sent 2-4 reports a day that way and none
# while it was carried 4 km (production, 2026-11-12..16). CR makes it locate and report for
# 3 minutes: "once every 10 seconds" says the vendor document, every 45-66 s was measured on
# production without a GPS fix. That pace is the watch's; the server only decides when to send CR:
#   moving (motion.py) - again every MOVING_ASK_EVERY, so that it reports about once a minute.
#                        Inside the 3 minutes the watch reports about 6, 54 and 102 s after a
#                        CR and then goes quiet: asking only every 165 s gave gaps of 48, 48 and
#                        70 s, and of 115 s when the third report was missing (production,
#                        2026-11-16/17). A CR every 100 s brings the next report before that;
#   still              - once per WATCH_STILL_EVERY, on a heartbeat; the 3 minutes of reports
#                        that follow are what shows that it has started to move.
LOCATE_MIN_BATTERY = 15  # below this the watch is left alone: locating runs its GPS
LOCATE_SLACK = 30  # heartbeats come every 300 s give or take; do not miss one by a second
MOVING_ASK_EVERY = 100  # seconds between CRs to a moving watch
CR_LOST_AFTER = 60  # asked, alive (heartbeat) and still no report after this: the CR never arrived

SCHEMA = """
CREATE TABLE IF NOT EXISTS devices(
  id TEXT PRIMARY KEY, first_seen REAL, last_seen REAL, last_ip TEXT,
  battery INTEGER, steps INTEGER, rolls INTEGER);
CREATE TABLE IF NOT EXISTS locations(
  id INTEGER PRIMARY KEY, device_id TEXT, received REAL, device_time TEXT, kind TEXT,
  valid INTEGER, lat REAL, lon REAL, speed REAL, direction REAL, altitude REAL,
  satellites INTEGER, gsm INTEGER, battery INTEGER, steps INTEGER, status INTEGER,
  accuracy REAL, cells TEXT, wifi TEXT, raw TEXT);
CREATE INDEX IF NOT EXISTS loc_dev ON locations(device_id, received);
CREATE TABLE IF NOT EXISTS alarms(
  id INTEGER PRIMARY KEY, device_id TEXT, received REAL, device_time TEXT,
  alarms TEXT, lat REAL, lon REAL);
CREATE TABLE IF NOT EXISTS commands(
  id INTEGER PRIMARY KEY, device_id TEXT, content TEXT, created REAL,
  sent REAL, reply TEXT);
"""


class Store:
    def __init__(self, path: str):
        self.db = sqlite3.connect(path)
        self.db.executescript(SCHEMA)
        self.db.commit()

    def touch(self, dev: str, ip: str, **kw) -> bool:
        """Upsert device; returns True if it was never seen before."""
        now = time.time()
        row = self.db.execute("SELECT 1 FROM devices WHERE id=?", (dev,)).fetchone()
        if row is None:
            self.db.execute("INSERT INTO devices(id,first_seen,last_seen,last_ip) VALUES(?,?,?,?)",
                            (dev, now, now, ip))
        else:
            self.db.execute("UPDATE devices SET last_seen=?, last_ip=? WHERE id=?", (now, ip, dev))
        for k, v in kw.items():
            self.db.execute(f"UPDATE devices SET {k}=? WHERE id=?", (v, dev))
        self.db.commit()
        return row is None

    def add_location(self, dev: str, kind: str, loc, raw: str):
        self.db.execute(
            "INSERT INTO locations(device_id,received,device_time,kind,valid,lat,lon,speed,direction,"
            "altitude,satellites,gsm,battery,steps,status,accuracy,cells,wifi,raw) "
            "VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
            (dev, time.time(), loc.device_time, kind, int(loc.valid), loc.lat, loc.lon, loc.speed,
             loc.direction, loc.altitude, loc.satellites, loc.gsm, loc.battery, loc.steps, loc.status,
             loc.accuracy, json.dumps(loc.cells), json.dumps(loc.wifi), raw))
        if loc.alarms and kind.startswith("AL"):
            self.db.execute("INSERT INTO alarms(device_id,received,device_time,alarms,lat,lon) VALUES(?,?,?,?,?,?)",
                            (dev, time.time(), loc.device_time, ",".join(loc.alarms), loc.lat, loc.lon))
        self.db.commit()

    def last_report(self, dev: str) -> float:
        """When the last position report of this watch arrived (0 = never)."""
        return self.db.execute("SELECT MAX(received) FROM locations WHERE device_id=?", (dev,)).fetchone()[0] or 0

    def battery(self, dev: str) -> int | None:
        row = self.db.execute("SELECT battery FROM devices WHERE id=?", (dev,)).fetchone()
        return row[0] if row else None

    def pending(self, dev: str):
        return self.db.execute("SELECT id, content FROM commands WHERE device_id=? AND sent IS NULL ORDER BY id",
                               (dev,)).fetchall()

    def mark_sent(self, cmd_id: int):
        self.db.execute("UPDATE commands SET sent=? WHERE id=?", (time.time(), cmd_id))
        self.db.commit()

    def record_reply(self, dev: str, reply: str):
        row = self.db.execute("SELECT id FROM commands WHERE device_id=? AND sent IS NOT NULL AND reply IS NULL "
                              "AND content LIKE ? ORDER BY id LIMIT 1",
                              (dev, reply.split(",", 1)[0] + "%")).fetchone()
        if row:
            self.db.execute("UPDATE commands SET reply=? WHERE id=?", (reply, row[0]))
            self.db.commit()


def trusts_proxy(peer: str) -> bool:
    """A PROXY header is only believed from the backend container / this host."""
    try:
        a = ipaddress.ip_address(peer)
    except ValueError:
        return False
    if getattr(a, "ipv4_mapped", None):
        a = a.ipv4_mapped
    return a.is_private or a.is_loopback


def take_proxy_header(buf: bytearray) -> tuple[str, str | None]:
    """Strip a leading "PROXY ...\\r\\n" line from buf.

    Returns ("wait", None) while a header may still be arriving, ("done", source ip) when one
    was removed, ("done", None) when there is none (buf untouched) or it was unusable.
    """
    prefix = b"PROXY "
    head = bytes(buf[: len(prefix)])
    if not prefix.startswith(head):
        return "done", None
    if len(buf) < len(prefix):
        return "wait", None
    end = buf.find(b"\r\n")
    if end < 0:
        return ("wait", None) if len(buf) < 108 else ("done", None)  # v1 lines are <= 107 bytes
    parts = bytes(buf[:end]).decode("ascii", "replace").split(" ")
    del buf[: end + 2]
    if len(parts) == 6 and parts[1] in ("TCP4", "TCP6"):
        try:
            return "done", str(ipaddress.ip_address(parts[2]))
        except ValueError:
            pass
    return "done", None


class Server:
    def __init__(self, store: Store, allowed: set[str], still_every: float = 0):
        self.store = store
        self.allowed = allowed
        self.still_every = still_every
        self.motion: dict[str, Motion] = {}  # device id -> moving or still; forgotten on restart
        self.asked: dict[str, float] = {}  # device id -> when it was last asked to locate
        self.vendors: dict[str, str] = {}  # device id -> frame header it uses
        self.writers: dict[str, asyncio.StreamWriter] = {}

    async def handle(self, reader: asyncio.StreamReader, writer: asyncio.StreamWriter):
        ip = writer.get_extra_info("peername")[0]
        buf = bytearray()
        dev_id: str | None = None
        # Watches that dial the EyeOn tracker port (5024) are relayed here by the backend, which
        # sends their real address first as a PROXY protocol v1 line. Only trusted from private /
        # loopback peers, so nobody on the internet can fake an address.
        proxy_pending = trusts_proxy(ip)
        try:
            while True:
                data = await reader.read(4096)
                if not data:
                    break
                buf += data
                if proxy_pending:
                    state, real = take_proxy_header(buf)
                    if state == "wait":
                        continue
                    proxy_pending = False
                    if real:
                        log.info("relayed connection from %s (via %s)", real, ip)
                        ip = real
                if len(buf) > 1 << 20:
                    log.warning("buffer overflow from %s, dropping", ip)
                    break
                for f in extract_frames(buf):
                    if self.allowed and f.device_id not in self.allowed:
                        log.warning("REJECTED unlisted device %s from %s", f.device_id, ip)
                        return
                    if dev_id != f.device_id:
                        dev_id = f.device_id
                        self.writers[dev_id] = writer
                        # A CR written into the connection this one replaces may never have
                        # arrived (the old one dies silently when the watch changes network):
                        # a moving watch is asked again on its first heartbeat here.
                        m = self.motion.get(dev_id)
                        if m is None or m.moving:
                            self.asked.pop(dev_id, None)
                    self.vendors[dev_id] = f.vendor
                    self.process(f, ip, writer)
                    if f.command == "LK":
                        self.heartbeat_steps(f)
                        self.maybe_locate(dev_id, writer, heartbeat=True)
                    await self.flush_commands(dev_id, writer)
        except (ConnectionError, asyncio.IncompleteReadError):
            pass
        finally:
            if dev_id and self.writers.get(dev_id) is writer:
                del self.writers[dev_id]
            writer.close()
            log.info("disconnected %s (%s)", dev_id, ip)

    def process(self, f: Frame, ip: str, writer: asyncio.StreamWriter):
        new = self.store.touch(f.device_id, ip)
        if new:
            log.warning("NEW DEVICE %s from %s", f.device_id, ip)
        cmd = f.command
        raw = f.content.decode("latin-1")
        try:
            if cmd == "LK":
                a = f.args
                self.store.touch(f.device_id, ip, steps=int(a[0]), rolls=int(a[1]), battery=int(a[2]))
                writer.write(build_frame(f.device_id, "LK", f.vendor))
            elif cmd == "UD" or cmd == "UD2" or cmd.startswith("UD_"):
                loc = parse_location(f.args)
                self.store.add_location(f.device_id, cmd, loc, raw)
                self.store.touch(f.device_id, ip, battery=loc.battery, steps=loc.steps, rolls=loc.rolls)
                self.observe(f.device_id, loc)
            elif cmd == "AL" or cmd.startswith("AL_"):
                writer.write(build_frame(f.device_id, "AL", f.vendor))  # ack first, even if parse fails
                loc = parse_location(f.args)
                self.store.add_location(f.device_id, cmd, loc, raw)
                self.observe(f.device_id, loc)
                log.warning("ALARM %s %s at %s,%s", f.device_id, loc.alarms, loc.lat, loc.lon)
            elif cmd in ACK_WITH_SUCCESS:
                writer.write(build_frame(f.device_id, cmd + ",1", f.vendor))
                log.info("%s -> %s (acked)", f.device_id, raw[:80])
            elif cmd == "TKQ":
                pass  # intercom request: not supported
            else:
                self.store.record_reply(f.device_id, raw)
                log.info("%s -> %s", f.device_id, raw[:80])
        except (ValueError, IndexError) as e:
            log.error("bad %s from %s: %s (%r)", cmd, f.device_id, e, raw[:120])

    def observe(self, dev: str, loc):
        """Feed a position report to the moving / still decision."""
        seen, now = Seen.of(loc), time.time()
        m = self.motion.get(dev)
        if m is None:
            self.motion[dev] = Motion(anchor=seen, since=now)
        elif m.observe(seen, now):
            log.info("%s is %s", dev, "moving" if m.moving else "still")

    def heartbeat_steps(self, f: Frame):
        m = self.motion.get(f.device_id)
        try:
            if m and m.steps_taken(int(f.args[0]), time.time()):
                log.info("%s is moving (steps)", f.device_id)
        except (ValueError, IndexError):
            pass  # bare LK

    def maybe_locate(self, dev: str, writer: asyncio.StreamWriter, heartbeat: bool = False):
        """Send CR when the watch should be reporting its position and is not.

        Moving (or not known yet): CR again every MOVING_ASK_EVERY (from the command pump), and
        on a heartbeat when a CR brought no report - on a mobile network the watch
        opens a new connection every few minutes and the old ones die silently, so a CR can be
        written into a dead one.
        Still: one CR per still_every, and only on a heartbeat, when the connection has just
        proved alive.
        """
        if not self.still_every:
            return
        battery = self.store.battery(dev)
        if battery is not None and battery < LOCATE_MIN_BATTERY:
            return
        now = time.time()
        asked = self.asked.get(dev, 0)
        m = self.motion.get(dev)
        if m is None or m.moving:
            unanswered = now - max(self.store.last_report(dev), asked) >= CR_LOST_AFTER
            due = now - asked >= MOVING_ASK_EVERY or (heartbeat and unanswered)
        else:
            due = heartbeat and now - asked >= self.still_every - LOCATE_SLACK
        if not due:
            return
        self.asked[dev] = now
        writer.write(build_frame(dev, "CR", self.vendors.get(dev, "3G")))
        log.info("asked %s to locate (%s)", dev, "still" if m and not m.moving else "moving")

    async def flush_commands(self, dev: str, writer: asyncio.StreamWriter):
        for cid, content in self.store.pending(dev):
            writer.write(build_frame(dev, content))
            self.store.mark_sent(cid)
            log.info("sent to %s: %s", dev, content)
        await writer.drain()

    async def command_pump(self):
        """Push queued commands to connected devices even when they are quiet."""
        while True:
            await asyncio.sleep(2)
            for dev, w in list(self.writers.items()):
                try:
                    self.maybe_locate(dev, w)
                    await self.flush_commands(dev, w)
                except ConnectionError:
                    self.writers.pop(dev, None)


async def main():
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
    allowed = {x.strip() for x in os.environ.get("WATCH_ALLOWED_IDS", "").split(",") if x.strip()}
    still_every = float(os.environ.get("WATCH_STILL_EVERY", "600"))
    srv = Server(Store(os.environ.get("WATCH_DB", "watch.db")), allowed, still_every)
    host, port = os.environ.get("WATCH_HOST", "0.0.0.0"), int(os.environ.get("WATCH_PORT", "8899"))
    s = await asyncio.start_server(srv.handle, host, port)
    log.info("listening on %s:%s (allowlist=%s, a still watch is located every %s s)", host, port,
             sorted(allowed) or "off", int(still_every) or "- never, nor a moving one")
    asyncio.create_task(srv.command_pump())
    async with s:
        await s.serve_forever()


if __name__ == "__main__":
    asyncio.run(main())

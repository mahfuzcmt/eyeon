"""TCP server for "3G"-protocol smart watches.

Env:
  WATCH_HOST (0.0.0.0)  WATCH_PORT (8899)  WATCH_DB (watch.db)
  WATCH_ALLOWED_IDS  comma-separated device IDs; empty = accept all (new IDs are logged)
Commands to devices are queued in the `commands` table (see send_command.py).
"""
from __future__ import annotations

import asyncio
import json
import logging
import os
import sqlite3
import time

from protocol import Frame, build_frame, extract_frames, parse_location

log = logging.getLogger("watch")

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


class Server:
    def __init__(self, store: Store, allowed: set[str]):
        self.store = store
        self.allowed = allowed
        self.writers: dict[str, asyncio.StreamWriter] = {}

    async def handle(self, reader: asyncio.StreamReader, writer: asyncio.StreamWriter):
        ip = writer.get_extra_info("peername")[0]
        buf = bytearray()
        dev_id: str | None = None
        try:
            while True:
                data = await reader.read(4096)
                if not data:
                    break
                buf += data
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
                    self.process(f, ip, writer)
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
            elif cmd == "AL" or cmd.startswith("AL_"):
                writer.write(build_frame(f.device_id, "AL", f.vendor))  # ack first, even if parse fails
                loc = parse_location(f.args)
                self.store.add_location(f.device_id, cmd, loc, raw)
                log.warning("ALARM %s %s at %s,%s", f.device_id, loc.alarms, loc.lat, loc.lon)
            elif cmd == "TKQ":
                pass  # intercom request: not supported
            else:
                self.store.record_reply(f.device_id, raw)
                log.info("%s -> %s", f.device_id, raw[:80])
        except (ValueError, IndexError) as e:
            log.error("bad %s from %s: %s (%r)", cmd, f.device_id, e, raw[:120])

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
                    await self.flush_commands(dev, w)
                except ConnectionError:
                    self.writers.pop(dev, None)


async def main():
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
    allowed = {x.strip() for x in os.environ.get("WATCH_ALLOWED_IDS", "").split(",") if x.strip()}
    srv = Server(Store(os.environ.get("WATCH_DB", "watch.db")), allowed)
    host, port = os.environ.get("WATCH_HOST", "0.0.0.0"), int(os.environ.get("WATCH_PORT", "8899"))
    s = await asyncio.start_server(srv.handle, host, port)
    log.info("listening on %s:%s (allowlist=%s)", host, port, sorted(allowed) or "off")
    asyncio.create_task(srv.command_pump())
    async with s:
        await s.serve_forever()


if __name__ == "__main__":
    asyncio.run(main())

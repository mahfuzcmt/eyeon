import asyncio
import os
import sqlite3
import sys
import tempfile
import unittest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from protocol import build_frame, extract_frames, parse_location  # noqa: E402
from motion import MOVED, QUIET, UNSURE, Motion, Seen, verdict  # noqa: E402
from server import Server, Store, take_proxy_header, trusts_proxy  # noqa: E402

UD = ("UD,120118,070625,A,22.570720,N,113.8620167,E,0.00,188.6,0.0,9,100,51,14188,0,00000010,6,255,460,0,"
      "9360,5081,156,9360,4081,129,9360,4151,128,9360,5082,127,9360,4723,122,9360,4082,120,2,"
      "ssid1,a0:c5:f2:b0:74:d0,-34,ssid2,92:76:9f:48:4f:20,-48,22.4")
AL = UD.replace("UD,", "AL,", 1).replace("00000010", "00010010")

# Reports without a GPS fix, as the HongMi watch sends them indoors (production, 2026-11-15/16):
# the last fix repeated, one cell, the five strongest access points.
NO_FIX = "UD_LTE,151126,1417%02d,V,23.750341,N,90.3918660,E,0.00,0.0,0.0,0,58,79,0,0,00000001,1,0,470,3,%s,146,5,%s,0.0"
HOME_APS = ["5C:92:5E:74:50:D8", "34:E8:94:5C:81:A1", "8C:90:2D:F9:A6:D6", "8E:90:2D:29:A6:D6", "58:04:4F:94:0B:FA",
            "62:62:8B:13:DC:8A", "04:D4:C4:13:99:C8", "24:7E:51:8B:45:44", "1C:3B:F3:8B:BD:62"]


def scan(n, cell, aps):
    return NO_FIX % (n % 60, cell, ",".join(",%s,-7%d" % (mac, i) for i, mac in enumerate(aps)))


def home(n):
    """The same place: the two strong access points recur, the weak ones rotate."""
    return scan(n, "1164,3234563", HOME_APS[:2] + [HOME_APS[2 + (n + i) % 7] for i in range(3)])


AWAY = scan(30, "1166,3494914", ["10:5A:95:EA:D1:D1", "FE:CE:DF:34:D9:2E", "DC:8E:8D:BA:AB:F8",
                                 "5E:D4:7B:0A:F7:F9", "DA:62:34:0C:6A:26"])


class Codec(unittest.TestCase):
    def test_roundtrip_and_len(self):
        self.assertEqual(build_frame("8800000015", "LK,50,100,100"), b"[3G*8800000015*000D*LK,50,100,100]")

    def test_split_and_sticky(self):
        data = bytearray(b"junk" + build_frame("1", "LK,1,2,3") + build_frame("1", "LK,4,5,6")[:10])
        self.assertEqual(len(extract_frames(data)), 1)
        data += build_frame("1", "LK,4,5,6")[10:]
        self.assertEqual(extract_frames(data)[0].args, ["4", "5", "6"])

    def test_escaped_bracket_in_content(self):
        f = extract_frames(bytearray(build_frame("1", b"TK,ab]cd")))
        self.assertEqual(f[0].content, b"TK,ab]cd")

    def test_parse(self):
        loc = parse_location(UD.split(",")[1:])
        self.assertAlmostEqual(loc.lat, 22.57072)
        self.assertEqual(loc.device_time, "2018-01-12 07:06:25")
        self.assertEqual((len(loc.cells), len(loc.wifi), loc.accuracy), (6, 2, 22.4))
        self.assertEqual(loc.alarms, [])
        self.assertEqual(parse_location(AL.split(",")[1:]).alarms, ["SOS"])

    def test_south_west_negative(self):
        a = UD.split(",")[1:]
        a[4], a[6] = "S", "W"
        loc = parse_location(a)
        self.assertTrue(loc.lat < 0 and loc.lon < 0)


class MovingOrStill(unittest.TestCase):
    @staticmethod
    def seen(content):
        return Seen.of(parse_location(content.split(",")[1:]))

    def test_another_cell_and_other_access_points_is_a_move(self):
        here = self.seen(home(1))
        self.assertEqual(verdict(here, self.seen(home(4))), QUIET)
        self.assertEqual(verdict(here, self.seen(AWAY)), MOVED)

    def test_a_hotspot_travelling_along_does_not_hide_a_move(self):
        """Production 2026-11-16: one access point (a phone) was heard on the whole ride."""
        ride = lambda n, cell: self.seen(scan(n, cell, ["AA:AA:AA:AA:55:4A"] + ["0%d:00:00:00:00:0%d" % (n, i)
                                                                                 for i in range(4)]))
        self.assertEqual(verdict(ride(1, "1197,2657539"), ride(2, "1197,3019779")), MOVED)

    def test_a_train_whose_own_access_points_travel_along_is_not_still(self):
        """Production 2026-11-17 10:58-11:03: a new cell on every report, 2-4 access points shared."""
        train = ["AA:AA:AA:A3:E2:F0", "AA:AA:AA:57:6E:1E", "AA:AA:AA:B3:35:CC"]
        ride = lambda n: self.seen(scan(n, "1197,%d" % (3400000 + 1000 * n), train + ["0%d:33:33:33:33:33" % (n % 9)]))
        m = Motion(anchor=ride(0), since=0)
        for n in range(1, 20):
            m.observe(ride(n), 50 * n)
            self.assertTrue(m.moving, "judged still on report %d" % n)
        # the train stops: the same cell from now on
        stop = lambda n: self.seen(scan(n, "1197,3419000", train + ["0%d:33:33:33:33:33" % (n % 9)]))
        for n in range(20, 27):
            m.observe(stop(n), 50 * n)
        self.assertFalse(m.moving)

    def test_flipping_between_two_cells_at_one_place_is_not_a_move(self):
        here = self.seen(home(1))
        self.assertEqual(verdict(here, self.seen(scan(2, "1164,3234999", HOME_APS[:5]))), QUIET)

    def test_no_shared_access_point_in_the_same_cell_needs_a_second_report(self):
        other = lambda n: self.seen(scan(n, "1164,3234563", ["0%d:11:11:11:11:1%d" % (n, i) for i in range(5)]))
        self.assertEqual(verdict(self.seen(home(1)), other(2)), UNSURE)
        m = Motion(anchor=self.seen(home(1)), since=0, moving=False)
        self.assertFalse(m.observe(other(2), 50))       # one odd scan: nothing
        self.assertFalse(m.observe(self.seen(home(3)), 100))
        self.assertFalse(m.moving)
        self.assertFalse(m.observe(other(4), 150))
        self.assertTrue(m.observe(other(5), 200))       # two in a row: walking inside the cell
        self.assertTrue(m.moving)

    def test_the_repeated_last_fix_of_a_report_without_gps_is_not_a_position(self):
        self.assertIsNone(self.seen(home(1)).fix)

    def test_gps_decides_when_both_have_a_fix(self):
        fix = lambda lat, kmh: self.seen("UD,120118,070625,A,%f,N,90.4000000,E,%s,0.0,0.0,9,100,51,0,0,00000000,0,0,0.0"
                                         % (lat, kmh))
        self.assertEqual(verdict(fix(23.7500, "0.00"), fix(23.7505, "2.10")), QUIET)  # 55 m of drift
        self.assertEqual(verdict(fix(23.7500, "0.00"), fix(23.7510, "0.00")), MOVED)  # 111 m
        self.assertEqual(verdict(fix(23.7500, "0.00"), fix(23.7501, "18.5")), MOVED)  # in a vehicle

    def test_cell_decides_when_nothing_else_can(self):
        bare = lambda cell: self.seen(scan(1, cell, []))
        self.assertEqual(verdict(bare("1164,3234563"), bare("1164,3234563")), QUIET)
        self.assertEqual(verdict(bare("1164,3234563"), bare("1166,3494914")), MOVED)

    def test_still_needs_five_quiet_reports_over_four_minutes(self):
        m = Motion(anchor=self.seen(home(1)), since=0)
        self.assertFalse(any(m.observe(self.seen(home(n)), 50 * n) for n in range(2, 6)))  # 4 quiet, 250 s
        self.assertTrue(m.moving)
        self.assertTrue(m.observe(self.seen(home(6)), 300))
        self.assertFalse(m.moving)
        m = Motion(anchor=self.seen(home(1)), since=0)
        self.assertFalse(any(m.observe(self.seen(home(n)), 10 * n) for n in range(2, 9)))  # many, but 80 s
        self.assertTrue(m.moving)
        self.assertTrue(m.observe(self.seen(home(9)), 240))
        # still: the anchor is everything heard there, so a scan of only weak ones is not a move
        self.assertFalse(m.observe(self.seen(scan(9, "1164,3234563", HOME_APS[4:9])), 900))
        self.assertTrue(m.observe(self.seen(AWAY), 950))
        self.assertTrue(m.moving)


class ProxyHeader(unittest.TestCase):
    def test_strips_header_and_returns_source(self):
        buf = bytearray(b"PROXY TCP4 37.111.200.5 172.26.0.4 40112 5024\r\n[3G*1*0002*LK]")
        self.assertEqual(take_proxy_header(buf), ("done", "37.111.200.5"))
        self.assertEqual(bytes(buf), b"[3G*1*0002*LK]")

    def test_no_header_leaves_buffer(self):
        buf = bytearray(b"[3G*1*0002*LK]")
        self.assertEqual(take_proxy_header(buf), ("done", None))
        self.assertEqual(bytes(buf), b"[3G*1*0002*LK]")

    def test_partial_header_waits(self):
        self.assertEqual(take_proxy_header(bytearray(b"PRO")), ("wait", None))
        self.assertEqual(take_proxy_header(bytearray(b"PROXY TCP4 1.2.3.4")), ("wait", None))

    def test_unknown_or_garbage_header_is_dropped(self):
        buf = bytearray(b"PROXY UNKNOWN\r\n[3G*1*0002*LK]")
        self.assertEqual(take_proxy_header(buf), ("done", None))
        self.assertEqual(bytes(buf), b"[3G*1*0002*LK]")

    def test_only_private_peers_are_trusted(self):
        self.assertTrue(trusts_proxy("172.26.0.4"))
        self.assertTrue(trusts_proxy("127.0.0.1"))
        self.assertTrue(trusts_proxy("::ffff:172.26.0.4"))
        self.assertFalse(trusts_proxy("45.79.207.181"))


class EndToEnd(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        self.tmp = tempfile.mkdtemp()
        self.dbp = os.path.join(self.tmp, "t.db")
        self.srv = Server(Store(self.dbp), set())
        self.s = await asyncio.start_server(self.srv.handle, "127.0.0.1", 0)
        self.port = self.s.sockets[0].getsockname()[1]

    async def asyncTearDown(self):
        self.s.close()
        for w in list(self.srv.writers.values()):
            w.close()

    async def test_flow(self):
        r, w = await asyncio.open_connection("127.0.0.1", self.port)
        w.write(build_frame("8800000015", "LK,50,100,90"))
        self.assertEqual(await asyncio.wait_for(r.readexactly(len(b"[3G*8800000015*0002*LK]")), 2),
                         b"[3G*8800000015*0002*LK]")
        w.write(build_frame("8800000015", UD))
        w.write(build_frame("8800000015", AL))
        self.assertEqual(await asyncio.wait_for(r.readexactly(len(b"[3G*8800000015*0002*AL]")), 2),
                         b"[3G*8800000015*0002*AL]")
        # queue a command; it is delivered on the next frame from the device
        db = sqlite3.connect(self.dbp)
        db.execute("INSERT INTO commands(device_id,content,created) VALUES('8800000015','UPLOAD,600',0)")
        db.commit()
        w.write(build_frame("8800000015", "LK,1,1,1"))
        got = await asyncio.wait_for(r.readuntil(b"]"), 2) + await asyncio.wait_for(r.readuntil(b"]"), 2)
        self.assertIn(b"[3G*8800000015*000A*UPLOAD,600]", got)
        w.write(build_frame("8800000015", "UPLOAD"))
        w.close()
        await asyncio.sleep(0.2)
        q = lambda s: db.execute(s).fetchone()[0]
        self.assertEqual(q("SELECT COUNT(*) FROM locations"), 2)
        self.assertEqual(q("SELECT alarms FROM alarms"), "SOS")
        self.assertEqual(q("SELECT battery FROM devices"), 1)
        self.assertEqual(q("SELECT reply FROM commands"), "UPLOAD")

    async def test_imei_report_is_acknowledged_with_success(self):
        r, w = await asyncio.open_connection("127.0.0.1", self.port)
        w.write(build_frame("1378748302", "RYIMEI,355913787483028"))
        want = b"[3G*1378748302*0008*RYIMEI,1]"
        self.assertEqual(await asyncio.wait_for(r.readexactly(len(want)), 2), want)
        # the reply carries the header the watch used (the vendor doc writes CS, the samples send 3G)
        w.write(build_frame("1378748302", "RYIMEI,355913787483028", "CS"))
        want = b"[CS*1378748302*0008*RYIMEI,1]"
        self.assertEqual(await asyncio.wait_for(r.readexactly(len(want)), 2), want)
        w.close()

    async def test_power_on_burst_is_acknowledged_message_by_message(self):
        """The burst a HongMi watch sent to production on 2026-11-13, in its order."""
        r, w = await asyncio.open_connection("127.0.0.1", self.port)
        burst = [
            ("CONFIG,TY:g601x,UL:10,SY:0,CM:1,WT:0,AA:1,HR:0,TB:5,CS:0,PP:0,AB:0,HH:1,TR:0,MO:", "CONFIG,1"),
            ("ICCID,8988039910498351025F,355913787483028,470039972038946,", "ICCID,1"),
            ("RYIMEI,355913787483028", "RYIMEI,1"),
            ("appcontacttel", None),  # reply format not known yet: not answered
            ("APPANDFNREPORT,16,vc01,0056006900640065006F002000630061006C006C", "APPANDFNREPORT,1"),
            ("DEVPWDCHECKBIND", "DEVPWDCHECKBIND,1"),
            ("eicard,355913787483028,1794477593,3a1c6184408fae", "eicard,1"),
        ]
        for content, _ in burst:
            w.write(build_frame("1378748302", content))
        w.write(build_frame("1378748302", "LK,0,0,57"))
        want = b"".join(build_frame("1378748302", reply) for _, reply in burst if reply) + b"[3G*1378748302*0002*LK]"
        self.assertEqual(await asyncio.wait_for(r.readexactly(len(want)), 2), want)
        w.close()

    async def test_relayed_connection_records_real_ip(self):
        r, w = await asyncio.open_connection("127.0.0.1", self.port)
        w.write(b"PROXY TCP4 37.111.200.5 172.26.0.4 40112 5024\r\n")
        await asyncio.sleep(0.05)  # header and first frame in separate reads
        w.write(build_frame("8800000016", "LK,50,100,90"))
        self.assertEqual(await asyncio.wait_for(r.readexactly(len(b"[3G*8800000016*0002*LK]")), 2),
                         b"[3G*8800000016*0002*LK]")
        w.close()
        await asyncio.sleep(0.1)
        db = sqlite3.connect(self.dbp)
        self.assertEqual(db.execute("SELECT last_ip FROM devices WHERE id='8800000016'").fetchone()[0],
                         "37.111.200.5")

    async def test_moving_watch_is_kept_locating_and_a_still_one_asked_now_and_then(self):
        self.srv.still_every = 600
        dev = "8800000015"
        lk, cr = b"[3G*8800000015*0002*LK]", b"[3G*8800000015*0002*CR]"
        r, w = await asyncio.open_connection("127.0.0.1", self.port)

        async def expect(sent, want):
            w.write(build_frame(dev, sent))
            self.assertEqual(await asyncio.wait_for(r.readexactly(len(want)), 2), want)

        async def nothing_from(call):
            call()
            await expect("LK,0,0,79", lk)  # the heartbeat's own answer is all that arrives

        pump = lambda: self.srv.maybe_locate(dev, self.srv.writers[dev])  # what command_pump does
        # not known yet = treated as moving: asked on the first heartbeat
        await expect("LK,0,0,79", lk + cr)
        # for the next 100 seconds nothing more is sent
        w.write(build_frame(dev, home(1)))
        self.srv.asked[dev] -= 90
        await nothing_from(pump)
        # then it is asked again without waiting for a heartbeat
        self.srv.asked[dev] -= 15
        pump()
        self.assertEqual(await asyncio.wait_for(r.readexactly(len(cr)), 2), cr)
        # a CR that brought no report within a minute is repeated on the next heartbeat
        db = sqlite3.connect(self.dbp)
        db.execute("UPDATE locations SET received = received - 500")
        db.commit()
        self.srv.asked[dev] -= 70
        await expect("LK,0,0,79", lk + cr)
        # five reports from one place over four minutes: still. No more renewing ...
        for n in range(2, 7):
            w.write(build_frame(dev, home(n)))
        await expect("LK,0,0,79", lk)
        self.srv.motion[dev].since -= 300
        w.write(build_frame(dev, home(7)))
        await expect("LK,0,0,79", lk)
        self.assertFalse(self.srv.motion[dev].moving)
        self.srv.asked[dev] -= 400
        await nothing_from(pump)
        # ... one CR per ten minutes, on a heartbeat
        self.srv.asked[dev] -= 200
        await expect("LK,0,0,79", lk + cr)
        # that CR's report comes from somewhere else: moving again, kept locating
        w.write(build_frame(dev, AWAY))
        await expect("LK,0,0,79", lk)
        self.assertTrue(self.srv.motion[dev].moving)
        self.srv.asked[dev] -= 170
        pump()
        self.assertEqual(await asyncio.wait_for(r.readexactly(len(cr)), 2), cr)
        w.close()

    async def test_moving_watch_is_asked_again_when_it_reconnects(self):
        self.srv.still_every = 600
        lk, cr = b"[3G*8800000015*0002*LK]", b"[3G*8800000015*0002*CR]"
        r, w = await asyncio.open_connection("127.0.0.1", self.port)
        w.write(build_frame("8800000015", "LK,0,0,79"))
        self.assertEqual(await asyncio.wait_for(r.readexactly(len(lk + cr)), 2), lk + cr)
        # the watch changes network: a new connection, the old one never closed
        r2, w2 = await asyncio.open_connection("127.0.0.1", self.port)
        w2.write(build_frame("8800000015", "LK,0,0,79"))
        self.assertEqual(await asyncio.wait_for(r2.readexactly(len(lk + cr)), 2), lk + cr)
        w.close()
        w2.close()

    async def test_still_watch_is_asked_every_three_minutes_without_waiting_for_a_heartbeat(self):
        self.srv.still_every = 180
        dev = "8800000015"
        lk, cr = b"[3G*8800000015*0002*LK]", b"[3G*8800000015*0002*CR]"
        r, w = await asyncio.open_connection("127.0.0.1", self.port)
        w.write(build_frame(dev, "LK,0,0,79"))
        self.assertEqual(await asyncio.wait_for(r.readexactly(len(lk + cr)), 2), lk + cr)
        for n in range(1, 7):
            w.write(build_frame(dev, home(n)))
        w.write(build_frame(dev, "LK,0,0,79"))
        self.assertEqual(await asyncio.wait_for(r.readexactly(len(lk)), 2), lk)
        self.srv.motion[dev].since -= 300
        w.write(build_frame(dev, home(7)))
        w.write(build_frame(dev, "LK,0,0,79"))
        self.assertEqual(await asyncio.wait_for(r.readexactly(len(lk)), 2), lk)
        self.assertFalse(self.srv.motion[dev].moving)
        pump = lambda: self.srv.maybe_locate(dev, self.srv.writers[dev])  # what command_pump does
        # two minutes after the last request: not yet (a moving watch would have been asked at 100 s)
        self.srv.asked[dev] -= 120
        pump()
        w.write(build_frame(dev, "LK,0,0,79"))
        self.assertEqual(await asyncio.wait_for(r.readexactly(len(lk)), 2), lk)
        # three minutes: asked from the pump, no heartbeat needed
        self.srv.asked[dev] -= 60
        pump()
        self.assertEqual(await asyncio.wait_for(r.readexactly(len(cr)), 2), cr)
        w.close()

    async def test_steps_on_the_heartbeat_wake_a_still_watch(self):
        self.srv.still_every = 600
        dev = "8800000015"
        lk, cr = b"[3G*8800000015*0002*LK]", b"[3G*8800000015*0002*CR]"
        r, w = await asyncio.open_connection("127.0.0.1", self.port)
        w.write(build_frame(dev, "LK,0,0,79"))
        self.assertEqual(await asyncio.wait_for(r.readexactly(len(lk + cr)), 2), lk + cr)
        for n in range(1, 7):
            w.write(build_frame(dev, home(n)))
        w.write(build_frame(dev, "LK,0,0,79"))
        self.assertEqual(await asyncio.wait_for(r.readexactly(len(lk)), 2), lk)
        self.srv.motion[dev].since -= 300
        w.write(build_frame(dev, home(7)))
        w.write(build_frame(dev, "LK,0,0,79"))
        self.assertEqual(await asyncio.wait_for(r.readexactly(len(lk)), 2), lk)
        self.assertFalse(self.srv.motion[dev].moving)
        self.srv.asked[dev] -= 200  # asked 200 s ago: neither a renewal nor the ten minutes is due
        w.write(build_frame(dev, "LK,40,0,79"))
        self.assertEqual(await asyncio.wait_for(r.readexactly(len(lk + cr)), 2), lk + cr)
        self.assertTrue(self.srv.motion[dev].moving)
        w.close()

    async def test_watch_low_on_battery_is_not_asked_to_locate(self):
        self.srv.still_every = 600
        lk = b"[3G*8800000015*0002*LK]"
        r, w = await asyncio.open_connection("127.0.0.1", self.port)
        w.write(build_frame("8800000015", "LK,0,0,14"))
        w.write(build_frame("8800000015", "LK,0,0,14"))
        self.assertEqual(await asyncio.wait_for(r.readexactly(2 * len(lk)), 2), lk + lk)
        self.assertEqual(self.srv.asked, {})
        w.close()

    async def test_allowlist_rejects(self):
        self.srv.allowed = {"1"}
        r, w = await asyncio.open_connection("127.0.0.1", self.port)
        w.write(build_frame("999", "LK,1,1,1"))
        self.assertEqual(await asyncio.wait_for(r.read(100), 2), b"")


if __name__ == "__main__":
    unittest.main()

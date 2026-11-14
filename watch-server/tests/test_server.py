import asyncio
import os
import sqlite3
import sys
import tempfile
import unittest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from protocol import build_frame, extract_frames, parse_location  # noqa: E402
from server import Server, Store, take_proxy_header, trusts_proxy  # noqa: E402

UD = ("UD,120118,070625,A,22.570720,N,113.8620167,E,0.00,188.6,0.0,9,100,51,14188,0,00000010,6,255,460,0,"
      "9360,5081,156,9360,4081,129,9360,4151,128,9360,5082,127,9360,4723,122,9360,4082,120,2,"
      "ssid1,a0:c5:f2:b0:74:d0,-34,ssid2,92:76:9f:48:4f:20,-48,22.4")
AL = UD.replace("UD,", "AL,", 1).replace("00000010", "00010010")


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

    async def test_allowlist_rejects(self):
        self.srv.allowed = {"1"}
        r, w = await asyncio.open_connection("127.0.0.1", self.port)
        w.write(build_frame("999", "LK,1,1,1"))
        self.assertEqual(await asyncio.wait_for(r.read(100), 2), b"")


if __name__ == "__main__":
    unittest.main()

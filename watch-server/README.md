# watch-server

Standalone TCP server for the "3G"-protocol smart watches (frames like `[3G*8800000015*000D*LK,50,100,100]`).
Separate from the EyeOn Netty/GT06 backend, with its own SQLite database. It is what answers the watch (LK, AL,
RYIMEI) and sends it commands. Since 2026-11-13 the backend also reads the frames it relays here and stores the watch
as an EyeOn device (`backend/.../netty/WatchIngest`), so the device list and map come from EyeOn's Postgres, not from
this database.

    cd watch-server
    WATCH_PORT=8899 WATCH_DB=watch.db python server.py
    python send_command.py <device_id> "UPLOAD,600"     # queue a command
    python -m unittest discover -s tests                # tests

Env: `WATCH_HOST`, `WATCH_PORT` (8899), `WATCH_DB`, `WATCH_ALLOWED_IDS` (comma list; empty = accept all, new IDs logged),
`WATCH_STILL_EVERY` (600; seconds, 0 = watches are never asked for a position).

Positions: the watch reports by itself only at power-on, on an alarm and "in vibration state" (vendor document); the
HongMi sample sent 2-4 reports a day. `CR` makes it locate and report for 3 minutes - every 10 s per the vendor
document, every 45-66 s measured on production without a GPS fix; that pace is the watch's, not the server's.
The server decides when to send `CR` (`motion.py` says whether the watch is moving, from its reports: GPS distance
and speed, else a new serving cell with at most one shared Wi-Fi access point, plus the step counter):
- **moving** (and after a restart, until five reports say otherwise): `CR` again every 165 s, so it never stops;
- **still** (five reports from one place over four minutes): one `CR` per `WATCH_STILL_EVERY`, on a heartbeat. The
  reports of those 3 minutes are what shows that it has left, so leaving is noticed up to that long afterwards.
Never below 15 % battery. Log lines: `asked <id> to locate (moving|still)`, `<id> is moving`, `<id> is still`.
Protocol: LK is answered with LK, AL with AL, the power-on messages CONFIG / ICCID / RYIMEI / APPANDFNREPORT /
DEVPWDCHECKBIND / eicard with `<name>,1` (appcontacttel is not answered yet); UD/UD2/UD_* are stored; command LEN is computed (vendor doc examples have wrong lengths).

Watches can also dial EyeOn's tracker port 5024: the backend recognises them by the leading `[` and relays the
connection here, sending a PROXY protocol v1 line first with the watch's real address. That line is only
accepted from private/loopback peers.

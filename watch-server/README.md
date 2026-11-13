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

Env: `WATCH_HOST`, `WATCH_PORT` (8899), `WATCH_DB`, `WATCH_ALLOWED_IDS` (comma list; empty = accept all, new IDs logged).
Protocol: LK is answered with LK, AL with AL, RYIMEI (IMEI report at power-on) with `RYIMEI,1`; UD/UD2/UD_* are stored; command LEN is computed (vendor doc examples have wrong lengths).

Watches can also dial EyeOn's tracker port 5024: the backend recognises them by the leading `[` and relays the
connection here, sending a PROXY protocol v1 line first with the watch's real address. That line is only
accepted from private/loopback peers.

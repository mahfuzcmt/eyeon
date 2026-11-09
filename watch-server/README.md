# watch-server

Standalone TCP server for the "3G"-protocol smart watches (frames like `[3G*8800000015*000D*LK,50,100,100]`).
Separate from the EyeOn Netty/GT06 backend: it has its own SQLite database and is not wired into EyeOn's Postgres.

    cd watch-server
    WATCH_PORT=8899 WATCH_DB=watch.db python server.py
    python send_command.py <device_id> "UPLOAD,600"     # queue a command
    python -m unittest discover -s tests                # tests

Env: `WATCH_HOST`, `WATCH_PORT` (8899), `WATCH_DB`, `WATCH_ALLOWED_IDS` (comma list; empty = accept all, new IDs logged).
Protocol: LK is answered with LK, AL with AL; UD/UD2/UD_* are stored; command LEN is computed (vendor doc examples have wrong lengths).

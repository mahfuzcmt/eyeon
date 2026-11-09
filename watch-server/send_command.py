"""Queue a command for a watch: python send_command.py <device_id> "UPLOAD,600"

Examples: "CR" (locate now), "UPLOAD,600", "ZONE,6", "SOS,n1,n2,n3", "FIND", "VERNO".
"""
import os
import sqlite3
import sys
import time

if len(sys.argv) != 3:
    sys.exit(__doc__)
db = sqlite3.connect(os.environ.get("WATCH_DB", "watch.db"))
db.execute("INSERT INTO commands(device_id,content,created) VALUES(?,?,?)", (sys.argv[1], sys.argv[2], time.time()))
db.commit()
print("queued")

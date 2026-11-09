"""Frame codec and payload parsing for the "3G" smart-watch TCP protocol.

Frame: [<Header>*<DeviceID>*<LEN hex4>*<Content>]
LEN is the byte length of Content only.
"""
from __future__ import annotations

from dataclasses import dataclass, field

HEADER_PREFIX = b"["
MAX_CONTENT = 65535


@dataclass
class Frame:
    vendor: str
    device_id: str
    content: bytes

    @property
    def command(self) -> str:
        return self.content.split(b",", 1)[0].decode("ascii", "replace")

    @property
    def args(self) -> list[str]:
        parts = self.content.decode("latin-1").split(",")
        return parts[1:]


def build_frame(device_id: str, content: str | bytes, vendor: str = "3G") -> bytes:
    body = content.encode("latin-1") if isinstance(content, str) else content
    return b"[%s*%s*%04X*%s]" % (vendor.encode(), device_id.encode(), len(body), body)


def extract_frames(buf: bytearray) -> list[Frame]:
    """Consume complete frames from buf (in place) and return them.

    Uses the LEN field to delimit content, so content may contain ',', '*' or ']'
    (needed for escaped TK audio). Garbage before '[' is discarded; a malformed
    header drops one byte and resyncs.
    """
    frames: list[Frame] = []
    while True:
        start = buf.find(HEADER_PREFIX)
        if start < 0:
            buf.clear()
            break
        if start:
            del buf[:start]
        # "[" + vendor(2) + "*" + id + "*" + len(4) + "*"
        parts = bytes(buf[1:64]).split(b"*", 3)
        if len(parts) < 4:
            if len(buf) > 64:  # header can't be this long: resync
                del buf[0]
                continue
            break
        vendor, dev, ln, _rest = parts
        try:
            length = int(ln, 16)
            if len(ln) != 4 or not dev.isalnum() or length > MAX_CONTENT:
                raise ValueError
        except ValueError:
            del buf[0]
            continue
        head_len = 1 + len(vendor) + 1 + len(dev) + 1 + len(ln) + 1
        total = head_len + length + 1
        if len(buf) < total:
            break
        if buf[total - 1:total] != b"]":
            del buf[0]
            continue
        frames.append(Frame(vendor.decode("ascii", "replace"), dev.decode("ascii"),
                            bytes(buf[head_len:head_len + length])))
        del buf[:total]
    return frames


@dataclass
class Location:
    device_time: str  # ISO-ish "YYYY-MM-DD HH:MM:SS" (watch local time)
    valid: bool
    lat: float
    lon: float
    speed: float
    direction: float
    altitude: float
    satellites: int
    gsm: int
    battery: int
    steps: int
    rolls: int
    status: int
    accuracy: float | None
    cells: list[dict] = field(default_factory=list)
    wifi: list[dict] = field(default_factory=list)

    @property
    def sos(self) -> bool:
        return bool(self.status & (1 << 16))

    @property
    def alarms(self) -> list[str]:
        names = {16: "SOS", 17: "LOW_BATTERY", 18: "OUT_OF_FENCE", 19: "IN_FENCE", 20: "LOW_BATTERY"}
        return sorted({n for b, n in names.items() if self.status & (1 << b)})


def parse_location(args: list[str]) -> Location:
    """Parse UD/UD2/AL/UD_*/AL_* payload (fields after the command name)."""
    d, t = args[0], args[1]
    lat = float(args[3]) * (-1 if args[4].upper() == "S" else 1)
    lon = float(args[5]) * (-1 if args[6].upper() == "W" else 1)
    dev_time = f"20{d[4:6]}-{d[2:4]}-{d[0:2]} {t[0:2]}:{t[2:4]}:{t[4:6]}"
    loc = Location(
        device_time=dev_time, valid=args[2].upper() == "A", lat=lat, lon=lon,
        speed=float(args[7]), direction=float(args[8]), altitude=float(args[9]),
        satellites=int(args[10]), gsm=int(args[11]), battery=int(args[12]),
        steps=int(args[13]), rolls=int(args[14]), status=int(args[15], 16),
        accuracy=None,
    )
    # Optional tail: base stations, wifi, accuracy. Tolerate truncation.
    try:
        i = 16
        n_bs = int(args[i]); i += 1
        if n_bs:
            ta, mcc, mnc = args[i:i + 3]; i += 3
            for _ in range(n_bs):
                lac, cid, rssi = args[i:i + 3]; i += 3
                loc.cells.append({"mcc": int(mcc), "mnc": int(mnc), "ta": int(ta),
                                  "lac": int(lac), "cid": int(cid), "rssi": int(rssi)})
        n_wifi = int(args[i]); i += 1
        for _ in range(n_wifi):
            ssid, mac, rssi = args[i:i + 3]; i += 3
            loc.wifi.append({"ssid": ssid, "mac": mac, "rssi": int(rssi)})
        loc.accuracy = float(args[i])
    except (ValueError, IndexError):
        pass
    return loc

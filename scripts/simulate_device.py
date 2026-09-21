#!/usr/bin/env python3
"""
GT06 device simulator for EyeOn.

Sends a login (0x01) packet then periodic V3 location (0x22) and heartbeat (0x13)
packets to the Netty server. Useful for end-to-end testing without real hardware.

Usage:
    python simulate_device.py --imei 864290061234567 --host 127.0.0.1 --port 5024
    python simulate_device.py --imei 864290061234567 --lat 23.7806 --lng 90.4193

The default IMEI matches the Flyway V2 seed device for the demo org.
"""
from __future__ import annotations

import argparse
import socket
import struct
import sys
import time
from datetime import datetime, timezone

# CRC-ITU as GT06 hardware actually computes it: CRC-16/X-25 — REFLECTED,
# poly 0x1021 (0x8408 bit-reversed), init 0xFFFF, XOR-out 0xFFFF. The MSB-first
# non-reflected variant looks similar but produces different values; the backend
# (verified against real Concox trackers) rejects those frames with CRC mismatch.
def crc_itu(data: bytes) -> int:
    crc = 0xFFFF
    for b in data:
        crc ^= b
        for _ in range(8):
            crc = (crc >> 1) ^ 0x8408 if crc & 1 else crc >> 1
    return (~crc) & 0xFFFF


def bcd_imei(imei: str) -> bytes:
    """Pack a 15-digit IMEI into 8 bytes (16 nibbles, leading nibble is 0)."""
    if len(imei) != 15 or not imei.isdigit():
        raise ValueError("IMEI must be 15 digits")
    digits = "0" + imei  # pad to 16 nibbles
    return bytes(int(digits[i:i + 2], 16) for i in range(0, 16, 2))


def build_frame(protocol: int, content: bytes, serial: int) -> bytes:
    """[0x78 0x78][Length][Proto][Content][Serial:2][CRC:2][0x0D 0x0A]"""
    payload = bytes([protocol]) + content + struct.pack(">H", serial)
    length = len(payload) + 2  # + CRC
    crc_input = bytes([length]) + payload
    crc = crc_itu(crc_input)
    return b"\x78\x78" + crc_input + struct.pack(">H", crc) + b"\x0D\x0A"


def build_login(imei: str, serial: int) -> bytes:
    return build_frame(0x01, bcd_imei(imei), serial)


def build_heartbeat(serial: int) -> bytes:
    # Status info: terminal info(1) + voltage(1) + GSM signal(1) + language(2)
    content = bytes([0x40, 0x04, 0x04, 0x00, 0x01])  # ACC on, full battery, signal good
    return build_frame(0x13, content, serial)


def build_location_v3(lat: float, lng: float, speed: int, course: int, serial: int, alarm_code: int | None = None) -> bytes:
    """V3 (0x22): lat/lng = decimal_degrees * 1_800_000."""
    now = datetime.now(timezone.utc)
    dt = bytes([
        now.year - 2000, now.month, now.day,
        now.hour, now.minute, now.second,
    ])

    south = lat < 0
    west = lng < 0
    lat_raw = int(abs(lat) * 1_800_000) & 0xFFFFFFFF
    lng_raw = int(abs(lng) * 1_800_000) & 0xFFFFFFFF

    gps_byte = (12 << 4) | 0x0C  # 12-byte gps info length, 12 satellites
    course_status = (course & 0x03FF) | 0x1000  # GPS valid bit
    # Hemisphere bits are ASYMMETRIC (CLAUDE.md §6.3): lat bit 10 SET = North,
    # lng bit 11 SET = West. A Dhaka device sends lat-bit 1, lng-bit 0.
    if not south:
        course_status |= 0x0400
    if west:
        course_status |= 0x0800

    gps_lbs = (
        dt
        + bytes([gps_byte])
        + struct.pack(">I", lat_raw)
        + struct.pack(">I", lng_raw)
        + bytes([speed & 0xFF])
        + struct.pack(">H", course_status)
        # MCC/MNC/LAC/CellId — fake values for Bangladesh GP (470/01)
        + struct.pack(">H", 470)        # MCC
        + bytes([0x01])                  # MNC
        + struct.pack(">H", 0x1234)     # LAC
        + bytes([0x00, 0x12, 0x34])     # 24-bit cell id
    )
    if alarm_code is not None:
        # 0x16 alarm packet = GPS + LBS + 5-byte status block
        # (terminal info, voltage level 0-6, GSM signal 0-4, alarm code, language).
        status = bytes([0x00, 0x04, 0x03, alarm_code & 0xFF, 0x02])
        return build_frame(0x16, gps_lbs + status, serial)

    content = (
        gps_lbs
        # V3-specific
        + bytes([0x01])  # ACC on
        + bytes([0x00])  # upload mode
        + bytes([0x01])  # realtime
        + struct.pack(">I", 1234)  # mileage km
    )
    return build_frame(0x22, content, serial)


def expect_ack(sock: socket.socket, label: str) -> None:
    sock.settimeout(5.0)
    try:
        data = sock.recv(64)
    except socket.timeout:
        print(f"  ! no ACK received for {label}", file=sys.stderr)
        return
    if not data:
        print(f"  ! connection closed waiting for {label} ACK", file=sys.stderr)
        return
    print(f"  <- ACK ({len(data)} bytes): {data.hex()}")


def main() -> int:
    parser = argparse.ArgumentParser(description="GT06 device simulator")
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=5024)
    parser.add_argument("--imei", default="864290061234567")
    parser.add_argument("--lat", type=float, default=23.7806)   # Dhaka
    parser.add_argument("--lng", type=float, default=90.4193)
    parser.add_argument("--speed", type=int, default=42)
    parser.add_argument("--course", type=int, default=90)
    parser.add_argument("--count", type=int, default=3, help="location packets to send")
    parser.add_argument("--interval", type=float, default=2.0, help="seconds between packets")
    parser.add_argument("--sos", action="store_true",
                        help="after the location packets, send one 0x16 alarm packet with code 0x01 (SOS button)")
    args = parser.parse_args()

    print(f"connecting to {args.host}:{args.port} as IMEI={args.imei}")
    with socket.create_connection((args.host, args.port), timeout=10) as sock:
        serial = 1

        login = build_login(args.imei, serial)
        print(f"-> login ({len(login)} bytes): {login.hex()}")
        sock.sendall(login)
        expect_ack(sock, "login")
        serial += 1

        for i in range(args.count):
            lat = args.lat + 0.0001 * i
            lng = args.lng + 0.0001 * i
            pkt = build_location_v3(lat, lng, args.speed, args.course, serial)
            print(f"-> location[{i + 1}] lat={lat:.4f} lng={lng:.4f} ({len(pkt)} bytes)")
            sock.sendall(pkt)
            expect_ack(sock, f"location[{i + 1}]")
            serial += 1
            time.sleep(args.interval)

        if args.sos:
            # A real tracker sends SOS some time after login; give the server's asynchronous
            # login lookup a moment so the alarm is not dropped (CLAUDE.md section 18 item 0).
            sos = build_location_v3(args.lat, args.lng, 0, args.course, serial, alarm_code=0x01)
            print(f"-> SOS alarm ({len(sos)} bytes): {sos.hex()}")
            sock.sendall(sos)
            expect_ack(sock, "SOS alarm")
            serial += 1

        hb = build_heartbeat(serial)
        print(f"-> heartbeat ({len(hb)} bytes): {hb.hex()}")
        sock.sendall(hb)
        expect_ack(sock, "heartbeat")

    print("done")
    return 0


if __name__ == "__main__":
    sys.exit(main())

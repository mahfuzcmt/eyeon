"""Is the watch moving? Decided from the position reports it sends, nothing else.

The watch has no usable "at rest" flag (status bit 4 of the vendor document was never set by the
HongMi sample, lying on a table or not), and indoors it has no GPS fix: its reports then repeat
the last fix and carry the serving cell and the 5 strongest Wi-Fi access points. A report is
compared with an anchor - what the watch heard since it last moved:

  * GPS fix on both: moved when 100 m or more from the anchor's fix, or the fix says 5 km/h or more;
  * otherwise a serving cell the anchor never heard, with at most one access point shared: moved.
    In town a cell is a few hundred metres (six cells on a 1 km ride, production 2026-11-16), and
    at one place the watch flips between two cells but keeps hearing the same access points. One
    shared access point does not count: on that ride a hotspot travelled along the whole way;
  * otherwise no access point shared at all, two reports in a row: moved (a walk inside one cell).
    Once is not enough - in a dense block two scans of one room can have nothing in common;
  * and always when the step counter went up by 10 or more.

Every report that did not move is added to the anchor. After STILL_AFTER_REPORTS of them in a
row, over at least STILL_AFTER_SECONDS, the watch is still.
"""
from __future__ import annotations

import math
from dataclasses import dataclass, field

MOVED_METERS = 100
MOVING_KMH = 5
MOVED_STEPS = 10
STILL_AFTER_REPORTS = 5
STILL_AFTER_SECONDS = 240


def meters(a: tuple[float, float], b: tuple[float, float]) -> float:
    lat = math.radians((a[0] + b[0]) / 2)
    dy = (a[0] - b[0]) * 111_320
    dx = (a[1] - b[1]) * 111_320 * math.cos(lat)
    return math.hypot(dx, dy)


@dataclass
class Seen:
    """What one report, or several from one place, say about where the watch is."""
    fix: tuple[float, float] | None = None
    macs: frozenset[str] = frozenset()
    cells: frozenset[tuple[int, int]] = frozenset()
    serving: tuple[int, int] | None = None
    steps: int = 0
    kmh: float = 0.0

    @staticmethod
    def of(loc) -> "Seen":
        cells = [(c["lac"], c["cid"]) for c in loc.cells]
        return Seen(
            fix=(loc.lat, loc.lon) if loc.valid and (loc.lat or loc.lon) else None,
            macs=frozenset(w["mac"].upper() for w in loc.wifi if w.get("mac")),
            cells=frozenset(cells), serving=cells[0] if cells else None,
            steps=loc.steps, kmh=loc.speed if loc.valid else 0.0)

    def merged(self, other: "Seen") -> "Seen":
        return Seen(fix=other.fix or self.fix, macs=self.macs | other.macs, cells=self.cells | other.cells,
                    serving=other.serving or self.serving, steps=other.steps, kmh=other.kmh)


MOVED, QUIET, UNSURE = "moved", "quiet", "unsure"


def verdict(anchor: Seen, now: Seen) -> str:
    """What one report says against the anchor; UNSURE = moved only if the next one agrees."""
    if now.kmh >= MOVING_KMH or now.steps - anchor.steps >= MOVED_STEPS:
        return MOVED
    if anchor.fix and now.fix:
        return MOVED if meters(anchor.fix, now.fix) >= MOVED_METERS else QUIET
    shared = len(anchor.macs & now.macs) if anchor.macs and now.macs else None
    if anchor.cells and now.serving and now.serving not in anchor.cells:
        return MOVED if shared is None or shared <= 1 else QUIET
    return UNSURE if shared == 0 else QUIET


@dataclass
class Motion:
    """One watch. A watch not heard of yet counts as moving until its reports say otherwise."""
    anchor: Seen
    since: float  # when it last moved (or was first seen)
    moving: bool = True
    quiet: int = 0  # reports in a row since then that did not move
    unsure: bool = False  # the last report shared no access point with the anchor

    def observe(self, seen: Seen, at: float) -> bool:
        """Take in a report; True when this changed moving <-> still."""
        v = verdict(self.anchor, seen)
        if v == UNSURE and not self.unsure:
            self.unsure = True
            return False
        self.unsure = False
        if v != QUIET:
            changed = not self.moving
            self.moving, self.since, self.anchor, self.quiet = True, at, seen, 0
            return changed
        self.anchor = self.anchor.merged(seen)
        if not self.moving:
            return False
        self.quiet += 1
        if self.quiet >= STILL_AFTER_REPORTS and at - self.since >= STILL_AFTER_SECONDS:
            self.moving = False
            return True
        return False

    def steps_taken(self, steps: int, at: float) -> bool:
        """The heartbeat's step counter; True when a still watch starts moving by it."""
        if steps < self.anchor.steps:
            self.anchor.steps = steps
        if steps - self.anchor.steps < MOVED_STEPS:
            return False
        self.anchor.steps = steps
        changed = not self.moving
        self.moving, self.since, self.quiet = True, at, 0
        return changed

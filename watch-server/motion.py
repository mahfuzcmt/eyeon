"""Is the watch moving? Decided from the position reports it sends, nothing else.

The watch has no usable "at rest" flag (status bit 4 of the vendor document was never set by the
HongMi sample, lying on a table or not), and indoors it has no GPS fix: its reports then repeat
the last fix and carry the 5 strongest Wi-Fi access points and the cells it hears. So a report
is compared with an anchor - where the watch was when it last moved:

  * GPS fix on both: moved when 100 m or more from the anchor's fix, or the fix says 5 km/h or more;
  * otherwise Wi-Fi on both: moved when not one access point is shared (at one place the strong
    ones recur from scan to scan, in a vehicle none does, on foot none after about 150 m);
  * otherwise: moved when the serving cell is not one the anchor heard;
  * and always when the step counter went up by 10 or more.

While moving, the anchor is the report that last showed movement. After STILL_AFTER_REPORTS
reports in a row without movement, over at least STILL_AFTER_SECONDS, the watch is still and
the anchor becomes everything those reports heard.
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


def moved(anchor: Seen, now: Seen) -> bool:
    if now.kmh >= MOVING_KMH or now.steps - anchor.steps >= MOVED_STEPS:
        return True
    if anchor.fix and now.fix:
        return meters(anchor.fix, now.fix) >= MOVED_METERS
    if anchor.macs and now.macs:
        return not (anchor.macs & now.macs)
    if anchor.cells and now.serving:
        return now.serving not in anchor.cells
    return False


@dataclass
class Motion:
    """One watch. A watch not heard of yet counts as moving until its reports say otherwise."""
    anchor: Seen
    since: float  # when it last moved (or was first seen)
    moving: bool = True
    quiet: list[Seen] = field(default_factory=list)  # reports since then, none of which moved

    def observe(self, seen: Seen, at: float) -> bool:
        """Take in a report; True when this changed moving <-> still."""
        if moved(self.anchor, seen):
            changed = not self.moving
            self.moving, self.since, self.anchor, self.quiet = True, at, seen, []
            return changed
        if seen.steps < self.anchor.steps:  # the counter starts again every day
            self.anchor.steps = seen.steps
        if not self.moving:
            return False
        self.quiet.append(seen)
        if len(self.quiet) >= STILL_AFTER_REPORTS and at - self.since >= STILL_AFTER_SECONDS:
            for s in self.quiet:
                self.anchor = self.anchor.merged(s)
            self.moving, self.quiet = False, []
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
        self.moving, self.since, self.quiet = True, at, []
        return changed

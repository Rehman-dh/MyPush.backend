/**
 * Timezone helpers for per-user-timezone delivery. Pure functions using `Intl`
 * (no external date library). "Has this wall-clock time arrived in this zone yet?"
 */

/** Offset in ms such that: wallClockUTCms - realUTCms, for `date` viewed in `tz`. */
function tzOffsetMs(tz: string, date: Date): number {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const parts = dtf.formatToParts(date);
  const m: Record<string, number> = {};
  for (const p of parts) if (p.type !== "literal") m[p.type] = Number(p.value);
  // Intl renders hour "24" at midnight in some environments — normalise.
  const hour = m.hour === 24 ? 0 : m.hour;
  const asUTC = Date.UTC(m.year, m.month - 1, m.day, hour, m.minute, m.second);
  return asUTC - date.getTime();
}

/** The real UTC instant when local `date`+`hhmm` occurs in `tz`. */
export function zonedWallClockToUtc(tz: string, dateStr: string, hhmm: string): Date {
  const [y, mo, d] = dateStr.split("-").map(Number);
  const [hh, mm] = hhmm.split(":").map(Number);
  const guess = Date.UTC(y, mo - 1, d, hh, mm);
  // One correction pass handles standard offsets and DST for practical cases.
  const offset = tzOffsetMs(tz, new Date(guess));
  return new Date(guess - offset);
}

/** True when local `date`+`hhmm` in `tz` is at or before `now`. */
export function isLocalTimeReached(
  tz: string,
  dateStr: string,
  hhmm: string,
  now: Date = new Date()
): boolean {
  try {
    return zonedWallClockToUtc(tz, dateStr, hhmm).getTime() <= now.getTime();
  } catch {
    // Unknown/invalid tz → treat as reached so it isn't stuck forever.
    return true;
  }
}

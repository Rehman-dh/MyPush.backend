/**
 * Read-only helpers for the dashboard charts. No schema/DB dependency —
 * pure functions over rows already fetched by the server component.
 */

/** Local YYYY-MM-DD key for a date. */
export function dayKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Short "MMM D" label (e.g. "Aug 12"). */
export function dayLabel(key: string): string {
  const d = new Date(key + "T00:00:00");
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

/** Dense list of the last `days` day-keys ending today (oldest → newest). */
export function lastNDayKeys(days: number, now: Date = new Date()): string[] {
  const keys: string[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    keys.push(dayKey(d));
  }
  return keys;
}

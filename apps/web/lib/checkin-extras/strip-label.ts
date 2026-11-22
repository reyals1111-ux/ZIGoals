/**
 * Session AV lane 2 (review b1 #15): what each box of the evening check-in's 14-day strip shows, so a sighted person can
 * tell the days apart — the weekday's initial and the day of the month ("M 16"), and "Today" on today's box. The full
 * date stays in each box's accessible name. Pure.
 */
const INITIALS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'] as const;
export function stripLabel(day: string, today: string): string {
  if (day === today) return 'Today';
  const d = new Date(`${day}T12:00:00Z`);
  return Number.isFinite(d.getTime()) ? `${INITIALS[d.getUTCDay()]} ${d.getUTCDate()}` : day;
}

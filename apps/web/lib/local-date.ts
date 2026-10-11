/** Calendar keys use the viewer's local date. Arithmetic uses UTC only for calendar fields, never instants. */
export function localDate(now = new Date()): string {
  if (!Number.isFinite(now.getTime())) throw Error("Invalid calendar date.");
  return `${now.getFullYear().toString().padStart(4, "0")}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}
function calendarDate(value: string): Date {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw Error("Invalid calendar date.");
  const date = new Date(`${value}T12:00:00Z`);
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== value) throw Error("Invalid calendar date.");
  return date;
}
export function addLocalDays(value: string, amount: number): string {
  if (!Number.isSafeInteger(amount) || Math.abs(amount) > 366_000) throw Error("Invalid day interval.");
  const date = calendarDate(value);
  date.setUTCDate(date.getUTCDate() + amount);
  return date.toISOString().slice(0, 10);
}
export function localWeekday(value: string): number { return calendarDate(value).getUTCDay(); }

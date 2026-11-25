/**
 * Session AW (simplicity-b, Part 3): the Agenda's add field and its one line for an empty range. Pure.
 *
 * The field adds to the chosen day (the day view's day, or the week's or month's chosen day) when it is today or later,
 * else to today when the range shows today; a range wholly in the past has no field.
 */
export function agendaAddDay({at, today, from, to}: {at: string; today: string; from: string; to: string}): string | null {
  if (at >= today) return at;
  return today >= from && today <= to ? today : null;
}
/** The line that stands for a day or a week with nothing on it (no item, countdown or deadline). */
export function quietRangeWords(view: 'day' | 'week' | 'month', canAdd: boolean): string {
  const where = view === 'day' ? 'on this day' : 'this week';
  return canAdd ? `Nothing planned ${where} yet. Add a task above, or a habit, a bill or a meal plan: each one shows here on its day.`
    : `Nothing was planned ${view === 'day' ? 'on this day' : 'in this week'}.`;
}

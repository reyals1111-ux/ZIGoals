/**
 * Session AL final pass (DV-115, AL-COUNTS-008): which of ZIGi's confirmed cards get a line of their own under "Actions by
 * ZIGi" in Activity. A habit's day (a check-in, a skip, or a Checklist tick of a habit, whose record id is
 * `habit:<id>:<day>`) always has its own row while it exists, so one without a row was removed since and is not listed:
 * the Today card's tick of a habit (`checklist-tick`) had stayed, filed under Health and counted by no other chip. A
 * line saved with Quick add is noted under its record's own id and never stands alone either.
 */
export function isHabitDayAction(action: {kind: string; activityId: string}): boolean {
  return /^(check-in|skip)$/.test(action.kind) || action.activityId.startsWith('habit:');
}
export function standsAlone(action: {kind: string; activityId: string; via?: string}, shownIds: ReadonlySet<string>): boolean {
  return !shownIds.has(action.activityId) && !isHabitDayAction(action) && action.via !== 'quick-add';
}

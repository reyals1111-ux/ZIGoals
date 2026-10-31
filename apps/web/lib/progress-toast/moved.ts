/**
 * Session AK F0 (brief 6.5, the cross-pillar progress toast): after an action that moves a Goal's progress (a
 * contribution funded through the Goal, today), one calm line in the app's one toast: "That moved Japan trip to 46%."
 * Said only when the whole percent went up; never when the progress is unknown (no source has a value: unknown is not
 * zero), and "at least" when some sources have no value yet (QA-38's lower bound). A habit tick does not move a Goal's
 * funded share in ZIGoals (funding is allocated wealth), so habit ticks keep their own toast and its "Add to its Goal".
 * Pure: two progress readings in, words or null out.
 */
export type ProgressReading = {progressPct: string; bound?: 'at-least' | 'unavailable'};
const whole = (pct: string) => { const n = Number(pct); return Number.isFinite(n) && n >= 0 ? Math.floor(Math.min(n, 100)) : null; };
export function movedMessage(goalName: string, before: ProgressReading, after: ProgressReading): string | null {
  if (after.bound === 'unavailable') return null;
  const was = before.bound === 'unavailable' ? null : whole(before.progressPct), now = whole(after.progressPct);
  if (now === null || (was !== null && now <= was) || (was === null && now === 0)) return null;
  const name = goalName.replace(/\s+/g, ' ').trim().slice(0, 60) || 'your Goal';
  return now >= 100 ? `That moved ${name} to its target.` : `That moved ${name} to ${after.bound === 'at-least' ? 'at least ' : ''}${now}%.`;
}

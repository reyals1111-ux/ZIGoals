import type {PrivateGoal} from './positions';
import type {AverageGoal} from './average-goals/store';
import {averageKey} from './average-goals/store';
import {areaLabel, type GoalExtras} from './goal-extras/store';

/**
 * G7, the Hall of achievements (Session AA-Cloud Part 2): every finished goal as a card with the day it was finished,
 * how long it took, its life area and the story the person wrote. A tracked goal's finish day is the last "completed"
 * step in its own lifecycle; without one (an older record) the card says the day is not recorded rather than guessing.
 */
export type Achievement = {key: string; name: string; finished: string | null; days: number | null; area?: string; areaLabel?: string; story?: string; started: string};
const dayOf = (iso: string) => iso.slice(0, 10);
const span = (from: string, to: string) => Math.max(0, Math.round((Date.parse(`${to}T12:00:00Z`) - Date.parse(`${from}T12:00:00Z`)) / 86_400_000));

export function achievementsOf(goals: readonly PrivateGoal[], averages: readonly AverageGoal[], extras: GoalExtras): Achievement[] {
  const out: Achievement[] = [];
  for (const g of goals) {
    if (g.status !== 'completed') continue;
    const done = [...(g.lifecycle ?? [])].reverse().find(l => l.kind === 'completed');
    const key = `private:${g.id}`, e = extras.goals[key], finished = done ? dayOf(done.at) : null, started = dayOf(g.createdAt);
    out.push({key, name: g.name, finished, days: finished ? span(started, finished) : null, area: e?.area, areaLabel: areaLabel(extras, e?.area), story: e?.story, started});
  }
  for (const a of averages) {
    if (a.status !== 'completed') continue;
    const key = averageKey(a.id), e = extras.goals[key], finished = a.completedAt ? dayOf(a.completedAt) : null, started = dayOf(a.createdAt);
    out.push({key, name: a.name, finished, days: finished ? span(started, finished) : null, area: e?.area ?? (a.metric === 'custom' ? undefined : 'health'), areaLabel: areaLabel(extras, e?.area ?? (a.metric === 'custom' ? undefined : 'health')), story: e?.story, started});
  }
  // Newest first; a card without a finish day goes last.
  return out.sort((x, y) => (y.finished ?? '').localeCompare(x.finished ?? '') || x.name.localeCompare(y.name));
}
export const durationWords = (days: number | null) => days === null ? 'Finish day not recorded' : days === 0 ? 'Finished the day it started' : days < 60 ? `${days} day${days === 1 ? '' : 's'}` : days < 730 ? `${Math.round(days / 30.4)} months` : `${Math.round(days / 365.25)} years`;

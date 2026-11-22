import type {Meditation} from './schema';
import {sessionDay} from './stats';
import {addDays} from '../zone-time';

/**
 * Session AV lane 2 (habits pillar; LEDGER #186, Insight Timer's milestones): calm, once-only meditation milestones from
 * the person's own sessions — seven days in a row (the longest run ever, so a rest day later takes nothing away), and 50
 * and 100 days with a session in all. Days, never minutes or a score. The game layer shows them as badges (lib/game/
 * badges.ts) and Meditation lists them; each is reached the moment the sessions show it. Pure.
 */
export const MILESTONES = [
  {id: 'meditate-7', title: 'Seven days in a row', blurb: 'Seven days in a row with a meditation.', symbol: '❂', need: 7, kind: 'row'},
  {id: 'meditate-50', title: 'Fifty days', blurb: 'Fifty days with a meditation, all told.', symbol: '❁', need: 50, kind: 'days'},
  {id: 'meditate-100', title: 'A hundred days', blurb: 'A hundred days with a meditation, all told.', symbol: '✺', need: 100, kind: 'days'},
] as const;
export type Milestone = (typeof MILESTONES)[number] & {reached: boolean; have: number};
/** The longest run of days in a row with a session, up to `today`. */
export function longestRun(days: ReadonlySet<string>): number {
  let best = 0;
  for (const d of days) {
    if (days.has(addDays(d, -1))) continue; // not the first day of a run
    let n = 0, day = d;
    while (days.has(day)) { n++; day = addDays(day, 1); }
    best = Math.max(best, n);
  }
  return best;
}
export function meditationMilestones(m: Pick<Meditation, 'sessions'> | null | undefined, today: string): Milestone[] {
  const days = new Set((m?.sessions ?? []).map(sessionDay).filter(d => d <= today)), run = longestRun(days);
  return MILESTONES.map(x => { const have = x.kind === 'row' ? run : days.size; return {...x, have, reached: have >= x.need}; });
}

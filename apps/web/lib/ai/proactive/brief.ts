import {habitDay, habitStats, latestHabitRule} from '../../habits';
import {waterSummary} from '../../health-daily';
import {addLocalDays} from '../../local-date';
import {asleep, nightDay} from '../../sleep/engine';
import {healthGroupIn} from '../../vault/w-homes';
import {formatMinutes} from '../../zone-time';
import type {ToolEnv} from '../tools/env';
import {summaries} from '../tools/goals';
import {listNames, shortName} from './calm';

/**
 * ZIGi's morning brief (Session V Part 9), computed on this device from the person's records, the same for the whole
 * day: what is still open today, one thing from yesterday, and one thing to start with. Counts and names only, in the
 * calm tone (no grades, no praise, no urgency); a part with nothing to say is left out, and an empty brief is null.
 * Health only through the environment's gate. Nothing is stored and nothing is sent; "Say it nicer" asks the person's
 * AI to reword it, on their click, from the brief made again for that AI.
 */
export type Brief = {due: string | null; win: string | null; focus: string | null; lines: string[]};
export const BRIEF_LABEL = 'Made on this device from your records · no AI used';
const fmtLitres = (ml: number) => `${Number((ml / 1000).toFixed(1))} L`;
export function morningBrief(env: ToolEnv): Brief | null {
  const today = env.habitDay, yesterday = addLocalDays(today, -1);
  const habits = env.areas.habits ? env.habits.habits.filter(h => latestHabitRule(h).state === 'active') : [];
  const open = habits.filter(h => { const s = habitDay(h, today, today).status; return s === 'due' || s === 'partial'; });
  const streaks = new Map(habits.map(h => [h.id, habitStats(h, today)]));
  const due = open.length ? `Still open today: ${listNames(open.map(h => shortName(h.title)))}.` : null;
  // One thing from yesterday: the longest daily run that yesterday continued, else the check-ins made; Health's water as a last resort.
  const done = habits.filter(h => habitDay(h, yesterday, today).status === 'complete');
  const run = done.map(h => ({h, s: streaks.get(h.id)!})).filter(x => x.s.streakUnit === 'days' && x.s.currentStreak >= 2).sort((a, b) => b.s.currentStreak - a.s.currentStreak || a.h.title.localeCompare(b.h.title))[0];
  let win: string | null = run ? `From yesterday: ${shortName(run.h.title)}, ${run.s.currentStreak} days in a row.`
    : done.length ? `From yesterday: ${done.length === 1 ? `${shortName(done[0]!.title)} checked in` : `${done.length} habits checked in`}.` : null;
  if (!win && env.health) { const water = waterSummary(env.health, yesterday); if (water.entries > 0) win = `From yesterday: ${fmtLitres(water.millilitres)} of water logged.`; }
  // Session W Part 21: else the night that ended this morning, from Health's Sleep (estimated when it says so).
  if (!win && env.health) {
    const night = (healthGroupIn(env.health, 'sleep')?.nights ?? []).filter(n => n.kind === 'night' && n.end !== null && nightDay(n) === today).sort((a, b) => b.end!.localeCompare(a.end!))[0];
    const slept = night ? asleep(night) : null;
    if (slept) win = `From yesterday: ${formatMinutes(slept.minutes)} of sleep logged for last night${slept.estimated ? ' (estimated)' : ''}.`;
  }
  // One thing to start with: the open habit with the longest run so far, else the goal with the nearest planned date this week.
  const lead = open.map(h => ({h, s: streaks.get(h.id)!})).sort((a, b) => b.s.currentStreak - a.s.currentStreak || a.h.title.localeCompare(b.h.title))[0];
  let focus: string | null = lead ? `One to start with: ${shortName(lead.h.title)}${lead.s.streakUnit === 'days' && lead.s.currentStreak >= 2 ? ` (${lead.s.currentStreak} days in a row so far)` : ''}.` : null;
  if (!focus && env.areas.goals) {
    const week = addLocalDays(today, 7), next = summaries(env).filter(g => g.status === 'active' && g.nextContributionDate && g.nextContributionDate >= today && g.nextContributionDate <= week).sort((a, b) => a.nextContributionDate!.localeCompare(b.nextContributionDate!))[0];
    if (next) focus = `Coming up: ${shortName(next.name)}, next planned date ${next.nextContributionDate}.`;
  }
  const lines = [due, win, focus].filter((line): line is string => !!line);
  return lines.length ? {due, win, focus, lines} : null;
}
/** The brief as data for the person's AI ("Say it nicer"), made again under the gates of that path. */
export function briefForAi(brief: Brief): string {
  return `## ZIGi's morning brief (made on this device from the records)\n${brief.lines.map(line => `- ${line}`).join('\n')}`;
}
export const SAY_IT_NICER = 'Say my morning brief from the records in a warmer way, in two or three short sentences. Keep every name, number and date exactly as it is, add nothing, and give no advice.';

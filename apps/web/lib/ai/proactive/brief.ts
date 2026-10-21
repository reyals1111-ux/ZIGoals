import {habitDay, habitStats, latestHabitRule} from '../../habits';
import {waterSummary} from '../../health-daily';
import {addLocalDays} from '../../local-date';
import {asleep, nightDay} from '../../sleep/engine';
import {healthGroupIn} from '../../vault/w-homes';
import {formatMinutes} from '../../zone-time';
import type {ToolEnv} from '../tools/env';
import {summaries} from '../tools/goals';
import {listNames, shortName} from './calm';
import type {EarnSnapshot} from '../../earn/snapshot';
import {checklistToday, earningSummary, goalsNeedingStep, mealsPlanned, noteLine, timersRunning} from './brief-sources';

/**
 * ZIGi's morning brief (Session V Part 9), computed on this device from the person's records, the same for the whole
 * day: what is still open today, one thing from yesterday, and one thing to start with. Counts and names only, in the
 * calm tone (no grades, no praise, no urgency); a part with nothing to say is left out, and an empty brief is null.
 * Health only through the environment's gate. Nothing is stored and nothing is sent; "Say it nicer" asks the person's
 * AI to reword it, on their click, from the brief made again for that AI.
 */
/**
 * Session AF (L4, P8.2): Daily Briefing v2 adds `sections` beside the three lines, each a labelled part with something to
 * say — today's Checklist dots, meals planned, timers running, goals needing a step, the earning summary, a note the
 * person keeps — made only when the caller passes the day's extras (`BriefExtras`), so a caller without them gets the
 * brief exactly as before. A section with nothing is left out; a brief with no line and no section is null.
 */
export type BriefSectionId = 'checklist' | 'meals' | 'timers' | 'goals' | 'earning' | 'note' | 'done' | 'streaks' | 'health' | 'tomorrow';
export type BriefSection = {id: BriefSectionId; label: string; text: string};
export type Brief = {due: string | null; win: string | null; focus: string | null; lines: string[]; sections?: BriefSection[]};
export type BriefExtras = {snapshot?: EarnSnapshot | null; earning?: boolean; notes?: boolean};
export const BRIEF_LABEL = 'Made on this device from your records · no AI used';
const fmtLitres = (ml: number) => `${Number((ml / 1000).toFixed(1))} L`;
/** The v2 sections of the morning: Checklist dots, meals planned, timers, goals needing a step, earning, one note. */
function morningSections(env: ToolEnv, extras: BriefExtras): BriefSection[] {
  const out: BriefSection[] = [], add = (id: BriefSectionId, label: string, text: string | null) => { if (text) out.push({id, label, text}); };
  const list = checklistToday(env);
  add('checklist', 'Checklist', list && list.total ? `${list.done} of ${list.total} dots done${list.open.length ? `; next: ${listNames(list.open.slice(0, 3))}` : ''}.${list.healthHidden ? ' Health dots are not shared with ZIGi.' : ''}` : list?.healthHidden ? 'Health dots are not shared with ZIGi.' : null);
  const meals = mealsPlanned(env);
  add('meals', 'Meals planned', meals.length ? `${meals.slice(0, 3).join('; ')}.` : null);
  const timers = timersRunning(env);
  add('timers', 'Running now', timers.length ? `${timers.slice(0, 3).join('; ').replace(/^./, c => c.toUpperCase())}.` : null);
  const goals = goalsNeedingStep(env);
  add('goals', 'Goals with a step this week', goals.length ? `${goals.join('; ')}.` : null);
  if (extras.earning !== false) { const earning = earningSummary(env, extras.snapshot); add('earning', 'Earning', earning ? earning.lines.join(' ') : null); }
  if (extras.notes !== false) add('note', 'From your notes', noteLine(env));
  return out;
}
export function morningBrief(env: ToolEnv, extras?: BriefExtras | null): Brief | null {
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
  if (!extras) return lines.length ? {due, win, focus, lines} : null;
  const sections = morningSections(env, extras);
  return lines.length || sections.length ? {due, win, focus, lines, sections} : null;
}
/**
 * Session AF (L4, P8.2): the Evening Recap, made on this device the same way: what was done today and what stayed open,
 * the streaks today kept, water, steps and meals logged (Health, gated), the Checklist's count, the earning summary, and
 * one for tomorrow (the first dot still open, else the first habit still open). Calm, counts and names only; null when
 * there is nothing to say (an empty /recap then says so in words, never a card).
 */
export function eveningRecap(env: ToolEnv, extras: BriefExtras = {}): Brief | null {
  const today = env.habitDay, sections: BriefSection[] = [], add = (id: BriefSectionId, label: string, text: string | null) => { if (text) sections.push({id, label, text}); };
  const habits = env.areas.habits ? env.habits.habits.filter(h => latestHabitRule(h).state === 'active') : [];
  const done = habits.filter(h => habitDay(h, today, today).status === 'complete'), open = habits.filter(h => { const s = habitDay(h, today, today).status; return s === 'due' || s === 'partial'; });
  add('done', 'Today', done.length || open.length ? `${done.length} ${done.length === 1 ? 'habit' : 'habits'} done${open.length ? `, ${open.length} still open (${listNames(open.map(h => shortName(h.title)))})` : ''}.` : null);
  const kept = done.map(h => ({h, s: habitStats(h, today)})).filter(x => x.s.streakUnit === 'days' && x.s.currentStreak >= 2).sort((a, b) => b.s.currentStreak - a.s.currentStreak || a.h.title.localeCompare(b.h.title)).slice(0, 2);
  add('streaks', 'Streaks kept', kept.length ? `${kept.map(x => `${shortName(x.h.title)}, ${x.s.currentStreak} days in a row`).join('; ')}.` : null);
  if (env.health) {
    const water = waterSummary(env.health, env.healthDay), steps = env.health.activity.filter(a => a.date === env.healthDay).reduce((n, a) => n + (a.steps ?? 0), 0), meals = env.health.diary.filter(e => e.date === env.healthDay).length;
    const bits = [water.entries ? `water ${fmtLitres(water.millilitres)}` : null, steps ? `${steps.toLocaleString('en-US')} steps` : null, meals ? `${meals} ${meals === 1 ? 'food' : 'foods'} logged` : null].filter(Boolean) as string[];
    add('health', 'Health', bits.length ? `${bits.join(' · ').replace(/^./, c => c.toUpperCase())}.` : null);
  }
  const list = checklistToday(env);
  add('checklist', 'Checklist', list && list.total ? `${list.done} of ${list.total} dots done.` : null);
  if (extras.earning !== false) { const earning = earningSummary(env, extras.snapshot); add('earning', 'Earning', earning ? earning.lines.join(' ') : null); }
  const first = list?.open[0] ?? (open[0] ? shortName(open[0].title) : null);
  add('tomorrow', 'One for tomorrow', first ? `${first}.` : null);
  return sections.length ? {due: null, win: null, focus: null, lines: [], sections} : null;
}
/** The words of a brief as plain lines (chat, read aloud): the three lines, then each section as "Label: text". */
export function briefLines(brief: Brief): string[] {
  return [...brief.lines, ...(brief.sections ?? []).map(s => `${s.label}: ${s.text}`)];
}
/** The brief as data for the person's AI ("Say it nicer"), made again under the gates of that path. */
export function briefForAi(brief: Brief): string {
  return `## ZIGi's morning brief (made on this device from the records)\n${briefLines(brief).map(line => `- ${line}`).join('\n')}`;
}
/** The recap as data for the person's AI, the same way. */
export function recapForAi(brief: Brief): string {
  return `## ZIGi's evening recap (made on this device from the records)\n${briefLines(brief).map(line => `- ${line}`).join('\n')}`;
}
/** The brief or the recap as one chat answer made on this device (/brief, /recap, "what's my plan today"). */
export const NOTHING_TO_BRIEF = 'Nothing to brief yet: your records have nothing open or planned for today.', NOTHING_RECORDED = 'Nothing recorded today. Tomorrow starts fresh.';
export function briefChatText(env: ToolEnv | null, when: 'morning' | 'evening', extras: BriefExtras = {}): string {
  if (!env) return 'ZIGi reads nothing on this screen, so there is no brief here.';
  const brief = when === 'morning' ? morningBrief(env, extras) : eveningRecap(env, extras);
  if (!brief) return when === 'morning' ? NOTHING_TO_BRIEF : NOTHING_RECORDED;
  return [when === 'morning' ? 'Your morning brief:' : 'Your evening recap:', ...briefLines(brief).map(line => `• ${line}`), BRIEF_LABEL].join('\n');
}
/** Whether the evening recap's time has come by this device's clock ("HH:MM" from the brief choices). */
export function recapDue(clock: string, eveningTime: string): boolean { return clock >= eveningTime; }
export const SAY_IT_NICER = 'Say my morning brief from the records in a warmer way, in two or three short sentences. Keep every name, number and date exactly as it is, add nothing, and give no advice.';

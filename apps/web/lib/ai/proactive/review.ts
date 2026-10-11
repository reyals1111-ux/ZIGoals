import {habitDay, latestHabitRule} from '../../habits';
import {addLocalDays} from '../../local-date';
import type {ToolEnv} from '../tools/env';
import {runTool, toolText} from '../tools/registry';

/**
 * The weekly review with ZIGi (Session V Part 9): the person's own review week (it ends on their review day) read on
 * this device from the `weekly_review` tool, plus the days without a check-in, stated as plain counts. No guilt words,
 * no grades; a skipped day is neutral. ZIGi writes nothing into the review: an AI reflection is asked for only on the
 * person's click, and the only thing it can propose is the week's intention, as a card the person confirms.
 */
export type LocalReview = {
  from: string; to: string; checkIns: number; contributions: number; busiestDay: string | null;
  habits: {title: string; done: number; scheduled: number; skipped: number}[];
  quietDays: string[]; health: string[] | null; lastIntention: string | null; state: string;
};
const num = (value: unknown) => typeof value === 'number' && Number.isFinite(value) ? value : 0;
/** Days of the review week, up to today, with a habit scheduled and no check-in logged. */
export function quietDays(env: ToolEnv, from: string, to: string): string[] {
  const out: string[] = [], last = to < env.habitDay ? to : env.habitDay;
  const habits = env.habits.habits.filter(h => latestHabitRule(h).state !== 'archived');
  for (let date = from; date <= last; date = addLocalDays(date, 1)) {
    const scheduled = habits.some(h => habitDay(h, date, env.habitDay).scheduled);
    const checkedIn = habits.some(h => h.entries.some(e => e.date === date && e.disposition === 'logged'));
    if (scheduled && !checkedIn) out.push(date);
  }
  return out;
}
export function localReview(env: ToolEnv): LocalReview | null {
  const result = runTool('weekly_review', {}, env);
  if (!result.ok) return null;
  const d = result.data as Record<string, unknown>, range = /(\d{4}-\d{2}-\d{2}) to (\d{4}-\d{2}-\d{2})/.exec(result.provenance);
  if (!range) return null;
  const [, from, to] = range as unknown as [string, string, string];
  const habits = (Array.isArray(d.habits) ? d.habits : []) as {habit: string; done: number; scheduled: number; skipped: number}[];
  return {
    from, to, checkIns: num(d.habitCheckIns), contributions: num(d.goalContributions), busiestDay: typeof d.busiestDay === 'string' && d.busiestDay !== 'none' ? d.busiestDay : null,
    habits: habits.map(h => ({title: h.habit, done: num(h.done), scheduled: num(h.scheduled), skipped: num(h.skipped)})),
    quietDays: env.areas.habits ? quietDays(env, from, to) : [], health: Array.isArray(d.health) ? (d.health as string[]) : null,
    lastIntention: typeof d.lastIntention === 'string' && d.lastIntention !== 'none written' ? d.lastIntention : null, state: String(d.review ?? 'due'),
  };
}
/** What the person's AI receives for a reflection: the same figures, made again under that path's gates. */
export function reviewForAi(env: ToolEnv): string | null {
  const result = runTool('weekly_review', {}, env);
  if (!result.ok) return null;
  const quiet = env.areas.habits ? (() => { const range = /(\d{4}-\d{2}-\d{2}) to (\d{4}-\d{2}-\d{2})/.exec(result.provenance); return range ? quietDays(env, range[1]!, range[2]!) : []; })() : [];
  return `## My review week (figures from ZIGi's tools on this device)\n${toolText(result, env)}${quiet.length ? `\nDays with a habit scheduled and no check-in: ${quiet.join(', ')}` : ''}`;
}
export const REFLECT_ASK = 'Help me reflect on my week from these figures, in a few calm sentences: what went well and one thing that stands out. No advice and no judgement. If I want, I can set an intention for next week; propose one only if I ask.';

import {latestHabitRule, measurementUnit} from '../../habits';
import type {ToolEnv} from '../tools/env';
import {summaries} from '../tools/goals';
import {text as clean} from '../tools/format';

/**
 * "I can answer questions like…" (Session V Part 3): examples made from the person's own records, so each one works
 * when tapped. Health examples appear only while the Health gate is open; with no records yet, plain examples remain.
 */
export const EXAMPLES_INTRO = 'I answer questions about your own records right here, on this device, without any AI. For example:';
const MINUTES = /^(minutes?|mins?|min)$/i;
export function examplesFor(env: ToolEnv | null, max = 6): string[] {
  const out: string[] = [];
  if (env) {
    const habits = env.habits.habits.filter(h => latestHabitRule(h).state === 'active');
    const timed = habits.find(h => { const r = latestHabitRule(h); return r.measurement.kind === 'duration' || MINUTES.test(measurementUnit(r)); });
    const streak = habits.find(h => h !== timed) ?? timed, goal = summaries(env).find(g => g.status === 'active');
    const asset = env.platform.positions.find(p => !p.archivedAt && /^[A-Z]{2,6}$/.test(p.asset) && p.assetClass === 'Crypto')?.asset ?? env.platform.positions.find(p => !p.archivedAt)?.asset;
    // One per area first (habits, goals, Health when it is shared, wealth), then more of each.
    if (timed) out.push(`How many minutes of ${clean(timed.title, 40)} this month?`);
    if (goal) out.push(`How far am I on my ${clean(goal.name, 40)} goal?`);
    if (env.health) out.push('How much water did I drink yesterday?');
    if (asset) out.push(`Total ${clean(asset, 12)} I hold?`);
    if (streak) out.push(`What's my longest ${clean(streak.title, 40)} streak?`);
    if (env.health) out.push('Average steps last week?', 'Did I hit my protein target this week?', 'What did I eat yesterday?');
    if (habits.length) out.push(`How many times did I check in ${clean(habits[0]!.title, 40)} last week?`);
  }
  // With records but no active goal, the goals question is not offered: asked, it answered with this very list (X-Cloud's H10, ADR-017 S71).
  const goalsExist = !env || summaries(env).some(g => g.status === 'active');
  if (out.length < 3) out.push('How many minutes did I meditate this month?', goalsExist ? 'How far am I on my goals?' : 'Which habits are open today?', 'What is my net worth?');
  return [...new Set(out)].slice(0, max);
}

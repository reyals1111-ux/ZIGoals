import {latestHabitRule, measurementUnit} from '../../habits';
import type {ToolEnv} from '../tools/env';
import {summaries} from '../tools/goals';
import {text as clean} from '../tools/format';
import {novaEnvInfo} from './nova-env';
import {novaExampleQuestions} from './nova-overview';

/**
 * "I can answer questions like…" (Session V Part 3): examples made from the person's own records, so each one works
 * when tapped. Health examples appear only while the Health gate is open; with no records yet, plain examples remain.
 */
// Session AK P4 (FIRST_RUN_REVIEW FR-2): never "without any AI" under NOVA's "Private intelligence"; what answers now, and until when.
export const EXAMPLES_INTRO = 'Until you give me a brain, I answer from your own records on this device. For example:';
const MINUTES = /^(minutes?|mins?|min)$/i;
/**
 * Session AV lane 2 (fr-answers; FR-S-5): `lang` 'nl' gives the same examples in Dutch (each one answered on the device
 * in Dutch when tapped), and the net worth example only for someone who keeps money records (Wealth's positions or
 * accounts), so a person with Habits and Health alone is never offered it.
 */
export function examplesFor(env: ToolEnv | null, max = 6, lang: 'en' | 'nl' = 'en'): string[] {
  const out: string[] = [], nl = lang === 'nl', say = (en: string, du: string) => nl ? du : en;
  // Release review 2 (R2-2): on NOVA's environment, the overview questions NOVA answers on the device come first.
  if (env && novaEnvInfo(env)) out.push(...novaExampleQuestions(env, lang));
  if (env) {
    const habits = env.habits.habits.filter(h => latestHabitRule(h).state === 'active');
    const timed = habits.find(h => { const r = latestHabitRule(h); return r.measurement.kind === 'duration' || MINUTES.test(measurementUnit(r)); });
    const streak = habits.find(h => h !== timed) ?? timed, goal = summaries(env).find(g => g.status === 'active');
    const asset = env.platform.positions.find(p => !p.archivedAt && /^[A-Z]{2,6}$/.test(p.asset) && p.assetClass === 'Crypto')?.asset ?? env.platform.positions.find(p => !p.archivedAt)?.asset;
    // One per area first (habits, goals, Health when it is shared, wealth), then more of each.
    // The minutes of a timed habit only in English: the Dutch form is answered by the no-model layer, not by the device's own lookups a tapped example must reach.
    if (timed && !nl) out.push(`How many minutes of ${clean(timed.title, 40)} this month?`);
    if (goal) out.push(say(`How far am I on my ${clean(goal.name, 40)} goal?`, `Hoe ver ben ik met mijn doel ${clean(goal.name, 40)}?`));
    if (env.health) out.push(say('How much water did I drink yesterday?', 'Hoeveel water heb ik gisteren gedronken?'));
    if (asset) out.push(say(`Total ${clean(asset, 12)} I hold?`, `Hoeveel ${clean(asset, 12)} heb ik?`));
    if (streak) out.push(say(`What's my longest ${clean(streak.title, 40)} streak?`, `Wat is mijn langste reeks voor ${clean(streak.title, 40)}?`));
    if (env.health) out.push(...(nl ? ['Hoe heb ik deze week geslapen?', 'Wat heb ik gisteren gegeten?'] : ['Average steps last week?', 'Did I hit my protein target this week?', 'What did I eat yesterday?']));
    if (habits.length) out.push(say(`How many times did I check in ${clean(habits[0]!.title, 40)} last week?`, `Hoe vaak heb ik ${clean(habits[0]!.title, 40)} vorige week gedaan?`));
  }
  // With records but no active goal, the goals question is not offered: asked, it answered with this very list (X-Cloud's H10, ADR-017 S71).
  const goalsExist = !env || summaries(env).some(g => g.status === 'active');
  // Session AL second pass (Lisbon LZ-008, LZ-032; P-LA-32): the meditation example only while Health is shared (with it
  // closed the chip could only be answered "Health isn't shared").
  const money = !env || env.platform.positions.some(p => !p.archivedAt) || (env.accounts?.items.length ?? 0) > 0;
  if (out.length < 3) out.push(...(!env || env.health ? [say('How many minutes did I meditate this month?', 'Hoeveel minuten heb ik deze maand gemediteerd?')] : []), goalsExist ? say('How far am I on my goals?', 'Hoe gaat het met mijn doelen?') : say('Which habits are open today?', 'Welke gewoontes staan vandaag nog open?'), ...(money ? [say('What is my net worth?', 'Wat is mijn vermogen?')] : []));
  return [...new Set(out)].slice(0, max);
}

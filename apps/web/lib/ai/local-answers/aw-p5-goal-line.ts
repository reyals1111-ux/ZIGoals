import {averageProgress} from '../../average-goals/progress';
import {AVERAGE_METRICS, averageKey, type AverageGoal} from '../../average-goals/store';
import {formatNumber} from '../../visual-format';
import type {ToolEnv} from '../tools/env';
import {hm} from './av-words';

/**
 * Session AW (p5-answers, FR-S-13): a goal's figures in a Dutch answer, in Dutch words with the figures written as the
 * answer writes its numbers (nl-NL in a Dutch answer, engine.ts `withNumberLocale`). The goal tools word a goal's figures
 * for the model and the English answers ("7.9 h a night", "at least 8 h a night", "2 milestones"); a Dutch answer read
 * "7,9 h a night van at least 8 h a night". Here:
 * - a goal that keeps an average says its average and its target in Dutch: sleep as hours and minutes ("7 h 55 min per
 *   nacht", as the Dutch sleep answers write it), steps and water a day, the person's own unit as typed (the usual English
 *   unit words the app suggests said in Dutch);
 * - a goal counted in milestones names them in Dutch ("2 van 4 mijlpalen").
 * Unknown stays unknown (null): nothing is filled in.
 */
const NL_UNIT_WORDS: readonly [RegExp, string][] = [
  [/^h a night$/i, 'uur per nacht'], [/^h a day$/i, 'uur per dag'], [/^hours? a day$/i, 'uur per dag'], [/^hours? a night$/i, 'uur per nacht'], [/^h a week$/i, 'uur per week'],
  [/^min(?:utes?)? a day$/i, 'minuten per dag'], [/^min(?:utes?)? a week$/i, 'minuten per week'], [/^steps a day$/i, 'stappen per dag'], [/^mL a day$/i, 'mL per dag'],
  [/^pages a day$/i, 'pagina’s per dag'], [/^times a week$/i, 'keer per week'], [/^times a day$/i, 'keer per dag'], [/^glasses a day$/i, 'glazen per dag'],
];
/** A goal's own unit in a Dutch sentence: the app's suggested English words in Dutch, anything else as the person typed it. */
export function nlUnit(unit: string): string {
  const u = unit.trim();
  for (const [re, nl] of NL_UNIT_WORDS) if (re.test(u)) return nl;
  return u;
}
const figure = (goal: AverageGoal, v: number) => formatNumber(Math.round(v * 10 ** AVERAGE_METRICS[goal.metric].decimals) / 10 ** AVERAGE_METRICS[goal.metric].decimals, {maximumFractionDigits: AVERAGE_METRICS[goal.metric].decimals});
/** One value of an average goal in Dutch: "7 h 55 min per nacht", "8 uur per nacht", "8.000 stappen per dag", "1,9 uur per dag". */
export function averageValueNl(goal: AverageGoal, v: number, {exact = false}: {exact?: boolean} = {}): string {
  if (goal.metric === 'sleep-hours') {
    const minutes = Math.round(v * 60);
    return `${!exact && minutes % 60 === 0 ? `${formatNumber(minutes / 60)} uur` : hm(minutes)} per nacht`;
  }
  const unit = goal.unit ? nlUnit(goal.unit) : '';
  return unit ? `${figure(goal, v)} ${unit}` : figure(goal, v);
}
/** "minstens 8 uur per nacht", "hooguit 2 uur per dag". */
export const averageTargetNl = (goal: AverageGoal): string => `${goal.direction === 'at-least' ? 'minstens' : 'hooguit'} ${averageValueNl(goal, goal.target)}`;
/**
 * The Dutch figures of a goal that keeps an average, as the goals list writes them after its share:
 * "gemiddeld 7 h 55 min per nacht van minstens 8 uur per nacht". The average is unknown while no day in the window has a
 * value, or while Health (where its days come from) is not shared here: then only the target is said.
 */
export function averageFiguresNl(goal: AverageGoal, env: ToolEnv): string {
  const target = averageTargetNl(goal), fromHealth = AVERAGE_METRICS[goal.metric].source === 'health';
  if (fromHealth && !env.health) return `doel ${target}; het gemiddelde is hier onbekend (de dagen komen uit Health, dat hier niet gedeeld wordt)`;
  const p = averageProgress(goal, env.health ?? undefined, env.habitDay);
  if (p.average === null) return `doel ${target}; nog geen dag met een waarde, dus onbekend`;
  return `gemiddeld ${averageValueNl(goal, p.average, {exact: true})} van ${target}`;
}
/** The average goal a goals-list row is (by the row's handle, as the tool gave it), or null for any other goal. */
export function averageGoalOf(env: ToolEnv, row: {handle?: unknown; type?: unknown}): AverageGoal | null {
  if (row.type !== 'Keep an average' || typeof row.handle !== 'string') return null;
  const found = env.handles.find(row.handle, 'goal');
  return found ? (env.averageGoals ?? []).find(g => averageKey(g.id) === found.id) ?? null : null;
}
/** A goal's own count unit in Dutch ("2 milestones" → "2 mijlpalen"); money and other units as they are. */
export const nlCountUnit = (text: string): string => text.replace(/^(\S+) milestones$/, '$1 mijlpalen').replace(/^(\S+) milestone$/, '$1 mijlpaal');

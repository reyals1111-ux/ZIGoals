import {addLocalDays} from './local-date';
import {universeCounts, type UniverseInput, type UniversePillar} from './universe/model';

/**
 * Session AJ (item 29; owner decision D10): the Life Score, 0–100, opt-in, on My Universe (and on Today only as a For-you
 * card when the person turned it on). Made on every read from the same counts as My Universe (lib/universe/model.ts),
 * over the last two weeks, never from the game layer:
 * - Habits: habit days done out of those that were due and ended (a skip is neither);
 * - Health: the days with any Health log (a meal, water, a walk, a weight, a night, a meditation, a fast) out of 14;
 * - Goals: the two weeks in which a goal moved (a contribution, a milestone or its status), 0, 1 or 2 of 2;
 * - Wealth: the two weeks with a contribution or an asset brought up to date, 0, 1 or 2 of 2.
 * A pillar the person keeps no records for is left out, never counted as zero; the score is the plain average of the
 * pillars that have records. Its words are kind and never compare the person with anyone.
 */
export const LIFE_SCORE_DAYS = 14;
export type PillarScore = {pillar: UniversePillar; score: number; why: string};
export type LifeScore = {score: number; pillars: PillarScore[]; left: UniversePillar[]; words: string};
const pct = (n: number) => Math.round(Math.max(0, Math.min(1, n)) * 100);
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

export function lifeScore(input: UniverseInput): LifeScore | null {
  const today = input.today, start = addLocalDays(today, -LIFE_SCORE_DAYS);
  const now = universeCounts(input, today), before = universeCounts(input, start);
  const days = Array.from({length: LIFE_SCORE_DAYS}, (_, i) => addLocalDays(start, i + 1));
  const daily = days.map(d => universeCounts(input, d));
  const weekHas = (pick: (c: ReturnType<typeof universeCounts>) => boolean) => [daily.slice(0, 7), daily.slice(7)].filter(w => w.some(pick)).length;
  const pillars: PillarScore[] = [], left: UniversePillar[] = [];

  const done = now.checkIns - before.checkIns, missed = now.misses - before.misses;
  if (done + missed > 0) pillars.push({pillar: 'habits', score: pct(done / (done + missed)), why: `${plural(done, 'habit day')} done and ${plural(missed, 'missed', 'missed')} in the last 14 days.`});
  else left.push('habits');

  const healthDays = now.healthDays - before.healthDays;
  if (now.healthEver) pillars.push({pillar: 'health', score: pct(healthDays / LIFE_SCORE_DAYS), why: `${plural(healthDays, 'day')} with a Health log out of the last 14.`});
  else left.push('health');

  if (now.goalsAny) { const weeks = weekHas(c => c.goalMovedToday); pillars.push({pillar: 'goals', score: pct(weeks / 2), why: `A goal moved in ${weeks} of the last 2 weeks (a contribution, a milestone or its status).`}); }
  else left.push('goals');

  if (now.wealthAny) { const weeks = weekHas(c => c.wealthToday); pillars.push({pillar: 'wealth', score: pct(weeks / 2), why: `${weeks} of the last 2 weeks had a contribution or an asset brought up to date.`}); }
  else left.push('wealth');

  if (!pillars.length) return null;
  const score = Math.round(pillars.reduce((t, p) => t + p.score, 0) / pillars.length);
  return {score, pillars, left, words: lifeScoreWords(score)};
}
/** Kind words for a score; never a judgement, never a comparison. */
export function lifeScoreWords(score: number): string {
  if (score >= 75) return 'Lots of care across your life lately.';
  if (score >= 50) return 'A steady rhythm. Keep going at your own pace.';
  if (score >= 25) return 'A quieter stretch. Every small step counts.';
  return 'A fresh start is always open. One small step is enough.';
}

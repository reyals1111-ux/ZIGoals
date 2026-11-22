import {consistency, dailySeries, sleepDebt, wakeConsistency} from '../sleep/engine';
import type {Sleep} from '../sleep/schema';
import {addLocalDays} from '../local-date';

/**
 * N10: a transparent sleep score out of 100 for the last seven nights, with the formula on the card. Nights without a log
 * are left out (never zeros); with fewer than three nights there is no score, only the count.
 *
 * Session AV (owner follow-up 1, F-SLEEP-SCORE; Sleep Cycle's score of routine, quality and duration, deliberate): four
 * parts — duration 40 · min(1, asleep ÷ goal); regularity 30 · (1 − spread ÷ 90 min), the spread being the average of the
 * bedtime and the wake-time spreads (either alone when only one is known); debt 15 · (1 − debt ÷ two nights of goal);
 * quality 15 · (average rating − 1) ÷ 4 from the nights rated 1–5. With no night rated, quality is left out (unknown is
 * not zero) and the other three are scaled to 100; the card says so.
 * Session AV (q3 #27): an unknown regularity or debt is left out the same way (it earned a silent 15 of 30 and 7.5 of
 * 15); `left` names every part left out, and the known parts are scaled to 100. `scaled` keeps its meaning (no night
 * rated). `weeksBefore` gives the score of the three weeks before, for the card's trend.
 */
export type SleepScore = {score: number | null; nights: number;
  duration: {points: number; averageMinutes: number | null; goalMinutes: number; /** The person's own goal (true), or the 8 h reference used while none is set. */ goalSet: boolean};
  consistency: {points: number; spreadMinutes: number | null; bedSpread: number | null; wakeSpread: number | null};
  debt: {points: number; minutes: number | null};
  quality: {points: number | null; average: number | null; rated: number};
  /** True when no night was rated, so the other parts count for 100. */ scaled: boolean;
  /** Session AV (q3 #27): the parts left out because they are unknown (their points then read 0); the rest count for 100. */ left: ('regularity' | 'debt' | 'quality')[];
  formula: string};
export const SLEEP_REFERENCE_MINUTES = 480;
export const SLEEP_SCORE_FORMULA = 'duration 40 × min(1, asleep ÷ goal) + regularity 30 × (1 − bedtime and wake-time spread ÷ 90 min) + debt 15 × (1 − debt ÷ two nights of goal) + quality 15 × (rating − 1) ÷ 4';
export function sleepScore(s: Sleep, today: string): SleepScore {
  // Session AL (PR-022, P-PR-25): the sleep goal has ONE home, Health → Sleep (`sleep.goal`); every page reads it there.
  // Without one, the score uses an 8 h reference and says so (the card no longer calls it "your goal").
  const goal = s.goal?.minutes ?? SLEEP_REFERENCE_MINUTES, goalSet = s.goal !== undefined && s.goal !== null;
  const points = dailySeries(s, today, 7).filter(p => p.asleep !== null);
  const nights = points.length;
  const rated = points.filter(p => p.quality !== null);
  if (nights < 3) return {score: null, nights, duration: {points: 0, averageMinutes: null, goalMinutes: goal, goalSet}, consistency: {points: 0, spreadMinutes: null, bedSpread: null, wakeSpread: null}, debt: {points: 0, minutes: null}, quality: {points: null, average: null, rated: rated.length}, scaled: false, left: [], formula: SLEEP_SCORE_FORMULA};
  const average = points.reduce((a, p) => a + p.asleep!, 0) / nights;
  const durationPoints = 40 * Math.min(1, average / goal);
  const bed = consistency(s, today)?.minutes ?? null, wake = wakeConsistency(s, today)?.minutes ?? null;
  const spreads = [bed, wake].filter((x): x is number => x !== null), spread = spreads.length ? Math.round(spreads.reduce((a, b) => a + b, 0) / spreads.length) : null;
  const regularityPoints = spread === null ? 0 : 30 * Math.max(0, 1 - spread / 90);
  const d = sleepDebt(s, today), debtMinutes = d?.minutes ?? null;
  const debtPoints = debtMinutes === null ? 0 : 15 * Math.max(0, 1 - Math.max(0, debtMinutes) / (goal * 2));
  const qualityAverage = rated.length ? rated.reduce((a, p) => a + p.quality!, 0) / rated.length : null;
  const qualityPoints = qualityAverage === null ? null : 15 * (qualityAverage - 1) / 4;
  const left = [...(spread === null ? ['regularity' as const] : []), ...(debtMinutes === null ? ['debt' as const] : []), ...(qualityPoints === null ? ['quality' as const] : [])];
  const max = 40 + (spread === null ? 0 : 30) + (debtMinutes === null ? 0 : 15) + (qualityPoints === null ? 0 : 15);
  const score = (durationPoints + regularityPoints + debtPoints + (qualityPoints ?? 0)) * 100 / max;
  return {score: Math.min(100, Math.round(score)), nights,
    duration: {points: Math.round(durationPoints), averageMinutes: Math.round(average), goalMinutes: goal, goalSet},
    consistency: {points: Math.round(regularityPoints), spreadMinutes: spread, bedSpread: bed, wakeSpread: wake},
    debt: {points: Math.round(debtPoints), minutes: debtMinutes},
    quality: {points: qualityPoints === null ? null : Math.round(qualityPoints), average: qualityAverage === null ? null : Math.round(qualityAverage * 10) / 10, rated: rated.length},
    scaled: qualityPoints === null, left, formula: SLEEP_SCORE_FORMULA};
}
/** Session AV (q3 #27; Sleep Cycle keeps each score's history): the scores of the three weeks before this one, oldest first (null: too few nights). */
export function weeksBefore(s: Sleep, today: string, weeks = 3): {end: string; score: number | null}[] {
  return Array.from({length: weeks}, (_, i) => { const end = addLocalDays(today, -7 * (weeks - i)); return {end, score: sleepScore(s, end).score}; });
}

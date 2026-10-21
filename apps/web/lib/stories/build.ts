import type {LifeReview, EnginePeriod} from '../life-review/engine';
import type {Platform} from '../positions';
import {formatDate, formatNumber} from '../visual-format';
import {STORY_MIN_DAYS, bestDay, factsByDay, pillarDays, type DayFacts, type HealthKind, type StoryPillar, type StoryRecords} from './days';

/**
 * Stories (Session AF, L5b; P9.3, ADR-028 H55, H78): a tap-through recap of the week, the month or the year, built on the
 * Life review's own engine (lib/life-review/engine.ts; the Life review page stays as it is). Cards in a fixed priority
 * (R7, Strava's Month in Sport): the opener with the person's "style" — their own strongest pillar, never a comparison
 * with anyone — then the streaks, the best day, the goals that moved, Health beside the period before, money working,
 * the wins and a closing card. A card with nothing true to say is left out. Counts and quantities only: no amount of
 * money, no price, rate or return — every line passes `shareSafe`, so a card on screen and its share image say the
 * same. Fewer than three logged days in the window make one honest card instead of a thin story.
 */
export type StoryCardId = 'opener' | 'streaks' | 'best-day' | 'goals-moved' | 'health-trend' | 'money-working' | 'wins' | 'closing' | 'not-enough';
export type StoryCard = {id: StoryCardId; pillar: StoryPillar | null; eyebrow: string; title: string; big?: string; lines: string[]};
export type StoryStyle = {pillar: StoryPillar; label: string; line: string};
export type Story = {period: EnginePeriod; key: string; loggedDays: number; enough: boolean; style: StoryStyle | null; cards: StoryCard[]};

/** Words that never go on a story card or its image: money signs, percentages and the words for prices, rates and returns. */
const UNSAFE = /[$€£¥₿%]|\bput in\b|\b(price|prices|rate|rates|return|returns|apr|apy|yield|interest|profit|gain|gains|loss|balance|worth)\b/i;
export const shareSafe = (line: string) => !UNSAFE.test(line);
const safe = (lines: readonly (string | null | undefined | false)[]) => lines.filter((l): l is string => !!l && shareSafe(l));
const plural = (n: number, one: string, many = `${one}s`) => `${formatNumber(n)} ${n === 1 ? one : many}`;
const PERIOD_WORD: Record<EnginePeriod, string> = {week: 'week', month: 'month', year: 'year'};
const ROLLS: Record<EnginePeriod, string> = {
  week: 'This story follows the last seven days and changes tomorrow. Share a card to keep it.',
  month: 'This story grows until the month ends, then a new one begins. Share a card to keep it.',
  year: 'This story grows until the year ends. Share a card to keep it.',
};
export const STYLES: Record<StoryPillar, {label: string; word: string}> = {
  habits: {label: 'Rhythm keeper', word: 'check-ins'}, health: {label: 'Body listener', word: 'Health logs'},
  goals: {label: 'Goal mover', word: 'goal steps'}, wealth: {label: 'Steady contributor', word: 'contributions'},
};
const KIND_WORD: Record<HealthKind, string> = {water: 'water', meals: 'meals', activity: 'a walk or workout', weight: 'a weight', sleep: 'a night', meditation: 'a meditation'};
const kindsLine = (kinds: ReadonlySet<HealthKind>) => { const w = [...kinds].map(k => KIND_WORD[k]); if (!w.length) return null; const text = `${w.length > 1 ? `${w.slice(0, -1).join(', ')} and ${w.at(-1)}` : w[0]} logged`; return `${text[0]!.toUpperCase()}${text.slice(1)}`; };
const dayLines = (f: DayFacts) => safe([f.habitsDone ? `${plural(f.habitsDone, 'habit')} done` : null, kindsLine(f.health), f.contributions ? plural(f.contributions, 'contribution') : null, f.goalSteps ? plural(f.goalSteps, 'goal step') : null]);

/** The person's own strongest pillar in the window (most active days; ties in the order Habits, Health, Goals, Wealth). */
export function storyStyle(days: Record<StoryPillar, number>, period: EnginePeriod): StoryStyle | null {
  const order: StoryPillar[] = ['habits', 'health', 'goals', 'wealth'];
  const top = order.reduce<StoryPillar | null>((best, p) => days[p] > 0 && (!best || days[p] > days[best]) ? p : best, null);
  return top ? {pillar: top, label: STYLES[top].label, line: `${STYLES[top].word[0]!.toUpperCase()}${STYLES[top].word.slice(1)} led your ${PERIOD_WORD[period]}: ${plural(days[top], 'day')} with them.`} : null;
}

export function buildStory({review, records, platform, rangeLabel}: {review: LifeReview; records: StoryRecords; platform: Platform; rangeLabel: string}): Story {
  const {window} = review, period = window.period, word = PERIOD_WORD[period];
  const facts = factsByDay(records, window.start, window.end), logged = facts.size;
  const eyebrow = `My ${word} · ${rangeLabel}`;
  if (logged < STORY_MIN_DAYS) {
    return {period, key: window.key, loggedDays: logged, enough: false, style: null, cards: [{id: 'not-enough', pillar: null, eyebrow, title: 'Not enough days yet', lines: [`Three logged days make a story. This ${word} has ${plural(logged, 'day')} so far.`, 'Check in a habit, log a day of Health or move a goal, and your story starts.']}]};
  }
  const days = pillarDays(facts), style = storyStyle(days, period), cards: StoryCard[] = [];
  cards.push({id: 'opener', pillar: style?.pillar ?? null, eyebrow, title: `Your ${word} in ${plural(logged, 'logged day')}`, big: formatNumber(logged), lines: safe([style ? `Your style this ${word}: ${style.label}.` : null, style?.line])});
  const [top, ...rest] = review.streaks;
  if (top) cards.push({id: 'streaks', pillar: 'habits', eyebrow: 'Streaks', title: top.title, big: formatNumber(top.streak), lines: safe([`${plural(top.streak, top.unit.replace(/s$/, ''))} in a row, still going.`, ...rest.map(s => `${s.title}: ${plural(s.streak, s.unit.replace(/s$/, ''))} in a row`)])});
  const best = bestDay(facts);
  if (best) cards.push({id: 'best-day', pillar: best.facts.habitsDone >= best.facts.health.size ? 'habits' : 'health', eyebrow: 'Best day', title: formatDate(best.day, {weekday: true, year: period === 'year' ? undefined : false}), lines: dayLines(best.facts)});
  // Goals that moved: contributions (as a count) and goal steps per goal, and the goals finished.
  const moved: string[] = [];
  for (const goal of platform.goals) {
    const inWindow = (iso: string) => iso.slice(0, 10) >= window.start && iso.slice(0, 10) <= window.end;
    const c = platform.contributions.filter(x => x.goalId === goal.id && x.direction === 'IN' && !x.reversesId && inWindow(x.occurredAt)).length;
    const steps = platform.goalHistory.filter(h => h.goalId === goal.id && (h.kind === 'milestone' || h.kind === 'status') && inWindow(h.capturedAt)).length;
    if (c || steps) moved.push(`${goal.name}: ${[c ? plural(c, 'contribution') : null, steps ? plural(steps, 'step') : null].filter(Boolean).join(', ')}`);
  }
  const finished = review.wins.filter(w => w.startsWith('Finished '));
  const goalLines = safe([...finished.map(w => `${w}.`), ...moved]);
  if (goalLines.length) cards.push({id: 'goals-moved', pillar: 'goals', eyebrow: 'Goals', title: finished.length ? `${plural(finished.length, 'goal')} reached` : `${plural(moved.length, 'goal')} moved`, lines: goalLines.slice(0, 5)});
  const health = safe(review.health.filter(t => t.now !== null).map(t => `${t.label}: ${t.now}${t.before ? ` (the ${word} before: ${t.before})` : ''}`));
  if (health.length) cards.push({id: 'health-trend', pillar: 'health', eyebrow: 'Health', title: `Your ${word}’s Health, beside the one before`, lines: health});
  const tracked = platform.positions.filter(p => !p.archivedAt).length, staked = platform.positions.filter(p => !p.archivedAt && (p.liquidity === 'BONDED' || !!p.validator)).length;
  const contributions = review.counts.contributions;
  if (contributions || tracked) cards.push({id: 'money-working', pillar: 'wealth', eyebrow: 'Money working', title: contributions ? `${plural(contributions, 'contribution')} to your goals` : `${plural(tracked, 'account')} tracked`, big: contributions ? formatNumber(contributions) : undefined, lines: safe([contributions && tracked ? `${plural(tracked, 'account')} tracked` : null, staked ? `${plural(staked, 'stake')} tracked: money working on its own` : null, 'Counts only: no amounts, prices or returns.'])});
  const wins = safe(review.wins.filter(w => !w.startsWith('Finished ')));
  if (wins.length) cards.push({id: 'wins', pillar: style?.pillar ?? null, eyebrow: 'Wins', title: plural(wins.length, 'win'), lines: wins.slice(0, 5)});
  cards.push({id: 'closing', pillar: style?.pillar ?? null, eyebrow, title: `That was your ${word}.`, lines: safe([[review.counts.habitCheckIns ? plural(review.counts.habitCheckIns, 'habit check-in') : null, review.counts.healthDays ? `${plural(review.counts.healthDays, 'day')} with Health logs` : null].filter(Boolean).join(' · ') || null, ROLLS[period]])});
  return {period, key: window.key, loggedDays: logged, enough: true, style, cards};
}

import type {ShareCard} from '../share-image';
import type {Habit} from '../habits';
import {habitStats} from '../habits';
import {habitShareCard} from '../habits-share';
import type {LifeReview} from '../life-review/engine';
import {formatNumber} from '../visual-format';
import {progressShareCard, type ProgressCardInput} from '../../components/goals/progress-card-content';

/**
 * Session AK Part 8.5: one share-card system. Every card kind is described here as words (pure), and one canvas renderer
 * draws them all (lib/share-cards/render.ts → lib/share-image.ts `drawShareCard`, 1080 × 1350, nothing uploaded).
 * - Sensitive numbers — amounts of money, weight, sleep, steps and other Health values — are OFF by default; a card
 *   carries them only when the person ticks "Include numbers" (`sensitive: true`). `hasSensitive` says whether there is
 *   anything for that box to add, so the box can be left out when it would do nothing.
 * - A card made from the Showcase is labelled "Example" in its eyebrow and footer, so a fictional record never passes for
 *   a person's own.
 * Kinds: a goal's progress (wraps components/goals/progress-card-content.ts, the words the goal page's card already uses),
 * a habit's streak and strength (wraps lib/habits-share.ts), and the week or month review (from lib/life-review).
 */
export type ShareKind = 'goal-progress' | 'habit-streak' | 'week-review';
export type ShareOptions = {sensitive?: boolean; example?: boolean};
export type ShareCardSpec = ShareCard & {kind: ShareKind; hasSensitive: boolean; fileName: string; example: boolean};

export const FOOTER = 'Made on this device with ZIGoals', EXAMPLE_FOOTER = 'Example data · the ZIGoals Showcase';
const slug = (text: string) => text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40);
/** The Showcase label on the card itself, so an image saved from the demo says what it is. */
function finish(kind: ShareKind, card: ShareCard, hasSensitive: boolean, name: string, example: boolean): ShareCardSpec {
  const lines = card.lines.length ? card.lines : ['Just getting started.'];
  return {...card, kind, lines, hasSensitive, example, eyebrow: example ? `Example · ${card.eyebrow}` : card.eyebrow, footer: example ? EXAMPLE_FOOTER : FOOTER, fileName: `zigoals-${example ? 'example-' : ''}${kind}-${slug(name) || 'card'}.png`};
}

/** A goal's progress: the percentage always; amounts only with sensitive numbers on. */
export function goalProgressCard(goal: ProgressCardInput, {sensitive = false, example = false}: ShareOptions = {}): ShareCardSpec {
  const card = progressShareCard(goal, {showAmounts: sensitive, showDate: false});
  const hasSensitive = progressShareCard(goal, {showAmounts: true}).lines.length > progressShareCard(goal).lines.length;
  return finish('goal-progress', card, hasSensitive, goal.title, example);
}

/** A habit's streak and strength: counts and a percentage of its own scheduled days; never a note, a mood or a Health figure. */
export function habitStreakCard(habit: Habit, today: string, {example = false}: ShareOptions = {}): ShareCardSpec {
  const base = habitShareCard(habit, today), s = habitStats(habit, today), lines = [...base.lines.filter(l => l !== 'Just getting started.')];
  if (s.successCount + s.failCount > 0) lines.push(`Strength: done on ${formatNumber(s.completionPercentage)}% of its scheduled days`);
  return finish('habit-streak', {...base, lines}, false, habit.title, example);
}

/**
 * The week or month review: check-ins, days with a Health record, contributions (as counts), the longest streak and the
 * wins that hold no figure. With sensitive numbers on: sleep and steps averages and each goal's recorded amount.
 */
export function weekReviewCard(review: Pick<LifeReview, 'counts' | 'streaks' | 'wins' | 'health' | 'goalsMoved' | 'window'>, range: string, {sensitive = false, example = false}: ShareOptions = {}): ShareCardSpec {
  const period = review.window.period === 'month' ? 'month' : 'week';
  const days = Math.round((Date.parse(`${review.window.end}T12:00:00Z`) - Date.parse(`${review.window.start}T12:00:00Z`)) / 86_400_000) + 1;
  const safe: string[] = [], numbers: string[] = [];
  const {habitCheckIns, healthDays, contributions} = review.counts;
  if (habitCheckIns) safe.push(`${formatNumber(habitCheckIns)} habit ${habitCheckIns === 1 ? 'check-in' : 'check-ins'}`);
  if (healthDays) safe.push(`Health records on ${formatNumber(healthDays)} of ${formatNumber(days)} days`);
  if (contributions) safe.push(`${formatNumber(contributions)} goal ${contributions === 1 ? 'contribution' : 'contributions'}`);
  const top = review.streaks[0];
  if (top) safe.push(`Longest streak: ${top.title}, ${formatNumber(top.streak)} ${top.unit}`);
  // A win with a figure in it (an average goal "on target, 7.5 h on average") is a Health value: sensitive.
  for (const w of review.wins) (/on target|on average|\d/.test(w) ? numbers : safe).push(w);
  for (const t of review.health) if (t.now && (t.label === 'Sleep a night' || t.label === 'Steps a day')) numbers.push(`${t.label === 'Sleep a night' ? 'Sleep' : 'Steps'}: ${t.now} ${t.label === 'Sleep a night' ? 'a night' : 'a day'} on average`);
  for (const g of review.goalsMoved) if (/put in|\d/.test(g.line)) numbers.push(`${g.name}: ${g.line}`);
  const lines = [...safe, ...(sensitive ? numbers : [])].slice(0, 6);
  return finish('week-review', {eyebrow: `Life review · ${range}`, title: period === 'week' ? 'My week' : 'My month', lines: lines.length ? lines : ['A quiet stretch, and that is fine.']}, numbers.length > 0, `${period}-${review.window.start}`, example);
}

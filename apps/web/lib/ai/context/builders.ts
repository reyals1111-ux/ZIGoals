import type {GoalMetadata} from '@zigoals/shared-types';
import {habitDay as habitDayOf, habitStats, latestHabitRule, measurementUnit, scheduleLabel, type Habit, type HabitData} from '../../habits';
import {createEmptyHealth, dailyHealthSummary, nutritionSummaryText, scaleNutrition, type HealthData} from '../../health';
import {dailyData, waterSummary} from '../../health-daily';
import {countOn, exerciseData} from '../../health-counters';
import {elapsedMs, fastingHistory, formatFast, runningSession} from '../../fasting/engine';
import type {Fasting} from '../../fasting/schema';
import type {Platform} from '../../positions';
import {progressText, unifiedGoalSummaries} from '../../goal-summary';
import type {LocalGoal} from '../../local-ledger';
import type {MarketQuote} from '../../market-quotes';
import {wealthOverview} from '../../wealth';
import type {Portfolio, PortfolioData} from '../../portfolio/schema';
import {portfolioTotals, validHistory} from '../../portfolio/math';
import type {PageArea} from '../settings';
import {estimateTokens} from './budget';
import type {Consent} from './consent';
import {wealthView} from './pages';
import {reviewState, weekSummary} from '../../weekly-review/engine';
import type {WeeklyReview} from '../../weekly-review/schema';
import {escapeData} from './specialists';
import {Handles} from '../handles';
export {resolveHandle} from '../handles';
import type {PageContext} from './types';

/**
 * The page context builders (ADR-012, Part 4): short summaries of the person's own records, computed by the app's
 * existing engines, written as plain text the AI reads as data. Rules: records carry short per-reply handles (h1, g2,
 * f3, r1) and never their identifiers; no email, account, wallet address, network, denomination, transaction hash,
 * sync or recovery data ever appears; every value the app does not know is written "unknown", never 0; one total per
 * currency, never converted; Portfolio is labelled Real or Hypothetical and kept apart from Wealth; the person's own
 * words (titles, notes, food names) are escaped so they can never close the data block. Health lines need the Health
 * consent on every page, Today included.
 */
export type BuilderInput = {
  area: PageArea; pathname: string; consent: Consent;
  now: Date; habitDay: string; healthDay: string;
  habits: HabitData; health: HealthData; fasting: Fasting | null;
  platform: Platform; localGoals: readonly LocalGoal[]; metadata: Record<string, GoalMetadata>; quotes: readonly MarketQuote[];
  /** A coin's price in the given currency (the portfolio's own; Session V Part 4 fix: never another currency's price). */
  portfolio: {data: PortfolioData; priceOf: (coin: string, currency: string) => string | undefined} | null;
  /** The weekly review's window and record, for Today's "This week" counts (follow-up part F); absent means no week section. */
  week?: {weekStart: string; weekEnd: string; review: WeeklyReview} | null;
};
const LIMITS = {habits: 60, goals: 40, diary: 40, foods: 40, recipes: 20, positions: 60, portfolios: 20, chars: 24_000};
const clean = (text: string, max = 120) => escapeData(text.replace(/\s+/g, ' ').trim()).slice(0, max);
const num = (value: number, digits = 1) => Number.isFinite(value) ? value.toFixed(digits).replace(/\.0+$/, '') : 'unknown';
/** A base-unit integer string with `decimals` as plain decimal text (no locale). */
export function unitsText(quantity: string, decimals: number): string {
  if (!/^\d+$/.test(quantity)) return 'unknown';
  const padded = quantity.padStart(decimals + 1, '0'), whole = padded.slice(0, padded.length - decimals) || '0', fraction = padded.slice(padded.length - decimals).replace(/0+$/, '');
  return fraction ? `${whole}.${fraction}` : whole;
}
/** Money kept at two decimals as a bigint. */
export const moneyText = (value: bigint) => { const negative = value < 0n, v = negative ? -value : value; return `${negative ? '-' : ''}${v / 100n}.${String(v % 100n).padStart(2, '0')}`; };
const kgText = (grams: number) => `${num(grams / 1000)} kg`, lbText = (grams: number) => `${num(grams / 453.59237)} lb`;
const weightText = (grams: number, unit: 'kg' | 'lb') => unit === 'lb' ? lbText(grams) : kgText(grams);

type Section = {title: string; lines: string[]};

function habitsSection(input: BuilderInput, handles: Handles, onlyDue: boolean): Section {
  const active = input.habits.habits.filter(h => latestHabitRule(h).state === 'active');
  const lines: string[] = [];
  for (const habit of active.slice(0, LIMITS.habits)) {
    const day = habitDayOf(habit, input.habitDay, input.habitDay), rule = latestHabitRule(habit);
    if (onlyDue && !['due', 'partial'].includes(day.status)) continue;
    const stats = habitStats(habit, input.habitDay), unit = measurementUnit(rule);
    const handle = handles.add('habit', habit.id, habit.title);
    // A check-in filled in from Health carries a Health value (steps, minutes…): it goes only with the Health gate open.
    const fromHealth = habit.entries.find(e => e.date === input.habitDay)?.source === 'health';
    const logged = !day.count ? '' : fromHealth && !input.consent.health ? ' (value from Health, not shared)' : ` (${day.count}${unit ? ' ' + unit : ''} logged)`;
    lines.push(`${handle}: ${clean(habit.title)} · ${rule.type} · ${scheduleLabel(rule.schedule)} · target ${rule.target}${unit ? ' ' + unit : ''} per ${rule.targetPeriod} · today: ${day.status}${logged} · streak ${stats.currentStreak} ${stats.streakUnit} · ${habit.timeOfDay}`);
  }
  if (active.length > LIMITS.habits) lines.push(`(${active.length - LIMITS.habits} more habits not listed)`);
  if (!lines.length) lines.push(onlyDue ? 'No habit is open right now.' : 'No active habits yet.');
  return {title: onlyDue ? 'Habits open today' : 'Habits', lines};
}
function goalsSection(input: BuilderInput, handles: Handles, brief: boolean): Section {
  const summaries = unifiedGoalSummaries(input.localGoals, input.metadata, input.platform, input.quotes, input.now.getTime());
  const active = summaries.filter(g => g.status === 'active'), rest = summaries.filter(g => g.status !== 'active');
  const lines: string[] = [];
  for (const goal of [...active, ...rest].slice(0, LIMITS.goals)) {
    const handle = handles.add('goal', goal.key, goal.name);
    const progress = progressText(goal.progressPct, goal.progressBound);
    lines.push(brief ? `${handle}: ${clean(goal.name)} · ${goal.status} · progress ${progress}${goal.nextContributionDate ? ` · next planned date ${goal.nextContributionDate}` : ''}`
      : `${handle}: ${clean(goal.name)} · ${goal.type} · ${goal.status} · progress ${progress} · now ${goal.current} ${goal.currency}${goal.target ? ` of ${goal.target} ${goal.currency}` : ''}${goal.remaining ? ` · remaining ${goal.remaining} ${goal.currency}` : ''} · target date ${goal.targetDate ?? 'none'} · next planned date ${goal.nextContributionDate ?? 'none'} · funding: ${goal.fundingHealth.replaceAll('_', ' ').toLowerCase()}${goal.requiresReview ? ' · needs review' : ''}`);
  }
  if (summaries.length > LIMITS.goals) lines.push(`(${summaries.length - LIMITS.goals} more goals not listed)`);
  if (!lines.length) lines.push('No goals yet.');
  return {title: 'Goals', lines};
}
function healthSection(input: BuilderInput, handles: Handles, full: boolean): Section {
  const {health, healthDay} = input, prefs = dailyData(health).preferences, lines: string[] = [];
  const summary = dailyHealthSummary(health, healthDay), water = waterSummary(health, healthDay);
  lines.push(`Diary ${healthDay}: ${summary.entries} entries · energy ${nutritionSummaryText(summary, 'kcal', 'kcal')} · protein ${nutritionSummaryText(summary, 'proteinMg', 'g', 1000)} · carbs ${nutritionSummaryText(summary, 'carbsMg', 'g', 1000)} · fat ${nutritionSummaryText(summary, 'fatMg', 'g', 1000)}`);
  lines.push(`Water ${healthDay}: ${num(water.millilitres, 0)} mL in ${water.entries} entries${water.targetMl ? ` · daily target ${water.targetMl} mL` : ' · no target set'}${prefs.waterUnit === 'fl-oz-us' ? ' · shown in US fl oz in the app' : ''}`);
  lines.push(`Steps ${healthDay}: ${summary.steps} · active minutes ${summary.minutes}`);
  const latestWeight = [...health.weights].sort((a, b) => b.date.localeCompare(a.date))[0];
  lines.push(latestWeight ? `Latest weight: ${weightText(latestWeight.grams, prefs.weightUnit)} on ${latestWeight.date} (unit preference ${prefs.weightUnit})` : `No weight recorded yet (unit preference ${prefs.weightUnit})`);
  if (full) {
    const entries = health.diary.filter(e => e.date === healthDay).slice(0, LIMITS.diary);
    for (const e of entries) { const kcal = scaleNutrition(e.snapshot.nutrients, e.quantityMilli).kcal; lines.push(`  ${e.meal}: ${clean(e.snapshot.name)} × ${num(e.quantityMilli / 1000, 2)} servings · ${kcal === null ? 'kcal unknown' : `${kcal} kcal`}`); }
    const latestByKind = new Map<string, {value: string; at: string}>();
    for (const m of [...(health.measurements ?? [])].sort((a, b) => a.observedAt.localeCompare(b.observedAt))) latestByKind.set(m.kind, {value: `${num(m.quantityMilli / 1000, 1)} ${m.unit}`, at: m.observedAt.slice(0, 10)});
    for (const [kind, latest] of latestByKind) if (kind !== 'weight') lines.push(`Latest ${kind}: ${latest.value} on ${latest.at}`);
    const exercise = exerciseData(health), counts = exercise.counters.map(c => { const n = countOn(health, c.id, healthDay); return `${clean(c.name, 40)} ${n === null ? 'none today' : n}`; });
    if (counts.length) lines.push(`Exercise counters today: ${counts.join(', ')}`);
    if (input.fasting) {
      const running = runningSession(input.fasting);
      if (running) lines.push(`Fasting now: started ${running.startedAt.slice(0, 16).replace('T', ' ')} (${running.timeZone}), ${formatFast(Math.max(0, elapsedMs(running, input.now).ms))} elapsed of a ${running.targetHours} h target`);
      else { const last = fastingHistory(input.fasting, 1)[0]; lines.push(last ? `No fast running. Last fast: ${num(last.hours)} h on ${last.day}` : 'No fast running and none recorded.'); }
    }
    const foods = health.foods.slice(0, LIMITS.foods), recipes = health.recipes.slice(0, LIMITS.recipes);
    for (const f of foods) { const handle = handles.add('food', f.id, f.name); lines.push(`${handle}: own food ${clean(f.name)}${f.brand ? ` (${clean(f.brand, 40)})` : ''} · serving ${f.servingGrams !== null ? `${f.servingGrams} g` : f.servingMl !== undefined ? `${f.servingMl} mL` : 'unknown'} · ${f.nutrients.kcal === null ? 'kcal unknown' : `${f.nutrients.kcal} kcal per serving`}`); }
    if (health.foods.length > LIMITS.foods) lines.push(`(${health.foods.length - LIMITS.foods} more foods not listed)`);
    for (const r of recipes) { const handle = handles.add('recipe', r.id, r.name); lines.push(`${handle}: own recipe ${clean(r.name)} · ${num(r.portionsMilli / 1000, 1)} portions`); }
  }
  return {title: 'Health', lines};
}
function wealthSection(input: BuilderInput): Section[] {
  const view = wealthView(input.pathname), overview = wealthOverview(input.platform, input.now.getTime(), input.quotes), sections: Section[] = [];
  const totals = overview.subtotals.length ? overview.subtotals.map(s => `${moneyText(s.value)} ${s.currency}`).join(' · ') : 'no valued holdings';
  const wealth: Section = {title: view === 'portfolio' ? 'Wealth (tracked holdings, for reference)' : 'Wealth', lines: [`Tracked wealth, one total per currency, never converted: ${totals}${overview.incomplete ? ' · some values are unknown, so no total is complete' : ''}`]};
  const rows = view === 'staking' ? overview.rows.filter(r => ['NATIVE_STAKING', 'NATIVE_UNBONDING', 'NATIVE_REWARDS', 'LIQUID_STAKING'].includes(r.position.sourceType)) : overview.rows;
  for (const row of rows.slice(0, LIMITS.positions)) {
    const p = row.position;
    wealth.lines.push(`${clean(p.providerId, 80)} · ${row.assetClass} · ${unitsText(p.quantity, p.decimals)} ${clean(p.asset, 20)} · value ${row.value === undefined ? 'unknown' : `${moneyText(row.value)} ${row.currency ?? ''}`.trim()} (${row.valuationState}${row.source ? `, ${row.source}` : ''})`);
  }
  if (rows.length > LIMITS.positions) wealth.lines.push(`(${rows.length - LIMITS.positions} more holdings not listed)`);
  if (!rows.length) wealth.lines.push(view === 'staking' ? 'No staking holdings tracked.' : 'No holdings tracked yet.');
  sections.push(wealth);
  if (view === 'markets' || view === 'wealth') {
    const watch = input.platform.watchlist.map(w => clean(w.symbol || w.name, 30)).filter(Boolean);
    sections.push({title: 'Markets', lines: [watch.length ? `Watchlist: ${watch.join(', ')} (public assets the person follows; no price is included here)` : 'The watchlist is empty.']});
  }
  if (input.portfolio && (view === 'portfolio' || view === 'wealth')) {
    const lines = input.portfolio.data.portfolios.slice(0, LIMITS.portfolios).map(p => portfolioLine(p, input.portfolio!.priceOf));
    sections.push({title: 'Portfolio (separate from Wealth)', lines: lines.length ? lines : ['No portfolios yet.']});
  }
  return sections;
}
function portfolioLine(p: Portfolio, priceOf: (coin: string, currency: string) => string | undefined): string {
  const label = p.kind === 'real' ? 'Real' : 'Hypothetical';
  if (!validHistory(p)) return `${label} portfolio ${clean(p.name, 60)} (${p.currency}): its history needs review in the app`;
  const totals = portfolioTotals(p, coin => priceOf(coin, p.currency));
  return `${label} portfolio ${clean(p.name, 60)} (${p.currency}): ${totals.held} coins held · value ${totals.unpriced === totals.held && totals.held > 0 ? 'unknown' : `${totals.knownValue} ${p.currency}${totals.unpriced ? ` (${totals.unpriced} coins unpriced, not counted)` : ''}`} · cost ${totals.costKnown ? `${totals.cost} ${p.currency}` : 'unknown'}`;
}
export const HELP_NOTES = [
  'ZIGoals keeps every record on this device, in the browser; nothing is uploaded unless the person turns on encrypted sync for an account, and Health syncs only after a separate opt-in.',
  'With encrypted sync, records are encrypted on the device before they leave; the server stores the encrypted data and the details needed to deliver it and cannot read plans, habits or health entries. Signing in (an email code) is not recovery: only the recovery secret unlocks the data.',
  'Goals hold a target, an optional date and an optional planned contribution; progress comes from the person\'s own records and tracked holdings. Habits have a type (build, quit, limit), a measurement, a schedule and a target; a skipped day is neutral. Health holds the diary, water, weight, steps, body measurements, exercise counters and a fasting timer (12 to 18 hours, stopped automatically at 24).',
  'Wealth tracks holdings with manual or automatic values, one total per currency and never converted; Portfolio is separate and labelled Real or Hypothetical; Markets shows public prices for assets the person follows; Staking is read-only.',
  'ZIGi is the person\'s own AI, connected with their key, a local model or OpenRouter\'s sign-in; ZIGoals runs no AI service and sees none of the conversation. Every answer is labelled as the provider\'s. ZIGi proposes records as cards the person confirms; it can never move money, contribute, allocate, stake, sync, export or delete. Settings → ZIGi · your AI turns it off and forgets the key.',
  'Backups are optional: an encrypted backup with its own secret, readable exports per area, and Export everything (a readable ZIP). The Alpha runs on a test network: nothing is real money.',
];
/** Builds the page context for the next message, under the given consent. */
/** Counts of the person's own week for the weekly review (read-only, from the review engine; nothing scored, nothing drafted). */
function weekSection(input: BuilderInput): Section | null {
  if (!input.week) return null;
  const {weekStart, weekEnd, review} = input.week;
  // Health counts and lines (meals, steps, water, weight) go only with the Health gate open, like every Health line:
  // without it the week is summarised from an empty Health journal and the health-entry count is left out, not zeroed.
  const health = input.consent.health ? input.health : createEmptyHealth();
  try {
    const week = weekSummary({weekStart, weekEnd, habits: input.habits, health, platform: input.platform, localGoals: input.localGoals, metadata: input.metadata, quotes: input.quotes, now: input.now.getTime(), financial: false, review});
    const lines = [
      `Week ${weekStart} to ${weekEnd} · review ${reviewState(review, weekStart)} (the person writes the review themselves; you may summarise these counts and ask what went well)`,
      `${week.wentWell.habitCheckIns} habit check-ins${input.consent.health ? ` · ${week.wentWell.healthEntries} health entries` : ''} · ${week.wentWell.goalContributions} goal contributions${week.wentWell.bestDay ? ` · busiest day ${week.wentWell.bestDay}` : ''}`,
      ...week.habits.slice(0, LIMITS.habits).map(h => `${clean(h.title)}: ${h.done} of ${h.scheduled} scheduled done${h.skipped ? `, ${h.skipped} skipped` : ''}${h.streak ? `, streak ${h.streak}` : ''}`),
      ...(input.consent.health ? week.health.slice(0, 12).map(line => clean(line, 160)) : []),
      week.lastIntention ? `Last week's intention: ${clean(week.lastIntention, 200)}` : 'No intention written last week.',
    ];
    return {title: 'This week (for your weekly review)', lines};
  } catch { return null; }
}
export function buildPageContext(input: BuilderInput, handles: Handles = new Handles()): PageContext {
  const sections: Section[] = [], omitted: string[] = [];
  if (!input.consent.page) return {area: input.area, text: '', handles: [], included: [], omitted: input.consent.reasons, estimatedTokens: 0};
  const health = () => { if (input.consent.health) sections.push(healthSection(input, handles, input.area === 'health')); else omitted.push(...(input.consent.reasons.length ? input.consent.reasons.filter(r => r.startsWith('Health')) : ['Health: not shared'])); };
  switch (input.area) {
    case 'today': sections.push({title: 'Today', lines: [`Habit day ${input.habitDay} · health day ${input.healthDay} · now ${input.now.toISOString().slice(0, 16).replace('T', ' ')} UTC`]}); sections.push(habitsSection(input, handles, true)); health(); sections.push(goalsSection(input, handles, true)); { const week = weekSection(input); if (week) sections.push(week); } break;
    case 'habits': sections.push(habitsSection(input, handles, false)); break;
    case 'goals': sections.push(goalsSection(input, handles, false)); break;
    case 'health': health(); break;
    case 'wealth': sections.push(...wealthSection(input)); break;
    case 'help': sections.push({title: 'How ZIGoals works', lines: HELP_NOTES}); break;
  }
  let text = sections.map(s => `## ${s.title}\n${s.lines.join('\n')}`).join('\n\n');
  if (text.length > LIMITS.chars) { text = `${text.slice(0, LIMITS.chars)}\n(context shortened to fit)`; omitted.push('Some lines were cut to keep the context within its size.'); }
  return {area: input.area, text, handles: handles.list, included: sections.map(s => s.title), omitted, estimatedTokens: estimateTokens(text)};
}
/** Habits by exact title (case-insensitive), for a proposal that names one instead of using a handle: one match or nothing. */
export function habitByTitle(habits: readonly Habit[], title: string): Habit | null {
  const wanted = title.trim().toLowerCase(), matches = habits.filter(h => h.title.trim().toLowerCase() === wanted);
  return matches.length === 1 ? matches[0]! : null;
}

import * as z from 'zod';
import type {HealthNumbers} from '../../health-numbers/store';
import {BP_LINE, LAB_LINE, VERDICT_WORDS, bpReadings, markers, rangeText, verdictOf} from '../../health-numbers/engine';
import type {Cycle} from '../../cycle/store';
import {SYMPTOM_WORDS, cycleOn} from '../../cycle/store';
import {CYCLE_LINE, cycleDay, cycleLengths, nextPeriodEstimate, periodStarts} from '../../cycle/engine';
import type {Scales} from '../../scales/store';
import {scaleSeries, valueWords} from '../../scales/engine';
import {FORECAST_DAYS, cashForecast, plannedContributions, type KnownForecast} from '../../cash-forecast/model';
import {emptyBills} from '../../bills/schema';
import {fromCents, monthOf} from '../../money-log/engine';
import {selectionLine, summarizeSelection} from '../../money-log/selection';
import {minorUnits} from '../../money-split/parts';
import {addLocalDays} from '../../local-date';
import type {ToolEnv} from './env';
import {capRows, num, ok, plural, provenance, refuse, text} from './format';
import type {ToolDefinition} from './types';

/**
 * Owner follow-up 2 (G8, "tools for G1"): the read-only tools for BUILD list 2's features (commit cf3cf2e1), shared by
 * ZIGi and NOVA (one engine), each behind its area's switch like every tool:
 * - `your_numbers` (Health gate): blood pressure readings and lab values the person copied. The only check is against
 *   the range the person copied from their own sheet ("inside / outside the range you copied"); a value with no range
 *   copied has no check at all. Units as typed, never mixed or converted. Not a diagnosis.
 * - `cycle_log` (Health gate AND the cycle log's own switch): periods, cycle lengths and the estimate range (only after
 *   three complete cycles), labelled as an estimate. Information, not a contraceptive or a diagnosis. A tool result is
 *   never a notification; this tool only answers the person's own question.
 * - `your_scales` (Today, as the data catalog files them): the person's own 1–5 scales with their end words and ratings;
 *   a day without a rating is unknown (never a 1 or a 3).
 * - `cash_forecast` (Wealth): the next 60 days of cash per currency, "a model from your own records, not a promise",
 *   never converted; a currency without a cash balance has no line (unknown, never zero). Goal plans only when Goals is
 *   readable here.
 * - `money_selection` (Wealth): the money log's Select-mode total for the entries that match some words, a category, a
 *   kind and a period, per currency, exact, never converted.
 * Nothing here writes, fetches or advises. Names (scales, lab values, bills, categories) are the person's own words,
 * escaped as data (text()); a name that reads like an instruction is still only a name.
 */
export type G1ToolSources = {
  /** `zigoals:health-numbers:v1` (Health-describing: read only through the Health gate; toolEnv drops it when closed). */ healthNumbers?: HealthNumbers | null;
  /** `zigoals:cycle:v1` (Health-describing, and its own switch must be on). */ cycle?: Cycle | null;
  /** `zigoals:scales:v1`. */ scales?: Scales | null;
};
const where = (env: ToolEnv, journal: string, subject: string | null = null) => provenance(env, journal, subject, null, null);
const NOT_READ = 'Not read on this path, so unknown here (never "none").', UNREADABLE = 'This record cannot be read on this device, so it is unknown (never "none").';
const absent = (record: unknown, empty: string) => record === undefined ? NOT_READ : record === null ? UNREADABLE : empty;
const fold = (s: string) => s.normalize('NFC').toLocaleLowerCase('en').replace(/\s+/g, ' ').trim();
const DAY = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

/** The words a tool result says for a value without a copied range (no check is ever made then). */
export const NO_RANGE = 'No range copied, so no check';
export const yourNumbersTool: ToolDefinition<{name?: string}> = {
  name: 'your_numbers', title: 'Your numbers', area: 'health',
  description: 'The person\'s own blood pressure readings and lab values (Health → Your numbers): day, value and unit as typed, and for a lab value only "inside / outside the range you copied" when they copied one. No interpretation, not a diagnosis. To log a reading they ask for, propose {"kind":"log-blood-pressure","systolic":128,"diastolic":82}.',
  parameters: {type: 'object', properties: {name: {type: 'string', description: 'One lab value by its name as on the sheet, such as Glucose (optional).'}}},
  args: z.object({name: z.string().trim().min(1).max(60).optional()}),
  label: args => args.name ? `Your numbers · ${text(args.name, 40)}` : 'Your numbers',
  run(args, env, label) {
    const record = env.nova?.healthNumbers;
    if (!record || !record.entries.length) return ok('your_numbers', label, where(env, 'numbers (Health → Your numbers)'), {bloodPressure: [], labs: [], note: absent(record, 'No reading is kept yet (Health → Your numbers).')});
    const bp = bpReadings(record).map(e => ({day: e.date, reading: `${e.systolic}/${e.diastolic} mmHg`, ...(e.pulse !== undefined ? {pulse: `${e.pulse} a minute`} : {})}));
    const wanted = args.name ? fold(args.name) : null, all = markers(record), list = wanted ? all.filter(m => fold(m.name).includes(wanted)) : all;
    const labs = list.slice(0, 20).map(m => {
      const v = verdictOf(m.latest), range = rangeText(m.latest, n => num(n, 4));
      return {value: text(m.name, 60), unit: text(m.unit, 20) || 'no unit typed', latest: num(m.latest.value, 4), day: m.latest.date, rangeYouCopied: range ?? 'none', check: v ? VERDICT_WORDS[v] : NO_RANGE,
        ...(m.points.length > 1 ? {earlier: m.points.slice(-6, -1).map(p => ({day: p.date, value: num(p.value, 4)}))} : {})};
    });
    const capped = capRows(wanted ? [] : bp, env);
    return ok('your_numbers', label, where(env, 'numbers (Health → Your numbers)'), {
      ...(wanted ? {} : {bloodPressure: capped.rows.slice(-10), readings: bp.length}),
      labs, ...(wanted && !list.length ? {note: `No lab value called "${text(args.name!, 40)}" is kept.`} : {}),
      rule: `${BP_LINE} ${LAB_LINE} Units as typed; values in different units are separate lines, never converted.`});
  },
};

export const CYCLE_OFF = 'The cycle log is switched off in Health, so none of it is read. The person can turn it on in Health → Cycle log.';
export const cycleLogTool: ToolDefinition<Record<string, never>> = {
  name: 'cycle_log', title: 'Cycle log', area: 'health',
  description: 'The person\'s cycle log (only when they turned it on): the day of the cycle, recent periods, cycle lengths and the next-period estimate as a range from past cycles (after three complete ones), with the last two weeks\' logged days. Information, not a contraceptive or a diagnosis.',
  parameters: {type: 'object', properties: {}}, args: z.object({}) as unknown as z.ZodType<Record<string, never>>,
  label: () => 'Cycle log',
  run(_args, env, label) {
    const record = env.nova?.cycle;
    if (!record) return ok('cycle_log', label, where(env, 'cycle log'), {periods: [], note: absent(record, '')});
    // The cycle log's own switch: off means nothing of it is read, entries kept or not.
    if (!cycleOn(record)) return refuse('cycle_log', label, 'gate', CYCLE_OFF);
    const today = env.healthDay, starts = periodStarts(record), lengths = cycleLengths(record), estimate = nextPeriodEstimate(record, today);
    if (!starts.length && !Object.keys(record.days).length) return ok('cycle_log', label, where(env, 'cycle log'), {periods: [], note: 'Nothing is logged yet (Health → Cycle log).', rule: CYCLE_LINE});
    const from = addLocalDays(today, -13);
    const recent = Object.entries(record.days).filter(([d]) => d >= from && d <= today).sort(([a], [b]) => a.localeCompare(b))
      .map(([d, v]) => ({day: d, ...(v.flow ? {flow: v.flow} : {}), ...(v.symptoms?.length ? {symptoms: v.symptoms.map(s => SYMPTOM_WORDS[s] ?? text(s, 30))} : {})}));
    const day = cycleDay(record, today);
    return ok('cycle_log', label, where(env, 'cycle log'), {today, ...(day !== null ? {dayOfCycle: day} : {}), periodStarts: starts.slice(-6), cycleLengths: lengths.slice(-6).map(n => `${n} days`),
      estimate: estimate.kind === 'range'
        ? {nextPeriod: `${estimate.from} to ${estimate.to}`, from: `the shortest and longest of the last ${Math.min(estimate.cycles, 6)} cycles (${estimate.shortest} to ${estimate.longest} days)`, ...(estimate.passed ? {passed: 'that range has passed without a logged period'} : {}), label: 'an estimate from your past cycles, never a date'}
        : {nextPeriod: 'not shown yet', why: `it needs ${estimate.need} complete cycles; ${estimate.cycles} logged so far`},
      lastTwoWeeks: recent, rule: CYCLE_LINE});
  },
};

export const yourScalesTool: ToolDefinition<{scale?: string; days?: number}> = {
  name: 'your_scales', title: 'Your own scales', area: 'today',
  description: 'The person\'s own 1–5 scales (stress, pain, focus…) with their words for 1 and 5, today\'s rating and the last days\' ratings; a day without a rating is unknown. To rate one they ask for, propose {"kind":"rate-scale","scale":"Stress","value":3}.',
  parameters: {type: 'object', properties: {scale: {type: 'string', description: 'One scale by its name (optional).'}, days: {type: 'integer', description: 'How many days back, 1 to 90 (default 14).'}}},
  args: z.object({scale: z.string().trim().min(1).max(40).optional(), days: z.number().int().min(1).max(90).optional()}),
  label: args => `Your own scales${args.scale ? ` · ${text(args.scale, 30)}` : ''} · ${args.days ?? 14} days`,
  run(args, env, label) {
    const record = env.nova?.scales;
    if (!record || (!record.scales.length && !(record.retired ?? []).length)) return ok('your_scales', label, where(env, 'scales'), {scales: [], note: absent(record, 'No scale yet. Scales are added in the check-in or the Journal (Your own scales).')});
    const wanted = args.scale ? fold(args.scale) : null, days = args.days ?? 14, from = addLocalDays(env.habitDay, -(days - 1));
    const pool = wanted ? [...record.scales.map(s => ({...s, removed: false})), ...(record.retired ?? []).map(s => ({...s, removed: true}))] : record.scales.map(s => ({...s, removed: false}));
    const exact = wanted ? pool.filter(s => fold(s.name) === wanted) : pool, chosen = wanted && !exact.length ? pool.filter(s => fold(s.name).includes(wanted)) : exact;
    if (wanted && !chosen.length) return ok('your_scales', label, where(env, 'scales'), {scales: [], note: `No scale called "${text(args.scale!, 30)}". The scales: ${record.scales.map(s => text(s.name, 30)).join(', ') || 'none active'}.`});
    const rows = chosen.map(s => {
      const series = scaleSeries(record, s.id).filter(p => p.date >= from && p.date <= env.habitDay), now = record.days[env.habitDay]?.[s.id];
      const avg = series.length ? series.reduce((a, p) => a + p.value, 0) / series.length : null;
      return {scale: text(s.name, 30), ends: `1 = ${text(s.low, 24)}, 5 = ${text(s.high, 24)}`, ...(s.removed ? {removed: 'taken out of the check-in; its ratings are kept'} : {}),
        today: now !== undefined ? `${now} (${text(valueWords(s, now), 24)})` : 'not rated today (unknown)', rated: `${plural(series.length, 'day')} of ${days}`,
        ...(avg !== null ? {averageOfRatedDays: num(avg, 1)} : {}), ratings: series.map(p => ({day: p.date, value: p.value}))};
    });
    return ok('your_scales', label, where(env, 'scales'), {today: env.habitDay, scales: rows, rule: 'the person\'s own scales and words; a day without a rating is unknown, never a 1 or a 3; the average counts rated days only'});
  },
};

/** "−123.45 EUR" from cents (exact, BigInt), never converted. */
export const centsText = (cents: bigint, currency: string): string => `${cents < 0n ? '-' : ''}${(cents < 0n ? -cents : cents) / 100n}.${String((cents < 0n ? -cents : cents) % 100n).padStart(2, '0')} ${currency}`;
export const FORECAST_LABEL = 'A model from your own records, not a promise. Per currency, never converted.';
export const cashForecastTool: ToolDefinition<{days?: number}> = {
  name: 'cash_forecast', title: 'Cash, the next 60 days', area: 'wealth',
  description: 'Cash ahead per currency for up to the next 60 days: today\'s cash and savings balances, the lowest point and when, the end of the period, the known bills, repeating payments, income and goal plans on their dates, and the everyday pace. A model from the person\'s own records, not a promise; never converted; not advice.',
  parameters: {type: 'object', properties: {days: {type: 'integer', description: 'How many days ahead, 7 to 60 (default 60).'}}},
  args: z.object({days: z.number().int().min(7).max(FORECAST_DAYS).optional()}),
  label: args => `Cash · next ${args.days ?? FORECAST_DAYS} days`,
  run(args, env, label) {
    const accounts = env.accounts, source = where(env, 'accounts, bills, budgets and Spending log');
    if (!accounts) return ok('cash_forecast', label, source, {currencies: [], note: absent(accounts, ''), model: FORECAST_LABEL});
    const days = args.days ?? FORECAST_DAYS, goals = env.areas.goals;
    const result = cashForecast({accounts, bills: env.ak?.bills ?? emptyBills(), entries: env.moneyLog?.entries ?? [], ...(env.nova?.budgets ? {budgets: env.nova.budgets} : {}),
      contributions: goals ? plannedContributions(env.platform.goals) : [], today: env.habitDay, days});
    if (!result.rows.length) return ok('cash_forecast', label, source, {currencies: [], note: 'This needs at least one cash or savings account with its balance (What you have → Accounts).', model: FORECAST_LABEL});
    const row = (r: KnownForecast) => {
      const last = r.points.at(-1)!, c = r.currency, m = (n: bigint) => centsText(n, c);
      const everyday = r.everyday.source === 'log' ? `the average of the last ${r.everyday.days} days of the Spending log, bills and repeats left out`
        : r.everyday.source === 'budgets' ? `the monthly ${c} budgets (less than ${14} days of the Spending log so far)` : 'not known yet, so the line holds only the dated items (the real line is likely lower)';
      return {currency: c, today: m(r.startCents), lowest: {day: r.lowest.date, amount: m(r.lowest.cents)}, ...(r.lowestLow && r.lowestLow.cents < r.lowest.cents ? {lowestAtLeanestPace: {day: r.lowestLow.date, amount: m(r.lowestLow.cents)}} : {}),
        end: {day: last.date, amount: m(last.mid), ...(last.low !== undefined && last.high !== undefined ? {range: `${m(last.low)} to ${m(last.high)} (the person's own leanest and fullest months)`} : {})},
        ...(r.missingBalances ? {notCounted: `${plural(r.missingBalances, 'cash account')} without a balance`} : {}), everyday,
        dated: r.events.slice(0, 10).map(e => ({day: e.date, what: text(e.title, 60), amount: m(e.cents), kind: e.kind})), ...(r.events.length > 10 ? {moreDated: r.events.length - 10} : {})};
    };
    return ok('cash_forecast', label, source, {from: env.habitDay, days, currencies: result.rows.map(r => r.known ? row(r) : {currency: r.currency, line: 'no line: none of its cash or savings accounts has a balance yet (unknown, not zero)'}),
      ...(result.unplaced.length ? {notDrawn: `bills or plans in ${result.unplaced.join(', ')}, which have no cash or savings account here`} : {}), ...(goals ? {} : {goalPlans: 'not read here (Goals is not shared)'}), model: FORECAST_LABEL});
  },
};

export const moneySelectionTool: ToolDefinition<{words?: string; category?: string; kind?: 'expense' | 'income'; from?: string; to?: string}> = {
  name: 'money_selection', title: 'Spending log total', area: 'wealth',
  description: 'The exact total of the Spending log entries that match some words in their note or category, a category, a kind and a period (default this month), like the log\'s Select mode: per currency, income adds and spending takes away, never converted; with the matching entries (newest first).',
  parameters: {type: 'object', properties: {words: {type: 'string', description: 'Words in the entry\'s note or category, such as taxi (optional).'}, category: {type: 'string', description: 'One category (optional).'},
    kind: {type: 'string', enum: ['expense', 'income'], description: 'Only spending or only income (optional).'}, from: {type: 'string', description: 'The first day, YYYY-MM-DD (default the 1st of this month).'}, to: {type: 'string', description: 'The last day, YYYY-MM-DD (default today).'}}},
  args: z.object({words: z.string().trim().min(1).max(40).optional(), category: z.string().trim().min(1).max(40).optional(), kind: z.enum(['expense', 'income']).optional(), from: DAY.optional(), to: DAY.optional()}),
  label: args => `Spending log total${args.words ? ` · "${text(args.words, 30)}"` : ''}${args.category ? ` · ${text(args.category, 30)}` : ''}`,
  run(args, env, label) {
    const log = env.moneyLog, source = where(env, 'Spending log');
    if (!log || !log.entries.length) return ok('money_selection', label, source, {entries: [], note: absent(log, 'Nothing is logged in Wealth → Spending yet.')});
    const to = args.to ?? env.habitDay, from = args.from ?? (args.to ? addLocalDays(to, -30) : monthOf(env.habitDay).start);
    if (from > to) return refuse('money_selection', label, 'range', 'The first day comes after the last day.');
    if (from < addLocalDays(to, -366)) return refuse('money_selection', label, 'range', 'Ask for a year at most.');
    const words = args.words ? fold(args.words) : null, category = args.category ? fold(args.category) : null;
    const hits = log.entries.filter(e => e.date >= from && e.date <= to && (!args.kind || e.kind === args.kind) && (!category || fold(e.category).includes(category)) && (!words || fold(`${e.note ?? ''} ${e.category}`).includes(words)))
      .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));
    const summary = summarizeSelection(hits, hits.map(e => e.id)), money = (cents: number, c: string) => `${fromCents(cents)} ${c}`;
    return ok('money_selection', label, source, {from, to, matched: plural(summary.count, 'entry', 'entries'), total: selectionLine(summary, money),
      totals: summary.totals.map(t => ({currency: t.currency, net: `${t.cents < 0 ? '-' : t.cents > 0 ? '+' : ''}${fromCents(Math.abs(t.cents))} ${t.currency}`, expenses: t.expenses, income: t.income})),
      entries: hits.slice(0, 20).map(e => ({day: e.date, category: text(e.category, 40), ...(e.note ? {note: text(e.note, 80)} : {}), amount: `${e.kind === 'income' ? '+' : '-'}${fromCents(minorUnits(e.amount))} ${e.currency}`})),
      ...(hits.length > 20 ? {notListed: hits.length - 20} : {}), rule: 'exact, per currency, never converted; an entry split into parts counts once, whole; not advice'});
  },
};
export const G1_TOOLS = [yourNumbersTool, cycleLogTool, yourScalesTool, cashForecastTool, moneySelectionTool] as const;

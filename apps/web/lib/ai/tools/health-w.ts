import {z} from 'zod';
import {healthGroupIn} from '../../vault/w-homes';
import type {HealthData} from '../../health';
import {asleep, bedClock, clockFromMidnight, clockFromNoon, consistency, dailySeries, inBedMinutes, nightDay, runningNights, sleepDebt, summary as sleepSummaryOf, wakeClock, type Summary} from '../../sleep/engine';
import {emptySleep, SLEEP_SOURCES} from '../../sleep/schema';
import {meditationSummary, minutesText, sessionDay, weeklyBars} from '../../meditation/stats';
import {emptyMeditation, MEDITATION_SOURCES} from '../../meditation/schema';
import {VITAL_SOURCES} from '../../vitals/schema';
import {addDays, formatMinutes, wallClock} from '../../zone-time';
import type {ToolEnv} from './env';
import {capRows, num, ok, plural, text} from './format';
import {gated, isRefusal, RANGE, rangeArg, rangeFor, where} from './health';
import {NO_ARGS, type ToolDefinition} from './types';

/**
 * Session W Part 21 (W7): ZIGi reads the Health areas Session W added, under the same three-part Health gate as every
 * Health tool (`gated`: nothing is read while it is closed). Sleep and meditation from Health v4's own groups, vitals as
 * the imports and links brought them, and where the journal's records came from. Values are the person's own: an
 * estimated night says so, a missing value stays absent, never 0; no score, no advice, no judgement. What the person
 * wrote (tags, notes) is escaped as data. Sign-ins and tokens of linked services are never read here.
 */
/** Where a record came from, in words (imports, links, Bluetooth; the person's own entries and timers). */
export const SOURCE_WORDS: Readonly<Record<string, string>> = {
  manual: 'typed in by you', timer: 'the bedtime timer', breathing: 'the breathing guide', 'apple-health': 'Apple Health export', fitbit: 'Fitbit / Google export',
  garmin: 'Garmin export', samsung: 'Samsung Health export', oura: 'Oura export', 'oura-link': 'Oura (linked)', 'withings-link': 'Withings (linked)',
  'polar-link': 'Polar (linked)', 'strava-link': 'Strava (linked)', bluetooth: 'a Bluetooth device',
};
const sourceWords = (source: string) => SOURCE_WORDS[source] ?? 'another source';
const sleepOf = (health: HealthData) => healthGroupIn(health, 'sleep') ?? emptySleep();
const meditationOf = (health: HealthData) => healthGroupIn(health, 'meditation') ?? emptyMeditation();

export const sleepNights: ToolDefinition<{range?: string; include_naps?: boolean}> = {
  name: 'sleep_nights', title: 'Sleep', area: 'health',
  description: 'The nights the person logged or imported for a period (naps when asked): the day they woke, bedtime and wake time where they slept, time in bed, time asleep (marked estimated when the night does not say), quality 1-5, their own tags and note, and where it came from.',
  parameters: {type: 'object', properties: {range: RANGE('the last 14 days'), include_naps: {type: 'boolean', description: 'Also list naps (default: nights only).'}}},
  args: z.object({range: rangeArg, include_naps: z.boolean().optional()}),
  label: args => `Sleep · ${args.range?.trim() || 'the last 14 days'}`,
  run(args, env, label) {
    const g = gated(env, 'sleep_nights', label); if (!g.ok) return g;
    const range = rangeFor(env, args.range, 'the last 14 days', 'sleep_nights', label); if (isRefusal(range)) return range;
    const sleep = sleepOf(g.health);
    const nights = sleep.nights.filter(n => n.end !== null && (args.include_naps || n.kind === 'night')).filter(n => { const day = nightDay(n)!; return day >= range.from && day <= range.to; })
      .sort((a, b) => a.end!.localeCompare(b.end!));
    const rows = nights.map(n => {
      const slept = asleep(n)!;
      return {woke: nightDay(n), kind: n.kind, bedtime: clockFromNoon(bedClock(n)), wake: clockFromMidnight(wakeClock(n)!), zone: n.timeZone, inBed: formatMinutes(inBedMinutes(n)), asleep: `${formatMinutes(slept.minutes)}${slept.estimated ? ' (estimated)' : ''}`,
        quality: n.quality ?? 'not rated', ...(n.tags?.length ? {tags: n.tags.map(t => text(t, 24))} : {}), ...(n.note ? {note: text(n.note, 300)} : {}), source: sourceWords(n.source)};
    });
    const running = runningNights(sleep).length, capped = capRows(rows, env);
    return ok('sleep_nights', label, where(env, args.include_naps ? 'nights and naps' : null, range), {nights: capped.rows, count: rows.length,
      ...(running ? {running: 'A night is running ("I\'m going to bed" was tapped); it has no end yet and is not counted.'} : {}), ...(rows.length ? {} : {note: 'No night logged in this period.'})}, capped.truncated);
  },
};

const summaryRow = (s: Summary | null) => s ? {nightsLogged: s.nights, averageAsleep: `${formatMinutes(s.asleep)}${s.estimated ? ' (some nights estimated)' : ''}`, averageInBed: formatMinutes(s.inBed), usualBedtime: clockFromNoon(s.bed), usualWake: clockFromMidnight(s.wake), averageQuality: s.quality ?? 'not rated'} : 'no night logged';
export const sleepSummary: ToolDefinition<Record<string, never>> = {
  name: 'sleep_summary', title: 'Sleep summary', area: 'health',
  description: 'Sleep over the last 7 and 30 days from the logged nights: average time asleep and in bed, usual bedtime and wake time, nights logged, the person\'s own goal and, with a goal, sleep debt and bedtime consistency, each with its formula and how many nights it uses.',
  parameters: {type: 'object', properties: {}},
  args: NO_ARGS,
  label: () => 'Sleep summary',
  run(_args, env, label) {
    const g = gated(env, 'sleep_summary', label); if (!g.ok) return g;
    const sleep = sleepOf(g.health), today = env.healthDay, debt = sleepDebt(sleep, today), steady = consistency(sleep, today);
    const debtText = (minutes: number) => minutes === 0 ? 'exactly your goal' : minutes > 0 ? `${formatMinutes(minutes)} less than your goal` : `${formatMinutes(-minutes)} more than your goal`;
    return ok('sleep_summary', label, where(env, null, {from: addDays(today, -29), to: today, label: 'the last 30 days'}), {
      last7Days: summaryRow(sleepSummaryOf(dailySeries(sleep, today, 7))), last30Days: summaryRow(sleepSummaryOf(dailySeries(sleep, today, 30))),
      yourGoal: sleep.goal ? `${formatMinutes(sleep.goal.minutes)} a night${sleep.goal.bedFrom ? `, bedtime between ${sleep.goal.bedFrom} and ${sleep.goal.bedTo}` : ''}` : 'none set',
      sleepDebt: debt ? {total: debtText(debt.minutes), nights: debt.nights, formula: 'the sum over the logged nights of the last 7 days of (your goal minus the time asleep)'} : sleep.goal ? 'no night logged in the last 7 days' : 'needs your own sleep goal (Health → Sleep)',
      bedtimeConsistency: steady ? {spread: formatMinutes(steady.minutes), nights: steady.nights, formula: 'the standard deviation of bedtimes over the last 14 days (at least 4 nights); smaller means steadier'} : 'needs at least 4 nights in the last 14 days',
      note: 'Figures from logged nights only; a night not logged is not counted. Not medical advice.',
    });
  },
};

const HOW: Readonly<Record<string, string>> = {timer: 'timer', breathing: 'breathing guide', manual: 'mindful minutes typed in', import: 'imported'};
const PATTERN_WORDS: Readonly<Record<string, string>> = {box: 'box breathing', '478': '4-7-8 breathing', coherent: 'slow and even breathing', sigh: 'double inhale'};
export const meditationSessions: ToolDefinition<{range?: string}> = {
  name: 'meditation_sessions', title: 'Meditation', area: 'health',
  description: 'The meditation sessions for a period: the day and start time where it happened, minutes, how (timer, breathing guide and its pattern, mindful minutes typed in, or an import), moods before and after (1-5) when given, the person\'s own note, and a heart-rate summary only when they saved one.',
  parameters: {type: 'object', properties: {range: RANGE('the last 14 days')}},
  args: z.object({range: rangeArg}),
  label: args => `Meditation · ${args.range?.trim() || 'the last 14 days'}`,
  run(args, env, label) {
    const g = gated(env, 'meditation_sessions', label); if (!g.ok) return g;
    const range = rangeFor(env, args.range, 'the last 14 days', 'meditation_sessions', label); if (isRefusal(range)) return range;
    const sessions = meditationOf(g.health).sessions.filter(s => { const day = sessionDay(s); return day >= range.from && day <= range.to; }).sort((a, b) => a.startedAt.localeCompare(b.startedAt));
    const rows = sessions.map(s => {
      const clock = wallClock(Date.parse(s.startedAt), s.timeZone);
      return {day: clock.date, start: clockFromMidnight(clock.minutes), minutes: num(s.seconds / 60, 1), how: HOW[s.kind] ?? s.kind, ...(s.pattern ? {pattern: PATTERN_WORDS[s.pattern] ?? s.pattern} : {}),
        ...(s.moodBefore !== undefined ? {moodBefore: s.moodBefore} : {}), ...(s.moodAfter !== undefined ? {moodAfter: s.moodAfter} : {}), ...(s.note ? {note: text(s.note, 300)} : {}),
        ...(s.heartRate ? {heartRate: {averageBpm: s.heartRate.avg, lowestBpm: s.heartRate.min, highestBpm: s.heartRate.max}} : {}), source: sourceWords(s.source)};
    });
    const total = Math.round(sessions.reduce((t, s) => t + s.seconds, 0) / 60), capped = capRows(rows, env);
    return ok('meditation_sessions', label, where(env, null, range), {sessions: capped.rows, count: rows.length, totalMinutes: rows.length ? total : 'no session', ...(rows.length ? {} : {note: 'No session in this period.'})}, capped.truncated);
  },
};

export const meditationSummaryTool: ToolDefinition<Record<string, never>> = {
  name: 'meditation_summary', title: 'Meditation summary', area: 'health',
  description: 'Meditation at a glance: minutes this week (Monday to Sunday) and the person\'s own weekly goal when set, sessions and minutes in total, the longest session, the last day with a session, days in a row (rest days are fine), and the last 8 weeks.',
  parameters: {type: 'object', properties: {}},
  args: NO_ARGS,
  label: () => 'Meditation summary',
  run(_args, env, label) {
    const g = gated(env, 'meditation_summary', label); if (!g.ok) return g;
    const m = meditationOf(g.health), s = meditationSummary(m, env.healthDay);
    if (!s.sessions) return ok('meditation_summary', label, where(env, null, null), {sessions: 0, note: 'No meditation session logged yet.', yourWeeklyGoal: s.goal ? minutesText(s.goal) : 'none set'});
    return ok('meditation_summary', label, where(env, null, {from: addDays(env.healthDay, -55), to: env.healthDay, label: 'the last 8 weeks'}), {
      thisWeek: minutesText(s.thisWeek), yourWeeklyGoal: s.goal ? minutesText(s.goal) : 'none set', ...(s.goal ? {thisWeekVsYourGoal: s.thisWeek >= s.goal ? 'at or above your goal' : `${minutesText(s.goal - s.thisWeek)} to your goal`} : {}),
      sessions: s.sessions, totalMinutes: minutesText(s.totalMinutes), longestSession: minutesText(s.longestMinutes), lastSession: s.last, daysInARow: s.daysInARow,
      last8Weeks: weeklyBars(m, env.healthDay, 8).map(w => ({weekStarting: w.weekStart, minutes: w.minutes, sessions: w.sessions})), note: 'Days in a row count back from today; a rest day is fine.',
    });
  },
};

export const vitals: ToolDefinition<{range?: string}> = {
  name: 'vitals', title: 'Vitals', area: 'health',
  description: 'Daily values brought in from an export or a linked device for a period: resting heart rate, the day\'s lowest, average and highest heart rate when a monitor summarised it, and active and resting energy in kcal, each with its source. A value the source does not give stays absent.',
  parameters: {type: 'object', properties: {range: RANGE('the last 7 days')}},
  args: z.object({range: rangeArg}),
  label: args => `Vitals · ${args.range?.trim() || 'the last 7 days'}`,
  run(args, env, label) {
    const g = gated(env, 'vitals', label); if (!g.ok) return g;
    const range = rangeFor(env, args.range, 'the last 7 days', 'vitals', label); if (isRefusal(range)) return range;
    const days = (healthGroupIn(g.health, 'vitals')?.days ?? []).filter(d => d.date >= range.from && d.date <= range.to).sort((a, b) => a.date.localeCompare(b.date) || a.source.localeCompare(b.source));
    const rows = days.map(d => ({date: d.date, source: sourceWords(d.source), ...(d.restingHr !== undefined ? {restingHeartRateBpm: d.restingHr} : {}),
      ...(d.hrMin !== undefined || d.hrAvg !== undefined || d.hrMax !== undefined ? {heartRateBpm: {lowest: d.hrMin ?? 'not given', average: d.hrAvg ?? 'not given', highest: d.hrMax ?? 'not given'}} : {}),
      ...(d.activeKcal !== undefined ? {activeKcal: d.activeKcal} : {}), ...(d.restingKcal !== undefined ? {restingKcal: d.restingKcal} : {})}));
    const capped = capRows(rows, env);
    return ok('vitals', label, where(env, null, range), {days: capped.rows, count: rows.length, ...(rows.length ? {} : {note: 'No vitals in this period: they arrive with an import or a linked device.'})}, capped.truncated);
  },
};

const EXTERNAL = [...new Set([...SLEEP_SOURCES, ...MEDITATION_SOURCES, ...VITAL_SOURCES])].filter(s => !['manual', 'timer', 'breathing'].includes(s)).sort((a, b) => b.length - a.length);
/** The source an imported or linked activity or weight carries in its id (`health_imp-<source>-…`, `health_imw-<source>-…`). */
const idSource = (id: string) => EXTERNAL.find(s => id.startsWith(`health_imp-${s}-`) || id.startsWith(`health_imw-${s}-`)) ?? null;
type Tally = {nights: number; naps: number; meditationSessions: number; vitalsDays: number; activities: number; weights: number; newest: string | null};
export const devices: ToolDefinition<Record<string, never>> = {
  name: 'devices', title: 'Devices and imports', area: 'health',
  description: 'Where the Health journal\'s records came from: each export, linked service or Bluetooth device by name, with how many nights, naps, meditation sessions, daily vitals, activities and weight readings it brought, and its newest day. Nothing about sign-ins or tokens, which ZIGi never reads.',
  parameters: {type: 'object', properties: {}},
  args: NO_ARGS,
  label: () => 'Devices and imports',
  run(_args, env: ToolEnv, label) {
    const g = gated(env, 'devices', label); if (!g.ok) return g;
    const by = new Map<string, Tally>(), tally = (source: string, day: string | null, key: Exclude<keyof Tally, 'newest'>) => {
      if (!(EXTERNAL as readonly string[]).includes(source)) return;
      const t = by.get(source) ?? {nights: 0, naps: 0, meditationSessions: 0, vitalsDays: 0, activities: 0, weights: 0, newest: null};
      t[key]++; if (day && (!t.newest || day > t.newest)) t.newest = day; by.set(source, t);
    };
    for (const n of sleepOf(g.health).nights) tally(n.source, nightDay(n), n.kind === 'nap' ? 'naps' : 'nights');
    for (const s of meditationOf(g.health).sessions) tally(s.source, sessionDay(s), 'meditationSessions');
    for (const d of healthGroupIn(g.health, 'vitals')?.days ?? []) tally(d.source, d.date, 'vitalsDays');
    for (const a of g.health.activity) { const s = idSource(a.id); if (s) tally(s, a.date, 'activities'); }
    for (const w of g.health.weights) { const s = idSource(w.id); if (s) tally(s, w.date, 'weights'); }
    const rows = [...by].sort(([a], [b]) => sourceWords(a).localeCompare(sourceWords(b))).map(([source, t]) => ({source: sourceWords(source), ...Object.fromEntries(Object.entries(t).filter(([k, v]) => k === 'newest' ? v !== null : v !== 0))}));
    return ok('devices', label, where(env, 'devices and imports', null), {sources: rows, count: rows.length,
      note: rows.length ? `${plural(rows.length, 'source')} besides your own entries. Connecting or disconnecting a service is done in Health → Devices.` : 'Everything in the Health journal was entered on this device: no import, linked service or Bluetooth device yet.'});
  },
};

export const W_HEALTH_TOOLS = [sleepNights, sleepSummary, meditationSessions, meditationSummaryTool, vitals, devices] as const;

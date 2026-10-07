import {expect, test} from 'vitest';
import {netWorth, moneyText} from '../../accounts/net-worth';
import {startChallenge} from '../../habits-v2/challenge';
import {healthGroupIn} from '../../vault/w-homes';
import {meditationSummary} from '../../meditation/stats';
import {platformSchema} from '../../positions';
import {showcaseLinks} from '../../links/showcase';
import {Handles} from '../handles';
import {toolEnv, type ToolSources} from './env';
import {DAY, gatesFor, SENTINEL, showcaseSources, withSentinels} from './fixtures';
import {HEALTH_CLOSED} from './format';
import {runTool, toolText} from './registry';
import type {ToolOk, ToolResult} from './types';

// Session W Part 21 (W7): ZIGi's tools for the areas Session W added, on the Showcase (2026-10-05) and the sentinel
// records. Expected figures are recomputed from the records with the app's own engines, never copied from a run.
const open = (sources: ToolSources = showcaseSources(), handles = new Handles()) => toolEnv(sources, gatesFor(true), 'provider', handles);
const closed = (sources: ToolSources = showcaseSources()) => toolEnv(sources, gatesFor(false), 'provider');
const okData = (result: ToolResult): ToolOk => { if (!result.ok) throw new Error(`refused: ${result.refusal}`); return result; };
const data = (result: ToolResult) => okData(result).data as Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

test('sleep_nights: the nights of the last 14 days by the day they woke, asleep marked estimated where the night does not say, the person\'s words escaped; naps only when asked', () => {
  const sources = withSentinels(showcaseSources()), env = open(sources), d = data(runTool('sleep_nights', {}, env));
  const nights = healthGroupIn(sources.health, 'sleep')!.nights.filter(n => n.kind === 'night' && n.end && n.end.slice(0, 10) >= '2026-09-21');
  expect(d.count).toBeGreaterThan(5);
  expect(d.count).toBeLessThanOrEqual(nights.length + 1);
  for (const row of d.nights) { expect(row.woke >= '2026-09-22' && row.woke <= DAY, row.woke).toBe(true); expect(row.bedtime).toMatch(/^\d{2}:\d{2}$/); expect(row.asleep).toMatch(/^\d+( h \d{2})? min( \(estimated\))?$/); expect(row.kind).toBe('night'); }
  const sentinel = d.nights.find((n: {note?: string}) => n.note === SENTINEL.sleepNote);
  expect(sentinel).toMatchObject({woke: '2026-10-01', tags: expect.arrayContaining([SENTINEL.sleepTag])});
  expect(okData(runTool('sleep_nights', {}, env)).provenance).toBe('Fictional Showcase data · From your Health journal on this device · the last 14 days (2026-09-22 to 2026-10-05, UTC)');
  const withNaps = data(runTool('sleep_nights', {include_naps: true, range: 'the last 30 days'}, env));
  expect(withNaps.count).toBeGreaterThanOrEqual(data(runTool('sleep_nights', {range: 'the last 30 days'}, env)).count);
  expect(runTool('sleep_nights', {range: 'next century'}, env)).toMatchObject({ok: false, reason: 'range'});
  expect(runTool('sleep_nights', {}, closed(sources))).toMatchObject({ok: false, reason: 'gate', refusal: HEALTH_CLOSED});
});
test('sleep_summary: averages of the logged nights over 7 and 30 days, the person\'s goal, and debt and consistency with their formulas, never advice', () => {
  const d = data(runTool('sleep_summary', {}, open()));
  expect(d.last7Days.nightsLogged).toBeGreaterThan(0);
  expect(d.last30Days.nightsLogged).toBeGreaterThanOrEqual(d.last7Days.nightsLogged);
  expect(d.note).toBe('Figures from logged nights only; a night not logged is not counted. Not medical advice.');
  if (typeof d.sleepDebt === 'object') expect(d.sleepDebt.formula).toBe('the sum over the logged nights of the last 7 days of (your goal minus the time asleep)');
  if (typeof d.bedtimeConsistency === 'object') expect(d.bedtimeConsistency.formula).toMatch(/standard deviation of bedtimes over the last 14 days/);
  expect(JSON.stringify(d)).not.toMatch(/\b(should|better|healthy|unhealthy|bad|good)\b/i);
  // Without any night, it says so instead of a zero.
  const empty = showcaseSources(), health = {...empty.health}; delete (health as Record<string, unknown>).sleep;
  expect(data(runTool('sleep_summary', {}, open({...empty, health}))).last7Days).toBe('no night logged');
});
test('meditation_sessions and meditation_summary: minutes from seconds, how, moods, the note escaped, a heart-rate summary only when saved; the summary is the app\'s own', () => {
  const sources = withSentinels(showcaseSources()), env = open(sources), d = data(runTool('meditation_sessions', {range: 'today'}, env));
  const today = healthGroupIn(sources.health, 'meditation')!.sessions.filter(s => s.startedAt.slice(0, 10) === DAY);
  expect(d.count).toBe(today.length);
  expect(d.totalMinutes).toBe(Math.round(today.reduce((t, s) => t + s.seconds, 0) / 60));
  const sentinel = d.sessions.find((s: {note?: string}) => s.note === SENTINEL.meditationNote);
  expect(sentinel.heartRate).toEqual({averageBpm: SENTINEL.heartRate.avg, lowestBpm: SENTINEL.heartRate.min, highestBpm: SENTINEL.heartRate.max});
  for (const s of d.sessions) expect(['timer', 'breathing guide', 'mindful minutes typed in', 'imported']).toContain(s.how);
  const summary = data(runTool('meditation_summary', {}, env)), expected = meditationSummary(healthGroupIn(sources.health, 'meditation')!, DAY);
  expect(summary).toMatchObject({sessions: expected.sessions, daysInARow: expected.daysInARow, lastSession: expected.last});
  expect(summary.last8Weeks).toHaveLength(8);
  expect(summary.note).toBe('Days in a row count back from today; a rest day is fine.');
  for (const tool of ['meditation_sessions', 'meditation_summary']) expect(runTool(tool, {}, closed(sources))).toMatchObject({ok: false, reason: 'gate'});
});
test('vitals and devices: what imports and links brought, each with its source; a value a source does not give stays absent; nothing about sign-ins', () => {
  const sources = withSentinels(showcaseSources()), env = open(sources), v = data(runTool('vitals', {}, env));
  const imported = v.days.find((day: {activeKcal?: number}) => day.activeKcal === SENTINEL.importKcal);
  expect(imported).toMatchObject({date: '2026-10-03', source: 'Apple Health export'});
  for (const day of v.days) expect(Object.values(day)).not.toContain(0);
  const dev = data(runTool('devices', {}, env));
  expect(dev.sources.map((s: {source: string}) => s.source)).toEqual(expect.arrayContaining(['Apple Health export', 'Strava (linked)']));
  expect(JSON.stringify(dev)).not.toMatch(/token|password|secret|username/i);
  expect(dev.note).toMatch(/Connecting or disconnecting a service is done in Health → Devices\./);
  expect(data(runTool('devices', {}, open())).sources.every((s: {source: string}) => s.source !== 'typed in by you')).toBe(true);
});
test('accounts and net_worth: the Showcase\'s five accounts with their latest balances, debts as owed, the person\'s own rate; net worth per currency by the app\'s formula, never converted', () => {
  const sources = showcaseSources(), env = open(sources), a = data(runTool('accounts', {}, env));
  expect(a.count).toBe(5);
  expect(a.accounts.map((x: {name: string}) => x.name)).toEqual(['Everyday account', 'Rainy-day savings', 'Workplace pension', 'Car loan', 'Credit card']);
  expect(a.accounts.find((x: {name: string}) => x.name === 'Car loan')).toMatchObject({kind: 'loan', debt: true, yourRatePercent: '5.9', currency: 'USD'});
  expect(JSON.stringify(a)).not.toMatch(/fictional bank|institution/);
  const n = data(runTool('net_worth', {}, env)), expected = netWorth(sources.accounts!, DAY, sources.platform.positions);
  expect(n.perCurrency.map((r: {currency: string}) => r.currency)).toEqual(expected.rows.map(r => r.currency));
  const usd = expected.rows.find(r => r.currency === 'USD')!;
  expect(n.perCurrency.find((r: {currency: string}) => r.currency === 'USD')).toMatchObject({netWorth: `${moneyText(usd.net)} USD`, debts: `${moneyText(usd.debts)} USD`});
  expect(n.formula).toMatch(/never converted/);
  expect(n.holdingsWithoutAValue).toBe(expected.unvaluedHoldings);
  // The Wealth switch decides, like every Wealth tool.
  const gates = gatesFor(true), noWealth = toolEnv(sources, {...gates, areas: {...gates.areas, wealth: false}}, 'provider');
  for (const tool of ['accounts', 'net_worth']) expect(runTool(tool, {}, noWealth)).toMatchObject({ok: false, reason: 'area'});
  expect(data(runTool('accounts', {}, open({...sources, accounts: null}))).note).toBe('No accounts or debts yet (Wealth → Accounts and debts).');
});
test('milestones: each milestone\'s value in the goal\'s currency, its date from this device, and done (the person\'s tick), reached or open', () => {
  const base = showcaseSources(), goal = base.platform.goals.find(g => g.type !== 'PROJECT' && g.status !== 'closed')!;
  const platform = platformSchema.parse({...base.platform, goals: base.platform.goals.map(g => g.id === goal.id ? {...g, milestones: [{id: 'm1', title: 'First step', done: true}, {id: 'm2', title: 'Tiny value', done: false, target: '1'}, {id: 'm3', title: 'All of it', done: false, target: goal.target}]} : g)});
  const env = open({...base, platform, milestoneDates: {version: 1, dates: {[goal.id]: {m3: '2027-06-30'}}}}), d = data(runTool('milestones', {}, env));
  const rows = d.goals.find((g: {goal: string}) => g.goal === goal.name).milestones;
  expect(rows[0]).toEqual({title: 'First step', state: 'done (your tick)'});
  expect(rows[2]).toMatchObject({title: 'All of it', targetDate: '2027-06-30', value: expect.stringMatching(new RegExp(` ${goal.asset}$`))});
  expect(['reached (recorded progress passed it)', 'open']).toContain(rows[1].state);
  expect(data(runTool('milestones', {goal: goal.name}, env)).count).toBe(1);
  expect(runTool('milestones', {goal: 'Origami'}, env)).toMatchObject({ok: false, reason: 'not-found'});
});
test('challenges: a habit with its own end date, which day today is and the scheduled days done so far; a Health-filled check-in is held back while Health is closed', () => {
  const base = showcaseSources(), walk = base.habits.habits.find(h => h.title === 'Walk')!;
  const habits = startChallenge(base.habits, walk.id, 30, new Date(`${DAY}T09:00:00Z`)), sources = {...base, habits};
  const d = data(runTool('challenges', {}, open(sources)));
  expect(d.challenges).toHaveLength(1);
  expect(d.challenges[0]).toMatchObject({habit: 'Walk', started: DAY, ends: '2026-11-03', today: 'day 1 of 30', finished: false, handle: expect.stringMatching(/^h\d+$/)});
  expect(data(runTool('challenges', {}, open())).note).toMatch(/^No challenge running\./);
  // The sentinel check-in on DAY was filled in from Health: counted with the gate open, held back with it closed.
  const sentinel = withSentinels(sources), openDone = data(runTool('challenges', {}, open(sentinel))).challenges[0].doneSoFar, shutDone = data(runTool('challenges', {}, closed(sentinel))).challenges[0].doneSoFar;
  expect(openDone).toBe('1 of 1 scheduled days');
  expect(shutDone).toBe('0 of 0 scheduled days');
});
test('chess_ratings, chess_games and links_count: the sites\' own numbers with no username or game link; only the number of links', () => {
  const sources = showcaseSources(), env = open(sources), r = data(runTool('chess_ratings', {}, env));
  expect(r.ratings.map((x: {site: string; control: string}) => `${x.site} ${x.control}`)).toEqual(['chess.com Rapid', 'Lichess Blitz']);
  expect(r.followed).toEqual({chesscom: 'yes', lichess: 'yes'});
  expect(r.yourGoals).toEqual([expect.objectContaining({site: 'chess.com', control: 'Rapid', yourTarget: 1600})]);
  const g = data(runTool('chess_games', {}, env));
  expect(g.count).toBe(12);
  expect(g.results.total.win + g.results.total.draw + g.results.total.loss).toBe(12);
  const text = JSON.stringify([r, g]);
  expect(text).not.toMatch(/showcase-rapid|showcase-blitz|https?:\/\/|showcase-\d/);
  const links = data(runTool('links_count', {}, env));
  expect(links.count).toBe(showcaseLinks(DAY).items.length);
  for (const link of showcaseLinks(DAY).items) { expect(JSON.stringify(links)).not.toContain(link.url); expect(JSON.stringify(links)).not.toContain(link.label); }
  // Today's switch decides for chess and links.
  const gates = gatesFor(true), noToday = toolEnv(sources, {...gates, areas: {...gates.areas, today: false}}, 'provider');
  for (const tool of ['chess_ratings', 'chess_games', 'links_count']) expect(runTool(tool, {}, noToday)).toMatchObject({ok: false, reason: 'area'});
  expect(toolText(runTool('chess_games', {range: 'the last 7 days'}, env), env).length).toBeLessThanOrEqual(env.limits.chars);
});

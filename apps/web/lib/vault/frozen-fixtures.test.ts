import {writeFileSync} from 'node:fs';
import {expect, test} from 'vitest';
import {platformSchema} from '../positions';
import {accountsSchema} from '../accounts/schema';
import {ACCOUNT, financeV4} from './format-fixtures';
import {emptyFinanceHomesMarker, reconcileFinanceHomes} from './finance-homes';
import {GOAL_EXTRAS_KEY, goalExtrasSchema} from '../goal-extras/store';
import {buildShowcase, showcaseChoices} from '../showcase-data';
import {EXTRAS_SECTIONS} from './extras-sections';
import {applySection, collectSection, mergeSection} from './extras-sync';
import {LAYOUT_KEY, emptyLayout, serializeLayout, setRegionOrder} from '../page-layout';
import {LINKED_WALLETS_KEY} from '../linked-wallets-key';
import {EARN_ACADEMY_KEY, EARN_PATH_KEY, EARN_PREFS_KEY} from '../af-earn-keys';
import {STAKING_JOURNAL_KEY, STAKING_PREFS_KEY, VALIDATOR_ALERTS_KEY} from '../af-signing-keys';
import {GOAL_VAULTS_KEY, WALLET_BALANCES_KEY} from '../af-wallet-keys';
import {ZIGI_PLANS_KEY} from '../af-zigi-keys';
import {DAY_TIMELINE_KEY, STORIES_KEY, UNIVERSE_KEY} from '../af-extras-keys';
import {CHECKLIST_DAYS_KEY, CHECKLIST_KEY} from '../af-checklist-keys';
import {linkedWalletsSchema} from '../linked-wallets';

/**
 * Session AB-Cloud (ADR-023): the records this build writes, for the frozen-reader proof (scripts/frozen-readers.mjs
 * runs scripts/frozen-readers/reader.frozen.ts against them inside worktrees of #37, #38 and #39). With FROZEN_OUT set
 * the fixture is written there; without it this test only proves that this build reads its own fixture.
 * Each part of the session adds the records it changes, with the reader module and spec an older release would use.
 */
/** Where each release keeps the reader of an extras record (#37 has none of them; #38 AA-Cloud's; #39 all). */
const FROZEN_READERS: Record<string, {module: string; spec: string}> = {
  'zigoals:average-goals:v1': {module: './average-goals/store', spec: 'AVERAGE_GOALS'}, 'zigoals:calculator:v1': {module: './compound/store', spec: 'CALCULATOR'},
  'zigoals:life-review:v1': {module: './life-review/store', spec: 'LIFE_REVIEW'}, 'zigoals:today-cards:v1': {module: './today-cards/store', spec: 'TODAY_CARDS'},
  'zigoals:reminders-plan:v1': {module: './reminders-plan/schema', spec: 'REMINDERS_PLAN'}, 'zigoals:habit-extras:v1': {module: './habits-extras/schema', spec: 'HABIT_EXTRAS'},
  'zigoals:routine-run:v1': {module: './routines/run-schema', spec: 'ROUTINE_RUN'}, 'zigoals:game:v1': {module: './game/schema', spec: 'GAME'},
  'zigoals:health-coach:v1': {module: './health-aa/coach-schema', spec: 'HEALTH_COACH'}, 'zigoals:micro-targets:v1': {module: './health-aa/micro', spec: 'MICRO_TARGETS'},
  'zigoals:macro-mode:v1': {module: './health-aa/macro-mode', spec: 'MACRO_MODE'}, 'zigoals:aisles:v1': {module: './health-aa/aisles', spec: 'AISLES_RECORD'},
  'zigoals:measurements-custom:v1': {module: './health-aa/measurements-custom', spec: 'MEASUREMENTS_CUSTOM'},
  'zigoals:health-vitamins:v1': {module: './health-vitamins/schema', spec: 'HEALTH_VITAMINS'},
};
export function frozenFixture() {
  const v4 = platformSchema.parse({...financeV4(), goals: financeV4().goals.map(g => ({...g, milestones: [{id: 'm1', title: 'Flights booked', done: false, target: '150000'}]}))});
  // Part 1: finance as the finance-homes switch writes it (v5, one account, one milestone date).
  const finance = reconcileFinanceHomes(v4, {accounts: accountsSchema.parse({version: 1, items: [ACCOUNT]}), dates: {version: 1, dates: {'1': {m1: '2026-12-01'}}}}, emptyFinanceHomesMarker()).platform;
  // Part 1: a goal-extras record with this session's `cardArt` (ADR-023 C7) beside AA-Cloud's fields.
  const extras = goalExtrasSchema.parse({version: 1, areas: [{id: 'custom-music', label: 'Music', color: '#aa66ff'}],
    goals: {'private:1': {area: 'fun', why: 'See the sea', cardArt: 'nebula-1', updatedAt: '2026-10-13T08:00:00.000Z'}}});
  const records: Record<string, string> = {'zigoals:platform:v1': JSON.stringify(finance), [GOAL_EXTRAS_KEY]: JSON.stringify(extras)};
  const checks: {key: string; module: string; spec: string; expect?: Record<string, unknown>}[] = [
    {key: GOAL_EXTRAS_KEY, module: './goal-extras/store', spec: 'GOAL_EXTRAS', expect: {'goals.private:1.why': 'See the sea', 'goals.private:1.cardArt': 'nebula-1', 'areas': extras.areas}},
  ];
  // Part 2: every record the extras sections carry, as an extras merge writes it into the device keys: the Showcase's
  // records on device A merged with device B's edits (a goal's card art, a calculator scenario's name, a coach answer).
  const showcase = buildShowcase('2026-10-13', 'UTC').records, a = new Map<string, string>(Object.entries({...showcase, ...showcaseChoices()}));
  // Gate C test audit: the Showcase holds no routine run, aisle choice or vitamins, so they are added here (fictional) and
  // every record the sections carry reaches the frozen readers.
  const SEEDS: Record<string, unknown> = {
    'zigoals:routine-run:v1': {version: 1, run: {version: 1, headId: 'showcase-morning', day: '2026-10-13', step: 1, startedAt: '2026-10-13T07:00:00.000Z', stepStartedAt: '2026-10-13T07:05:00.000Z', done: ['stretch'], skipped: []}},
    'zigoals:aisles:v1': {version: 1, overrides: {'oat milk': 'Dairy & eggs'}},
    'zigoals:health-vitamins:v1': {version: 1, foods: {'health_fixture-oats': {cMg: 0, dUg: 2500, b12Ug: 400}}, entries: {'health_fixture-entry-1': {dUg: 2500}}, targets: {dUg: 15000}},
  };
  for (const [key, value] of Object.entries(SEEDS)) if (!a.has(key)) a.set(key, JSON.stringify(value));
  const storageA = {getItem: (k: string) => a.get(k) ?? null, setItem: (k: string, v: string) => { a.set(k, v); }, removeItem: (k: string) => { a.delete(k); }};
  for (const section of EXTRAS_SECTIONS) {
    const local = collectSection(storageA, section), other = structuredClone(local.records) as Record<string, {goals: Record<string, Record<string, unknown>>; scenarios?: {name: string}[]; answers?: Record<string, unknown>}>;
    const goals = other[GOAL_EXTRAS_KEY], first = goals ? Object.keys(goals.goals)[0] : undefined;
    if (goals && first) goals.goals[first] = {...goals.goals[first], cardArt: 'aurora-2', updatedAt: '2026-10-13T12:00:00.000Z'};
    const scenario = other['zigoals:calculator:v1']?.scenarios?.[0]; if (scenario) { scenario.name = 'Renamed on device B'; /* Session AH (TR14, M21): the optional months field */ scenario.input.months = 6; }
    const coach = other['zigoals:health-coach:v1']; if (coach) coach.answers = {...coach.answers, '2026-10-12': {answer: 'keep', at: '2026-10-13T12:00:00.000Z'}};
    applySection(storageA, section, local, mergeSection(section, local.records, local.records, other));
    for (const r of section.records) if (a.has(r.spec.key) && r.spec.key !== GOAL_EXTRAS_KEY) { records[r.spec.key] = a.get(r.spec.key)!; checks.push({key: r.spec.key, ...FROZEN_READERS[r.spec.key]!}); }
    if (section.name === 'goals') { records[GOAL_EXTRAS_KEY + '#merged'] = a.get(GOAL_EXTRAS_KEY)!; checks.push({key: GOAL_EXTRAS_KEY + '#merged', module: './goal-extras/store', spec: 'GOAL_EXTRAS', expect: {[`goals.${first}.cardArt`]: 'aurora-2'}}); }
  }
  // Session AE (ADR-027 G14, TIER 3 storage): Habits' layout as this build saves it after a move, with Routines
  // (`habits:routines`) as its own block. Older builds read the record, show their own blocks (the new id ignored), and
  // keep the new id when they save a move of their own (lib/page-layout.ts, unchanged since #32).
  const layout = setRegionOrder(emptyLayout(), 'habits', 'body', ['habits:overview', 'habits:list', 'habits:routines', 'habits:consistency', 'habits:rhythm']);
  records[LAYOUT_KEY] = serializeLayout(layout);
  // Session AE (ADR-027 G16, TIER 3 storage): the device-only record of wallets linked read-only (fictional addresses).
  // No older build has a reader: the key is ignored there (and never synced or restored here).
  // Session AF (L2b): the record also carries the new kind 'solana' and the optional `chains`/`via` (older builds keep them
  // through their own writes and hide the kind; lib/wallets/frozen-readers.test.ts runs AE's own modules on it).
  const linked = linkedWalletsSchema.parse({version: 1, display: 'USD', wallets: [
    {kind: 'btc', address: 'bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4', label: 'BIP-173 test vector', addedAt: '2026-10-17T08:00:00.000Z'},
    {id: 'w-evm', kind: 'evm', wallet: 'MetaMask', address: '0x0000000000000000000000000000000000000001', label: 'Fictional EVM address', addedAt: '2026-10-18T08:00:00.000Z', chains: ['eip155:8453'], via: 'extension'},
    {id: 'w-sol', kind: 'solana', wallet: 'Phantom', address: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', label: 'Fictional Solana address', addedAt: '2026-10-18T08:05:00.000Z', via: 'extension'},
  ]});
  records[LINKED_WALLETS_KEY] = JSON.stringify(linked);
  checks.push({key: LINKED_WALLETS_KEY, module: './linked-wallets', spec: 'LINKED_WALLETS', expect: {display: 'USD'}});
  // Session AF (ADR-028, TIER 3 storage): the Earn and Checklist device records (fictional). No release before AF has a
  // reader: each key is ignored there (ABSENT); this build reads its own.
  records[EARN_PATH_KEY] = JSON.stringify({version: 1, steps: {wallet: {done: true, at: '2026-10-18T20:00:00.000Z'}}, todayCard: 'auto', visited: ['native']});
  checks.push({key: EARN_PATH_KEY, module: './earn/records', spec: 'EARN_PATH', expect: {'steps.wallet.done': true}});
  records[EARN_ACADEMY_KEY] = JSON.stringify({version: 1, lessons: {'what-is-staking': {read: true, score: 3, passedAt: '2026-10-18T20:05:00.000Z', attempts: 1}}});
  checks.push({key: EARN_ACADEMY_KEY, module: './earn/records', spec: 'EARN_ACADEMY', expect: {'lessons.what-is-staking.score': 3}});
  // Session AG Polish 3 (ADR-032 L2, L19; TIER 3 stored preference): Governance's device switch rides in this loose record;
  // builds #40–#47 read it with the field kept (and ignored on screen), #37–#39 have no reader.
  records[EARN_PREFS_KEY] = JSON.stringify({version: 1, pageShown: true, dockShown: true, dockFolded: false, governanceShown: true});
  checks.push({key: EARN_PREFS_KEY, module: './earn/records', spec: 'EARN_PREFS', expect: {dockShown: true, governanceShown: true}});
  records[CHECKLIST_KEY] = JSON.stringify({version: 1, items: [{id: 'c1', kind: 'custom', label: 'Fictional piano 15 minutes', colour: 'gold', section: 'evening', addedAt: '2026-10-17T07:00:00.000Z', pathLabel: 'Piano'}]});
  // Session AG Polish 3 (owner amendment 10; TIER 3 stored format): an item's one word on the path, `pathLabel`, kept and
  // ignored by every older build (its items are loose records).
  checks.push({key: CHECKLIST_KEY, module: './checklist/schema', spec: 'CHECKLIST', expect: {version: 1, 'items.0.pathLabel': 'Piano'}});
  records[CHECKLIST_DAYS_KEY] = JSON.stringify({version: 1, days: {'2026-10-17': {total: 6, done: 6, perfect: true}}});
  checks.push({key: CHECKLIST_DAYS_KEY, module: './checklist/schema', spec: 'CHECKLIST_DAYS', expect: {'days.2026-10-17.perfect': true}});
  // Session AF (L2a): native staking's choices and journal (fictional address and hash).
  records[STAKING_PREFS_KEY] = JSON.stringify({version: 1, network: 'real', realConfirmedAt: '2026-10-18T21:00:00.000Z', lastValidator: {'zigchain-1': 'zigvaloper18vykgjgcmp2z4xzkt6mh74glrpd7qda8fqldrl'}});
  checks.push({key: STAKING_PREFS_KEY, module: './staking/prefs', spec: 'STAKING_PREFS', expect: {network: 'real'}});
  records[STAKING_JOURNAL_KEY] = JSON.stringify({version: 1, entries: [{operationId: '00000000-0000-4000-8000-000000000001', chainId: 'zig-test-2', wallet: 'zig1qvpsxqcrqvpsxqcrqvpsxqcrqvpsxqcrrdrgwr', action: 'delegate', validator: 'zigvaloper18vykgjgcmp2z4xzkt6mh74glrpd7qda8fqldrl', amount: '25000000000000000000', state: 'CONFIRMED', hash: 'AB'.repeat(32), height: '8290600', code: 0, at: '2026-10-18T21:00:00.000Z'}]});
  checks.push({key: STAKING_JOURNAL_KEY, module: './staking/journal', spec: 'STAKING_JOURNAL', expect: {version: 1}});
  // Session AF (L2b): linked wallets' last balances and a Goal Vault link (fictional ids and amounts).
  records[WALLET_BALANCES_KEY] = JSON.stringify({version: 1, observations: {'w-evm:eip155:8453': {walletId: 'w-evm', chainId: 'eip155:8453', at: '2026-10-18T09:00:00.000Z', height: '21000000', assets: [{id: 'native', symbol: 'ETH', decimals: 18, amount: '1000000000000000'}], missing: ['USDC']}}});
  checks.push({key: WALLET_BALANCES_KEY, module: './wallets/balances/store', spec: 'WALLET_BALANCES', expect: {version: 1}});
  records[GOAL_VAULTS_KEY] = JSON.stringify({version: 1, links: [{id: 'v1', goalId: 'g1', walletId: 'w-zig', parts: ['delegations'], linkedAt: '2026-10-18T10:00:00.000Z', baseline: {stakedAzig: '25000000000000000000', rewardsAzig: '0', stzigUnits: '0', height: '13046000'}}]});
  checks.push({key: GOAL_VAULTS_KEY, module: './goal-vaults/store', spec: 'GOAL_VAULTS', expect: {'links.0.goalId': 'g1'}});
  // Session AF (L2a chunk 3): what this device last saw of a validator, for the health alerts.
  records[VALIDATOR_ALERTS_KEY] = JSON.stringify({version: 1, seen: {'zig-test-2 zigvaloper18vykgjgcmp2z4xzkt6mh74glrpd7qda8fqldrl': {at: '2026-10-19T00:00:00.000Z', rate: '0.05', maxRate: '0.2', maxChangeRate: '0.01', updatedAt: '2026-01-18T21:24:58.055Z'}}});
  checks.push({key: VALIDATOR_ALERTS_KEY, module: './validators/health', spec: 'VALIDATOR_ALERTS', expect: {version: 1}});
  // Session AF (L4): ZIGi's plans; (L5b) My universe, Day timeline, Stories.
  records[ZIGI_PLANS_KEY] = JSON.stringify({version: 1, plans: [{id: 'plan_1', title: 'Your 10k plan', createdAt: '2026-10-18T08:00:00.000Z', updatedAt: '2026-10-18T08:05:00.000Z', done: false, items: [{sig: '0a1b2c3d', kind: 'checklist-add-custom', label: 'Add to your Checklist: Buy race socks', outcome: 'opened'}]}]});
  checks.push({key: ZIGI_PLANS_KEY, module: './ai/store/plans', spec: 'ZIGI_PLANS', expect: {version: 1}});
  records[UNIVERSE_KEY] = JSON.stringify({version: 1, celebrated: {'universe:habits:ring:1': '2026-10-17'}});
  checks.push({key: UNIVERSE_KEY, module: './universe/store', spec: 'UNIVERSE', expect: {version: 1}});
  records[DAY_TIMELINE_KEY] = JSON.stringify({version: 1, times: {'meal:Lunch': {time: '12:30'}}});
  checks.push({key: DAY_TIMELINE_KEY, module: './timeline/store', spec: 'DAY_TIMELINE', expect: {version: 1}});
  records[STORIES_KEY] = JSON.stringify({version: 1, seen: {'week:2026-10-11': '2026-10-17'}});
  checks.push({key: STORIES_KEY, module: './stories/store', spec: 'STORIES', expect: {version: 1}});
  return {records, checks, finance: {accounts: 1, dates: 1}, layout: {key: LAYOUT_KEY, page: 'habits', region: 'body', added: 'habits:routines', older: ['habits:overview', 'habits:consistency', 'habits:list', 'habits:rhythm']}};
}

test('the frozen-reader fixture is read by this build', () => {
  const fixture = frozenFixture();
  // Every extras record the sections carry is in the fixture with its older readers named (Gate C test audit: no filter, so
  // a record missing from the fixture fails here instead of dropping out of both sides).
  const carried = EXTRAS_SECTIONS.flatMap(x => x.records.map(r => r.spec.key));
  expect(carried.filter(k => k !== GOAL_EXTRAS_KEY && !fixture.records[k])).toEqual([]);
  expect(fixture.checks.map(c => c.key.replace('#merged', '')).sort()).toEqual([...carried, GOAL_EXTRAS_KEY, LINKED_WALLETS_KEY, EARN_PATH_KEY, EARN_ACADEMY_KEY, EARN_PREFS_KEY, CHECKLIST_KEY, CHECKLIST_DAYS_KEY, STAKING_PREFS_KEY, STAKING_JOURNAL_KEY, WALLET_BALANCES_KEY, GOAL_VAULTS_KEY, VALIDATOR_ALERTS_KEY, ZIGI_PLANS_KEY, UNIVERSE_KEY, DAY_TIMELINE_KEY, STORIES_KEY].sort());
  // Session AE: the layout record holds the new block, and the linked-wallets record is this build's own.
  expect(JSON.parse(fixture.records[LAYOUT_KEY]!).pages.habits.body.order).toContain('habits:routines');
  expect(linkedWalletsSchema.parse(JSON.parse(fixture.records[LINKED_WALLETS_KEY]!)).display).toBe('USD');
  // Each record parses with this build's schema, and device B's three edits survived the merge.
  for (const section of EXTRAS_SECTIONS) for (const r of section.records) r.spec.schema.parse(JSON.parse(fixture.records[r.spec.key === GOAL_EXTRAS_KEY ? `${GOAL_EXTRAS_KEY}#merged` : r.spec.key]!));
  const merged = fixture.checks.find(c => c.key === `${GOAL_EXTRAS_KEY}#merged`)!;
  expect(Object.keys(merged.expect!)).toHaveLength(1);
  const [path] = Object.keys(merged.expect!), goalKey = path!.slice('goals.'.length, -'.cardArt'.length);
  expect(goalKey).toMatch(/^private:\d+$/);
  expect(goalExtrasSchema.parse(JSON.parse(fixture.records[`${GOAL_EXTRAS_KEY}#merged`]!)).goals[goalKey]!.cardArt).toBe('aurora-2');
  expect(JSON.parse(fixture.records['zigoals:calculator:v1']!).scenarios[0].name).toBe('Renamed on device B');
  expect(JSON.parse(fixture.records['zigoals:health-coach:v1']!).answers['2026-10-12']).toEqual({answer: 'keep', at: '2026-10-13T12:00:00.000Z'});
  expect(platformSchema.parse(JSON.parse(fixture.records['zigoals:platform:v1']!)).schemaVersion).toBe(5);
  expect(goalExtrasSchema.parse(JSON.parse(fixture.records[GOAL_EXTRAS_KEY]!)).goals['private:1']!.cardArt).toBe('nebula-1');
  if (process.env.FROZEN_OUT) writeFileSync(process.env.FROZEN_OUT, JSON.stringify(fixture));
});

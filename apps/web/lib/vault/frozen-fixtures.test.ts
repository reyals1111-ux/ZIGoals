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
import {MONEY_LOG_KEY} from '../money-log/schema';
import {JOURNAL_KEY} from '../journal/schema';
import {AI_MEMORY_KEY, ZIGI_KEY} from '../ai/store/keys';
import {MEAL_ESTIMATES_KEY} from '../meal-estimates/schema';
import {TASKS_KEY} from '../tasks/schema';
import {READING_SOURCES_KEY} from '../wealth-sources/schema';
import {PRICE_ALERTS_KEY} from '../price-alerts/schema';
import {FOCUS_SESSIONS_KEY} from '../focus-sessions/schema';
import {NOTIFY_KEY} from '../notify/prefs';
import {MUSIC_MIX_KEY} from '../music/mix-store';
import {BILLS_KEY} from '../bills/schema';
import {BUDGETS_KEY} from '../budgets/schema';
import {TARGET_ALLOCATION_KEY} from '../allocation/target';
import {CSV_MAPPINGS_KEY} from '../csv/templates/saved';
import {AUTO_RULES_KEY} from '../auto-rules/schema';
import {BACKUP_REMINDER_KEY} from '../backup-reminder';
import {FOOD_SCANS_KEY} from '../food-scans/schema';
import {NUTRIENT_EXTRAS_KEY} from '../health-vitamins/extras';
import {GROCERY_KEY} from '../grocery/schema';
import {CALORIE_WEEK_KEY} from '../health-aa/calorie-week';
import {COMPARE_PAIR_KEY} from '../compare/schema';
import {SUPPLEMENTS_KEY} from '../supplements/schema';
import {GOV_REMINDERS_KEY} from '../zigchain-eco/governance';
import {INSIGHT_FEEDBACK_KEY} from '../insight-feedback/store';
import {FOCUS_ROUNDS_KEY} from '../focus-rounds/store';
import {CYCLE_KEY} from '../cycle/store';
import {SCALES_KEY} from '../scales/store';
import {HEALTH_NUMBERS_KEY} from '../health-numbers/store';
import {NOVA_HERMES_KEY} from '../nova/hermes-record';
import {NOVA_SETUP_KEY} from '../nova/setup';
import {NOVA_WORKFLOWS_KEY} from '../nova/workflows/schema';
import {NOVA_BRIEFS_KEY} from '../nova/briefs';
import {NOVA_BRIDGE_KEY} from '../nova/bridge';
import {NOVA_KEY} from '../nova/store';
import {NOVA_STAGE_KEY} from '../nova/stage/record';
import {NOVA_WORLD_KEY} from '../nova/world/record';
import {CALENDAR_IMPORT_KEY} from '../ics/calendar';
import {NOTES_KEY} from '../notes/schema';
import {NETWORTH_MILESTONES_KEY} from '../networth-milestones/milestones';
import {SAVINGS_CHALLENGES_KEY} from '../savings-challenges/challenges';
import {DEBT_PLANNER_KEY} from '../debt-planner/store';
import {WRAPPED_KEY} from '../wrapped/store';
import {AGENDA_KEY} from '../agenda/store';
import {JOURNAL_DISPLAY_KEY} from '../on-this-day/store';
import {FIRST_WEEK_KEY} from '../first-week/store';
import {EXPERIMENTS_KEY} from '../experiments/store';
import {MONEY_RULES_KEY} from '../money-rules/schema';
import {MONEY_REVIEW_KEY} from '../money-review/review';
import {FI_MODEL_KEY} from '../fi-model/store';
import {EMERGENCY_SHEET_KEY} from '../emergency-sheet/schema';
import {MUSCLE_RECOVERY_KEY} from '../muscle-freshness/model';
import {FOOD_DISPLAY_KEY} from '../food-display/schema';
import {REWARDS_SHELF_KEY} from '../rewards-shelf/store';
import {WORKOUTS_KEY} from '../workouts/schema';
import {GUIDED_JOURNEYS_KEY} from '../guided/schema';
import {UI_PREFS_KEY} from '../ab-design-keys';
import {RECEIPTS_KEY} from '../portfolio/receipts';
import {IMPORTS_KEY} from '../portfolio/wallet-import';
import {EXCHANGES_KEY} from '../exchanges/record';
import {ZIGI_METRICS_KEY} from '../ai/store/metrics';
import {ENERGY_KEY} from '../energy/schema';
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
  // Session AM (ADR-038 D18; TIER 3 (sync)): the NOVA section's two records (#52 and later read NOVA's own record; the
  // stage record is this session's, absent before it).
  [NOVA_KEY]: {module: './nova/store', spec: 'NOVA_STORE'}, [NOVA_STAGE_KEY]: {module: './nova/stage/record', spec: 'NOVA_STAGE'},
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
  // Session AJ (item 35; TIER 3 (stored format) + TIER 3 (auth/sync)): a habit's everyday clock time in the synced habit
  // extras (optional `times` map); an older build reads the record with it and keeps or ignores the map.
  { const hx = JSON.parse(a.get('zigoals:habit-extras:v1') ?? '{"version":1}') as Record<string, unknown>; a.set('zigoals:habit-extras:v1', JSON.stringify({...hx, times: {'fixture-habit-1': '07:15'}})); }
  // Session AK (5.7, 6.4, 8.6; TIER 3 (stored format)): optional fields on synced records — the habit order and list
  // mode, a milestone's linked habits, and the badges setting on the game record. Older builds keep or ignore them.
  { const hx = JSON.parse(a.get('zigoals:habit-extras:v1')!) as Record<string, unknown>; a.set('zigoals:habit-extras:v1', JSON.stringify({...hx, order: {'fixture-habit-1': 0}, listMode: 'compact', intentions: {'fixture-habit-1': {when: 'After I pour coffee', where: 'kitchen'}}, monthWeekday: {'fixture-habit-1': {weekday: 1, nth: 1, from: '2026-10-01'}}})); }
  { const gx = JSON.parse(a.get(GOAL_EXTRAS_KEY) ?? '{"version":1,"goals":{},"areas":[]}') as {goals: Record<string, Record<string, unknown>>}; const first = Object.keys(gx.goals ?? {})[0]; if (first) { gx.goals[first] = {...gx.goals[first], milestoneHabits: {m1: ['fixture-habit-1']}}; a.set(GOAL_EXTRAS_KEY, JSON.stringify(gx)); } }
  { const game = JSON.parse(a.get('zigoals:game:v1') ?? '{"version":1}') as Record<string, unknown>; a.set('zigoals:game:v1', JSON.stringify({...game, badges: false})); }
  const storageA = {getItem: (k: string) => a.get(k) ?? null, setItem: (k: string, v: string) => { a.set(k, v); }, removeItem: (k: string) => { a.delete(k); }};
  for (const section of EXTRAS_SECTIONS) {
    const local = collectSection(storageA, section), other = structuredClone(local.records) as Record<string, {goals: Record<string, Record<string, unknown>>; scenarios?: {name: string}[]; answers?: Record<string, unknown>}>;
    const goals = other[GOAL_EXTRAS_KEY], first = goals ? Object.keys(goals.goals)[0] : undefined;
    if (goals && first) goals.goals[first] = {...goals.goals[first], cardArt: 'aurora-2', updatedAt: '2026-10-13T12:00:00.000Z'};
    const scenario = other['zigoals:calculator:v1']?.scenarios?.[0]; if (scenario) { scenario.name = 'Renamed on device B'; /* Session AH (TR14, M21): the optional months field */ (scenario as {input?: {months?: number}}).input!.months = 6; }
    const coach = other['zigoals:health-coach:v1']; if (coach) coach.answers = {...coach.answers, '2026-10-12': {answer: 'keep', at: '2026-10-13T12:00:00.000Z'}};
    applySection(storageA, section, local, mergeSection(section, local.records, local.records, other));
    for (const r of section.records) if (a.has(r.spec.key) && r.spec.key !== GOAL_EXTRAS_KEY) { records[r.spec.key] = a.get(r.spec.key)!; checks.push({key: r.spec.key, ...FROZEN_READERS[r.spec.key]!}); }
    if (section.name === 'goals') { records[GOAL_EXTRAS_KEY + '#merged'] = a.get(GOAL_EXTRAS_KEY)!; checks.push({key: GOAL_EXTRAS_KEY + '#merged', module: './goal-extras/store', spec: 'GOAL_EXTRAS', expect: {[`goals.${first}.cardArt`]: 'aurora-2'}}); }
  }
  // Session AI (feature 9, GO14; TIER 3 (stored format)): the Life review record may carry the person's values and each
  // week's values check (optional, additive; the record is loose in every release that reads it).
  const lifeKey = 'zigoals:life-review:v1';
  records[lifeKey] = JSON.stringify({...JSON.parse(records[lifeKey] ?? '{"version":1,"focus":{}}') as object, values: ['Health', 'Patience'], valueChecks: {'week:2026-10-22': {ratings: {Health: 4}, at: '2026-10-28T20:00:00.000Z'}}});
  const lifeCheck = checks.find(c => c.key === lifeKey);
  if (lifeCheck) lifeCheck.expect = {...lifeCheck.expect, 'values.1': 'Patience', 'valueChecks.week:2026-10-22.ratings.Health': 4}; else checks.push({key: lifeKey, ...FROZEN_READERS[lifeKey]!, expect: {'values.1': 'Patience'}});
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
  // Session AL (L5 fifth pass, LS-032): a day filled in afterwards carries its additive `filled` list.
  records[CHECKLIST_DAYS_KEY] = JSON.stringify({version: 1, days: {'2026-10-17': {total: 6, done: 6, perfect: true}, '2026-10-18': {total: 4, done: 3, filled: ['habit:00000000-0000-4000-8000-000000000001']}}});
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
  // Session AI (B3, TIER 3 (stored format)): the expense and income log, a new device-only key (fictional entries).
  records[MONEY_LOG_KEY] = JSON.stringify({version: 1, entries: [{id: 'm1', kind: 'expense', amount: '12.50', currency: 'EUR', category: 'Food & drink', note: 'Fictional lunch', date: '2026-10-27', createdAt: '2026-10-27T12:00:00.000Z', source: 'form', parts: [{amount: '10.00', category: 'Food & drink'}, {amount: '2.50', category: 'Coffee'}]}], budget: {weekly: '200.00', currency: 'EUR'}, weekStartsOn: 'monday', currency: 'EUR'});
  checks.push({key: MONEY_LOG_KEY, module: './money-log/schema', spec: 'MONEY_LOG', expect: {version: 1, 'entries.0.amount': '12.50', 'entries.0.parts.1.category': 'Coffee'}});
  // Session AI (B3, TIER 3 (stored format)): the journal and the daily energy rating, two new device-only keys (fictional).
  records[JOURNAL_KEY] = JSON.stringify({version: 1, entries: [{id: 'j1', date: '2026-10-27', text: 'Fictional calm day.', createdAt: '2026-10-27T21:00:00.000Z', followUp: {question: 'What made it calm?', from: 'device', answer: 'A walk.', answeredAt: '2026-10-27T21:05:00.000Z'}}], shareWithAi: false, followUps: true});
  checks.push({key: JOURNAL_KEY, module: './journal/schema', spec: 'JOURNAL', expect: {version: 1, 'entries.0.followUp.answer': 'A walk.'}});
  records[ENERGY_KEY] = JSON.stringify({version: 1, days: {'2026-10-27': {energy: 4, at: '2026-10-27T20:30:00.000Z'}}, words: {'2026-10-27': {energy: 'high', pleasantness: 'pleasant', word: 'focused', at: '2026-10-27T20:31:00.000Z'}}});
  checks.push({key: ENERGY_KEY, module: './energy/schema', spec: 'ENERGY', expect: {'days.2026-10-27.energy': 4, 'words.2026-10-27.word': 'focused'}});
  // Session AI (feature 3, TIER 3 (stored format)): a ZIGi note may carry `paused` (additive, optional; the note schema is loose in every release).
  records[AI_MEMORY_KEY] = JSON.stringify({version: 1, notes: [{id: 'note_frozen', text: 'Fictional: trains in the morning', category: 'schedule', source: 'person', createdAt: '2026-10-27T08:00:00.000Z', updatedAt: '2026-10-28T08:00:00.000Z', paused: true}]});
  checks.push({key: AI_MEMORY_KEY, module: './ai/store/records', spec: 'AI_MEMORY', expect: {'notes.0.text': 'Fictional: trains in the morning', 'notes.0.paused': true}});
  // Session AI (tasks, TIER 3 (stored format)): one-off tasks with a priority and a due date, a new device-only key (fictional).
  records[TASKS_KEY] = JSON.stringify({version: 1, tasks: [{id: 'task_1', title: 'Fictional: call the bank', priority: 'high', due: '2026-10-30', createdAt: '2026-10-28T09:00:00.000Z'}]});
  checks.push({key: TASKS_KEY, module: './tasks/schema', spec: 'TASKS', expect: {'tasks.0.priority': 'high'}});
  // Session AI (J15, TIER 3 (stored format)): what a Portfolio transfer in was, a new device-only key (fictional ids).
  records[RECEIPTS_KEY] = JSON.stringify({version: 1, kinds: {'showcase-tx-9': 'reward'}});
  checks.push({key: RECEIPTS_KEY, module: './portfolio/receipts', spec: 'RECEIPTS', expect: {'kinds.showcase-tx-9': 'reward'}});
  // Session AI (WE20, TIER 3 (stored format)): which Portfolio rows came from a linked wallet, a new device-only key (fictional).
  records[IMPORTS_KEY] = JSON.stringify({version: 1, rows: {'tx-from-wallet': {walletId: 'w-evm', chainId: 'eip155:8453', assetId: 'native', portfolioId: 'p-real', at: '2026-10-28T08:00:00.000Z'}}});
  checks.push({key: IMPORTS_KEY, module: './portfolio/wallet-import', spec: 'IMPORTS', expect: {'rows.tx-from-wallet.walletId': 'w-evm'}});
  // Session AI (J14, TIER 3 (stored format)): the exchanges read on this device, balances only (fictional).
  records[EXCHANGES_KEY] = JSON.stringify({version: 1, connections: {kraken: {connectedAt: '2026-10-28T08:00:00.000Z', read: {at: '2026-10-28T08:01:00.000Z', balances: [{asset: 'BTC', amount: '0.5'}]}}}});
  checks.push({key: EXCHANGES_KEY, module: './exchanges/record', spec: 'EXCHANGES_RECORD', expect: {'connections.kraken.read.balances.0.asset': 'BTC'}});
  // Session AI (G14, TIER 3 (stored format)): ZIGi's own counts, a new device-only key (fictional).
  records[ZIGI_METRICS_KEY] = JSON.stringify({version: 1, on: true, months: {'2026-10': {'card-added': 3}}});
  checks.push({key: ZIGI_METRICS_KEY, module: './ai/store/metrics', spec: 'ZIGI_METRICS', expect: {'months.2026-10.card-added': 3}});
  // Session AI (mascot, TIER 3 (stored format)): ZIGi's record may carry `personality` (optional; the record is loose in every release).
  records[ZIGI_KEY] = JSON.stringify({version: 1, side: 'left', personality: 'direct'});
  checks.push({key: ZIGI_KEY, module: './ai/store/records', spec: 'ZIGI', expect: {side: 'left', personality: 'direct'}});
  // Session AI (feature 1, HE17, TIER 3 (stored format)): the ranges behind an AI meal estimate, a new device-only key (fictional).
  records[MEAL_ESTIMATES_KEY] = JSON.stringify({version: 1, keepPhotos: true, foods: {'health_fixture-estimate': {ranges: {kcal: [450, 650], protein_g: [20, 30]}, source: 'photo', at: '2026-10-28T12:00:00.000Z'}}});
  checks.push({key: MEAL_ESTIMATES_KEY, module: './meal-estimates/schema', spec: 'MEAL_ESTIMATES', expect: {'foods.health_fixture-estimate.source': 'photo', keepPhotos: true}});
  // Session AJ (item 6, CO6, D7; TIER 3 (stored format)): where each wealth reading came from, a new device-only key (fictional ids).
  records[READING_SOURCES_KEY] = JSON.stringify({version: 1, since: '2026-10-29T10:00:00.000Z', readings: {'valuation:fixture-1:00000000-0000-4000-8000-000000000001': 'market', 'valuation:fixture-2:00000000-0000-4000-8000-000000000002': 'staking'}});
  // Session AJ (item 15, D9; TIER 3 (stored format)): price alerts, a new device-only key (fictional ids and figures).
  records[PRICE_ALERTS_KEY] = JSON.stringify({version: 1, alerts: [{id: 'alert_fixture-0001', kind: 'price', coin: 'bitcoin', coinName: 'Fictional coin', currency: 'USD', direction: 'above', price: '12345', createdAt: '2026-10-29T10:00:00.000Z', active: true, channels: {inApp: true, push: false}}], fired: []});
  checks.push({key: READING_SOURCES_KEY, module: './wealth-sources/schema', spec: 'READING_SOURCES', expect: {since: '2026-10-29T10:00:00.000Z'}});
  checks.push({key: PRICE_ALERTS_KEY, module: './price-alerts/schema', spec: 'PRICE_ALERTS', expect: {'alerts.0.price': '12345'}});
  // Session AJ (item 30, D11; TIER 3 (stored format)): the trader tools' opt-in and tilt dismissal, an optional group in the
  // loose UI preferences; an older build keeps or ignores it. Item 32 (D5): the Customize `look` group rides the same record.
  records[UI_PREFS_KEY] = JSON.stringify({version: 1, heroCollapsed: true, trader: {on: true, tiltHiddenUntil: '2026-11-05'}, focusWindow: false, lifeScore: true, look: {font: 'inter', textSize: 'large', density: 'compact', glow: 'soft'}});
  checks.push({key: UI_PREFS_KEY, module: './ui-prefs/schema', spec: 'UI_PREFS', expect: {heroCollapsed: true}});
  // Session AJ (item 34, D13; TIER 3 (stored format)): Focus Sessions, a new device-only key (fictional ids).
  records[FOCUS_SESSIONS_KEY] = JSON.stringify({version: 1, sessions: [{id: 'focus_fixture-0001', startedAt: '2026-10-29T09:00:00.000Z', endedAt: '2026-10-29T09:25:00.000Z', day: '2026-10-29', plannedMinutes: 25, focusedSeconds: 1440, awaySeconds: 60, outcome: 'grown'}]});
  checks.push({key: FOCUS_SESSIONS_KEY, module: './focus-sessions/schema', spec: 'FOCUS_SESSIONS', expect: {'sessions.0.outcome': 'grown'}});
  // Session AJ (item 27, D12; TIER 3 (stored format)): a workout imported from a GPX file keeps an optional summary
  // (`imported`) in the loose workouts record; an older build keeps or ignores it (fictional figures).
  records[WORKOUTS_KEY] = JSON.stringify({version: 1, workouts: [{id: 'w_fixture-1', name: 'Run (imported)', date: '2026-10-28', type: 'cardio', startedAt: '2026-10-28T07:00:00.000Z', endedAt: '2026-10-28T07:30:00.000Z', exercises: [], imported: {source: 'gpx', importId: '20261028T0700Z-1800s-5000m', sport: 'running', distanceKm: 5, elevationM: 40, avgHr: 148, durationSeconds: 1800}},
    // Session AK (4.7, 4.9; TIER 3 (stored format)): RPE, supersets, rest per exercise, a FIT summary and the plate set, all optional.
    {id: 'w_fixture-2', name: 'Strength', date: '2026-10-29', type: 'strength', startedAt: '2026-10-29T07:00:00.000Z', endedAt: '2026-10-29T07:45:00.000Z', exercises: [{id: 'e1', exerciseId: 'bench-press', name: 'Bench press', measure: 'weight-reps', supersetId: 'A', restSeconds: 120, sets: [{id: 's1', kind: 'normal', reps: 5, weightKg: 60, done: true, rpe: 8.5}]}]},
    {id: 'w_fixture-3', name: 'Ride (FIT)', date: '2026-10-30', type: 'cardio', startedAt: '2026-10-30T07:00:00.000Z', endedAt: '2026-10-30T08:00:00.000Z', exercises: [], fileImport: {source: 'fit', importId: 'fit-20261030-1', sport: 'cycling', distanceKm: 30, durationSeconds: 3600}}],
    templates: [], exercises: [], restSeconds: 90, plates: {unit: 'kg', bar: 20, plates: [{size: 20, pairs: 2}, {size: 10, pairs: 2}]}});
  checks.push({key: WORKOUTS_KEY, module: './workouts/schema', spec: 'WORKOUTS', expect: {'workouts.0.name': 'Run (imported)'}});
  // Session AJ (item 34, D13; TIER 3 (stored format)): Guided journeys, a new device-only key (fictional).
  records[GUIDED_JOURNEYS_KEY] = JSON.stringify({version: 1, journeys: [{programId: 'walking-start', startedOn: '2026-10-27', done: ['walk-1']}]});
  checks.push({key: GUIDED_JOURNEYS_KEY, module: './guided/schema', spec: 'GUIDED_JOURNEYS', expect: {'journeys.0.programId': 'walking-start'}});
  // Session AK Part 2 (ADR-036 Q3; TIER 3 (stored format)): notification choices, a new device-only key.
  records[NOTIFY_KEY] = JSON.stringify({version: 1, types: {habits: true, evening: true, future: false}, morning: {time: '07:45'}, here: true});
  checks.push({key: NOTIFY_KEY, module: './notify/prefs', spec: 'NOTIFY_PREFS', expect: {'morning.time': '07:45'}});
  // Session AK Part 1d (MUSIC; TIER 3 (stored format)): the sound mix, a new device-only key (zigoals:music:v1 unchanged).
  records[MUSIC_MIX_KEY] = JSON.stringify({version: 1, mix: {v: 1, active: true, layers: [{sound: 'rain', level: 0.6}, {sound: 'pad', level: 0.3}]}, master: 40, timerMin: 30, preset: 'wind-down', playOnSilent: false});
  checks.push({key: MUSIC_MIX_KEY, module: './music/mix-store', spec: 'MUSIC_MIX', expect: {timerMin: 30}});
  // Session AK Parts 5 and 7 (TIER 3 (stored format)): five new device-only keys (fictional values).
  records[BILLS_KEY] = JSON.stringify({version: 1, bills: [{id: 'b1', title: 'Fictional rent', amount: '900.00', currency: 'EUR', cadence: 'monthly', nextDue: '2026-11-01', origin: 'manual', createdAt: '2026-10-27T12:00:00.000Z'}], dismissed: []});
  checks.push({key: BILLS_KEY, module: './bills/schema', spec: 'BILLS', expect: {'bills.0.amount': '900.00'}});
  records[BUDGETS_KEY] = JSON.stringify({version: 1, budgets: [{id: 'g1', category: 'Food', currency: 'EUR', monthly: '400.00', rollover: true, since: '2026-10'}]});
  checks.push({key: BUDGETS_KEY, module: './budgets/schema', spec: 'BUDGETS', expect: {'budgets.0.category': 'Food'}});
  records[TARGET_ALLOCATION_KEY] = JSON.stringify({version: 1, basis: 'class', targets: [{key: 'crypto', label: 'Crypto', percent: '20'}], band: 5});
  checks.push({key: TARGET_ALLOCATION_KEY, module: './allocation/target', spec: 'TARGET_ALLOCATION', expect: {band: 5}});
  records[CSV_MAPPINGS_KEY] = JSON.stringify({version: 1, mappings: [{id: 'm1', name: 'Fictional bank', target: 'money', columns: {date: 'Date', amount: 'Amount'}, savedAt: '2026-10-27T12:00:00.000Z'}]});
  checks.push({key: CSV_MAPPINGS_KEY, module: './csv/templates/saved', spec: 'CSV_MAPPINGS', expect: {'mappings.0.name': 'Fictional bank'}});
  records[AUTO_RULES_KEY] = JSON.stringify({version: 1, rules: [{id: 'r1', source: 'steps', comparator: 'at-least', threshold: 8000, unit: 'steps', habitId: '00000000-0000-4000-8000-000000000001', createdAt: '2026-10-27T08:00:00.000Z'}], applied: []});
  checks.push({key: AUTO_RULES_KEY, module: './auto-rules/schema', spec: 'AUTO_RULES', expect: {'rules.0.threshold': 8000}});
  records[BACKUP_REMINDER_KEY] = JSON.stringify({version: 1, savedOn: '2026-10-01', askedOn: '2026-10-20'});
  checks.push({key: BACKUP_REMINDER_KEY, module: './backup-reminder', spec: 'BACKUP_REMINDER', expect: {savedOn: '2026-10-01'}});
  // Session AK Part 4 (TIER 3 (stored format)): four new device-only Health keys (fictional values).
  records[FOOD_SCANS_KEY] = JSON.stringify({version: 1, scans: [{barcode: '7610000000001', name: 'Fictional muesli', source: 'Open Food Facts', at: '2026-10-28T08:00:00.000Z', count: 2, foodId: 'health_fixture-muesli', quantityMilli: 60000, meal: 'Breakfast'}]});
  checks.push({key: FOOD_SCANS_KEY, module: './food-scans/schema', spec: 'FOOD_SCANS', expect: {'scans.0.count': 2}});
  records[NUTRIENT_EXTRAS_KEY] = JSON.stringify({version: 1, foods: {'health_fixture-muesli': {magnesiumMg: 90000, zincMg: 2500}}});
  checks.push({key: NUTRIENT_EXTRAS_KEY, module: './health-vitamins/extras', spec: 'NUTRIENT_EXTRAS_RECORD', expect: {'foods.health_fixture-muesli.zincMg': 2500}});
  records[GROCERY_KEY] = JSON.stringify({version: 1, ticks: {'2026-10-26|oats|g': {on: true, at: '2026-10-27T10:00:00.000Z'}}, pantry: {Salt: '2026-10-27T10:00:00.000Z'}, showFrequent: true});
  checks.push({key: GROCERY_KEY, module: './grocery/schema', spec: 'GROCERY_RECORD', expect: {showFrequent: true}});
  records[CALORIE_WEEK_KEY] = JSON.stringify({version: 1, shifts: [-100, -100, -100, -100, 0, 200, 200], rollover: {on: true, maxKcal: 300}});
  checks.push({key: CALORIE_WEEK_KEY, module: './health-aa/calorie-week', spec: 'CALORIE_WEEK', expect: {'rollover.maxKcal': 300}});
  records[COMPARE_PAIR_KEY] = JSON.stringify({version: 1, factor: 'workout', outcome: 'energy', lag: 'next'});
  checks.push({key: COMPARE_PAIR_KEY, module: './compare/schema', spec: 'COMPARE_PAIR', expect: {lag: 'next'}});
  records[SUPPLEMENTS_KEY] = JSON.stringify({version: 1, items: [{id: 'supp_fixture1', name: 'Fictional vitamin D', dose: '1 drop', kind: 'supplement', times: ['09:00'], weekdays: 127, remind: true, createdAt: '2026-10-31T09:00:00.000Z'}], log: [{itemId: 'supp_fixture1', date: '2026-10-31', slot: '09:00', status: 'taken', at: '2026-10-31T09:01:00.000Z'}]});
  checks.push({key: SUPPLEMENTS_KEY, module: './supplements/schema', spec: 'SUPPLEMENTS', expect: {'items.0.name': 'Fictional vitamin D'}});
  // Owner follow-up 1 (F4, TIER 3 (stored format)): governance vote reminders (fictional proposal).
  records[GOV_REMINDERS_KEY] = JSON.stringify({version: 1, reminders: {'zig-test-2:7': {endsAt: '2026-11-05T10:00:00.000Z', title: 'Fictional proposal', setAt: '2026-10-31T09:00:00.000Z'}}});
  checks.push({key: GOV_REMINDERS_KEY, module: './zigchain-eco/governance', spec: 'GOV_REMINDERS', expect: {'reminders.zig-test-2:7.title': 'Fictional proposal'}});
  // Owner follow-up 2 (B): notes, daily notes and the capture inbox.
  records[NOTES_KEY] = JSON.stringify({version: 1, notes: [{id: "note_fixture1", kind: "topic", title: "Fictional topic", body: "See [[Read]]", createdAt: "2026-11-01T09:00:00.000Z"}], voice: false});
  checks.push({key: NOTES_KEY, module: './notes/schema', spec: 'NOTES', expect: {"notes.0.title": "Fictional topic"}});
  // Owner follow-up 2 (T2): calendars imported from .ics files (read-only events).
  records[CALENDAR_IMPORT_KEY] = JSON.stringify({version: 1, calendars: [{id: "cal_fixture1", name: "Fictional work", importedAt: "2026-11-01T09:00:00.000Z", events: [{id: "0123456789abcdef", title: "Fictional stand-up", allDay: false, start: "2026-11-03T09:30", minutes: 15}]}]});
  checks.push({key: CALENDAR_IMPORT_KEY, module: './ics/calendar', spec: 'CALENDAR_IMPORT', expect: {"calendars.0.name": "Fictional work"}});
  // Owner follow-up 1 (BUILD list 2 #8): experiments, one change compared with the days before.
  records[EXPERIMENTS_KEY] = JSON.stringify({version: 1, items: [{id: "exp_fixture1", title: "Fictional walk after lunch", factor: "habit:fixture-habit-1", outcome: "mood", start: "2026-10-01", days: 14}]});
  checks.push({key: EXPERIMENTS_KEY, module: './experiments/store', spec: 'EXPERIMENTS', expect: {"items.0.days": 14}});
  // Owner follow-up 1 (BUILD list 2 #5): the optional Your first week card.
  records[FIRST_WEEK_KEY] = JSON.stringify({version: 1, startedOn: "2026-10-27", done: {"first-habit": "2026-10-27"}});
  checks.push({key: FIRST_WEEK_KEY, module: './first-week/store', spec: 'FIRST_WEEK', expect: {"startedOn": "2026-10-27"}});
  // Owner follow-up 1 (BUILD list 2 #3): On this day, its switch and the memories hidden from it.
  records[JOURNAL_DISPLAY_KEY] = JSON.stringify({version: 1, onThisDay: true, hidden: ["journal-fixture-1"]});
  checks.push({key: JOURNAL_DISPLAY_KEY, module: './on-this-day/store', spec: 'JOURNAL_DISPLAY', expect: {"hidden.0": "journal-fixture-1"}});
  // Owner follow-up 1 (F5): the agenda view and filters.
  records[AGENDA_KEY] = JSON.stringify({version: 1, view: "week", hidden: ["bill"]});
  checks.push({key: AGENDA_KEY, module: './agenda/store', spec: 'AGENDA', expect: {"view": "week"}});
  // Owner follow-up 1 (F5): ZIGoals Wrapped, the day each year was opened.
  records[WRAPPED_KEY] = JSON.stringify({version: 1, opened: {"2026": "2026-12-02"}});
  checks.push({key: WRAPPED_KEY, module: './wrapped/store', spec: 'WRAPPED', expect: {"opened.2026": "2026-12-02"}});
  // Owner follow-up 1 (F5): the debt payoff planner figures.
  records[DEBT_PLANNER_KEY] = JSON.stringify({version: 1, currency: "EUR", extra: "100.00", debts: {"acct-fixture-1": {minimum: "25.00", ratePercent: "19.9"}}});
  checks.push({key: DEBT_PLANNER_KEY, module: './debt-planner/store', spec: 'DEBT_PLANNER', expect: {"debts.acct-fixture-1.minimum": "25.00"}});
  // Owner follow-up 1 (F5): savings challenges on goals.
  records[SAVINGS_CHALLENGES_KEY] = JSON.stringify({version: 1, goals: {"9202": {kind: "52-week", startedOn: "2026-10-05", step: "5", order: "up"}}});
  checks.push({key: SAVINGS_CHALLENGES_KEY, module: './savings-challenges/challenges', spec: 'SAVINGS_CHALLENGES', expect: {"goals.9202.kind": "52-week"}});
  // Owner follow-up 1 (F5): net-worth milestones.
  records[NETWORTH_MILESTONES_KEY] = JSON.stringify({version: 1, enabled: true, currency: "EUR", amounts: ["10000"], reached: [{currency: "EUR", amount: "10000", on: "2026-10-20", quiet: true}]});
  checks.push({key: NETWORTH_MILESTONES_KEY, module: './networth-milestones/milestones', spec: 'NETWORTH_MILESTONES', expect: {"amounts.0": "10000"}});
  // Owner follow-up 2 (T1, T3; TIER 3 (stored format)): optional fields on existing records — a task's time and goal link,
  // the agenda's hidden extra kinds, and the focus sessions' Pomodoro settings and block fields. Older builds keep or ignore them.
  { const t = JSON.parse(records[TASKS_KEY] ?? '{"version":1,"tasks":[]}') as {tasks: unknown[]}; records[TASKS_KEY] = JSON.stringify({...t, tasks: [...(t.tasks ?? []), {id: 'task_fixture_t1', title: 'Fictional: book', priority: 'normal', due: '2026-11-04', time: '10:30', goal: 'private:goal-1', createdAt: '2026-11-01T09:00:00.000Z'}]}); }
  { const a = JSON.parse(records[AGENDA_KEY]!) as Record<string, unknown>; records[AGENDA_KEY] = JSON.stringify({...a, hiddenExtra: ['event']}); }
  { const f = JSON.parse(records[FOCUS_SESSIONS_KEY] ?? '{"version":1}') as Record<string, unknown>; records[FOCUS_SESSIONS_KEY] = JSON.stringify({...f, pomodoro: {work: 25, shortBreak: 5, longBreak: 15, cycles: 4, sound: true, tickTask: true}}); }
  // Owner follow-up 2 (N2, N12): NOVA layout, widgets, quick access, persona and panels.
  records[NOVA_KEY] = JSON.stringify({version: 1, openingSeen: true, layout: "bento", widgets: [{id: "orbit", size: "M", slot: 0}], persona: {name: "Fictional NOVA", avatar: "orb"}, accent: "cyan", panels: {left: "rail", right: "hidden"}});
  // Session AM (D18, deliberate): both NOVA records are carried by the `nova` extras section now, so the Showcase's went
  // through the extras merge above and each has its check already (one check per key, as before); the records below
  // replace them and the checks take the same expectations as before.
  const novaCheck = (key: string, expect: Record<string, unknown>) => { const held = checks.filter(c => c.key === key); if (held.length !== 1) throw Error(`${key}: one check from the extras merge was expected, found ${held.length}.`); held[0]!.expect = expect; };
  novaCheck(NOVA_KEY, {"persona.name": "Fictional NOVA"});
  // Session AM (ADR-038 D16; TIER 3 (stored format), additive key): NOVA's stage record — a made widget, its parameters and one request.
  records[NOVA_STAGE_KEY] = JSON.stringify({version: 1, made: [{id: "weight", at: "2026-11-11T09:00:00.000Z"}], params: {weight: {range: "month"}}, asks: [{id: "a1", at: "2026-11-11T09:00:00.000Z", text: "What is my weight progress this month?", widgets: ["weight"], device: "computer", by: "device"}]});
  novaCheck(NOVA_STAGE_KEY, {"made.0.id": "weight", "params.weight.range": "month", "asks.0.text": "What is my weight progress this month?"});
  // Session AM (ADR-038 D17; TIER 3 (stored format), additive key): NOVA's outside-data record — the weather switch and a fictional place.
  records[NOVA_WORLD_KEY] = JSON.stringify({version: 1, on: true, place: {name: "Brussels", lat: 50.85, lon: 4.35}});
  checks.push({key: NOVA_WORLD_KEY, module: './nova/world/record', spec: 'NOVA_WORLD', expect: {"on": true, "place.name": "Brussels", "place.lat": 50.85}});
  // Owner follow-up 2 (N1): which chats started in NOVA and which turns were delegated (no message text).
  records[NOVA_BRIDGE_KEY] = JSON.stringify({version: 1, origins: {"chat-fixture-1": "2026-11-01T09:00:00.000Z"}, delegated: {"turn-fixture-1": {chat: "chat-fixture-1", area: "goals", role: "task", agent: "zigi"}}, speechInput: false});
  checks.push({key: NOVA_BRIDGE_KEY, module: './nova/bridge', spec: 'NOVA_BRIDGE', expect: {"origins.chat-fixture-1": "2026-11-01T09:00:00.000Z"}});
  // Owner follow-up 2 (N6): NOVA briefs composed on the device.
  records[NOVA_BRIEFS_KEY] = JSON.stringify({version: 1, briefs: [{id: "morning:2026-11-01", kind: "morning", day: "2026-11-01", at: "2026-11-01T07:00:00.000Z", lines: ["Fictional line"]}]});
  checks.push({key: NOVA_BRIEFS_KEY, module: './nova/briefs', spec: 'NOVA_BRIEFS', expect: {"briefs.0.kind": "morning"}});
  // Owner follow-up 2 (N6): NOVA custom workflows (names, instructions, steps; no records).
  records[NOVA_WORKFLOWS_KEY] = JSON.stringify({version: 1, custom: [{id: "wf_fixture1", from: "review-week", title: "Fictional review", instruction: "Keep it short", skip: [], createdAt: "2026-11-01T09:00:00.000Z", updatedAt: "2026-11-01T09:00:00.000Z", imported: true}]}); // Z1A-5: imported workflows are marked
  checks.push({key: NOVA_WORKFLOWS_KEY, module: './nova/workflows/schema', spec: 'NOVA_WORKFLOWS', expect: {"custom.0.title": "Fictional review", "custom.0.imported": true}});
  // Owner follow-up 2 (N3): the setup guide progress and the privacy mode.
  records[NOVA_SETUP_KEY] = JSON.stringify({version: 1, steps: {meet: {doneOn: "2026-11-01"}}, privacyMode: "strict", privacyChosenOn: "2026-11-01", cloudModels: ["fictional:cloud"], firstLocalReply: "Fictional first reply"}); // P4 (FR-12): the first on-device reply kept for the guide // Z1A-7: Ollama models it marks as remote
  checks.push({key: NOVA_SETUP_KEY, module: './nova/setup', spec: 'NOVA_SETUP', expect: {"privacyMode": "strict", "cloudModels.0": "fictional:cloud", "firstLocalReply": "Fictional first reply"}});
  // Owner follow-up 3 (N11): the Hermes Agent connection and guide progress (the key stays in the key store).
  records[NOVA_HERMES_KEY] = JSON.stringify({version: 1, baseUrl: "http://127.0.0.1:8642", localModelConfirmed: true, steps: {install: {doneOn: "2026-11-01"}}});
  checks.push({key: NOVA_HERMES_KEY, module: './nova/hermes-record', spec: 'NOVA_HERMES', expect: {"baseUrl": "http://127.0.0.1:8642"}});
  // Owner follow-up 2 (N7, N2 cost meter; TIER 3 (stored format)): optional fields on ZIGi's memory notes (kind, pinned,
  // where it came from, its date) and on the usage record (a daily cap and per-day counts). Older builds keep or ignore them.
  { const m = JSON.parse(records[AI_MEMORY_KEY]!) as {notes: Record<string, unknown>[]}; m.notes = m.notes.map((n, i) => i === 0 ? {...n, kind: 'person', pinned: true, from: {by: 'nova', label: 'NOVA chat'}, about: '2026-10-01'} : n); records[AI_MEMORY_KEY] = JSON.stringify(m); }
  { const u = JSON.parse(records['zigoals:ai-usage:v1'] ?? '{"version":1}') as Record<string, unknown>; records['zigoals:ai-usage:v1'] = JSON.stringify({...u, dailyCap: {amount: '1', currency: 'USD', mode: 'ask'}, days: {'2026-11-01': {openai: {input: 1, output: 1, requests: 1}}}}); }
  // Owner follow-up 2 (G1 #4): Your numbers (TIER 3 stored format, additive).
  records[HEALTH_NUMBERS_KEY] = JSON.stringify({version: 1, entries: [{id: "bp1", date: "2026-10-30", kind: "bp", systolic: 124, diastolic: 80, pulse: 66}, {id: "lab1", date: "2026-10-28", kind: "lab", name: "Glucose (fasting)", value: 5.4, unit: "mmol/L", refLow: 3.9, refHigh: 5.6}]});
  checks.push({key: HEALTH_NUMBERS_KEY, module: './health-numbers/store', spec: 'HEALTH_NUMBERS', expect: {"entries.1.value": 5.4}});
  // Owner follow-up 2 (G1 #12): your own 1-5 scales.
  records[SCALES_KEY] = JSON.stringify({version: 1, scales: [{id: "stress", name: "Stress", low: "calm", high: "very tense"}], days: {"2026-10-31": {stress: 2, pain: 3}}, retired: [{id: "pain", name: "Pain", low: "none", high: "a lot"}]});
  checks.push({key: SCALES_KEY, module: './scales/store', spec: 'SCALES', expect: {"days.2026-10-31.pain": 3}});
  // Owner follow-up 2 (G1 #16): the cycle log, off by default; Health-describing.
  records[CYCLE_KEY] = JSON.stringify({version: 1, on: true, days: {"2026-10-03": {flow: "medium", symptoms: ["cramps"]}, "2026-10-20": {note: "Slept badly"}}});
  checks.push({key: CYCLE_KEY, module: './cycle/store', spec: 'CYCLE', expect: {"days.2026-10-03.flow": "medium"}});
  // Owner follow-up 2 (G1 #15): the Pomodoro bell and breaks.
  records[FOCUS_ROUNDS_KEY] = JSON.stringify({version: 1, bell: "chime", volume: 40, quietBreaks: false});
  checks.push({key: FOCUS_ROUNDS_KEY, module: './focus-rounds/store', spec: 'FOCUS_ROUNDS', expect: {"volume": 40}});
  // Owner follow-up 2 (G1 #21): Was this useful? under ZIGi notes.
  records[INSIGHT_FEEDBACK_KEY] = JSON.stringify({version: 1, marks: [{kind: "pairing", verdict: "not-for-me", at: "2026-11-01T09:00:00.000Z"}]});
  checks.push({key: INSIGHT_FEEDBACK_KEY, module: './insight-feedback/store', spec: 'INSIGHT_FEEDBACK', expect: {"marks.0.verdict": "not-for-me"}});
  // @wired-end
  records[MONEY_RULES_KEY] = JSON.stringify({version: 1, rules: [{id: 'r1', field: 'payee', op: 'contains', text: 'fictional grocer', direction: 'out', category: 'Groceries', enabled: true}]});
  checks.push({key: MONEY_RULES_KEY, module: './money-rules/schema', spec: 'MONEY_RULES', expect: {'rules.0.category': 'Groceries'}});
  records[MONEY_REVIEW_KEY] = JSON.stringify({version: 1, ids: ['m-fixture-1']});
  checks.push({key: MONEY_REVIEW_KEY, module: './money-review/review', spec: 'MONEY_REVIEW', expect: {'ids.0': 'm-fixture-1'}});
  records[FI_MODEL_KEY] = JSON.stringify({version: 1, inputs: {invested: 10000, yearlySpend: 24000, monthlyContribution: 500, withdrawalPct: 4, returnPct: 5, volatilityPct: 15, years: 30, currency: 'EUR'}});
  checks.push({key: FI_MODEL_KEY, module: './fi-model/store', spec: 'FI_MODEL', expect: {'inputs.withdrawalPct': 4}});
  records[EMERGENCY_SHEET_KEY] = JSON.stringify({version: 1, documents: {}, accounts: [{id: 'a1', name: 'Fictional current account'}], wallets: [], insurance: [], note: 'Fictional note'});
  checks.push({key: EMERGENCY_SHEET_KEY, module: './emergency-sheet/schema', spec: 'EMERGENCY_SHEET', expect: {note: 'Fictional note'}});
  records[MUSCLE_RECOVERY_KEY] = JSON.stringify({version: 1, days: {Legs: 4}});
  checks.push({key: MUSCLE_RECOVERY_KEY, module: './muscle-freshness/model', spec: 'MUSCLE_RECOVERY', expect: {'days.Legs': 4}});
  records[FOOD_DISPLAY_KEY] = JSON.stringify({version: 1, nutriScore: true, abFirst: true, grades: [{barcode: '4006381333931', grade: 'b'}]});
  checks.push({key: FOOD_DISPLAY_KEY, module: './food-display/schema', spec: 'FOOD_DISPLAY', expect: {nutriScore: true}});
  records[REWARDS_SHELF_KEY] = JSON.stringify({version: 1, on: true, rewards: [{id: 'r1', name: 'Fictional cinema night', price: 300, createdAt: '2026-10-31T10:00:00.000Z'}], claims: []});
  checks.push({key: REWARDS_SHELF_KEY, module: './rewards-shelf/store', spec: 'REWARDS_SHELF', expect: {'rewards.0.price': 300}});
  return {records, checks, finance: {accounts: 1, dates: 1}, layout: {key: LAYOUT_KEY, page: 'habits', region: 'body', added: 'habits:routines', older: ['habits:overview', 'habits:consistency', 'habits:list', 'habits:rhythm']}};
}

test('the frozen-reader fixture is read by this build', async () => {
  const fixture = frozenFixture();
  // Every extras record the sections carry is in the fixture with its older readers named (Gate C test audit: no filter, so
  // a record missing from the fixture fails here instead of dropping out of both sides).
  const carried = EXTRAS_SECTIONS.flatMap(x => x.records.map(r => r.spec.key));
  expect(carried.filter(k => k !== GOAL_EXTRAS_KEY && !fixture.records[k])).toEqual([]);
  expect(fixture.checks.map(c => c.key.replace('#merged', '')).sort()).toEqual([...carried, GOAL_EXTRAS_KEY, LINKED_WALLETS_KEY, EARN_PATH_KEY, EARN_ACADEMY_KEY, EARN_PREFS_KEY, STAKING_PREFS_KEY, STAKING_JOURNAL_KEY, WALLET_BALANCES_KEY, GOAL_VAULTS_KEY, VALIDATOR_ALERTS_KEY, ZIGI_PLANS_KEY, UNIVERSE_KEY, DAY_TIMELINE_KEY, STORIES_KEY, MONEY_LOG_KEY, JOURNAL_KEY, ENERGY_KEY, AI_MEMORY_KEY, MEAL_ESTIMATES_KEY, ZIGI_KEY, TASKS_KEY, RECEIPTS_KEY, IMPORTS_KEY, EXCHANGES_KEY, ZIGI_METRICS_KEY, READING_SOURCES_KEY, PRICE_ALERTS_KEY, UI_PREFS_KEY, FOCUS_SESSIONS_KEY, WORKOUTS_KEY, GUIDED_JOURNEYS_KEY, NOTIFY_KEY, MUSIC_MIX_KEY, BILLS_KEY, BUDGETS_KEY, TARGET_ALLOCATION_KEY, CSV_MAPPINGS_KEY, AUTO_RULES_KEY, BACKUP_REMINDER_KEY, FOOD_SCANS_KEY, NUTRIENT_EXTRAS_KEY, GROCERY_KEY, CALORIE_WEEK_KEY, COMPARE_PAIR_KEY, MUSCLE_RECOVERY_KEY, FOOD_DISPLAY_KEY, REWARDS_SHELF_KEY, MONEY_RULES_KEY, MONEY_REVIEW_KEY, FI_MODEL_KEY, EMERGENCY_SHEET_KEY, SUPPLEMENTS_KEY, GOV_REMINDERS_KEY, INSIGHT_FEEDBACK_KEY, FOCUS_ROUNDS_KEY, CYCLE_KEY, SCALES_KEY, HEALTH_NUMBERS_KEY, NOVA_HERMES_KEY, NOVA_SETUP_KEY, NOVA_WORKFLOWS_KEY, NOVA_BRIEFS_KEY, NOVA_BRIDGE_KEY, /* Session AM (D18, deliberate): NOVA_KEY and NOVA_STAGE_KEY are in `carried` now (the nova extras section), once each as before */ NOVA_WORLD_KEY, CALENDAR_IMPORT_KEY, NOTES_KEY, NETWORTH_MILESTONES_KEY, SAVINGS_CHALLENGES_KEY, DEBT_PLANNER_KEY, WRAPPED_KEY, AGENDA_KEY, JOURNAL_DISPLAY_KEY, FIRST_WEEK_KEY, EXPERIMENTS_KEY].sort());
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
  // Session AL (frozen readers at #53): three records were not ones this build writes — a target percent as a number (the
  // schema and setTargets keep strings), an auto-rule without its unit and createdAt, an agenda source "bills" (the source
  // is "bill") — so #53's readers refused them although no writer produces them. Every record named by a check must parse
  // with this build's own reader first, so the proof only ever carries records this build can write.
  for (const check of fixture.checks) {
    const mod = await import(`../${check.module.slice(2)}`) as Record<string, {schema?: {safeParse(v: unknown): {success: boolean}}; safeParse?(v: unknown): {success: boolean}}>;
    const spec = mod[check.spec]; const schema = spec?.schema ?? spec;
    if (!schema?.safeParse) continue;
    expect(schema.safeParse(JSON.parse(fixture.records[check.key]!)).success, `${check.key} is a record this build reads`).toBe(true);
  }
  if (process.env.FROZEN_OUT) writeFileSync(process.env.FROZEN_OUT, JSON.stringify(fixture));
});

// @vitest-environment jsdom
import 'fake-indexeddb/auto';
import {afterAll, beforeAll, describe, expect, test, vi} from 'vitest';

// jsdom's Blob cannot pass through IndexedDB's structured clone; Node's can (as in lib/restore/r5-restore-media.test.ts).
vi.hoisted(() => { (globalThis as {Blob: unknown}).Blob = (process as unknown as {getBuiltinModule: (id: string) => {Blob: unknown}}).getBuiltinModule('node:buffer').Blob; });

import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {DEVICE_KEYS, EVERYTHING_KEYS, MODULE_KEYS, TEXT_DEVICE_KEYS} from './export/everything';
import {buildEverythingExport} from './export/make-everything';
import {ERASE_PREFIX, eraseEverythingOnThisDevice, zigoalsKeys, type EraseResult} from './erase-everything';
import {forgetAaDeviceRecords} from './aa-device-forget';
import {DEVICE_ONLY, KEPT_NOT_EXPORTED, SYNCED} from './data-health/catalog';
import {MODULE_PARTS, NEVER_RESTORED, RESTORABLE_DEVICE_PARTS, partValueOf, planParts, type DevicePart, type ModulePart, type PlannedPart} from './restore/plan';
import {openBackup, type OpenedBackup} from './restore/read-backup';
import {RESTORE_UNDO_KEY, applyRestore, forgetRestoreUndo, type RestoreOutcome} from './restore/apply';
import {NON_PERSONAL_KEYS} from './onboarding';
import {PORTFOLIO_KEY} from './portfolio/schema';
import {PROGRESS_PHOTOS_KEY} from './aa-device-keys';
import {getPhotoBlob, putPhotoBlob} from './health-aa/photos';
import {indexedDbChatStore, newChat} from './ai/chats';
import {AV2_R6_NOTES_NOT_RECORDS} from './av2-r6-notes-keys';
import {AW_X6_NOT_RECORDS} from './aw-x6-keys';
import {AW_X7_NOT_RECORDS} from './aw-x7-money-keys';
import {buildShowcase, showcaseChoices} from './showcase-data';
import {showcasePortfolios} from './portfolio/showcase';
import {defaultAiSettings} from './ai/settings';
// The frozen-reader fixture is the richest set of fictional records this build writes; its own test runs here once more.
import {frozenFixture} from './vault/frozen-fixtures.test';

/**
 * Session AW Part 6 (the owner's brief): the whole round trip, for every record kind the app stores. A device holds one
 * fictional sample of every key in Export everything (the four synced modules, the Portfolio and every device key, read
 * from EVERYTHING_KEYS, never a hand-made list), ZIGi's conversations and a progress photo, and the records Export
 * everything leaves out on purpose (lib/erase-coverage.test.ts NOT_RECORDS). Then the real paths run, as Settings runs
 * them: Export everything (lib/export/make-everything.ts) → Erase everything (lib/erase-everything.ts, the Settings
 * button) → the device holds no ZIGoals key or store → Restore from a backup (read-backup, plan, apply; every part,
 * Replace) → every restorable record reads back, through its own reader, exactly as it was. What is never restored stays
 * away (plan.ts NEVER_RESTORED), and what is never exported never comes back. A new key in Export everything fails the
 * first test here until it has a sample. Fictional data only.
 */
const DAY = '2026-10-13', AT = '2026-10-13T08:00:00.000Z';
const isObject = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);

/** A small valid JPEG header (the restore checks the size in the header before storing a photo). */
function jpeg(w = 64, h = 48) {
  const app0 = [0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 1, 1, 0, 0, 1, 0, 1, 0, 0];
  const sof = [0xff, 0xc0, 0x00, 0x11, 0x08, h >> 8, h & 255, w >> 8, w & 255, 3, 1, 0x22, 0, 2, 0x11, 1, 3, 0x11, 1];
  return new Uint8Array([0xff, 0xd8, ...app0, ...sof, 0xff, 0xd9]);
}
const PHOTO = jpeg(), PHOTO_ID = 'photo_roundtrip-01';

/**
 * Fictional samples for the keys neither the frozen-reader fixture nor the Showcase holds. Each is only added where the
 * two hold nothing (a test below says when one is no longer needed).
 */
const HABIT = 'f0000000-0000-4000-8000-000000000001', HABIT_2 = 'f0000000-0000-4000-8000-000000000002';
const SEEDS: Record<string, unknown> = {
  [PROGRESS_PHOTOS_KEY]: {version: 1, photos: [{id: PHOTO_ID, date: '2026-10-12', pose: 'front', note: 'After the long walk', bytes: PHOTO.length, type: 'image/jpeg', at: AT}]},
  // The Portfolio as the Showcase draws it (lib/portfolio/showcase.ts).
  [PORTFOLIO_KEY]: showcasePortfolios(DAY),
  // Restored records (each read through its part's reader below).
  'zigoals:reminders:v1': {version: 1, habits: {[HABIT]: {time: '07:30'}}, water: {time: '10:00'}, dismissed: {[HABIT]: '2026-10-12'}},
  'zigoals:habit-health-links:v1': {version: 1, links: {[HABIT]: {version: 1, measure: 'water', rule: 'at-least', target: 2000, updatedAt: AT}, [HABIT_2]: {version: 1, measure: 'weight', rule: 'recorded', updatedAt: AT}},
    applied: [{habitId: HABIT, date: '2026-10-12', healthDate: '2026-10-12', measure: 'water', value: 2250, appliedAt: AT}]},
  'zigoals:health-goals:v1': {version: 1, goals: [{version: 1, id: 'f0000000-0000-4000-8000-0000000000a1', name: 'Walk 8,000 steps', measure: 'steps', direction: 'at-least', target: {value: '8000', decimals: 0}, unit: 'steps',
    window: {kind: 'rolling', weeks: 4}, status: 'active', notes: 'Evenings count too', createdAt: AT, updatedAt: AT}]},
  'zigoals:weekly-review:v1': {version: 1, weekday: 0, reviews: [{weekStart: '2026-10-05', completedAt: AT, notes: {wentWell: 'Three early nights', intention: 'Cook twice midweek'}}, {weekStart: '2026-09-28', skipped: true}]},
  'zigoals:fasting:v1': {version: 1, sessions: [{id: 'fast-1', startedAt: '2026-10-11T20:00:00.000Z', endedAt: '2026-10-12T12:00:00.000Z', targetHours: 16, timeZone: 'Europe/Brussels', note: 'Easy one', stoppedBy: 'person'}]},
  'zigoals:insights:v1': {version: 1, dismissed: {'sleep-vs-steps': '2026-10-10'}},
  'zigoals:milestone-dates:v1': {version: 1, dates: {'1': {m1: '2026-12-01'}}},
  'zigoals:profile-name:v1': {version: 1, name: 'Mira', at: AT},
  'zigoals:markets-watchlist-more:v1': {version: 1, items: [{ref: {provider: 'coingecko', kind: 'coin', id: 'cosmos'}, name: 'Cosmos Hub', symbol: 'ATOM'}, {ref: {provider: 'coingecko', kind: 'rwa', id: 'gold-etf', assetType: 'etf'}, name: 'A gold ETF', symbol: 'GLD'}]},
  'zigoals:day-ends:v1': {version: 1, endsAt: 120, change: {at: AT, from: 0}},
  'zigoals:day-goal:v1': {version: 1, changes: [{from: '2026-09-01', need: 3}, {from: '2026-10-01', need: null}]},
  'zigoals:today-orbits:v1': {version: 1, shown: true},
  'zigoals:task-templates:v1': {version: 1, items: [{id: 'tpl-move', name: 'Moving house', createdAt: AT, items: [{title: 'Book the van', section: 'Before', offset: 0, minutes: 20}, {title: 'Pack the books', section: 'Before', parent: 0, offset: 2}]}],
    repeats: [{id: 'rep-month', name: 'Month end', every: 'month', start: '2026-10-01', lastMade: '2026-10-01', items: [{title: 'Pay the rent'}]}]},
  'zigoals:budget-periods:v1': {version: 1, paychecks: {items: [{id: 'p1', name: '1st', every: 'month', day: 1, amount: '1000.00', currency: 'EUR'}], lines: {'b:b1': 'p1'}}},
  'zigoals:workout-places:v1': {version: 1, places: [{id: 'place-home', name: 'Home', equipment: ['dumbbells', 'mat'], createdAt: AT}, {id: 'place-gym1', name: 'Gym', equipment: ['barbell', 'rack'], createdAt: AT}], current: 'place-home'},
  'zigoals:money-more:v1': {version: 1, saved: [{id: 's1', name: 'Coffee', kind: 'expense', amount: '3.20', currency: 'EUR', category: 'Eating out'}], owed: [{id: 'o1', name: 'Sam', amount: '12.00', currency: 'EUR', date: '2026-10-10'}],
    loans: [{id: 'l1', kind: 'lent', name: 'Noor', amount: '50.00', currency: 'EUR', date: '2026-09-20', repaid: [{date: '2026-10-01', amount: '20.00'}]}], streak: {on: true, looked: ['2026-10-12']}},
  'zigoals:store-cards:v1': {version: 1, cards: [{id: 'card-1', name: 'Library', number: '2900012345', format: 'code128', note: 'Branch on Main St', addedAt: AT}]},
  'zigoals:money-log-business:v1': {version: 1, weekStartsOn: 'monday', entries: [{id: 'b1', kind: 'income', amount: '400.00', currency: 'EUR', category: 'Clients', date: '2026-10-09', createdAt: AT}]},
  'zigoals:budgets-business:v1': {version: 1, budgets: [{id: 'bb1', category: 'Software', currency: 'EUR', monthly: '60.00', rollover: false, since: '2026-01'}]},
  'zigoals:workout-hr:v1': {version: 1, maxHr: 186, runs: {'workout-run-1': {from: 120, seconds: [60, 300, 900, 240]}}},
  'zigoals:note-cards:v1': {version: 1, reviews: [{id: 'c-abc123', due: '2026-10-15', interval: 3, ease: 2.5, reps: 2, lapses: 0, last: '2026-10-12', first: '2026-10-09'}]},
  'zigoals:low-day:v1': {version: 1, helps: ['A short walk', 'Tea by the window'], people: ['Sam: can we talk for ten minutes?'], later: ['Tidy the desk'], note: 'It passes.', updatedAt: AT},
  'zigoals:bring-up:v1': {version: 1, items: [{id: 'bu-0001-knee', text: 'The left knee after long runs', from: 'typed', day: '2026-10-11', createdAt: AT}]},
  // Health's "Hide calories and weight": plain text, not JSON (TEXT_DEVICE_KEYS).
  'zigoals:hide-body-figures': 'on',
  // Exported, never restored (NEVER_RESTORED): each a fictional record in its owner's shape.
  'zigoals:push:v1': {version: 1, subscriptionId: 'f0000000-0000-4000-8000-0000000000b1', endpointHash: 'a'.repeat(64), quiet: {from: '22:00', to: '07:00'}, lastSyncDay: '2026-10-12'},
  'zigoals:ai:v1': defaultAiSettings(),
  'zigoals:today-folds:v1': {version: 1, open: {habits: true}},
  'zigoals:ai-options:v1': {version: 1},
  'zigoals:ai-actions:v1': {version: 1, actions: []},
  'zigoals:zigi-reminders:v1': {version: 1},
  'zigoals:zigi-knock:v1': {version: 1, counts: {'2026-10-12': 1}},
  'zigoals:import-batches:v1': {version: 1, batches: [{id: 'f0000000-0000-4000-8000-0000000000c1', format: 'loop', label: 'Loop habits export', at: AT, counts: {habits: 2}, refs: {}}]},
  'zigoals:w-reminders:v1': {version: 1, windDown: {time: '22:15'}, chained: {}, contributions: {}, dismissed: {}},
  'zigoals:celebrations:v1': {version: 1, seen: {'streak-7': '2026-10-12'}},
  'zigoals:meditation-run:v1': {version: 1, run: {startedAt: AT, plannedSec: 600, pausedMs: 0, kind: 'breathing', pattern: 'box', moodBefore: 3}},
  'zigoals:music:v1': {version: 1, source: 'ambient', mini: false, volume: 40, ambient: {sound: 'rain', timerMin: 30, stopOnHide: false}},
  'zigoals:pages-view:v1': {version: 1, hidden: ['chess', 'links'], start: 'today'},
  'zigoals:zigi-suggestions:v1': {version: 1},
  'zigoals:zigi-voice:v1': {version: 1},
  'zigoals:zigi-cards:v1': {version: 1},
  'zigoals:search-recent:v1': {version: 1, queries: ['water', 'budget']},
  'zigoals:onboarding-setup:v1': {version: 1, at: AT, habitIds: [HABIT], widgetIds: ['habits'], focuses: ['tidy']},
  'zigoals:point-tell:v1': {version: 1, enabled: true, pins: []},
  'zigoals:apps:v1': {version: 1, hidden: ['chess'], sidebarFolded: true},
  'zigoals:wallet-names:v1': {version: 1, names: [{network: 'zigchain', account: 'zig1fictional0000000000000000000000000000', name: 'Savings wallet'}]},
  'zigoals:chess-puzzle:v1': {version: 1, id: 'puzzle-0001', progress: ['e2e4']},
  'zigoals:nova-hud:v1': {version: 1},
  'zigoals:stablecoins-as-cash:v1': 1,
  'zigoals:chess-puzzle-log:v1': {version: 1},
  'zigoals:eco-tvl-history:v1': {version: 1},
};

const showcase = buildShowcase(DAY, 'UTC', {aa: true}).records;
const BASE: Record<string, string> = {...showcase, ...showcaseChoices(showcase, DAY), ...frozenFixture().records};
const SAMPLES: Record<string, string> = {...BASE};
for (const [key, value] of Object.entries(SEEDS)) if (SAMPLES[key] === undefined) SAMPLES[key] = typeof value === 'string' ? value : JSON.stringify(value);
/**
 * The two records a restore brings back in shares, given what each share holds, so every share is proven: today's
 * Checklist ticks (never restored) beside the day history, and a diet note (restored only with Health) beside ZIGi's
 * other notes.
 */
const ENRICH: Record<string, (v: Record<string, unknown>) => Record<string, unknown>> = {
  'zigoals:checklist-days:v1': v => ({...v, today: {date: DAY, ticks: [{id: 'ck_showcase-1', at: AT}], custom: [], nudged: ['10']}}),
  'zigoals:ai-memory:v1': v => ({...v, notes: [...(Array.isArray(v.notes) ? v.notes : []), {id: 'note_rt_diet', text: 'Fictional: no coffee after 3 pm', category: 'diet', source: 'person', createdAt: AT, updatedAt: AT}]}),
};
for (const [key, enrich] of Object.entries(ENRICH)) if (SAMPLES[key] !== undefined) SAMPLES[key] = JSON.stringify(enrich(JSON.parse(SAMPLES[key]!) as Record<string, unknown>));
/** The device: one sample of every key Export everything reads (and nothing else from the fixtures). */
const DEVICE: Record<string, string> = Object.fromEntries(EVERYTHING_KEYS.flatMap(key => SAMPLES[key] === undefined ? [] : [[key, SAMPLES[key]!]]));

/**
 * The records Export everything leaves out on purpose, read from lib/erase-coverage.test.ts NOT_RECORDS (its own literals
 * and the key modules it spreads), with where each lives (sessionStorage when its reason says so).
 */
function notRecords(): Record<string, string> {
  const source = readFileSync(join(__dirname, 'erase-coverage.test.ts'), 'utf8');
  const block = source.slice(source.indexOf('const NOT_RECORDS'), source.indexOf('};', source.indexOf('const NOT_RECORDS')));
  const out: Record<string, string> = {};
  for (const m of block.matchAll(/'(zigoals:[a-z0-9-]+:v\d+)':\s*'((?:[^'\\]|\\.)*)'/g)) out[m[1]!] = m[2]!;
  if (block.includes("'zigoals:goal-extras:' + 'v2'")) out['zigoals:goal-extras:' + 'v2'] = 'a reserved next version of the goal extras';
  return {...out, ...AV2_R6_NOTES_NOT_RECORDS, ...AW_X6_NOT_RECORDS, ...AW_X7_NOT_RECORDS};
}
const NOT_RECORDS = notRecords();
const inSession = (reason: string) => reason.startsWith('sessionStorage');
/** What the not-exported records hold here: fictional and marked, so a copy that came back would be seen. */
const PLANTED = (key: string) => key === 'zigoals:money-removed:v1'
  ? JSON.stringify({version: 1, items: [{space: 'personal', removedAt: AT, entry: {id: 'rt-removed', kind: 'expense', amount: '12.50', currency: 'EUR', category: 'Coffee', date: '2026-10-12', createdAt: AT}}]})
  : JSON.stringify({version: 1, roundTrip: 'never exported'});

/** Each key a restore writes, with the parts that write it (two parts share the Checklist's and the memory's key). */
const PARTS_BY_KEY = new Map<string, (ModulePart | DevicePart)[]>();
for (const part of [...MODULE_PARTS, ...RESTORABLE_DEVICE_PARTS]) PARTS_BY_KEY.set(part.key, [...PARTS_BY_KEY.get(part.key) ?? [], part]);
const EXPORT_NAME: Record<string, string> = {...Object.fromEntries(Object.entries(MODULE_KEYS).map(([n, k]) => [k, `modules.${n}`])), [PORTFOLIO_KEY]: 'portfolio', ...Object.fromEntries(Object.entries(DEVICE_KEYS).map(([n, k]) => [k, `device.${n}`]))};
const RESTORED_KEYS = EVERYTHING_KEYS.filter(k => PARTS_BY_KEY.has(k) && k !== PROGRESS_PHOTOS_KEY);
const NOT_RESTORED_KEYS = EVERYTHING_KEYS.filter(k => !PARTS_BY_KEY.has(k) && k !== PROGRESS_PHOTOS_KEY);

/**
 * What a restore deliberately leaves out of a record it brings back, each named in NEVER_RESTORED (or by the record's
 * restore reader, which the comparison below goes through): the expected value is the sample with that part removed.
 */
const LEFT_OUT: Record<string, {never: string; drop: (v: Record<string, unknown>) => Record<string, unknown>}> = {
  'zigoals:checklist-days:v1': {never: 'today’s Checklist ticks', drop: ({today: _today, ...rest}) => { void _today; return rest; }},
};
/**
 * Personal device records Export everything carries and a restore never writes, each with the words of NEVER_RESTORED
 * that say so. Display choices (onboarding NON_PERSONAL_KEYS) are covered by its "display choices". A new personal key
 * that is exported and not restored fails below until it is restored or named here.
 */
const NEVER_RESTORED_PERSONAL: Record<string, string> = {
  'zigoals:import-undo:v1': 'an import’s undo', 'zigoals:import-batches:v1': 'an import’s undo',
  'zigoals:push:v1': 'notifications', 'zigoals:notify:v1': 'notifications', 'zigoals:w-reminders:v1': 'notifications', 'zigoals:zigi-reminders:v1': 'notifications',
  'zigoals:ai:v1': 'ZIGi’s settings', 'zigoals:ai-options:v1': 'ZIGi’s settings', 'zigoals:ai-usage:v1': 'usage', 'zigoals:zigi-metrics:v1': 'usage',
  'zigoals:meditation-run:v1': 'a timer or routine in progress', 'zigoals:routine-run:v1': 'a timer or routine in progress',
  'zigoals:onboarding-setup:v1': 'the welcome’s setup', 'zigoals:search-recent:v1': 'recent searches',
  'zigoals:linked-wallets:v1': 'linked wallet addresses', 'zigoals:point-tell:v1': 'Point & tell notes',
  'zigoals:earn-path:v1': 'Earn progress and choices', 'zigoals:earn-academy:v1': 'Earn progress and choices',
  'zigoals:staking-journal:v1': 'the staking journal', 'zigoals:validator-alerts:v1': 'validator health alerts',
  'zigoals:wallet-balances:v1': 'linked wallet balances', 'zigoals:goal-vaults:v1': 'Goal Vault links', 'zigoals:zigi-plans:v1': 'ZIGi\'s plans',
  'zigoals:universe:v1': 'My universe milestones', 'zigoals:day-timeline:v1': 'Day timeline times',
  // Session AW Part 6 (integrator): the seven the first run found exported, never restored and unnamed, now named in
  // NEVER_RESTORED (a tracked wallet's name follows its address, which is never restored either).
  'zigoals:guide:v1': 'the Guide\'s choices', 'zigoals:ai-actions:v1': 'ZIGi\'s actions log', 'zigoals:chess-cache:v1': 'the Chess ratings cache',
  'zigoals:celebrations:v1': 'celebrations already shown', 'zigoals:zigi-suggestions:v1': 'suggestions', 'zigoals:backup-reminder:v1': 'the backup reminder',
  'zigoals:wallet-names:v1': 'names you gave tracked wallets',
};
/**
 * The display choices (onboarding NON_PERSONAL_KEYS) a restore does bring back, pinned so a new one is seen. NEVER_RESTORED
 * says "display choices (except Hide calories and weight …)" are never restored; these seven are restored all the same
 * (named in the hand-back as a wording gap of plan.ts:409, not a data gap: each is restored value for value above).
 */
const DISPLAY_RESTORED = ['zigoals:settings:v1', 'zigoals:today-cards:v1', 'zigoals:macro-mode:v1', 'zigoals:day-ends:v1', 'zigoals:day-goal:v1', 'zigoals:task-when:v1', 'zigoals:today-orbits:v1', 'zigoals:hide-body-figures'];

const snapshot = (store: Storage) => Object.fromEntries(Array.from({length: store.length}, (_, i) => store.key(i)!).map(k => [k, store.getItem(k)]));
const databases = async () => (await indexedDB.databases()).map(d => d.name ?? '').filter(n => n.startsWith(ERASE_PREFIX)).sort();
/** A stored text as the app reads it: through the record's own reader (the restore part's schema), as the page would. */
function readAs(part: ModulePart | DevicePart, raw: string | null): unknown {
  if (raw === null) return null;
  const parsed = part.schema.safeParse(partValueOf(part, raw));
  return parsed.success ? parsed.data : {unreadable: parsed.error.issues.slice(0, 3)};
}
/** What the sample becomes after a restore, read as the app reads it. */
function expectedOf(key: string): unknown {
  const part = PARTS_BY_KEY.get(key)![0]!, value = readAs(part, DEVICE[key]!), left = LEFT_OUT[key];
  return left && isObject(value) ? left.drop(value) : value;
}

let fileName = '', notes: string[] = [], erase: EraseResult, leftLocal: string[] = [], leftSession: string[] = [], leftStores: string[] = [];
let opened: OpenedBackup, planned: PlannedPart[] = [], outcome: RestoreOutcome, after: Record<string, string | null> = {}, afterSession: Record<string, string | null> = {};
let chatsBack = -1, photoBack: Blob | null = null;

Object.defineProperty(navigator, 'locks', {configurable: true, value: {request: async (_key: string, work: () => unknown) => work()}});
beforeAll(async () => {
  localStorage.clear(); sessionStorage.clear(); forgetRestoreUndo();
  // The device: every record, the not-exported ones, one ZIGi conversation and one progress photo's bytes.
  for (const [key, value] of Object.entries(DEVICE)) localStorage.setItem(key, value);
  for (const [key, reason] of Object.entries(NOT_RECORDS)) (inSession(reason) ? sessionStorage : localStorage).setItem(key, PLANTED(key));
  const store = indexedDbChatStore('local'), chat = newChat('local', 'openai', 'mock-chat-1', new Date(AT), 'chat-roundtrip');
  await store.save({...chat, title: 'Water', turns: [{id: 't1', role: 'user', text: 'How much water today?', at: chat.createdAt}, {id: 't2', role: 'assistant', text: 'MOCK: two more glasses', at: chat.createdAt, provider: 'openai', model: 'mock-chat-1'}]});
  await putPhotoBlob('local', PHOTO_ID, new Blob([PHOTO as Uint8Array<ArrayBuffer>], {type: 'image/jpeg'}));
  // Export everything, exactly as Settings makes it.
  const made = await buildEverythingExport();
  fileName = made.name; notes = made.notes;
  // Erase everything, exactly as the Settings button runs it.
  erase = await eraseEverythingOnThisDevice();
  leftLocal = zigoalsKeys(localStorage); leftSession = zigoalsKeys(sessionStorage); leftStores = await databases();
  // Restore from a backup: the file opened, every part chosen, Replace, the photos too.
  opened = await openBackup(new Blob([made.bytes as Uint8Array<ArrayBuffer>]));
  planned = planParts(opened.json);
  outcome = await applyRestore(opened, planned.filter(p => !p.problem).map(part => ({part, mode: 'replace' as const})), {vision: true, progress: true, media: true});
  after = snapshot(localStorage); afterSession = snapshot(sessionStorage);
  chatsBack = (await indexedDbChatStore('local').list()).length;
  photoBack = await getPhotoBlob('local', PHOTO_ID);
}, 120_000);
afterAll(() => { localStorage.clear(); sessionStorage.clear(); forgetRestoreUndo(); });

describe('the device holds one sample of every record Export everything reads', () => {
  test('every key in Export everything has a sample (a new key fails here until it has one)', () => {
    expect(EVERYTHING_KEYS.length).toBeGreaterThan(150);
    expect(EVERYTHING_KEYS.filter(k => DEVICE[k] === undefined), 'add a fictional sample for these keys to SEEDS (or to the Showcase or the frozen-reader fixture)').toEqual([]);
  });
  test('every seed is still needed, and every restorable sample reads through its own reader', () => {
    expect(Object.keys(SEEDS).filter(k => BASE[k] !== undefined), 'the fixtures now hold these: remove their seeds').toEqual([]);
    for (const key of RESTORED_KEYS) expect(readAs(PARTS_BY_KEY.get(key)![0]!, DEVICE[key]!), `${key}: the sample reads`).not.toHaveProperty('unreadable');
  });
  test('the registries agree: every exported key is catalogued, and every restore part writes the key its export name reads', () => {
    const catalogued = new Set([...SYNCED, ...DEVICE_ONLY].map(e => e.key));
    expect(EVERYTHING_KEYS.filter(k => !catalogued.has(k))).toEqual([]);
    for (const part of MODULE_PARTS) expect(MODULE_KEYS[part.name], part.id).toBe(part.key);
    const exported = new Map(Object.entries(DEVICE_KEYS));
    for (const part of RESTORABLE_DEVICE_PARTS) expect(part.name === 'portfolio' ? PORTFOLIO_KEY : exported.get(part.name), `${part.id} reads device.${part.name} and writes ${part.key}`).toBe(part.key);
  });
});

describe('Export everything → Erase everything → Restore, every record', () => {
  test('the export reads every record (nothing unreadable, no record that did not read as expected)', () => {
    expect(fileName).toMatch(/^zigoals-export-\d{4}-\d{2}-\d{2}\.zip$/);
    // (The legacy simulation's ledger is a NOT_RECORDS key planted here with a marked value, so its note says it is damaged.)
    expect(notes.filter(n => /did not read|could not be read|left out/.test(n))).toEqual([]);
    expect(opened.json.app).toBeDefined();
    expect((opened.json as unknown as {unreadable: string[]}).unreadable).toEqual([]);
  });
  test.each(EVERYTHING_KEYS.filter(k => k !== PROGRESS_PHOTOS_KEY))('the file holds %s value for value', key => {
    const [where, name] = EXPORT_NAME[key]!.split('.') as [string, string | undefined];
    const inFile = where === 'portfolio' ? opened.json.portfolio : (opened.json as unknown as Record<string, Record<string, unknown>>)[where]![name!];
    expect(inFile).toEqual(TEXT_DEVICE_KEYS.has(key) ? DEVICE[key] : JSON.parse(DEVICE[key]!));
  });
  test('ZIGi’s conversation and the progress photo are in the file', () => {
    expect(opened.json.device.aiChats).toHaveLength(1);
    expect(opened.photos.map(p => p.name)).toEqual(['photos/2026-10-12-front-roundtrip-01.jpg']);
  });
  test('Erase everything leaves no ZIGoals key in either storage and no ZIGoals store', () => {
    expect(erase.failed).toEqual([]);
    expect(erase.keys).toBe(Object.keys(DEVICE).length + Object.keys(NOT_RECORDS).length);
    expect([...leftLocal, ...leftSession]).toEqual([]);
    expect(leftStores).toEqual([]);
  });
  test('every part of the file reads and restores (Replace, nothing refused)', () => {
    expect(planned.filter(p => p.problem).map(p => `${p.id}: ${p.problem}`)).toEqual([]);
    expect(outcome.failed).toEqual([]);
    expect(outcome.stopped).toBe(false);
    // Every key a part writes is offered by the file (a share of a record only when the file holds some of it).
    expect([...new Set(planned.map(p => p.key))].sort()).toEqual(RESTORED_KEYS.filter(k => k !== PROGRESS_PHOTOS_KEY).sort());
  });
  test.each(RESTORED_KEYS)('%s is back value for value, read as the app reads it', key => {
    expect(readAs(PARTS_BY_KEY.get(key)![0]!, after[key] ?? null)).toEqual(expectedOf(key));
  });
  test('what a restore leaves out of a record it brings back is named in NEVER_RESTORED, and stays out', () => {
    for (const [key, {never, drop}] of Object.entries(LEFT_OUT)) {
      expect(NEVER_RESTORED, key).toContain(never);
      const sample = JSON.parse(DEVICE[key]!) as Record<string, unknown>;
      expect(Object.keys(sample).length, `${key}: the sample holds what is left out`).toBeGreaterThan(Object.keys(drop(sample)).length);
    }
  });
  test('the progress photo comes back with its index; ZIGi’s conversations are never restored', () => {
    expect(photoBack?.size).toBe(PHOTO.length);
    expect(JSON.parse(after[PROGRESS_PHOTOS_KEY] ?? 'null')).toEqual(JSON.parse(DEVICE[PROGRESS_PHOTOS_KEY]!));
    expect(chatsBack).toBe(0);
    expect(NEVER_RESTORED).toContain('conversations');
  });
});

describe('what is never restored stays away', () => {
  test.each(NOT_RESTORED_KEYS)('%s (exported, never restored) does not come back', key => {
    expect(after[key] ?? null).toBeNull();
    // It is a display choice (NEVER_RESTORED: "display choices") or a personal record NEVER_RESTORED names.
    if (NON_PERSONAL_KEYS.includes(key)) expect(NEVER_RESTORED).toContain('display choices');
    else {
      expect(NEVER_RESTORED_PERSONAL[key], `GAP (Session AW Part 6): ${key} is a personal record Export everything carries, a restore never writes it, and NEVER_RESTORED does not say so; restore it (lib/restore/plan.ts) or name the NEVER_RESTORED words here`).toBeDefined();
      expect(NEVER_RESTORED).toContain(NEVER_RESTORED_PERSONAL[key]);
    }
  });
  test('the display choices a restore brings back are exactly the pinned ones (Hide calories and weight is the one NEVER_RESTORED names)', () => {
    expect(RESTORED_KEYS.filter(k => NON_PERSONAL_KEYS.includes(k)).sort()).toEqual([...DISPLAY_RESTORED].sort());
    expect(NEVER_RESTORED).toContain('except Hide calories and weight');
  });
  test.each(Object.keys(NOT_RECORDS))('%s (never exported) is erased and does not come back', key => {
    const back = inSession(NOT_RECORDS[key]!) ? afterSession[key] : after[key];
    // The restore keeps its own undo record under this key: it is the new restore's, never the erased one.
    if (key === RESTORE_UNDO_KEY) expect(back).not.toBe(PLANTED(key));
    else expect(back ?? null).toBeNull();
  });
  /**
   * The account erase (lib/aa-device-forget.ts, run when the account's cloud copy is deleted) is not the Settings button:
   * it removes the device records the later sessions list for it and leaves the four modules to the sync code. What it
   * leaves of the exported records is in the hand-back (registry-round-trip.md), for the integrator to judge.
   */
  test('the account erase removes the device records it lists, never a module, and every recovery copy of them', () => {
    localStorage.clear();
    for (const [key, value] of Object.entries(DEVICE)) localStorage.setItem(key, value);
    localStorage.setItem('zigoals:tasks:v1:recovery:rt-0001', DEVICE['zigoals:tasks:v1']!);
    forgetAaDeviceRecords(localStorage);
    const removed = Object.keys(DEVICE).filter(k => localStorage.getItem(k) === null);
    expect(removed.length).toBeGreaterThan(100);
    expect(removed.filter(k => (Object.values(MODULE_KEYS) as string[]).includes(k))).toEqual([]);
    expect(localStorage.getItem('zigoals:tasks:v1:recovery:rt-0001')).toBeNull();
    localStorage.clear();
  });
  test('Removed recently is catalogued, never exported, erased and never restored', () => {
    expect(KEPT_NOT_EXPORTED).toEqual(['zigoals:money-removed:v1']);
    expect(EVERYTHING_KEYS).not.toContain('zigoals:money-removed:v1');
    expect(JSON.stringify(opened.json)).not.toContain('rt-removed');
    expect(after['zigoals:money-removed:v1'] ?? null).toBeNull();
    expect(NEVER_RESTORED).toContain('money entries you removed');
  });
});

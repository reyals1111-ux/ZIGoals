import {mkdirSync, writeFileSync, readFileSync, existsSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {expect, type Page, type TestInfo} from '@playwright/test';
import {buildShowcase} from '../lib/showcase-data';
import {HEALTH_STORAGE_KEY} from '../lib/health';
import {nightDay} from '../lib/sleep/engine';
import {DASHBOARD_SETTINGS_KEY, presetSettings} from '../lib/dashboard-settings';
import {WHATS_NEW_KEY, WHATS_NEW_RELEASE} from '../lib/whats-new';
import {AI_SETTINGS_KEY, defaultAiSettings} from '../lib/ai/settings';
import {AI_OPTIONS_KEY} from '../lib/ai/store/keys';
import {AI_CHATS_DATABASE} from '../lib/ai/chats';
import type {CorpusArea} from '../lib/ai/evals/corpus';
import {score, type Observed, type Score} from '../lib/ai/evals/score';
import type {Expect} from '../lib/ai/evals/corpus';
import {estimateCost} from '../lib/ai/pricing';
import {AI_USAGE_KEY} from '../lib/ai/store/keys';

/**
 * Shared helpers of the real-model browser specs (Session X-Local Part 6c): the real panel against a real local model
 * over the Ollama wire (the PC through the loopback forwarder, or the Mac), on the fictional Showcase records only.
 * Nothing here runs without ZIGI_REAL_MODEL=1; every run writes its transcripts and scores as JSON under ZIGI_OUT, so
 * the test document is built from evidence, never from memory.
 */
export const REAL = process.env.ZIGI_REAL_MODEL === '1';
/** Session Z-Local Part 2: `anthropic` runs the same specs against a real Claude model on the owner's test key. */
export const PROVIDER: 'local' | 'anthropic' = process.env.ZIGI_PROVIDER === 'anthropic' ? 'anthropic' : 'local';
export const MODEL = process.env.ZIGI_MODEL ?? '', HOST = process.env.ZIGI_HOST ?? (PROVIDER === 'anthropic' ? 'Anthropic API' : 'unknown host'), BASE = process.env.ZIGI_MODEL_BASE ?? 'http://127.0.0.1:11435';
/** Where the raw run files go: the owner keeps them on the orphan branch `review/session-x-local-runs` (its worktree's `real-model/`), never on the feature branch; without ZIGI_OUT they land in the system's temporary folder. */
export const OUT = process.env.ZIGI_OUT ?? join(tmpdir(), 'zigoals-real-model');
/** How long one reply may take on a local model (first token on a cold model can be a minute). */
export const REPLY_TIMEOUT_MS = Number(process.env.ZIGI_REPLY_TIMEOUT_MS ?? '240000');
export const DAY = '2026-09-20', EVENING = '2026-09-20T19:00:00.000Z';
/** Where each corpus area's asks are typed. Settings has no launcher by the app's own rule (ZIGi stays out of the page
 * that configures it), so the settings-area asks go through the panel on Help, the nearest page about the app itself. */
export const PAGE_PATHS: Record<CorpusArea, string> = {today: '/app', goals: '/app/goals', habits: '/app/habits', health: '/app/health', sleep: '/app/health?view=sleep', meditation: '/app/health?view=meditation', devices: '/app/health?view=devices', imports: '/app/health?view=imports', wealth: '/app/wealth', portfolio: '/app/portfolio', markets: '/app/markets', staking: '/app/staking', ecosystem: '/app/ecosystem', chess: '/app/chess', music: '/app', links: '/app', settings: '/app/help', help: '/app/help', activity: '/app/activity'};
export const slug = (s: string) => s.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase();
/** The Showcase plus a real local connection; Health shared (fictional records). `health: false` closes the gate. */
/**
 * Phase 2 round 9 (ADR-017 S75): the Showcase logs a night for every one of its 30 days but three, so a scenario that
 * logs "last night" on the Showcase day asks for a night the app rightly refuses (it overlaps the one that ended that
 * morning: 0 of 6 runs on every host). The scenario removes that night first, so the lie-in is the first night of the day.
 */
export async function removeShowcaseNightEndingOn(page: Page, day: string) {
  const health = JSON.parse(buildShowcase(day).records[HEALTH_STORAGE_KEY]!) as {sleep?: {nights: {id: string; end: string | null; timeZone: string}[]}};
  const gone = (health.sleep?.nights ?? []).filter(n => nightDay(n) === day).map(n => n.id);
  expect(gone.length, 'the Showcase night that ends on its day').toBe(1);
  await page.evaluate(([key, ids]) => {
    const raw = localStorage.getItem(key); if (!raw) return;
    const data = JSON.parse(raw) as {sleep?: {nights: {id: string}[]}};
    if (data.sleep) data.sleep.nights = data.sleep.nights.filter(n => !ids.includes(n.id));
    localStorage.setItem(key, JSON.stringify(data));
  }, [HEALTH_STORAGE_KEY, gone] as const);
}
/**
 * Session Z-Local Part 2 (owner edit 3): the key reaches the app through its own key store, sealed exactly as
 * `lib/ai/keys.ts` seals it (a non-extractable AES-GCM-256 wrap key in IndexedDB `zigoals-ai-keys-v1`, the record bound
 * to the scope and the provider), from an init script that receives the key as an ARGUMENT read from this process's
 * environment: never a DOM input, never text in a script file, never a trace (the Anthropic config records nothing).
 * Each test's context is ephemeral and discarded with its storage.
 */
async function sealKeyInApp(page: Page, key: string, scope = 'local') {
  // Security read after Part 5 (finding 4): an init script runs in every frame of every origin the context loads, so the
  // key is sealed only on the app's own origin, and the context never reaches any other host but the provider's API.
  const origin = new URL(process.env.PLAYWRIGHT_BASE_URL ?? 'http://127.0.0.1:3103').origin, apiHost = 'api.anthropic.com';
  await page.context().route(url => url.origin !== origin && url.hostname !== apiHost, route => route.abort('blockedbyclient'));
  await page.context().addInitScript(async ({key, scope, origin}: {key: string; scope: string; origin: string}) => {
    if (location.origin !== origin) return;
    const slot = `${scope}:anthropic`;
    const open = () => new Promise<IDBDatabase>((res, rej) => { const r = indexedDB.open('zigoals-ai-keys-v1', 1); r.onupgradeneeded = () => { const db = r.result; for (const n of ['wrap', 'keys']) if (!db.objectStoreNames.contains(n)) db.createObjectStore(n); }; r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
    const db = await open();
    const get = (store: string, k: string) => new Promise<unknown>((res, rej) => { const q = db.transaction(store, 'readonly').objectStore(store).get(k); q.onsuccess = () => res(q.result); q.onerror = () => rej(q.error); });
    const put = (store: string, k: string, v: unknown) => new Promise<void>((res, rej) => { const t = db.transaction(store, 'readwrite'); t.objectStore(store).put(v, k); t.oncomplete = () => res(); t.onerror = () => rej(t.error); });
    try {
      if (await get('keys', slot)) return;
      let wrap = await get('wrap', 'device') as CryptoKey | undefined;
      if (!(wrap instanceof CryptoKey)) { wrap = await crypto.subtle.generateKey({name: 'AES-GCM', length: 256}, false, ['encrypt', 'decrypt']); await put('wrap', 'device', wrap); }
      const iv = crypto.getRandomValues(new Uint8Array(12)), aad = new TextEncoder().encode(JSON.stringify(['zigoals-ai-key', 1, scope, 'anthropic']));
      const ciphertext = new Uint8Array(await crypto.subtle.encrypt({name: 'AES-GCM', iv, additionalData: aad, tagLength: 128}, wrap, new TextEncoder().encode(key)));
      const b64 = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
      await put('keys', slot, {version: 1, scope, provider: 'anthropic', iv: b64(iv), ciphertext: b64(ciphertext), createdAt: new Date().toISOString()});
    } finally { db.close(); }
  }, {key, scope, origin});
}
export async function seedReal(page: Page, {health = true, log = false}: {health?: boolean; log?: boolean} = {}) {
  if (PROVIDER === 'anthropic') {
    const key = process.env.ANTHROPIC_TEST_KEY ?? '';
    if (!key) throw new Error('ANTHROPIC_TEST_KEY is not in this process\'s environment.');
    await sealKeyInApp(page, key);
  }
  await page.goto('/app/settings');
  const base = defaultAiSettings();
  const ai = PROVIDER === 'anthropic'
    ? {...base, enabled: true, mode: 'api', provider: 'anthropic', model: MODEL, localServer: null, baseUrl: null, rememberKey: true, includeHealth: health, pageShare: {...base.pageShare, health}}
    : {...base, enabled: true, mode: 'local', provider: 'local', model: MODEL, localServer: 'ollama', baseUrl: BASE, includeHealth: health, pageShare: {...base.pageShare, health}};
  await page.evaluate(values => { localStorage.clear(); sessionStorage.clear(); for (const [k, v] of Object.entries(values)) localStorage.setItem(k, v); }, {...buildShowcase(DAY).records, [DASHBOARD_SETTINGS_KEY]: JSON.stringify({...presetSettings('habits-health'), onboarded: true}), [WHATS_NEW_KEY]: JSON.stringify({version: 1, dismissed: [WHATS_NEW_RELEASE]}), [AI_SETTINGS_KEY]: JSON.stringify(ai), [AI_OPTIONS_KEY]: JSON.stringify({version: 1, toolMode: 'auto'})});
  void log;
}
export const panel = (page: Page) => page.locator('dialog.ai-chat[open]');
/** The app's own /api/* routes answer offline (fixtures only); the model's base URL is never touched by this (a bare `**\/api/**` would block the model too). */
export async function offlineAppApi(page: Page) {
  const model = new URL(BASE).origin;
  await page.route(url => url.pathname.startsWith('/api/') && url.origin !== model, route => route.fulfill({status: 503, json: {error: 'offline fixture'}}));
}
/** Opens the panel; a page without the launcher fails in 20 s, never at the test's timeout. */
export async function openChat(page: Page) { await page.getByRole('button', {name: /Open ZIGi/}).click({timeout: 20_000}); await expect(panel(page)).toBeVisible(); }
/** Sends a message and waits until the reply is final: a new assistant turn (or a failure block) has appeared, no turn is
 * live and the Stop button is gone, within the reply timeout. The clock runs from the click to that final state; a reply
 * that is over before the Stop button could be seen is measured as it was, never padded by a wait for the button. */
export async function askAndWait(page: Page, text: string, {log = false}: {log?: boolean} = {}): Promise<{ms: number}> {
  const turns = panel(page).locator('.ai-turn-assistant'), failed = panel(page).locator('.ai-failure');
  const before = await turns.count();
  // Log mode through the composer's own slash command (/log), as the person would type it; the submit stays "Send".
  await page.getByLabel('Message to your AI').fill(log ? `/log ${text}` : text, {timeout: 20_000});
  const started = Date.now();
  await page.getByRole('button', {name: 'Send', exact: true}).click({timeout: 20_000});
  await expect.poll(async () => (await turns.count()) > before || (await failed.count()) > 0, {timeout: REPLY_TIMEOUT_MS, intervals: [50, 100, 250]}).toBe(true);
  await expect(panel(page).locator('.ai-turn-live')).toHaveCount(0, {timeout: REPLY_TIMEOUT_MS});
  await expect(panel(page).getByRole('button', {name: 'Stop', exact: true})).toHaveCount(0, {timeout: 10_000});
  // A failure block instead of a reply (network, CORS, a stall, the model missing) is the run's error, never a hang.
  const failure = panel(page).locator('.ai-failure');
  if (await failure.count() > 0) throw new Error(`The chat shows a failure: ${(await failure.innerText()).replace(/\s+/g, ' ').trim().slice(0, 400)}`);
  return {ms: Date.now() - started};
}
/** What the panel shows for the last reply (empty when there is no assistant turn); never waits on a missing element. */
export async function shownReply(page: Page): Promise<string> {
  const turn = panel(page).locator('.ai-turn-assistant').last();
  return await turn.count() > 0 ? turn.innerText() : '';
}
export type StoredTurn = {id: string; role: 'user' | 'assistant'; text: string; stopped?: string; tools?: {tool: string; label: string}[]; source?: string};
/** The chat as the device stored it (the raw reply with its blocks; the hint already stripped by the app). */
export async function storedTurns(page: Page): Promise<StoredTurn[]> {
  const raw = await page.evaluate(name => new Promise<string>((resolve, reject) => { const open = indexedDB.open(name); open.onerror = () => reject(open.error); open.onsuccess = () => { const db = open.result, store = db.objectStoreNames[0]!, all = db.transaction(store).objectStore(store).getAll(); all.onsuccess = () => { resolve(JSON.stringify(all.result)); db.close(); }; all.onerror = () => reject(all.error); }; }), AI_CHATS_DATABASE);
  const chats = JSON.parse(raw) as {updatedAt: string; turns: StoredTurn[]}[];
  chats.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  return chats[0]?.turns ?? [];
}
export type UiCard = {kind: string; title: string; status: string};
export async function cardsOf(page: Page): Promise<UiCard[]> {
  const list = panel(page).locator('.ai-turn-assistant').last().locator('.ai-card');
  const n = await list.count(), out: UiCard[] = [];
  for (let i = 0; i < n; i++) { const c = list.nth(i); out.push({kind: (await c.getAttribute('data-kind')) ?? 'refused', title: (await c.locator('h4').textContent()) ?? '', status: (await c.getAttribute('class')) ?? ''}); }
  return out;
}
/** Session Z-Local Part 2: the case's own usage as the app's meter kept it (the storage was cleared at the seed), priced at the dated table. */
export type UiUsage = {model: string; input: number; output: number; cacheWrite: number; cacheRead: number; requests: number; costUsd: number | null};
export type UiRun = {id: string; model: string; host: string; project: string; page: string; ask: string; reply: string; cards: UiCard[]; tools: string[]; ms: number; score: Score | null; error: string | null; at: string; usage?: UiUsage};
/**
 * The provider's usage since this helper last read it on this page (the app's own meter, `zigoals:ai-usage:v1`): one
 * run's share even when several asks share a page; a seed clears the record, which reads as a fresh start. Null when
 * nothing new was counted. The ledger sums these deltas, so nothing is counted twice.
 */
const lastUsage = new WeakMap<Page, {input: number; output: number; cacheWrite: number; cacheRead: number; requests: number}>();
export async function usageOf(page: Page): Promise<UiUsage | null> {
  if (PROVIDER !== 'anthropic') return null;
  const raw = await page.evaluate(k => localStorage.getItem(k), AI_USAGE_KEY);
  if (!raw) { lastUsage.delete(page); return null; }
  try {
    const months = (JSON.parse(raw) as {months?: Record<string, Record<string, {input?: number; output?: number; cacheWrite?: number; cacheRead?: number; requests?: number}>>}).months ?? {};
    const sum = {input: 0, output: 0, cacheWrite: 0, cacheRead: 0, requests: 0};
    for (const routes of Object.values(months)) { const a = routes.anthropic; if (!a) continue; sum.input += a.input ?? 0; sum.output += a.output ?? 0; sum.cacheWrite += a.cacheWrite ?? 0; sum.cacheRead += a.cacheRead ?? 0; sum.requests += a.requests ?? 0; }
    const before = lastUsage.get(page), reset = !before || sum.requests < before.requests;
    lastUsage.set(page, sum);
    const delta = reset ? sum : {input: sum.input - before.input, output: sum.output - before.output, cacheWrite: sum.cacheWrite - before.cacheWrite, cacheRead: sum.cacheRead - before.cacheRead, requests: sum.requests - before.requests};
    if (!delta.requests) return null;
    return {model: MODEL, ...delta, costUsd: estimateCost(MODEL, delta)};
  } catch { return null; }
}
/** Scores a reply from the UI: cards, schema, tools, wording and refusals; facts and hints are the Node harness's. */
export function scoreUi(expect_: Expect, reply: string, tools: string[], source?: string): Score {
  const {hint, facts, localFirst, ...rest} = expect_; void hint; void facts; void localFirst;
  // Phase 2 (ADR-017 S61): a reply the device made (`source: 'local'`) carries no model tool call; the scorer knows.
  const observed: Observed = {text: reply, calls: tools.map(name => ({name, args: null, accepted: true})), local: {answered: source === 'local'}};
  return score(rest, observed);
}
/** Appends one run to the model's UI results file (one JSON array per model and spec), and attaches it to the test. */
export function record(info: TestInfo, file: string, run: UiRun) {
  mkdirSync(OUT, {recursive: true});
  const path = join(OUT, file);
  const list: UiRun[] = existsSync(path) ? JSON.parse(readFileSync(path, 'utf8')) as UiRun[] : [];
  list.push(run);
  writeFileSync(path, JSON.stringify(list, null, 1));
  info.annotations.push({type: 'real-model', description: `${run.model} on ${run.host}: ${run.score ? (run.score.pass ? 'pass' : 'fail') : 'unscored'} in ${run.ms} ms`});
}
export const lastReply = async (page: Page) => { const turns = await storedTurns(page); const last = [...turns].reverse().find(t => t.role === 'assistant'); return {text: last?.text ?? '', tools: (last?.tools ?? []).map(t => t.tool), stopped: last?.stopped ?? null, source: last?.source ?? null}; };

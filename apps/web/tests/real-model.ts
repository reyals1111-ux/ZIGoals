import {mkdirSync, writeFileSync, readFileSync, existsSync} from 'node:fs';
import {join} from 'node:path';
import {expect, type Page, type TestInfo} from '@playwright/test';
import {buildShowcase} from '../lib/showcase-data';
import {DASHBOARD_SETTINGS_KEY, presetSettings} from '../lib/dashboard-settings';
import {WHATS_NEW_KEY, WHATS_NEW_RELEASE} from '../lib/whats-new';
import {AI_SETTINGS_KEY, defaultAiSettings} from '../lib/ai/settings';
import {AI_OPTIONS_KEY} from '../lib/ai/store/keys';
import {AI_CHATS_DATABASE} from '../lib/ai/chats';
import type {CorpusArea} from '../lib/ai/evals/corpus';
import {score, type Observed, type Score} from '../lib/ai/evals/score';
import type {Expect} from '../lib/ai/evals/corpus';

/**
 * Shared helpers of the real-model browser specs (Session X-Local Part 6c): the real panel against a real local model
 * over the Ollama wire (the PC through the loopback forwarder, or the Mac), on the fictional Showcase records only.
 * Nothing here runs without ZIGI_REAL_MODEL=1; every run writes its transcripts and scores as JSON under ZIGI_OUT, so
 * the test document is built from evidence, never from memory.
 */
export const REAL = process.env.ZIGI_REAL_MODEL === '1';
export const MODEL = process.env.ZIGI_MODEL ?? '', HOST = process.env.ZIGI_HOST ?? 'unknown host', BASE = process.env.ZIGI_MODEL_BASE ?? 'http://127.0.0.1:11435';
export const OUT = process.env.ZIGI_OUT ?? 'docs/verification/x-local/real-model';
/** How long one reply may take on a local model (first token on a cold model can be a minute). */
export const REPLY_TIMEOUT_MS = Number(process.env.ZIGI_REPLY_TIMEOUT_MS ?? '240000');
export const DAY = '2026-09-20', EVENING = '2026-09-20T19:00:00.000Z';
/** Where each corpus area's asks are typed. Settings has no launcher by the app's own rule (ZIGi stays out of the page
 * that configures it), so the settings-area asks go through the panel on Help, the nearest page about the app itself. */
export const PAGE_PATHS: Record<CorpusArea, string> = {today: '/app', goals: '/app/goals', habits: '/app/habits', health: '/app/health', sleep: '/app/health?view=sleep', meditation: '/app/health?view=meditation', devices: '/app/health?view=devices', imports: '/app/health?view=imports', wealth: '/app/wealth', portfolio: '/app/portfolio', markets: '/app/markets', staking: '/app/staking', ecosystem: '/app/ecosystem', chess: '/app/chess', music: '/app', links: '/app', settings: '/app/help', help: '/app/help', activity: '/app/activity'};
export const slug = (s: string) => s.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase();
/** The Showcase plus a real local connection; Health shared (fictional records). `health: false` closes the gate. */
export async function seedReal(page: Page, {health = true, log = false}: {health?: boolean; log?: boolean} = {}) {
  await page.goto('/app/settings');
  const base = defaultAiSettings();
  const ai = {...base, enabled: true, mode: 'local', provider: 'local', model: MODEL, localServer: 'ollama', baseUrl: BASE, includeHealth: health, pageShare: {...base.pageShare, health}};
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
export type UiRun = {id: string; model: string; host: string; project: string; page: string; ask: string; reply: string; cards: UiCard[]; tools: string[]; ms: number; score: Score | null; error: string | null; at: string};
/** Scores a reply from the UI: cards, schema, tools, wording and refusals; facts and hints are the Node harness's. */
export function scoreUi(expect_: Expect, reply: string, tools: string[]): Score {
  const {hint, facts, localFirst, ...rest} = expect_; void hint; void facts; void localFirst;
  const observed: Observed = {text: reply, calls: tools.map(name => ({name, args: null, accepted: true}))};
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
export const lastReply = async (page: Page) => { const turns = await storedTurns(page); const last = [...turns].reverse().find(t => t.role === 'assistant'); return {text: last?.text ?? '', tools: (last?.tools ?? []).map(t => t.tool), stopped: last?.stopped ?? null}; };

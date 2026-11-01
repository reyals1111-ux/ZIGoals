import {readdirSync, readFileSync} from 'node:fs';
import {join} from 'node:path';
import {expect, type Locator, type Page, type Route} from '@playwright/test';
import {buildShowcase} from '../lib/showcase-data';
import {DASHBOARD_SETTINGS_KEY, presetSettings} from '../lib/dashboard-settings';
import {WHATS_NEW_KEY, WHATS_NEW_RELEASE} from '../lib/whats-new';
import {AI_SETTINGS_KEY, defaultAiSettings} from '../lib/ai/settings';
import {AI_OPTIONS_KEY} from '../lib/ai/store/keys';
import {NOVA_SETUP_KEY} from '../lib/nova/setup';

/**
 * Session AK, owner follow-up 4 (P6, the accessibility sweep): shared steps of tests/p6-*.spec.ts.
 *
 * The axe engine is axe-core 4.13 as the repository already installs it (eslint-plugin-jsx-a11y's own dependency, in
 * pnpm-lock.yaml): no new dependency. It is read from the pnpm store and injected into the page, then run with the WCAG
 * 2.0, 2.1 and 2.2 A and AA rules only (the standard the product promises; axe's "best-practice" rules are not part of
 * it). No rule is turned off and no element is excluded. Every finding names the rule, the element and axe's own summary.
 */
const ROOT = join(__dirname, '..', '..', '..');
function axeSource(): string {
  const store = join(ROOT, 'node_modules', '.pnpm');
  const dir = readdirSync(store).filter(name => /^axe-core@\d/.test(name)).sort().pop();
  if (!dir) throw Error('axe-core is not in the pnpm store (it comes with eslint-plugin-jsx-a11y); run pnpm install.');
  return readFileSync(join(store, dir, 'node_modules', 'axe-core', 'axe.min.js'), 'utf8');
}
let source: string | null = null;
export const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] as const;
export type Violation = {rule: string; impact: string; target: string; summary: string};

/** axe over the page (or one part of it); the violations, one entry per element. */
export async function axe(page: Page, scope?: Locator): Promise<Violation[]> {
  source ??= axeSource();
  // Evaluated through the DevTools protocol, not a <script> tag: the app's Trusted Types policy (rightly) refuses a
  // script element written from a string, and the page's own security headers stay as they are.
  if (!await page.evaluate(() => 'axe' in window)) await page.evaluate(`${source}\n;void 0`);
  const handle = scope ? await scope.elementHandle() : null;
  // A section with `content-visibility: auto` (Settings' groups, Earn's sections) is not laid out until it nears the
  // screen, so axe would measure placeholder boxes (a false "partially obscured" target where two never-drawn groups
  // overlap). The person always sees a section laid out when it is on screen, so each is laid out for the check (on the
  // page's own element, through the CSSOM) and put back right after. Nothing is excluded.
  // The page is read from its top: the phone's bars stay fixed over whatever a click or an anchor last scrolled under them,
  // and axe would count those controls as covered for good (they are whole as soon as the page scrolls; a control that
  // takes focus under a bar is the keyboard spec's 2.4.11 check).
  await page.evaluate(() => window.scrollTo({top: 0, behavior: 'instant'}));
  await page.evaluate(() => { for (const el of document.querySelectorAll<HTMLElement>('body *')) if (getComputedStyle(el).contentVisibility === 'auto') { el.dataset.p6Cv = el.style.getPropertyValue('content-visibility'); el.style.setProperty('content-visibility', 'visible'); } });
  try { return await run(); } finally {
    await page.evaluate(() => { for (const el of document.querySelectorAll<HTMLElement>('[data-p6-cv]')) { const before = el.dataset.p6Cv; if (before) el.style.setProperty('content-visibility', before); else el.style.removeProperty('content-visibility'); delete el.dataset.p6Cv; } }).catch(() => undefined);
  }
  function run() { return page.evaluate(async ({root, tags}) => {
    type Check = {relatedNodes?: {target: unknown[]}[]};
    type Node = {target: unknown[]; failureSummary?: string; any?: Check[]; all?: Check[]; none?: Check[]};
    type Result = {id: string; impact?: string; nodes: Node[]};
    const engine = (window as unknown as {axe: {run: (context: unknown, options: unknown) => Promise<{violations: Result[]}>}}).axe;
    const result = await engine.run(root ?? document, {runOnly: {type: 'tag', values: tags}, resultTypes: ['violations']});
    return result.violations.flatMap(v => v.nodes.map(n => ({rule: v.id, impact: v.impact ?? '', target: n.target.map(String).join(' '), summary: `${(n.failureSummary ?? '').replace(/\s+/g, ' ').slice(0, 300)}${(() => { const related = [...(n.any ?? []), ...(n.all ?? []), ...(n.none ?? [])].flatMap(c => c.relatedNodes ?? []).map(r => r.target.map(String).join(' ')).slice(0, 3); return related.length ? ` (related: ${related.join(', ')})` : ''; })()}`})));
  }, {root: handle, tags: [...WCAG_TAGS]}); }
}

export type Theme = 'nebula' | 'light' | 'dark';
export const THEMES: readonly Theme[] = ['nebula', 'light', 'dark'];
/** The theme as the person picks it in Settings (`zigoals:ui-prefs:v1`, lib/ui-prefs/theme.ts), on every page load. */
export async function applyTheme(page: Page, theme: Theme) {
  await page.addInitScript(t => {
    try {
      const key = 'zigoals:ui-prefs:v1';
      let prefs: Record<string, unknown> = {version: 1};
      try { const raw = localStorage.getItem(key); if (raw) prefs = JSON.parse(raw) as Record<string, unknown>; } catch { /* a fresh record */ }
      if (t === 'nebula') delete prefs.theme; else prefs.theme = t;
      localStorage.setItem(key, JSON.stringify(prefs));
    } catch { /* storage blocked: Nebula */ }
  }, theme);
}
/** Nothing leaves the browser: the app's own /api answers 503, any outside host is aborted (local model ports are left to the spec). */
export async function offline(page: Page) {
  await page.route(/^https?:\/\/(?!127\.0\.0\.1[:/])(?!localhost[:/])/, route => route.abort());
  await page.route('**/api/**', route => route.fulfill({status: 503, json: {error: 'offline fixture'}}));
}
export async function loadShowcase(page: Page) {
  await page.goto('/app/settings');
  await page.getByRole('button', {name: 'Load Showcase Demo', exact: true}).click();
  await page.waitForURL('**/app');
}
/**
 * Waits until the page has arrived: its main region shown, nothing busy, no streamed part waiting in a hidden holder, and
 * every finite animation finished (an entrance mid-fade would read as low contrast). Endless ambient motion (stars, the
 * orb) never finishes, so it is not waited for.
 */
export async function settle(page: Page) {
  await expect(page.locator('main').first()).toBeVisible({timeout: 20_000});
  await expect(page.locator('.workspace[aria-busy="true"]')).toHaveCount(0, {timeout: 20_000});
  await expect(page.locator('div[hidden][id^="S:"]')).toHaveCount(0, {timeout: 20_000});
  await expect(page.locator('[aria-busy="true"]').filter({visible: true})).toHaveCount(0, {timeout: 10_000}).catch(() => undefined);
  await page.evaluate(() => Promise.race([
    Promise.all(document.getAnimations().filter(a => { const t = a.effect?.getComputedTiming(); return a.playState === 'running' && t && t.iterations !== Infinity; }).map(a => a.finished.catch(() => undefined))),
    new Promise(resolve => setTimeout(resolve, 4_000)),
  ]));
  await page.waitForTimeout(150);
}
export type Findings = Record<string, string[]>;
export const note = (all: Findings, key: string, items: readonly (string | Violation)[]) => {
  if (!items.length) return;
  all[key] = [...(all[key] ?? []), ...items.map(v => typeof v === 'string' ? v : `${v.rule} (${v.impact}) ${v.target} — ${v.summary}`)];
};

export const LOCAL = 'http://127.0.0.1:1234', DAY = '2026-09-20', EVENING = '2026-09-20T19:00:00.000Z';
const chunk = (body: Record<string, unknown>) => `data: ${JSON.stringify({id: 'mock', object: 'chat.completion.chunk', ...body})}\n\n`;
const answer = (text: string) => [chunk({choices: [{index: 0, delta: {role: 'assistant', content: ''}, finish_reason: null}]}), ...(text.match(/.{1,24}/gs) ?? []).map(part => chunk({choices: [{index: 0, delta: {content: part}, finish_reason: null}]})), chunk({choices: [{index: 0, delta: {}, finish_reason: 'stop'}]}), 'data: [DONE]\n\n'].join('');
export const fence = (value: unknown) => `\`\`\`zigoals-action\n${typeof value === 'string' ? value : JSON.stringify(value)}\n\`\`\``;
/**
 * The MOCK local model (as tests/nova-chat.spec.ts answers it): 127.0.0.1:1234 is answered by page.route, each chat request
 * gets the next of `replies` (the last repeats), streamed; the app's /api answers 503 and every other host is aborted.
 */
export async function mockModel(page: Page, replies: readonly string[]) {
  let n = 0;
  await page.route(/^https?:\/\/(?!127\.0\.0\.1[:/])(?!localhost[:/])/, route => route.abort());
  await page.route('**/api/**', route => route.fulfill({status: 503, json: {error: 'offline fixture'}}));
  await page.route(`${LOCAL}/**`, async (route: Route) => {
    const url = route.request().url();
    if (url.endsWith('/api/v1/models')) return route.fulfill({status: 200, contentType: 'application/json', body: JSON.stringify({models: [{type: 'llm', key: 'mock-chat', loaded_instances: [], capabilities: {vision: false, trained_for_tool_use: false}}]})});
    if (url.endsWith('/v1/models')) return route.fulfill({status: 200, contentType: 'application/json', body: JSON.stringify({object: 'list', data: [{id: 'mock-chat'}]})});
    if (url.endsWith('/v1/chat/completions')) return route.fulfill({status: 200, contentType: 'text/event-stream', body: answer(replies[Math.min(n++, replies.length - 1)]!)});
    return route.fulfill({status: 404, body: ''});
  });
}
/** The Showcase's fictional records written as the person's own, with the MOCK model connected; `guide` leaves the NOVA guide's example progress out. The theme choice is kept. */
export async function seedDevice(page: Page, {guide = false} = {}) {
  await page.clock.install({time: EVENING});
  await page.goto('/app/settings');
  const base = defaultAiSettings();
  const ai = {...base, enabled: true, mode: 'local', provider: 'local', model: 'mock-chat', localServer: 'openai-compatible', baseUrl: LOCAL, includeHealth: true, pageShare: {...base.pageShare, health: true}};
  const {[NOVA_SETUP_KEY]: progress, ...records} = buildShowcase(DAY).records;
  const values = {...records, ...(guide ? {} : {[NOVA_SETUP_KEY]: progress}), [DASHBOARD_SETTINGS_KEY]: JSON.stringify({...presetSettings('habits-health'), onboarded: true}), [WHATS_NEW_KEY]: JSON.stringify({version: 1, dismissed: [WHATS_NEW_RELEASE]}), [AI_SETTINGS_KEY]: JSON.stringify(ai), [AI_OPTIONS_KEY]: JSON.stringify({version: 1, toolMode: 'attach'})};
  await page.evaluate(v => { const prefs = localStorage.getItem('zigoals:ui-prefs:v1'); localStorage.clear(); sessionStorage.clear(); for (const [k, x] of Object.entries(v)) localStorage.setItem(k, x); if (prefs) localStorage.setItem('zigoals:ui-prefs:v1', prefs); }, values);
  await page.waitForLoadState('networkidle');
}

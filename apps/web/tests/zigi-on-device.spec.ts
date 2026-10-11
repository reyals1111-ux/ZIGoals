import {expect, test, type Page} from '@playwright/test';
import {buildShowcase} from '../lib/showcase-data';
import {DASHBOARD_SETTINGS_KEY, presetSettings} from '../lib/dashboard-settings';
import {WHATS_NEW_KEY, WHATS_NEW_RELEASE} from '../lib/whats-new';
import {AI_OPTIONS_KEY} from '../lib/ai/store/keys';
import {CHAT_SYSTEM, REWRITE_SYSTEM, SAY_NICER_SYSTEM} from '../lib/ai/on-device-chat';

/**
 * Session V Part 15 end to end: "Which setup fits me?" in Settings and in the panel, and Chrome's on-device model.
 * No test browser has Chrome's model, so a stand-in LanguageModel answers and logs every session it is asked for and
 * every prompt it gets. Checked: no card without the API; asking about the model downloads nothing; the download only
 * from the button; with the model on and no AI connected, a question ZIGi's lookups did not recognise is put in plain
 * words by the model and answered by ZIGi's own lookup, or answered briefly by the model; the model only ever gets
 * the person's own words; "Say it nicer · on this computer" on the brief.
 */
const DAY = '2026-09-20', EVENING = '2026-09-20T19:00:00.000Z';
async function seed(page: Page, extra: Record<string, unknown> = {}) {
  await page.clock.install({time: EVENING});
  await page.goto('/app/settings');
  const values = {...buildShowcase(DAY).records, [DASHBOARD_SETTINGS_KEY]: JSON.stringify({...presetSettings('habits-health'), onboarded: true}), [WHATS_NEW_KEY]: JSON.stringify({version: 1, dismissed: [WHATS_NEW_RELEASE]}),
    ...Object.fromEntries(Object.entries(extra).map(([k, v]) => [k, typeof v === 'string' ? v : JSON.stringify(v)]))};
  await page.evaluate(v => { localStorage.clear(); sessionStorage.clear(); for (const [k, x] of Object.entries(v)) localStorage.setItem(k, x); }, values);
}
type Logged = {kind: 'availability' | 'create' | 'prompt'; system?: string; input?: string};
/** The stand-in for Chrome's LanguageModel: its availability, a download that reports progress, and canned replies. */
async function fakeModel(page: Page, state: 'available' | 'downloadable', replies: {rewrites?: Record<string, string>; chat?: string; nicer?: string} = {}) {
  await page.addInitScript(({state, replies}) => {
    const log: {kind: string; system?: string; input?: string}[] = [];
    let current = state;
    Object.assign(window, {__onDevice: log});
    Object.defineProperty(window, 'LanguageModel', {configurable: true, value: {
      availability: async () => { log.push({kind: 'availability'}); return current; },
      create: async (options: {initialPrompts?: {content: string}[]; monitor?: (m: EventTarget) => void}) => {
        const system = options.initialPrompts?.[0]?.content ?? '';
        log.push({kind: 'create', system});
        if (current === 'downloadable') {
          const monitor = new EventTarget(); options.monitor?.(monitor);
          for (const loaded of [0, 0.5, 1]) monitor.dispatchEvent(Object.assign(new Event('downloadprogress'), {loaded}));
          current = 'available';
        }
        return {
          prompt: async (input: string) => {
            log.push({kind: 'prompt', system, input});
            return system.startsWith('You turn') ? replies.rewrites?.[input] ?? 'NONE' : system.startsWith('Reword') ? replies.nicer ?? 'A calm day.' : replies.chat ?? 'A short answer.';
          },
          promptStreaming: () => new ReadableStream<string>(),
          destroy() {},
        };
      },
    }});
  }, {state, replies});
}
/**
 * A card's address, as a real page load from another page: a fragment-only navigation before hydration can lose its
 * hash to the router's first history write (the same finding as Part 12's Meet ZIGi spec).
 */
async function settingsAt(page: Page, anchor: string) { await page.goto('/app'); await page.goto(`/app/settings#${anchor}`); }
const logged = (page: Page) => page.evaluate(() => (window as unknown as {__onDevice: Logged[]}).__onDevice);
const panel = (page: Page) => page.locator('dialog.ai-chat[open]');
test.beforeEach(async ({page}) => { await page.route('**/api/**', route => route.fulfill({status: 503, json: {error: 'offline fixture'}})); });

test('"Which setup fits me?": a few answers, one honest suggestion with its steps; worked out here, nothing stored', async ({page}) => {
  await seed(page);
  await settingsAt(page, 'zigi-setup');
  const card = page.locator('details#zigi-setup');
  await expect(card).toHaveAttribute('open', '');
  const before = await page.evaluate(() => JSON.stringify(localStorage));
  await card.getByRole('radio', {name: 'Nothing yet'}).check();
  await card.getByRole('radio', {name: 'On a phone'}).check();
  await card.getByRole('radio', {name: 'The best answers'}).check();
  const result = card.getByRole('article', {name: 'Recommendation'});
  await expect(result.getByRole('heading')).toHaveText('An API key from a provider');
  await expect(result.getByRole('listitem').filter({hasText: 'Set a monthly spending limit'})).toBeVisible();
  // A phone with privacy first: a phone runs no model, so the bridge, which sends only what the person copies.
  await card.getByRole('radio', {name: 'Nothing leaves my computer'}).check();
  await expect(result.getByRole('heading')).toHaveText('The subscription bridge');
  await expect(card.getByRole('radio', {name: '16 GB or more'})).toHaveCount(0);
  // A computer with privacy first asks about memory, then suggests a local model.
  await card.getByRole('radio', {name: 'On a computer'}).check();
  await expect(card.getByRole('article', {name: 'Recommendation'})).toHaveCount(0);
  await card.getByRole('radio', {name: '16 GB or more'}).check();
  await expect(result.getByRole('heading')).toHaveText('A local model on this computer (Ollama or LM Studio)');
  expect(await page.evaluate(() => JSON.stringify(localStorage))).toBe(before);
  // Without Chrome's model there is no card for it.
  await expect(page.locator('details#zigi-on-device')).toHaveCount(0);
});

test('the panel before setup offers the same questions', async ({page}) => {
  await seed(page);
  await page.goto('/app/habits');
  await page.getByRole('button', {name: /Open ZIGi/}).click();
  await panel(page).getByRole('button', {name: 'Which setup fits me?'}).click();
  const view = panel(page).getByRole('region', {name: 'Which setup fits me?'});
  await view.getByRole('radio', {name: 'A ChatGPT, Claude, Gemini or Grok subscription'}).check();
  await view.getByRole('radio', {name: 'On a phone'}).check();
  await view.getByRole('radio', {name: 'No extra cost'}).check();
  await expect(view.getByRole('article', {name: 'Recommendation'}).getByRole('heading')).toHaveText('The subscription bridge');
  await view.getByRole('button', {name: 'Back to the chat'}).click();
  await expect(panel(page).getByRole('note', {name: 'ZIGi is not connected to an AI'})).toContainText('Not connected to an AI yet');
});

test('Chrome\'s model: asking downloads nothing; the download only from the button, with progress; then the switch', async ({page, isMobile}) => {
  test.skip(isMobile, 'Chrome on computers');
  await fakeModel(page, 'downloadable');
  await seed(page);
  await settingsAt(page, 'zigi-on-device');
  const card = page.locator('details#zigi-on-device');
  await expect(card).toHaveAttribute('open', '');
  await expect(card).toContainText('Chrome can download its model when you choose.');
  await expect(card).toContainText('about 22 GB of free space');
  expect((await logged(page)).filter(l => l.kind === 'create')).toEqual([]);
  await card.getByRole('button', {name: 'Download Chrome’s model'}).click();
  await expect(card.getByRole('status').filter({hasText: 'Chrome’s model is ready on this computer.'})).toBeVisible();
  expect((await logged(page)).filter(l => l.kind === 'create')).toHaveLength(1);
  const use = card.getByRole('switch', {name: 'Use Chrome’s on-device model'});
  await expect(use).toHaveAttribute('aria-checked', 'false');
  await use.click();
  await expect(use).toHaveAttribute('aria-checked', 'true');
  expect(JSON.parse((await page.evaluate(k => localStorage.getItem(k), AI_OPTIONS_KEY))!)).toMatchObject({version: 1, onDevice: true});
});

test('with the model on and no AI: it puts a question in plain words for ZIGi\'s lookup, or answers briefly; it only ever gets the person\'s words', async ({page, isMobile}) => {
  test.skip(isMobile, 'Chrome on computers');
  const asked = 'roughly how long have I sat in calm breathing lately';
  await fakeModel(page, 'available', {rewrites: {[asked]: 'How many minutes did I meditate this month?'}, chat: 'A short stretch after a walk is a good start.'});
  await seed(page, {[AI_OPTIONS_KEY]: {version: 1, onDevice: true}});
  await page.goto('/app/habits');
  await page.getByRole('button', {name: /Open ZIGi/}).click();
  const box = panel(page).getByLabel('Ask ZIGi about your records');
  await box.fill(asked);
  await panel(page).getByRole('button', {name: 'Send', exact: true}).click();
  const first = panel(page).locator('.ai-turn-local').last();
  await expect(first).toContainText('Read as “How many minutes did I meditate this month?” with Chrome’s on-device model');
  await expect(first).toContainText('Answered by Chrome’s on-device model');
  let log = await logged(page);
  expect(log.filter(l => l.kind === 'prompt')).toEqual([{kind: 'prompt', system: REWRITE_SYSTEM, input: asked}]);
  // A question that is not about the records: the model's own short answer, labelled.
  await page.evaluate(() => { (window as unknown as {__onDevice: unknown[]}).__onDevice.length = 0; });
  await box.fill('what is a gentle way to start stretching');
  await panel(page).getByRole('button', {name: 'Send', exact: true}).click();
  const second = panel(page).locator('.ai-turn-local').last();
  await expect(second).toContainText('A short stretch after a walk is a good start.');
  await expect(second).toContainText('Answered by Chrome’s on-device model');
  log = await logged(page);
  expect(log.filter(l => l.kind === 'prompt')).toEqual([
    {kind: 'prompt', system: REWRITE_SYSTEM, input: 'what is a gentle way to start stretching'},
    {kind: 'prompt', system: CHAT_SYSTEM, input: 'what is a gentle way to start stretching'},
  ]);
});

test('a question never starts Chrome\'s download: with the model gone from this computer, ZIGi points to Settings', async ({page, isMobile}) => {
  test.skip(isMobile, 'Chrome on computers');
  await fakeModel(page, 'downloadable');
  await seed(page, {[AI_OPTIONS_KEY]: {version: 1, onDevice: true}});
  await page.goto('/app/habits');
  await page.getByRole('button', {name: /Open ZIGi/}).click();
  await panel(page).getByLabel('Ask ZIGi about your records').fill('what is a gentle way to start stretching');
  await panel(page).getByRole('button', {name: 'Send', exact: true}).click();
  await expect(panel(page).locator('.ai-turn-local').last()).toContainText('Chrome’s on-device model is not ready on this computer');
  expect((await logged(page)).filter(l => l.kind === 'create')).toEqual([]);
});

test('"Say it nicer · on this computer" on the brief, from the click only', async ({page, isMobile}) => {
  test.skip(isMobile, 'Chrome on computers');
  await fakeModel(page, 'available', {nicer: 'Today is calm: two habits are still open, and yesterday went well.'});
  await seed(page, {[AI_OPTIONS_KEY]: {version: 1, onDevice: true}});
  await page.goto('/app/habits');
  await page.getByRole('button', {name: /Open ZIGi/}).click();
  // Session Z-Cloud Part 2: the brief waits in the Suggestions sheet's "Your day" tab.
  await panel(page).getByRole('button', {name: 'Suggestions', exact: true}).click();
  await panel(page).getByRole('region', {name: 'Suggestions for you'}).getByRole('tab', {name: 'Your day'}).click();
  const brief = panel(page).getByRole('region', {name: 'Your morning brief'});
  await expect(brief).toBeVisible();
  expect((await logged(page)).filter(l => l.kind === 'create')).toEqual([]);
  await brief.getByRole('button', {name: 'Say it nicer · on this computer'}).click();
  await expect(brief).toContainText('Today is calm: two habits are still open, and yesterday went well.');
  await expect(brief).toContainText('Reworded by Chrome’s on-device model');
  const prompts = (await logged(page)).filter(l => l.kind === 'prompt');
  expect(prompts).toHaveLength(1);
  expect(prompts[0]!.system).toBe(SAY_NICER_SYSTEM);
  expect(prompts[0]!.input).toContain('ZIGi\'s morning brief (made on this device from the records)');
});

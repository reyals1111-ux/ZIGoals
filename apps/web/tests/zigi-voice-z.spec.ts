import {expect, test, type Page, type Route} from '@playwright/test';
import {buildShowcase} from '../lib/showcase-data';
import {DASHBOARD_SETTINGS_KEY, presetSettings} from '../lib/dashboard-settings';
import {WHATS_NEW_KEY, WHATS_NEW_RELEASE} from '../lib/whats-new';
import {AI_SETTINGS_KEY, defaultAiSettings, type AiSettings} from '../lib/ai/settings';
import {ZIGI_VOICE_KEY} from '../lib/z-device-keys';

/**
 * Session Z-Cloud Part 3 (ADR-019): talk to ZIGi, through the real panel on a production build, both projects. The
 * browser's speech recognition is a MOCK (it records the language and the event that was being dispatched when `start()`
 * ran, so a start inside the person's own press, click or key is proven); the microphone is a real Web Audio stream whose
 * tracks the test can watch end; speech synthesis is a MOCK that records what would be read. AI replies are MOCK.
 */
const BASE = 'http://127.0.0.1:1234', DAY = '2026-09-20', EVENING = '2026-09-20T19:00:00.000Z', NIGHT = '2026-09-20T23:30:00.000Z';
const chunk = (delta: Record<string, unknown>, finish: string | null = null) => `data: ${JSON.stringify({id: 'mock', object: 'chat.completion.chunk', choices: [{index: 0, delta, finish_reason: finish}]})}\n\n`;
const stream = (text: string) => [chunk({role: 'assistant', content: text}), chunk({}, 'stop'), 'data: [DONE]\n\n'].join('');
type Log = {starts: {lang: string; event: string; processLocally?: boolean}[]; stops: number; aborts: number; streams: number; ended: number};
async function fakes(page: Page, {recognition = true} = {}) {
  await page.addInitScript(({recognition}) => {
    const log = {starts: [] as {lang: string; event: string}[], stops: 0, aborts: 0, streams: 0, ended: 0, tracks: [] as MediaStreamTrack[]};
    const w = window as unknown as Record<string, unknown>;
    w.__voiceLog = log;
    class FakeRecognition {
      lang = ''; interimResults = false; continuous = true; maxAlternatives = 1; onresult: ((e: unknown) => void) | null = null; onend: (() => void) | null = null; onerror: ((e: unknown) => void) | null = null;
      constructor() { (w.__voiceLast as unknown) = this; }
      // The gesture whose task is running when start() is called (set by the capture listeners below, cleared after the task).
      start() { log.starts.push({lang: this.lang, event: (w.__gesture as string | null) ?? 'none'}); }
      stop() { log.stops++; setTimeout(() => { const said = w.__voiceSay as string | undefined; if (said) this.onresult?.({resultIndex: 0, results: [Object.assign([{transcript: said}], {isFinal: true})]}); this.onend?.(); }, 30); }
      abort() { log.aborts++; }
    }
    for (const type of ['pointerdown', 'pointerup', 'click', 'keydown']) window.addEventListener(type, () => { w.__gesture = type; setTimeout(() => { if (w.__gesture === type) w.__gesture = null; }, 0); }, true);
    if (recognition) { w.SpeechRecognition = FakeRecognition; w.webkitSpeechRecognition = FakeRecognition; }
    else { delete w.SpeechRecognition; delete w.webkitSpeechRecognition; }
    /** The person stops talking: the recognition delivers its words and ends by itself. */
    w.__voiceEnd = (text: string) => { const r = w.__voiceLast as FakeRecognition; r.onresult?.({resultIndex: 0, results: [Object.assign([{transcript: text}], {isFinal: true})]}); r.onend?.(); };
    Object.defineProperty(navigator, 'mediaDevices', {configurable: true, value: {getUserMedia: async () => { const ctx = new AudioContext(), dest = ctx.createMediaStreamDestination(); log.streams++; for (const t of dest.stream.getTracks()) { log.tracks.push(t); const stop = t.stop.bind(t); t.stop = () => { log.ended++; stop(); }; } return dest.stream; }}});
    const spoken: {text: string; lang: string; voice: string | null}[] = [];
    w.__spoken = spoken;
    Object.defineProperty(window, 'speechSynthesis', {configurable: true, value: {speaking: false, speak(u: SpeechSynthesisUtterance) { if (u.text) spoken.push({text: u.text, lang: u.lang, voice: u.voice?.name ?? null}); setTimeout(() => u.onend?.(new Event('end') as SpeechSynthesisEvent), 10); }, cancel() {}, getVoices() { return [{lang: 'en-GB', name: 'Daniel'}, {lang: 'en-US', name: 'Samantha'}, {lang: 'nl-BE', name: 'Ellen'}, {lang: 'nl-NL', name: 'Xander'}]; }}});
  }, {recognition});
}
const log = (page: Page) => page.evaluate(() => { const l = (window as unknown as {__voiceLog: Log}).__voiceLog; return {starts: l.starts, stops: l.stops, aborts: l.aborts, streams: l.streams, ended: l.ended}; });
const spoken = (page: Page) => page.evaluate(() => (window as unknown as {__spoken: unknown[]}).__spoken);
async function server(page: Page, reply = 'MOCK: you drank 1.2 litres today.') {
  await page.route(`${BASE}/**`, async (route: Route) => {
    const url = route.request().url();
    if (url.endsWith('/v1/models')) return route.fulfill({status: 200, contentType: 'application/json', body: JSON.stringify({object: 'list', data: [{id: 'mock-chat'}]})});
    return route.fulfill({status: 200, contentType: 'text/event-stream', body: stream(reply)});
  });
}
async function seed(page: Page, {ai = null as Partial<AiSettings> | null, voice = null as Record<string, unknown> | null, time = EVENING} = {}) {
  await page.clock.install({time});
  // Help, so that every test's next address is a document load: a jump to `/app/settings#…` from Settings itself is a
  // fragment change outside Next's router, which can rewrite the address without the hash while it finishes hydrating.
  await page.goto('/app/help');
  const base = defaultAiSettings();
  const values: Record<string, string> = {...buildShowcase(DAY).records, [DASHBOARD_SETTINGS_KEY]: JSON.stringify({...presetSettings('habits-health'), onboarded: true}), [WHATS_NEW_KEY]: JSON.stringify({version: 1, dismissed: [WHATS_NEW_RELEASE]})};
  if (ai) values[AI_SETTINGS_KEY] = JSON.stringify({...base, enabled: true, mode: 'local', provider: 'local', model: 'mock-chat', localServer: 'openai-compatible', baseUrl: BASE, ...ai});
  if (voice) values[ZIGI_VOICE_KEY] = JSON.stringify({version: 1, ...voice});
  await page.evaluate(v => { localStorage.clear(); sessionStorage.clear(); for (const [k, x] of Object.entries(v)) localStorage.setItem(k, x); }, values);
}
const SEEN = {disclosed: {chrome: '2026-09-01T00:00:00.000Z', safari: '2026-09-01T00:00:00.000Z', other: '2026-09-01T00:00:00.000Z'}};
const panel = (page: Page) => page.locator('dialog.ai-chat[open]');
const mic = (page: Page) => panel(page).getByRole('button', {name: /^(Talk to ZIGi|Stop listening)$/});
const launcherButton = (page: Page) => page.getByTestId('ai-launcher').getByRole('button', {name: /ZIGi, your personal AI companion/});
async function openChat(page: Page, path = '/app') { await page.goto(path); await page.getByRole('button', {name: /Open ZIGi/}).click(); await expect(panel(page)).toBeVisible(); }
/** A real press on a control: down, a pause of `ms`, up (the launcher's own timings, where a slow runner only lengthens it). */
async function press(page: Page, target: ReturnType<Page['locator']>, ms = 60) { const b = (await target.boundingBox())!; await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2); await page.mouse.down(); await page.waitForTimeout(ms); await page.mouse.up(); }
/** The microphone's tap and hold with exact timings: pointer events dispatched in the page (a slow runner cannot turn a tap into a hold). */
const pointer = (el: Element, type: string) => el.dispatchEvent(new PointerEvent(type, {bubbles: true, cancelable: true, button: 0, pointerId: 7, pointerType: 'mouse', isPrimary: true}));
async function tap(target: ReturnType<Page['locator']>) { await target.evaluate(el => { for (const type of ['pointerdown', 'pointerup']) el.dispatchEvent(new PointerEvent(type, {bubbles: true, cancelable: true, button: 0, pointerId: 7, pointerType: 'mouse', isPrimary: true})); }); }
async function hold(page: Page, target: ReturnType<Page['locator']>, ms: number) { await target.evaluate(pointer, 'pointerdown'); await page.waitForTimeout(ms); await target.evaluate(pointer, 'pointerup'); }
test.beforeEach(async ({page}) => { await page.route('**/api/**', route => route.fulfill({status: 503, json: {error: 'offline fixture'}})); });

test('without any AI the microphone is there; the first press says who hears the audio; "Talk now" starts inside the click; the words go to the on-device answers', async ({page, isMobile}) => {
  await fakes(page);
  await seed(page);
  await openChat(page, '/app/habits');
  await expect(mic(page)).toBeVisible();
  await expect(mic(page)).toHaveAttribute('aria-pressed', 'false');
  await tap(mic(page));
  const disclose = panel(page).getByRole('group', {name: 'Before you talk to ZIGi'});
  await expect(disclose).toContainText(isMobile ? 'Apple' : 'Google');
  await expect(disclose).toContainText('ZIGoals never stores the audio');
  expect((await log(page)).starts).toEqual([]);
  await disclose.getByRole('button', {name: 'Talk now'}).click();
  expect((await log(page)).starts).toEqual([{lang: 'en-US', event: 'click'}]);
  await expect(mic(page)).toHaveAttribute('aria-pressed', 'true');
  await expect(panel(page).getByRole('status').filter({hasText: 'Listening…'})).toHaveCount(1);
  const stored = await page.evaluate(k => JSON.parse(localStorage.getItem(k)!), ZIGI_VOICE_KEY);
  expect(Object.keys(stored.disclosed)).toEqual([isMobile ? 'safari' : 'chrome']);
  await page.evaluate(() => (window as unknown as {__voiceEnd: (t: string) => void}).__voiceEnd('How many minutes did I meditate this month?'));
  await expect(panel(page).locator('.ai-turn-user').last()).toHaveText('How many minutes did I meditate this month?');
  await expect(panel(page).locator('.ai-turn-local').last()).toBeVisible();
  await expect(mic(page)).toHaveAttribute('aria-pressed', 'false');
});

test('the composer\'s microphone: a tap starts inside the press and a second tap stops; a hold stops on release; Escape cancels and releases the microphone', async ({page, isMobile}) => {
  await fakes(page);
  await seed(page, {voice: {...SEEN, sendOnStop: false}});
  await openChat(page);
  await tap(mic(page));
  expect((await log(page)).starts).toEqual([{lang: 'en-US', event: 'pointerdown'}]);
  await expect(mic(page)).toHaveAttribute('aria-pressed', 'true');
  expect((await log(page)).stops).toBe(0);
  await tap(mic(page));
  await expect.poll(async () => (await log(page)).stops).toBe(1);
  await expect(mic(page)).toHaveAttribute('aria-pressed', 'false');
  await page.evaluate(() => { (window as unknown as {__voiceSay: string}).__voiceSay = 'two glasses of water'; });
  await hold(page, mic(page), 700);
  await expect.poll(async () => (await log(page)).stops).toBe(2);
  // "Send when I stop talking" is off here: the words wait in the box.
  await expect(panel(page).getByRole('textbox', {name: /^(Message to your AI|Ask ZIGi about your records)$/})).toHaveValue('two glasses of water');
  await expect(panel(page).locator('.ai-turn-user')).toHaveCount(0);
  await tap(mic(page));
  await expect(mic(page)).toHaveAttribute('aria-pressed', 'true');
  await page.keyboard.press('Escape');
  await expect(mic(page)).toHaveAttribute('aria-pressed', 'false');
  expect((await log(page)).aborts).toBe(1);
  await expect(panel(page)).toBeVisible();
  // Chromium on a computer measures the level on a real stream, and every track ends; iOS opens no second capture.
  const l = await log(page);
  if (isMobile) expect(l.streams).toBe(0);
  else { expect(l.streams).toBeGreaterThanOrEqual(1); expect(l.ended).toBe(l.streams); }
});

test('replies to a spoken question are read aloud in the chosen language; a typed one is not; mute silences', async ({page}) => {
  await fakes(page);
  await server(page);
  await seed(page, {ai: {voice: {transcription: 'off', transcriptionModel: null, language: 'nl-BE', readAloud: false}}, voice: SEEN});
  await openChat(page);
  await tap(mic(page));
  expect((await log(page)).starts.at(-1)!.lang).toBe('nl-BE');
  await page.evaluate(() => (window as unknown as {__voiceEnd: (t: string) => void}).__voiceEnd('Vertel me iets leuks over mijn week'));
  await expect(panel(page).locator('.ai-turn-assistant').last()).toContainText('MOCK: you drank');
  // The language is the chosen one; a test page cannot hand Chrome a real voice object, so the voice itself is the device's.
  await expect.poll(() => spoken(page)).toEqual([expect.objectContaining({text: 'MOCK: you drank 1.2 litres today.', lang: 'nl-BE'})]);
  // A typed question is not read.
  await panel(page).getByRole('textbox', {name: 'Message to your AI'}).fill('Tell me something nice');
  await panel(page).locator('.ai-composer button[type=submit]').click();
  await expect(panel(page).locator('.ai-turn-assistant')).toHaveCount(2);
  await page.waitForTimeout(300);
  expect(await spoken(page)).toHaveLength(1);
  await panel(page).getByRole('button', {name: 'Mute ZIGi’s voice'}).click();
  await expect(panel(page).getByRole('button', {name: 'Unmute ZIGi’s voice'})).toHaveAttribute('aria-pressed', 'true');
  await tap(mic(page));
  await page.evaluate(() => (window as unknown as {__voiceEnd: (t: string) => void}).__voiceEnd('Nog iets leuks?'));
  await expect(panel(page).locator('.ai-turn-assistant')).toHaveCount(3);
  await page.waitForTimeout(300);
  expect(await spoken(page)).toHaveLength(1);
});

test('quiet hours: a reply to a spoken question is not read at 23:30', async ({page}) => {
  await fakes(page);
  await server(page);
  await seed(page, {ai: {}, voice: SEEN, time: NIGHT});
  await openChat(page);
  await tap(mic(page));
  await page.evaluate(() => (window as unknown as {__voiceEnd: (t: string) => void}).__voiceEnd('Tell me something nice about my week'));
  await expect(panel(page).locator('.ai-turn-assistant').last()).toContainText('MOCK: you drank');
  await page.waitForTimeout(300);
  expect(await spoken(page)).toEqual([]);
});

test('Settings → Voice: English and Dutch only, no French; an old French choice listens in the device language', async ({page}) => {
  await fakes(page);
  await seed(page, {ai: {voice: {transcription: 'off', transcriptionModel: null, language: 'fr-FR', readAloud: false}}, voice: SEEN});
  // The Voice card opens from its own link, with or without an AI connected.
  await page.goto('/app/settings#zigi-voice');
  await expect(page.locator('details#zigi-voice')).toHaveAttribute('open', '');
  const language = page.locator('.ai-voice-settings').getByLabel('Language');
  await expect(language.locator('option')).toHaveText(['This device’s language (English (US))', 'English (UK)', 'English (US)', 'Nederlands (België)', 'Nederlands (Nederland)']);
  await expect(language).toHaveValue('');
  expect(await language.locator('option').allTextContents()).not.toContain(expect.stringMatching(/fr|Fran/i));
  for (const name of ['Show the microphone', 'Send when I stop talking', 'Read replies to spoken questions aloud', 'Tap ZIGi to talk']) await expect(page.locator('.ai-voice-settings').getByRole('switch', {name})).toBeVisible();
  await openChat(page);
  await tap(mic(page));
  expect((await log(page)).starts.at(-1)!.lang).toBe('en-US');
  await page.keyboard.press('Escape');
  await page.goto('/app/settings#zigi-voice');
  await language.selectOption('nl-NL');
  await expect.poll(() => page.evaluate(k => JSON.parse(localStorage.getItem(k)!).voice.language, AI_SETTINGS_KEY)).toBe('nl-NL');
  await openChat(page);
  await tap(mic(page));
  expect((await log(page)).starts.at(-1)!.lang).toBe('nl-NL');
});

test('ZIGi\'s launcher: before the chat exists a hold lights the mic; then a hold talks and its release stops; a tap opens; "Tap ZIGi to talk" and the shortcut start inside the click and the key', async ({page}) => {
  await fakes(page);
  await seed(page, {voice: SEEN});
  await page.goto('/app');
  await press(page, launcherButton(page), 700);
  await expect(panel(page)).toBeVisible();
  await expect(panel(page).locator('.ai-voice-hint')).toContainText('Tap the mic to talk');
  await expect(mic(page)).toHaveClass(/ai-mic-highlight/);
  expect((await log(page)).starts).toEqual([]);
  await panel(page).getByRole('button', {name: 'Close ZIGi'}).click();
  await expect(panel(page)).toHaveCount(0);
  await press(page, launcherButton(page), 900);
  await expect(panel(page)).toBeVisible();
  await expect.poll(async () => (await log(page)).starts.length).toBe(1);
  await expect.poll(async () => (await log(page)).stops).toBe(1);
  await panel(page).getByRole('button', {name: 'Close ZIGi'}).click();
  await press(page, launcherButton(page), 60);
  await expect(panel(page)).toBeVisible();
  expect((await log(page)).starts).toHaveLength(1);
  await panel(page).getByRole('button', {name: 'Close ZIGi'}).click();
  await page.evaluate(k => localStorage.setItem(k, JSON.stringify({version: 1, ...JSON.parse(localStorage.getItem(k)!), tapToTalk: true})), ZIGI_VOICE_KEY);
  await launcherButton(page).click();
  await expect.poll(async () => (await log(page)).starts.at(-1)).toEqual({lang: 'en-US', event: 'click'});
  await expect(mic(page)).toHaveAttribute('aria-pressed', 'true');
  await page.keyboard.press('Escape');
  await page.keyboard.press('Control+Shift+Space');
  await expect.poll(async () => (await log(page)).starts.at(-1)).toEqual({lang: 'en-US', event: 'keydown'});
  await expect(mic(page)).toHaveAttribute('aria-pressed', 'true');
});

test('long presses: no text selection, callout or menu on the launcher and the mic; a hold never moves the resting or the corner launcher', async ({page, isMobile}) => {
  await fakes(page);
  await seed(page, {voice: SEEN});
  await page.goto('/app');
  const box = page.getByTestId('ai-launcher');
  for (const scrolled of [false, true]) {
    if (scrolled) { await page.mouse.wheel(0, 900); await page.waitForTimeout(700); }
    const before = (await box.boundingBox())!;
    const b = (await launcherButton(page).boundingBox())!;
    await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2); await page.mouse.down(); await page.waitForTimeout(600);
    const during = (await box.boundingBox())!;
    await page.mouse.up();
    expect(during, `${isMobile ? 'phone' : 'computer'}, ${scrolled ? 'corner' : 'resting'}`).toEqual(before);
    await page.keyboard.press('Escape');
    if (await panel(page).count()) await panel(page).getByRole('button', {name: 'Close ZIGi'}).click();
  }
  const styles = await launcherButton(page).evaluate(el => { const cs = getComputedStyle(el); const menu = new MouseEvent('contextmenu', {bubbles: true, cancelable: true}); el.dispatchEvent(menu); return {select: cs.userSelect, touch: cs.touchAction, menu: menu.defaultPrevented}; });
  expect(styles).toEqual({select: 'none', touch: 'none', menu: true});
  await launcherButton(page).click();
  const micStyles = await mic(page).evaluate(el => { const cs = getComputedStyle(el); const menu = new MouseEvent('contextmenu', {bubbles: true, cancelable: true}); el.dispatchEvent(menu); return {select: cs.userSelect, touch: cs.touchAction, menu: menu.defaultPrevented}; });
  expect(micStyles).toEqual({select: 'none', touch: 'none', menu: true});
});

test('Motion Off: listening is a still glow and a level bar, nothing pulsing; with motion the rings flow', async ({page}) => {
  await fakes(page);
  await seed(page, {voice: SEEN});
  await openChat(page);
  await tap(mic(page));
  const waves = mic(page).locator('.zigi-waves');
  await expect(waves).toHaveAttribute('data-on', 'true');
  const moving = await waves.evaluate(el => ({ring: getComputedStyle(el.querySelector('i')!).animationName, bar: getComputedStyle(el.querySelector('.zigi-level-bar')!).display}));
  expect(moving).toEqual({ring: 'zigi-wave', bar: 'none'});
  await page.evaluate(() => { document.documentElement.dataset.appMotion = 'off'; });
  const still = await waves.evaluate(el => ({rings: [...el.querySelectorAll('i')].map(i => getComputedStyle(i).display), animation: getComputedStyle(el.querySelector('i')!).animationName, bar: getComputedStyle(el.querySelector('.zigi-level-bar')!).display, glow: getComputedStyle(el).boxShadow !== 'none'}));
  expect(still).toEqual({rings: ['block', 'none', 'none'], animation: 'none', bar: 'block', glow: true});
  await page.keyboard.press('Escape');
  await expect(waves).toHaveAttribute('data-on', 'false');
});

test('where the browser has no speech recognition: one plain line and the keyboard\'s dictation', async ({page}) => {
  await fakes(page, {recognition: false});
  await seed(page);
  await openChat(page);
  await tap(mic(page));
  await expect(panel(page).locator('.ai-voice-hint')).toContainText('Use your keyboard’s dictation (the mic on the iPhone keyboard), or type.');
  await expect(mic(page)).toHaveAttribute('aria-pressed', 'false');
});

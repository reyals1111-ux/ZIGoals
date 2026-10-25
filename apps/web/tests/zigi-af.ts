import {expect, type Page, type Route} from '@playwright/test';
import {buildShowcase} from '../lib/showcase-data';
import {DASHBOARD_SETTINGS_KEY, presetSettings} from '../lib/dashboard-settings';
import {WHATS_NEW_KEY, WHATS_NEW_RELEASE} from '../lib/whats-new';
import {AI_SETTINGS_KEY, defaultAiSettings, type AiSettings} from '../lib/ai/settings';
import {AI_OPTIONS_KEY} from '../lib/ai/store/keys';
import {HABITS_KEY} from '../lib/habits';
import {CHECKLIST_DAYS_KEY, CHECKLIST_KEY} from '../lib/af-checklist-keys';
import {emptyChecklist, emptyChecklistDays} from '../lib/checklist/schema';
import {addCustom, addFavourite} from '../lib/checklist/store';
import {ZIGI_VOICE_KEY} from '../lib/z-device-keys';

/**
 * Session AF (L4): the shared harness of ZIGi's Session AF specs (zigi-*-af.spec.ts), on a production build. Every
 * /api request answers 503 unless a spec routes it; the person's AI is a MOCK local OpenAI-compatible server whose
 * requests are recorded (a test that says "nothing was sent" checks they stay empty); speech is a MOCK that records what
 * would be read; recognition is a MOCK that delivers the words a test says. No model, no network, no wallet.
 */
export const BASE = 'http://127.0.0.1:1234', DAY = '2026-10-19';
export const MORNING = `${DAY}T07:00:00.000Z`, EVENING = `${DAY}T19:00:00.000Z`;
const chunk = (delta: Record<string, unknown>, finish: string | null = null) => `data: ${JSON.stringify({id: 'mock', object: 'chat.completion.chunk', choices: [{index: 0, delta, finish_reason: finish}]})}\n\n`;
const stream = (text: string) => [chunk({role: 'assistant', content: text}), chunk({}, 'stop'), 'data: [DONE]\n\n'].join('');
export const block = (value: unknown) => `\`\`\`zigoals-action\n${JSON.stringify(value)}\n\`\`\``;
export type Body = {messages: {role: string; content: unknown}[]};
export async function server(page: Page, reply: (body: Body) => string = () => 'MOCK: a calm reply.') {
  const bodies: Body[] = [];
  await page.route(`${BASE}/**`, async (route: Route) => {
    const url = route.request().url();
    if (url.endsWith('/v1/models')) return route.fulfill({status: 200, contentType: 'application/json', body: JSON.stringify({object: 'list', data: [{id: 'mock-chat'}]})});
    if (url.endsWith('/v1/chat/completions')) { const body = JSON.parse(route.request().postData() ?? '{}') as Body; bodies.push(body); return route.fulfill({status: 200, contentType: 'text/event-stream', body: stream(reply(body))}); }
    return route.fulfill({status: 404, body: ''});
  });
  return bodies;
}
/** The Showcase's habit ids by title, for a Checklist path that points at them. */
export function showcaseHabits(): Record<string, string> {
  const habits = JSON.parse(buildShowcase(DAY).records[HABITS_KEY]!) as {habits: {id: string; title: string}[]};
  return Object.fromEntries(habits.habits.map(h => [h.title, h.id]));
}
/** A fictional path: "Read" starred, the person's own "Push-ups" and "Buy running shoes". */
export function checklistRecords(): Record<string, string> {
  const at = new Date(`${DAY}T06:00:00.000Z`), read = showcaseHabits().Read;
  let r = emptyChecklist();
  if (read) r = addFavourite(r, {kind: 'habit', habitId: read}, {id: 'ck_read', at});
  r = addCustom(r, {label: 'Push-ups'}, {id: 'ck_push', at});
  r = addCustom(r, {label: 'Buy running shoes'}, {id: 'ck_shoes', at});
  return {[CHECKLIST_KEY]: JSON.stringify(r), [CHECKLIST_DAYS_KEY]: JSON.stringify(emptyChecklistDays())};
}
export const SEEN_VOICE = {disclosed: {chrome: '2026-09-01T00:00:00.000Z', safari: '2026-09-01T00:00:00.000Z', other: '2026-09-01T00:00:00.000Z'}};
export async function seed(page: Page, {ai = {} as Partial<AiSettings> | null, extra = {} as Record<string, string>, time = EVENING, voice = null as Record<string, unknown> | null} = {}) {
  await page.clock.install({time});
  await page.goto('/app/help');
  const values: Record<string, string> = {...buildShowcase(DAY).records, [DASHBOARD_SETTINGS_KEY]: JSON.stringify({...presetSettings('habits-health'), onboarded: true}), [WHATS_NEW_KEY]: JSON.stringify({version: 1, dismissed: [WHATS_NEW_RELEASE]}), ...extra};
  if (ai) { values[AI_SETTINGS_KEY] = JSON.stringify({...defaultAiSettings(), enabled: true, mode: 'local', provider: 'local', model: 'mock-chat', localServer: 'openai-compatible', baseUrl: BASE, ...ai}); values[AI_OPTIONS_KEY] = JSON.stringify({version: 1, toolMode: 'attach'}); }
  if (voice) values[ZIGI_VOICE_KEY] = JSON.stringify({version: 1, ...voice});
  await page.evaluate(v => { localStorage.clear(); sessionStorage.clear(); for (const [k, x] of Object.entries(v)) localStorage.setItem(k, x); }, values);
  // Session AE Gate C (ed1d90f4): the seed's own page settles before the test's next navigation (WebKit's stall).
  await page.waitForLoadState('networkidle');
}
/** MOCK speech: what would be read aloud; MOCK recognition: `say(page, words)` delivers the words and ends. */
export async function voiceFakes(page: Page) {
  await page.addInitScript(() => {
    const w = window as unknown as Record<string, unknown>;
    class FakeRecognition {
      lang = ''; interimResults = false; continuous = true; maxAlternatives = 1; onresult: ((e: unknown) => void) | null = null; onend: (() => void) | null = null; onerror: ((e: unknown) => void) | null = null;
      constructor() { (w.__voiceLast as unknown) = this; }
      start() {} stop() { setTimeout(() => this.onend?.(), 30); } abort() {}
    }
    w.SpeechRecognition = FakeRecognition; w.webkitSpeechRecognition = FakeRecognition;
    w.__voiceEnd = (text: string) => { const r = w.__voiceLast as FakeRecognition; r.onresult?.({resultIndex: 0, results: [Object.assign([{transcript: text}], {isFinal: true})]}); r.onend?.(); };
    Object.defineProperty(navigator, 'mediaDevices', {configurable: true, value: {getUserMedia: async () => new AudioContext().createMediaStreamDestination().stream}});
    const spoken: string[] = [];
    w.__spoken = spoken;
    Object.defineProperty(window, 'speechSynthesis', {configurable: true, value: {speaking: false, speak(u: SpeechSynthesisUtterance) { if (u.text) spoken.push(u.text); setTimeout(() => u.onend?.(new Event('end') as SpeechSynthesisEvent), 10); }, cancel() {}, getVoices() { return [{lang: 'en-GB', name: 'Daniel'}, {lang: 'nl-BE', name: 'Ellen'}]; }}});
  });
}
export const spoken = (page: Page) => page.evaluate(() => (window as unknown as {__spoken: string[]}).__spoken);
export const speak = (page: Page, words: string) => page.evaluate(t => (window as unknown as {__voiceEnd: (t: string) => void}).__voiceEnd(t), words);
export const panel = (page: Page) => page.locator('dialog.ai-chat[open]');
export async function openChat(page: Page) { await page.getByRole('button', {name: /Open ZIGi/}).first().click(); await expect(panel(page)).toBeVisible(); }
export const box = (page: Page) => panel(page).getByRole('textbox', {name: /^(Message to your AI|Ask ZIGi about your records)$/});
/**
 * Session AH Part 2 (AF16, WebKit "ZIGi box empty after a fill"): a fill that lands while the composer re-renders can be
 * reset to empty, and Send then stays disabled until the test times out. The text is filled until the box holds it and
 * Send is enabled (up to 15 s), then sent once.
 */
export async function fillComposer(page: Page, text: string, field = box(page)) {
  const submit = panel(page).locator('.ai-composer button[type=submit]');
  await expect(async () => { await field.fill(text); await expect(field).toHaveValue(text, {timeout: 1_000}); await expect(submit).toBeEnabled({timeout: 1_000}); }).toPass({timeout: 15_000});
  return submit;
}
export const say = async (page: Page, text: string) => { await (await fillComposer(page, text)).click(); };
export const lastLocal = (page: Page) => panel(page).locator('.ai-turn-local').last();
export const stored = (page: Page, key: string, where: 'local' | 'session' = 'local') => page.evaluate(([k, w]) => { const v = (w === 'session' ? sessionStorage : localStorage).getItem(k!); return v === null ? null : JSON.parse(v) as Record<string, any>; }, [key, where] as const); // eslint-disable-line @typescript-eslint/no-explicit-any
/** For you's cards can arrive a moment after the region; "Show more" is opened until the card is there. */
export async function forYouCard(page: Page, name: string) {
  const forYou = page.getByRole('region', {name: 'For you'}), card = forYou.getByRole('article', {name});
  const showMore = forYou.getByRole('button', {name: /^Show more/});
  await expect.poll(async () => { if (await showMore.isVisible()) await showMore.click(); return card.count(); }, {timeout: 15_000}).toBe(1);
  return card;
}

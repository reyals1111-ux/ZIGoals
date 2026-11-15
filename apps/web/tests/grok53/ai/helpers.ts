import {expect, type Page, type Route} from '@playwright/test';
import {buildShowcase} from '../../../lib/showcase-data';
import {DASHBOARD_SETTINGS_KEY, presetSettings} from '../../../lib/dashboard-settings';
import {WHATS_NEW_KEY, WHATS_NEW_RELEASE} from '../../../lib/whats-new';
import {AI_SETTINGS_KEY, defaultAiSettings, type AiSettings} from '../../../lib/ai/settings';
import {AI_OPTIONS_KEY} from '../../../lib/ai/store/keys';

/** Session AL (lane L7): shared steps for the AI specs (bot widths, an empty profile or the Showcase, a MOCK local model). */
export const DAY = '2026-11-04', MORNING = '2026-11-04T09:00:00.000Z', BASE = 'http://127.0.0.1:1234';
export type Body = {messages: {role: string; content: unknown}[]};
const chunk = (delta: Record<string, unknown>, finish: string | null = null) => `data: ${JSON.stringify({id: 'mock', object: 'chat.completion.chunk', choices: [{index: 0, delta, finish_reason: finish}]})}\n\n`;
export const stream = (text: string) => [chunk({role: 'assistant', content: text}), chunk({}, 'stop'), 'data: [DONE]\n\n'].join('');
export const connected = (): AiSettings => ({...defaultAiSettings(), enabled: true, mode: 'local', provider: 'local', model: 'mock-chat', localServer: 'openai-compatible', baseUrl: BASE});
/** A MOCK OpenAI-compatible local model; every request body is kept, so a spec can prove nothing was sent. */
export async function mockModel(page: Page, reply = 'MOCK reply.'): Promise<Body[]> {
  const bodies: Body[] = [];
  await page.route('**/api/**', route => route.fulfill({status: 503, json: {error: 'offline fixture'}}));
  await page.route(`${BASE}/**`, async (route: Route) => {
    const url = route.request().url();
    if (url.endsWith('/v1/models')) return route.fulfill({status: 200, contentType: 'application/json', body: JSON.stringify({object: 'list', data: [{id: 'mock-chat'}]})});
    if (url.endsWith('/v1/chat/completions')) { bodies.push(JSON.parse(route.request().postData() ?? '{}') as Body); return route.fulfill({status: 200, contentType: 'text/event-stream', body: stream(reply)}); }
    return route.fulfill({status: 404, body: ''});
  });
  return bodies;
}
/** A fresh profile (or the Showcase's records), onboarded, with or without a model. */
export async function seed(page: Page, {settings = null, showcase = false, extra = {}}: {settings?: AiSettings | null; showcase?: boolean; extra?: Record<string, string>} = {}) {
  await page.clock.install({time: MORNING});
  await page.goto('/app/settings'); await page.locator('html[data-app-hydrated]').waitFor({state: 'attached', timeout: 20_000}); /* Session AP: a seed only writes storage here, once the page is live (a jump made before it is lost to the router's first history write, CI 1726); no group needs opening */
  await page.evaluate(values => { localStorage.clear(); sessionStorage.clear(); for (const [k, v] of Object.entries(values)) localStorage.setItem(k, v); }, {
    ...(showcase ? buildShowcase(DAY).records : {}), [DASHBOARD_SETTINGS_KEY]: JSON.stringify({...presetSettings('habits-health'), onboarded: true}), [WHATS_NEW_KEY]: JSON.stringify({version: 1, dismissed: [WHATS_NEW_RELEASE]}),
    [AI_OPTIONS_KEY]: JSON.stringify({version: 1, toolMode: 'attach'}), ...(settings ? {[AI_SETTINGS_KEY]: JSON.stringify(settings)} : {}), ...extra,
  });
  await page.waitForLoadState('networkidle');
}
export const nova = (page: Page) => page.locator('section.nova-chat');
/** ⌘/Ctrl + J (the command bar) sends the words to NOVA, whose page opens with its chat (as tests/nova-chat.spec.ts does). */
export async function sendInNova(page: Page, text: string) {
  // Fix-up FX-G53b: on NOVA itself ⌘/Ctrl + J opens no bar by design (components/nova/nova-entry.tsx: "except on NOVA
  // itself, which has its own command field"), so there the words go where a person types them: the open chat's composer,
  // or else the dashboard's "Ask NOVA" field, whose Enter sends them and opens the chat. The dashboard mounts after
  // hydration, so the field is ready once it is visible.
  if (/^\/app\/nova\/?$/.test(new URL(page.url()).pathname)) {
    const field = await nova(page).isVisible() ? nova(page).getByRole('textbox', {name: /^Message /}) : page.getByRole('form', {name: /^Ask /}).getByRole('textbox', {name: /^Message /});
    await field.fill(text);
    await field.press('Enter');
    await expect(nova(page)).toBeVisible();
    return;
  }
  await page.keyboard.press(process.platform === 'darwin' ? 'Meta+j' : 'Control+j');
  const bar = page.locator('dialog.nova-bar[open]');
  await expect(bar).toBeVisible();
  await bar.getByRole('textbox').fill(text);
  await bar.getByRole('textbox').press('Enter');
  await expect(page).toHaveURL(/\/app\/nova(\?|$)/);
  await expect(nova(page)).toBeVisible();
}

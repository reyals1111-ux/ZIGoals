import {expect, test, type Page, type Route} from '@playwright/test';
import {DASHBOARD_SETTINGS_KEY, presetSettings} from '../lib/dashboard-settings';
import {WHATS_NEW_KEY, WHATS_NEW_RELEASE} from '../lib/whats-new';
import {AI_SETTINGS_KEY, defaultAiSettings} from '../lib/ai/settings';
import {AI_OPTIONS_KEY} from '../lib/ai/store/keys';
import {NOTES_KEY} from '../lib/notes/schema';

/**
 * Session AK lane WA (owner follow-up 2 B5; WIRING_AUDIT_2 B5): "Ask about my notes" on the Notes page. A fresh start
 * teaches; with notes it waits for NOVA → Permissions → Notes (off by default) and then for a model of the person's own;
 * with both, the question goes to NOVA's own chat, which reads the notes (a MOCK local model answers) and says so. The
 * Showcase shows a labelled example and sends nothing. Fictional notes only; the clock is fixed.
 */
test.skip(({isMobile}) => isMobile, 'one layout is enough for the path; the Notes page is covered on phones by notes.spec.ts');
const BASE = 'http://127.0.0.1:1234', EVENING = '2026-09-20T19:00:00.000Z';
const NOTE = {id: 'wa-note-1', kind: 'topic', title: 'Fictional garden plan', body: 'Plant the beans in May, after the last frost.', createdAt: '2026-09-18T08:00:00.000Z', updatedAt: '2026-09-18T08:00:00.000Z'};
const settled = {[DASHBOARD_SETTINGS_KEY]: JSON.stringify({...presetSettings('habits-health'), onboarded: true}), [WHATS_NEW_KEY]: JSON.stringify({version: 1, dismissed: [WHATS_NEW_RELEASE]}), 'zigoals:onboarding:v1': JSON.stringify({version: 1, seen: true}), 'zigoals:nova:v1': JSON.stringify({version: 1, openingSeen: true})};
const model = () => { const base = defaultAiSettings(); return JSON.stringify({...base, enabled: true, mode: 'local', provider: 'local', model: 'mock-chat', localServer: 'openai-compatible', baseUrl: BASE}); };
async function seed(page: Page, values: Record<string, string>) {
  await page.clock.install({time: EVENING});
  await page.route('**/api/**', route => route.fulfill({status: 503, json: {error: 'offline fixture'}}));
  await page.goto('/app/settings'); /* Session AP: a seed only writes storage here; no group needs opening */
  await page.evaluate(v => { localStorage.clear(); sessionStorage.clear(); for (const [k, x] of Object.entries(v)) localStorage.setItem(k, x); }, {...settled, ...values});
}
const ask = (page: Page) => page.getByRole('region', {name: 'Ask about my notes'});

test('a fresh start teaches; with notes it waits for NOVA → Permissions, then for a model of your own', async ({page}) => {
  await seed(page, {});
  await page.goto('/app/notes');
  await expect(ask(page)).toContainText('Once you have notes, ask NOVA about them here');
  await page.evaluate(([k, v]) => localStorage.setItem(k!, v!), [NOTES_KEY, JSON.stringify({version: 1, notes: [NOTE]})]);
  await page.reload();
  await expect(ask(page)).toContainText('NOVA reads your notes only when Notes is on in NOVA → Permissions.');
  await expect(ask(page).getByRole('link', {name: 'Open NOVA → Permissions'})).toHaveAttribute('href', '/app/nova#nova-permissions');
  await page.evaluate(k => localStorage.setItem(k, JSON.stringify({version: 1, scopes: {notes: true}})), 'zigoals:nova-setup:v1');
  await page.reload();
  await expect(ask(page)).toContainText('NOVA answers questions about your notes with a model of your own');
  await expect(ask(page).getByRole('link', {name: 'Build NOVA’s brain'})).toHaveAttribute('href', '/app/nova/setup');
  await expect(ask(page).getByRole('textbox')).toHaveCount(0);
});

test('with Notes allowed and a model of your own, the question goes to NOVA\'s chat, which reads the notes', async ({page}) => {
  const seen: string[] = [];
  await page.route(`${BASE}/**`, async (route: Route) => {
    const url = route.request().url();
    if (url.endsWith('/v1/models')) return route.fulfill({status: 200, contentType: 'application/json', body: JSON.stringify({object: 'list', data: [{id: 'mock-chat'}]})});
    if (url.endsWith('/v1/chat/completions')) { seen.push(route.request().postData() ?? ''); return route.fulfill({status: 200, contentType: 'text/event-stream', body: `data: ${JSON.stringify({id: 'm', object: 'chat.completion.chunk', choices: [{index: 0, delta: {role: 'assistant', content: 'Your garden note says May.'}, finish_reason: null}]})}\n\ndata: ${JSON.stringify({id: 'm', object: 'chat.completion.chunk', choices: [{index: 0, delta: {}, finish_reason: 'stop'}]})}\n\ndata: [DONE]\n\n`}); }
    return route.fulfill({status: 404, body: ''});
  });
  await seed(page, {[NOTES_KEY]: JSON.stringify({version: 1, notes: [NOTE]}), 'zigoals:nova-setup:v1': JSON.stringify({version: 1, privacyMode: 'strict', scopes: {notes: true}}), [AI_SETTINGS_KEY]: model(), [AI_OPTIONS_KEY]: JSON.stringify({version: 1, toolMode: 'attach'})});
  await page.goto('/app/notes');
  await expect(ask(page)).toContainText('Privacy mode Strict: only a model on this computer reads your notes');
  await ask(page).getByLabel('Your question').fill('When do I plant the beans?');
  expect(seen).toEqual([]);
  await ask(page).getByRole('button', {name: 'Ask NOVA'}).click();
  await expect(page).toHaveURL(/\/app\/nova(\?|$)/);
  const chat = page.locator('section.nova-chat');
  await expect(chat.locator('.nova-turn-user').last()).toContainText('About my notes: When do I plant the beans?');
  await expect(chat.locator('.nova-turn-assistant').last()).toContainText('Your garden note says May.', {timeout: 20_000});
  // NOVA's pack carried the notes (the Notes permission is on): the note's title reached the person's own model.
  expect(seen.some(body => body.includes('Fictional garden plan'))).toBe(true);
});

test('the Showcase shows a labelled example of asking about notes, and sends nothing', async ({page}) => {
  const sent: string[] = [];
  page.on('request', r => { if (r.method() === 'POST' && !r.url().startsWith('http://127.0.0.1:3')) sent.push(r.url()); });
  await seed(page, {});
  await page.getByRole('button', {name: 'Load Showcase Demo', exact: true}).click(); await page.waitForURL('**/app');
  await page.goto('/app/notes');
  const example = ask(page).getByRole('note', {name: 'Showcase example'});
  await expect(example).toContainText('Showcase example: written for the Showcase, no AI ran and nothing was sent.');
  await expect(example).toContainText('About my notes: what helps me stay calm?');
  expect(sent).toEqual([]);
});

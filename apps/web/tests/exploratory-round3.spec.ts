import {expect, test, type Page} from '@playwright/test';
import {openNovaConversation, withEarlierWidgets} from './nova-am';
import {DASHBOARD_SETTINGS_KEY, presetSettings} from '../lib/dashboard-settings';

/**
 * Session AK lane P7 (owner follow-up 4, P7): exploratory round 3 — docs/review/session-ak/EXPLORATORY_ROUND3.md (EX3-1 …).
 * Each bug checked the way the tester found it. A fresh device, every `/api/**` answered 503, fictional words only.
 */
const NOVA_KEY = 'zigoals:nova:v1';
async function fresh(page: Page, extra: Record<string, string> = {}) {
  await page.route('**/api/**', route => route.fulfill({status: 503, json: {error: 'offline fixture'}}));
  await page.goto('/manifest.webmanifest');
  await page.evaluate(values => { localStorage.clear(); sessionStorage.clear(); for (const [k, v] of Object.entries(values)) localStorage.setItem(k, v); },
    {'zigoals:onboarding:v1': JSON.stringify({version: 1, seen: true}), [DASHBOARD_SETTINGS_KEY]: JSON.stringify({...presetSettings('balanced'), onboarded: true}), ...extra});
}
// Session AM (D2, deliberate): a record without a widget list used to read as AK's eight "Everyday" widgets; the stage now
// starts empty, so the record these tests start from arranges that same list first (tests/nova-am.ts), and each assertion stays.
const seen = (more: Record<string, unknown> = {}) => ({[NOVA_KEY]: JSON.stringify(withEarlierWidgets({version: 1, openingSeen: true, ...more}))});
const chat = (page: Page) => page.locator('section.nova-chat');
async function openNova(page: Page) {
  await page.goto('/app/nova');
  await expect(page.getByRole('button', {name: /^Exit NOVA/})).toBeVisible();
}
/**
 * Every control of the open chat outside its scrolling conversation (the header's tools, the composer, "Ask ZIGi about a
 * page") that is not where a press lands once scrolled into view: its centre outside the window, or another element (the
 * foot) on top of it. Lead's report: on 1d6902be, `.nova-foot` intercepted "Let ZIGi answer here" (tests/nova-chat.spec.ts).
 */
const coveredControls = (page: Page) => chat(page).evaluate(root => {
  const out: string[] = [];
  for (const el of root.querySelectorAll<HTMLElement>('button, select, textarea, input, a[href]')) {
    if (el.closest('.nova-chat-log') || el.closest('[hidden]')) continue;
    el.scrollIntoView({block: 'nearest'}); // as a press does: a control may scroll inside its own panel, never sit under another
    const r = el.getBoundingClientRect(); if (!r.width || !r.height) continue;
    const x = r.left + r.width / 2, y = r.top + r.height / 2, name = (el.getAttribute('aria-label') ?? el.textContent ?? el.tagName).trim().slice(0, 40);
    if (x < 0 || y < 0 || x > innerWidth || y > innerHeight) { out.push(`${name}: centre ${Math.round(x)},${Math.round(y)} outside ${innerWidth}×${innerHeight}`); continue; }
    const hit = document.elementFromPoint(x, y);
    if (!hit || !(el === hit || el.contains(hit) || (el.tagName === 'SELECT' && hit.closest('label')?.contains(el)))) out.push(`${name}: under ${hit ? `${hit.tagName.toLowerCase()}.${String(hit.className).split(' ')[0]}` : 'nothing'}`);
  }
  return out;
});

test.describe('NOVA on a computer', () => {
  test.skip(({isMobile}) => isMobile, 'computer layout');

  test('EX3-1: with "Ask ZIGi about a page" open, every chat control is where a press lands (768 to 1920 px)', async ({page}) => {
    await page.setViewportSize({width: 1280, height: 720});
    await fresh(page, seen());
    await openNova(page);
    const field = page.locator('.nova-command').getByRole('textbox', {name: 'Message NOVA'});
    await field.fill('hello');
    await field.press('Enter');
    // Session AM (D7, deliberate): Enter in the dashboard field no longer always opens the conversation (words the stage
    // has a widget for are answered under the star); it is opened as a person would, from the answer's button when it did
    // not open by itself, and is then read exactly as before.
    await openNovaConversation(page);
    const box = chat(page).getByRole('textbox', {name: /^Message /});
    await expect(box).toBeFocused();
    await box.fill('Write me a kind note about my water this week.');
    // Opened by keyboard: the toggle itself may be the control that is covered.
    await chat(page).getByRole('button', {name: 'Ask ZIGi about a page'}).focus();
    await page.keyboard.press('Enter');
    await expect(chat(page).getByRole('group', {name: 'Ask ZIGi about a page'})).toBeVisible();
    for (const [width, height] of [[1280, 720], [1440, 900], [1440, 800], [1920, 1080], [1024, 768], [768, 1024], [1366, 640]] as const) {
      await page.setViewportSize({width, height});
      await expect.poll(() => coveredControls(page), {message: `${width}×${height}`, timeout: 3_000}).toEqual([]);
    }
    // And the press itself lands: ZIGi takes the task.
    await page.setViewportSize({width: 1280, height: 720});
    await chat(page).getByRole('button', {name: 'Let ZIGi answer here'}).click({timeout: 5_000});
  });

  test('NOVA Tasks widget, fresh start: after the first task the title field keeps the focus; a letter is a word, never a shortcut', async ({page}) => {
    await page.setViewportSize({width: 1440, height: 900});
    await fresh(page, seen({widgets: [{id: 'tasks', size: 'M', slot: 0}]}));
    await openNova(page);
    const widget = page.locator('.tasks-widget');
    const title = widget.getByRole('textbox', {name: 'New task'});
    await title.fill('Water the plants');
    await title.press('Enter');
    await expect(widget.getByRole('list', {name: 'Today’s tasks'})).toContainText('Water the plants');
    await expect(title).toBeFocused();
    await page.keyboard.type('t');
    await expect(title).toHaveValue('t');
    await expect(page).toHaveURL(/\/app\/nova$/);
  });

  test('EX3-4: Hermes as NOVA\'s brain, then a new API_SERVER_KEY tested in the guide: NOVA\'s chat sends the new key', async ({page}) => {
    await page.setViewportSize({width: 1440, height: 900});
    const KEY1 = 'hermes-old-key-0123456789abcdef', KEY2 = 'hermes-new-key-fedcba9876543210';
    let valid = KEY1; const sent: string[] = [];
    await fresh(page, seen());
    // A MOCK Hermes API server on its default port: /health open, everything else behind the bearer key.
    await page.route('http://127.0.0.1:8642/**', route => {
      const url = new URL(route.request().url()), auth = route.request().headers().authorization ?? '';
      if (url.pathname === '/health') return route.fulfill({json: {status: 'ok', platform: 'hermes-agent', version: '0.22.5'}});
      if (url.pathname.startsWith('/v1/chat')) sent.push(auth);
      if (auth !== `Bearer ${valid}`) return route.fulfill({status: 401, json: {error: {message: 'Invalid gateway API key (API_SERVER_KEY)', type: 'gateway_auth_error', code: 'gateway_auth_failed'}}});
      if (url.pathname === '/v1/models') return route.fulfill({json: {object: 'list', data: [{id: 'hermes-agent', object: 'model'}]}});
      if (url.pathname === '/v1/chat/completions') return route.fulfill({status: 200, contentType: 'text/event-stream', body: 'data: {"choices":[{"index":0,"delta":{"content":"Hello from your Hermes."},"finish_reason":"stop"}]}\n\ndata: [DONE]\n\n'});
      return route.fulfill({status: 404, body: ''});
    });
    const connect = async (key: string) => {
      await page.goto('/app/nova/hermes');
      await page.getByRole('button', {name: /^Connect it in ZIGoals/}).first().click();
      const panel = page.locator('[data-hermes-panel="connect"]');
      await panel.getByLabel('API_SERVER_KEY').fill(key);
      await panel.getByLabel(/Remember the key/).check();
      await panel.getByRole('button', {name: /Test \/health|Check again/}).click();
      // Session AM, second pass (spec cause): on the second visit the row already reads "Checked: it works." from the first
      // test, so that line alone was true before the new check (and the key's hand-over to the brain) had run, and the
      // spec left the page mid-check. The check is over when its button is back from "Checking…".
      await expect(panel.locator('.nova-guide-check').getByRole('button', {name: 'Check again'})).toBeEnabled({timeout: 15_000});
      await expect(panel.locator('.nova-guide-check-result')).toContainText('Checked: it works.');
      return panel;
    };
    const panel = await connect(KEY1);
    await panel.getByRole('button', {name: 'Use Hermes as NOVA’s brain'}).click();
    await expect(panel.getByRole('status').filter({hasText: 'now answer with your Hermes'})).toBeVisible();
    // Hermes's key changes (a new API_SERVER_KEY, gateway restarted); the person tests the new one in the guide.
    valid = KEY2;
    const again = await connect(KEY2);
    await expect(again.getByRole('button', {name: 'Hermes is NOVA’s brain'})).toBeDisabled();
    await openNova(page);
    const field = page.locator('.nova-command').getByRole('textbox', {name: 'Message NOVA'});
    await field.fill('hello');
    await field.press('Enter');
    await expect(chat(page).locator('.nova-turn-assistant').last()).toContainText('Hello from your Hermes.', {timeout: 15_000});
    expect(sent.at(-1)).toBe(`Bearer ${KEY2}`);
  });
});


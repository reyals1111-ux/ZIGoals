import {expect, test, type Page, type Route} from '@playwright/test';
import {buildShowcase} from '../lib/showcase-data';
import {DASHBOARD_SETTINGS_KEY, presetSettings} from '../lib/dashboard-settings';
import {WHATS_NEW_KEY, WHATS_NEW_RELEASE} from '../lib/whats-new';
import {AI_SETTINGS_KEY, defaultAiSettings} from '../lib/ai/settings';
import {AI_OPTIONS_KEY} from '../lib/ai/store/keys';
import {NOVA_KEY} from '../lib/nova/store';
import {NOVA_SETUP_KEY} from '../lib/nova/setup';
import {NOVA_WORKFLOWS_KEY} from '../lib/nova/workflows/schema';

/**
 * Session AK lane P1 (owner message 4, P1; WIRING_AUDIT_2 row N2 gap 3): NOVA's "Make it yours" and its panels, driven on
 * the UI path — the four layouts (Customize the view and View controls; remembered on this device), the five accents (each
 * a different nebula pair on NOVA's frame), the persona (name, avatar: the orb or ZIGi, what NOVA calls the person), the
 * Activity panel (a card confirmed in NOVA appears there, by ZIGi, and is removed and put back with Undo) and the model per
 * task (chat, briefs, workflows) on a MOCK local server. The MOCK answers on 127.0.0.1:1234 come from page.route; every
 * other outside host is refused and counted (nothing leaves the browser). Fictional data only.
 */
const BASE = 'http://127.0.0.1:1234', DAY = '2026-09-20', EVENING = '2026-09-20T19:00:00.000Z';
const nova = (page: Page) => page.evaluate(k => JSON.parse(localStorage.getItem(k) ?? 'null'), NOVA_KEY);
const frame = (page: Page) => page.locator('.nova-frame');
const seen = (more: Record<string, unknown> = {}) => JSON.stringify({version: 1, openingSeen: true, ...more});
const localAi = () => ({...defaultAiSettings(), enabled: true, mode: 'local', provider: 'local', model: 'mock-chat', localServer: 'openai-compatible', baseUrl: BASE});
const chunk = (delta: Record<string, unknown>, finish: string | null = null) => `data: ${JSON.stringify({id: 'mock', object: 'chat.completion.chunk', choices: [{index: 0, delta, finish_reason: finish}]})}\n\n`;
const stream = (text: string) => [chunk({role: 'assistant', content: text}), chunk({}, 'stop'), 'data: [DONE]\n\n'].join('');
const block = (value: unknown) => `Here it is.\n\n\`\`\`zigoals-action\n${JSON.stringify(value)}\n\`\`\``;

const external: string[] = [];
test.beforeEach(async ({page}) => {
  external.length = 0;
  await page.emulateMedia({reducedMotion: 'reduce'});
  await page.route('**/api/**', route => route.fulfill({status: 503, json: {error: 'offline fixture'}}));
  await page.route(/^https?:\/\/(?!127\.0\.0\.1:(?:3\d{3}|1234))/, route => { external.push(route.request().url()); return route.abort(); });
});
test.afterEach(() => { expect(external.filter(u => !/fonts\.g|localhost/.test(u))).toEqual([]); });

/** A fresh device that has seen NOVA's opening once (so nothing plays over the controls). */
async function fresh(page: Page, extra: Record<string, string> = {}) {
  await page.goto('/app/settings');
  await page.evaluate(values => { localStorage.clear(); sessionStorage.clear(); for (const [k, v] of Object.entries(values)) localStorage.setItem(k, v); },
    {'zigoals:onboarding:v1': JSON.stringify({version: 1, seen: true}), [NOVA_KEY]: seen(), ...extra});
}
/** The MOCK local server: two chat models, and the given reply to every chat request. */
async function mockLocal(page: Page, reply: string) {
  await page.route(`${BASE}/**`, (route: Route) => {
    const url = route.request().url();
    if (url.endsWith('/v1/models')) return route.fulfill({status: 200, contentType: 'application/json', body: JSON.stringify({object: 'list', data: [{id: 'mock-chat'}, {id: 'mock-small'}]})});
    if (url.endsWith('/v1/chat/completions')) return route.fulfill({status: 200, contentType: 'text/event-stream', body: stream(reply)});
    return route.fulfill({status: 404, body: ''});
  });
}
async function customize(page: Page, persona = 'NOVA') {
  await page.getByRole('button', {name: 'Customize the view'}).click();
  const sheet = page.getByRole('dialog', {name: `Make ${persona} yours`});
  await expect(sheet).toBeVisible();
  return sheet;
}

test.describe('Make NOVA yours on a computer', () => {
  test.skip(({isMobile}) => isMobile, 'the computer layouts');
  test.use({viewport: {width: 1440, height: 900}});

  test('the four layouts: Orbit, Bento, Focus and Minimal, from Customize and from View controls; remembered on this device', async ({page}) => {
    await fresh(page);
    await page.goto('/app/nova');
    await expect(frame(page)).toHaveAttribute('data-layout', 'orbit');
    await expect(page.locator('.nova-orbit .nova-orbit-centre .nova-orb-button')).toBeVisible();
    const all = await page.locator('.nova-orbit .nova-widget').count();
    expect(all).toBeGreaterThan(3); // a fresh start has more than Focus's three on its stage
    const sheet = await customize(page);
    const layouts = sheet.getByRole('group', {name: 'Layout'});
    await layouts.getByRole('radio', {name: 'Bento'}).check();
    await expect(frame(page)).toHaveAttribute('data-layout', 'bento');
    await expect(sheet.locator('p.nova-status-line')).toHaveText('Bento layout.');
    await expect(page.locator('.nova-bento .nova-bento-hero .nova-orb-button')).toBeAttached();
    await expect(page.locator('.nova-bento .nova-widget')).toHaveCount(all);
    await layouts.getByRole('radio', {name: 'Focus'}).check();
    await expect(frame(page)).toHaveAttribute('data-layout', 'focus');
    await expect(page.locator('.nova-focus-layout .nova-focus-row .nova-widget')).toHaveCount(3);
    await layouts.getByRole('radio', {name: 'Minimal'}).check();
    await expect(frame(page)).toHaveAttribute('data-layout', 'minimal');
    await expect(page.locator('.nova-widget')).toHaveCount(0);
    await expect(page.locator('.nova-minimal .nova-orb-button')).toBeAttached();
    expect((await nova(page)).layout).toBe('minimal');
    await sheet.getByRole('button', {name: 'Close Make NOVA yours'}).click();
    // Minimal keeps the widgets (only hidden): View controls says where they wait.
    await page.reload();
    await expect(frame(page)).toHaveAttribute('data-layout', 'minimal');
    const view = page.getByRole('button', {name: /View controls/});
    await expect(view).toContainText('View · Minimal');
    await view.click();
    const menu = page.getByRole('group', {name: 'View controls'});
    await expect(menu.getByText('Minimal shows the star alone; your widgets wait here.')).toBeVisible();
    await menu.getByRole('radio', {name: 'Orbit'}).check();
    await expect(frame(page)).toHaveAttribute('data-layout', 'orbit');
    await expect(page.locator('.nova-orbit .nova-widget')).toHaveCount(all);
    await expect(page.getByRole('button', {name: /View controls/})).toContainText('View · Orbit');
  });

  test('the five accents: each paints NOVA in its own nebula pair, and the choice stays after a reload', async ({page}) => {
    await fresh(page);
    await page.goto('/app/nova');
    await expect(frame(page)).toHaveAttribute('data-accent', 'violet');
    const sheet = await customize(page);
    const accents = sheet.getByRole('group', {name: 'Accent'});
    const paint = () => frame(page).evaluate(el => { const s = getComputedStyle(el); return `${s.getPropertyValue('--nova-a').trim()}|${s.getPropertyValue('--nova-b').trim()}`; });
    const seenPaint = new Set<string>();
    for (const [id, label] of [['cyan', 'Comet cyan'], ['magenta', 'Aurora magenta'], ['teal', 'Lagoon teal'], ['gold', 'Solar gold'], ['violet', 'Nebula violet']] as const) {
      await accents.getByRole('radio', {name: label}).check();
      await expect(frame(page)).toHaveAttribute('data-accent', id);
      await expect(sheet.locator('p.nova-status-line')).toHaveText(`${label}.`);
      seenPaint.add(await paint());
    }
    expect(seenPaint.size).toBe(5);
    await accents.getByRole('radio', {name: 'Solar gold'}).check();
    expect((await nova(page)).accent).toBe('gold');
    await page.reload();
    await expect(frame(page)).toHaveAttribute('data-accent', 'gold');
  });

  test('the persona: a name of its own, ZIGi or the orb as its face, and what it calls the person; a blank name is NOVA again', async ({page}) => {
    await fresh(page);
    await page.goto('/app/nova');
    let sheet = await customize(page);
    await sheet.getByRole('textbox', {name: 'Your assistant’s name'}).fill('Vega');
    await sheet.getByRole('button', {name: 'Save name'}).click();
    sheet = page.getByRole('dialog', {name: 'Make Vega yours'});
    await expect(sheet.locator('p.nova-status-line')).toHaveText('Your assistant is called Vega now.');
    await expect(page.locator('.nova-greeting')).toContainText('Vega is online.');
    await expect(page.getByRole('textbox', {name: 'Message Vega'})).toBeAttached();
    await expect(page.locator('.nova-orb-button')).toContainText('Talk to Vega');
    // The face: ZIGi as the person dressed ZIGi, then the orb again.
    await sheet.getByRole('radio', {name: 'ZIGi, as you dressed ZIGi'}).check();
    await expect(sheet.locator('p.nova-status-line')).toHaveText('ZIGi is the face of your assistant now.');
    await expect(page.locator('.nova-orb-button .nova-persona-zigi')).toBeAttached();
    expect((await nova(page)).persona).toEqual({name: 'Vega', avatar: 'zigi'});
    await sheet.getByRole('radio', {name: 'The NOVA orb'}).check();
    await expect(page.locator('.nova-orb-button .nova-persona-zigi')).toHaveCount(0);
    // What Vega calls the person: in the greeting and the command field, on this device only.
    await sheet.getByRole('textbox', {name: /What Vega calls you/}).fill('Fictional Rey');
    await sheet.getByRole('button', {name: 'Save', exact: true}).click();
    await expect(sheet.locator('p.nova-status-line')).toHaveText('Vega calls you Fictional Rey.');
    await expect(page.locator('.nova-greeting')).toContainText(', Fictional Rey. Vega is online.');
    await expect(page.getByRole('textbox', {name: 'Message Vega'})).toHaveAttribute('placeholder', 'What’s on your mind, Fictional Rey?');
    await sheet.getByRole('button', {name: 'Close Make Vega yours'}).click();
    await page.reload();
    await expect(page.locator('.nova-greeting')).toContainText(', Fictional Rey. Vega is online.');
    sheet = await customize(page, 'Vega');
    await sheet.getByRole('textbox', {name: 'Your assistant’s name'}).fill('');
    await sheet.getByRole('button', {name: 'Save name'}).click();
    await expect(page.getByRole('dialog', {name: 'Make NOVA yours'}).locator('p.nova-status-line')).toHaveText('Your assistant is called NOVA again.');
    await expect(page.locator('.nova-greeting')).toContainText('NOVA is online.');
  });

  test('Activity: a card confirmed in NOVA is listed there by ZIGi; Remove takes it out and Undo puts it back', async ({page}) => {
    await mockLocal(page, block({kind: 'log-water', millilitres: 300}));
    await page.clock.install({time: EVENING});
    await page.goto('/app/settings');
    const base = defaultAiSettings();
    const ai = {...localAi(), includeHealth: true, pageShare: {...base.pageShare, health: true}};
    await page.evaluate(values => { localStorage.clear(); sessionStorage.clear(); for (const [k, v] of Object.entries(values)) localStorage.setItem(k, v); }, {
      ...buildShowcase(DAY).records, [DASHBOARD_SETTINGS_KEY]: JSON.stringify({...presetSettings('habits-health'), onboarded: true}),
      [WHATS_NEW_KEY]: JSON.stringify({version: 1, dismissed: [WHATS_NEW_RELEASE]}), [AI_OPTIONS_KEY]: JSON.stringify({version: 1, toolMode: 'attach'}),
      [AI_SETTINGS_KEY]: JSON.stringify(ai), [NOVA_KEY]: seen(), [NOVA_SETUP_KEY]: JSON.stringify({version: 1, privacyMode: 'strict'}),
    });
    await page.goto('/app/nova');
    // Before any card: the right panel says nothing was done yet.
    await page.getByRole('button', {name: 'Show Behind the intelligence'}).click();
    const right = page.getByRole('complementary', {name: 'Behind the intelligence'});
    await expect(right).toContainText('No action yet.');
    await page.getByRole('textbox', {name: 'Message NOVA'}).first().fill('Log 300 ml of water');
    await page.getByRole('textbox', {name: 'Message NOVA'}).first().press('Enter');
    const chat = page.locator('section.nova-chat');
    const card = chat.locator('.ai-card').last();
    await expect(card).toBeVisible({timeout: 20_000});
    await card.getByRole('button', {name: 'Add', exact: true}).click();
    await expect(card).toHaveClass(/ai-card-added/);
    await chat.getByRole('button', {name: 'Close NOVA’s chat'}).click();
    await expect(right).not.toContainText('No action yet.');
    await right.getByRole('button', {name: 'Open Activity'}).click();
    const panels = page.getByRole('dialog', {name: 'NOVA’s panels'});
    await expect(panels.getByRole('navigation', {name: 'NOVA panels'}).getByRole('button', {name: 'Activity'})).toHaveAttribute('aria-pressed', 'true');
    const water = panels.locator('.activity-event').filter({hasText: 'Water: 300 mL'});
    await expect(water).toHaveCount(1);
    await expect(water.locator('.activity-by-zigi')).toHaveText(' · by ZIGi');
    await water.getByRole('button', {name: /^Remove Water: 300 mL/}).click();
    await expect(panels.getByRole('button', {name: /^Remove Water: 300 mL/})).toHaveCount(0);
    await page.getByRole('button', {name: 'Undo'}).click();
    await expect(panels.getByRole('button', {name: /^Remove Water: 300 mL/})).toHaveCount(1);
  });

  test('models per task: the chat\'s model is ZIGi\'s; briefs and workflows may use another model of the same server, or the chat\'s again', async ({page}) => {
    await mockLocal(page, 'Fine.');
    await fresh(page, {[AI_SETTINGS_KEY]: JSON.stringify(localAi()), [NOVA_SETUP_KEY]: JSON.stringify({version: 1, privacyMode: 'strict'})});
    await page.goto('/app/nova');
    await page.getByRole('button', {name: /Model routing/}).click();
    await page.getByRole('group', {name: 'Model routing'}).getByRole('button', {name: 'Models per task'}).click();
    const panels = page.getByRole('dialog', {name: 'NOVA’s panels'});
    await expect(panels.getByRole('heading', {name: 'Models'})).toBeVisible();
    await expect(panels).toContainText('free, on your device');
    const row = (task: string) => panels.locator('li.ai-memory-note').filter({hasText: `${task}:`});
    await expect(row('Chat')).toContainText('Chat: mock-chat');
    await expect(row('Briefs')).toContainText('Briefs: mock-chat (the chat’s)');
    // Briefs on another model of the same server.
    await row('Briefs').getByRole('button', {name: 'Change'}).click();
    await row('Briefs').getByRole('listbox', {name: 'Briefs model'}).getByRole('option', {name: 'mock-small'}).click();
    await expect(panels.getByText('Briefs: mock-small.', {exact: true})).toBeVisible();
    await expect(row('Briefs')).toContainText('Briefs: mock-small');
    await expect(row('Briefs')).not.toContainText('(the chat’s)');
    const workflows = () => page.evaluate(k => JSON.parse(localStorage.getItem(k) ?? 'null'), NOVA_WORKFLOWS_KEY);
    expect((await workflows()).taskModels).toEqual({provider: 'local', briefs: 'mock-small'});
    await row('Workflows').getByRole('button', {name: 'Change'}).click();
    await row('Workflows').getByRole('listbox', {name: 'Workflows model'}).getByRole('option', {name: 'mock-small'}).click();
    expect((await workflows()).taskModels).toEqual({provider: 'local', briefs: 'mock-small', workflows: 'mock-small'});
    // Back to the chat's model.
    await row('Briefs').getByRole('button', {name: 'Use the chat’s model'}).click();
    await expect(panels.getByText('Briefs: the chat\'s model.', {exact: true})).toBeVisible();
    expect((await workflows()).taskModels).toEqual({provider: 'local', workflows: 'mock-small'});
    // The chat's model is ZIGi's own (one engine).
    await row('Chat').getByRole('button', {name: 'Change'}).click();
    await row('Chat').getByRole('listbox', {name: 'Chat model'}).getByRole('option', {name: 'mock-small'}).click();
    await expect(row('Chat')).toContainText('Chat: mock-small');
    expect((await page.evaluate(k => JSON.parse(localStorage.getItem(k) ?? 'null'), AI_SETTINGS_KEY)).model).toBe('mock-small');
    await expect(row('Workflows')).toContainText('Workflows: mock-small');
    await expect(row('Briefs')).toContainText('Briefs: mock-small (the chat’s)');
  });

  test('M2 on NOVA: the dock and the command field wear the glass edge; the aurora is drawn behind the stars and holds still under reduced motion', async ({page}) => {
    await fresh(page);
    await page.goto('/app/nova');
    for (const selector of ['.nova-command.zg-glass', 'aside.nova-left.zg-glass']) {
      const el = page.locator(selector);
      await expect(el, selector).toBeVisible();
      expect(await el.evaluate(n => getComputedStyle(n, '::before').content), selector).not.toBe('none');
    }
    const sky = page.locator('.nova-sky.zg-aurora');
    await expect(sky).toBeAttached();
    expect(await sky.evaluate(n => { const s = getComputedStyle(n, '::before'); return [s.content !== 'none', s.animationName]; })).toEqual([true, 'none']);
  });

  test('with no model connected, Models teaches the setup guide instead of an empty list', async ({page}) => {
    await fresh(page);
    await page.goto('/app/nova');
    await page.getByRole('button', {name: 'Show Behind the intelligence'}).click();
    const right = page.getByRole('complementary', {name: 'Behind the intelligence'});
    await right.getByText('Cost meter and models per task').click();
    await right.getByRole('button', {name: 'Models per task'}).click();
    const panels = page.getByRole('dialog', {name: 'NOVA’s panels'});
    await expect(panels).toContainText('No model is connected yet');
    await expect(panels.getByRole('link', {name: 'Open the setup guide'})).toHaveAttribute('href', '/app/nova/setup');
  });
});

test.describe('Make NOVA yours on a phone', () => {
  test('Customize is in the quick-access sheet; an accent and a name chosen there dress the phone view', async ({page}) => {
    await page.setViewportSize({width: 390, height: 844});
    await fresh(page);
    await page.goto('/app/nova');
    await page.getByRole('button', {name: 'Quick access'}).click();
    await page.getByRole('dialog', {name: 'Quick access'}).getByRole('button', {name: 'Customize'}).click();
    const sheet = page.getByRole('dialog', {name: 'Make NOVA yours'});
    await sheet.getByRole('group', {name: 'Accent'}).getByRole('radio', {name: 'Lagoon teal'}).check();
    await expect(frame(page)).toHaveAttribute('data-accent', 'teal');
    await sheet.getByRole('textbox', {name: 'Your assistant’s name'}).fill('Atlas');
    await sheet.getByRole('button', {name: 'Save name'}).click();
    await page.getByRole('dialog', {name: 'Make Atlas yours'}).getByRole('button', {name: 'Close Make Atlas yours'}).click();
    await expect(page.locator('.nova-greeting')).toContainText('Atlas is online.');
    await expect(page.getByRole('textbox', {name: 'Message Atlas'})).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0);
  });
});

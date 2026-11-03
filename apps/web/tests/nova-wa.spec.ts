import {expect, test, type Page, type Route} from '@playwright/test';
import {buildShowcase} from '../lib/showcase-data';
import {DASHBOARD_SETTINGS_KEY, presetSettings} from '../lib/dashboard-settings';
import {WHATS_NEW_KEY, WHATS_NEW_RELEASE} from '../lib/whats-new';
import {AI_SETTINGS_KEY, defaultAiSettings} from '../lib/ai/settings';
import {AI_OPTIONS_KEY} from '../lib/ai/store/keys';
import {TASKS_KEY} from '../lib/tasks/schema';

/**
 * Session AK lane WA (WIRING_AUDIT_2 N1, N2, T1, T3, N11): the Duo on NOVA's dashboard while NOVA hands a task to ZIGi
 * (a MOCK local model answers, as in tests/nova-chat.spec.ts), NOVA's Tasks widget and its running Focus (Pomodoro)
 * widget on a fresh start and in the Showcase, and the Showcase's labelled Hermes example (no request to any gateway).
 * Fictional records only; the clock is fixed.
 */
test.skip(({isMobile}) => isMobile, 'computer layouts (the widgets live on the stage beside the orb; phones show the orb and the chat)');
test.use({viewport: {width: 1440, height: 900}});
const BASE = 'http://127.0.0.1:1234', DAY = '2026-09-20', EVENING = '2026-09-20T19:00:00.000Z';
const NOVA_KEY = 'zigoals:nova:v1';
type Body = {messages: {role: string; content: unknown}[]};
const chunk = (delta: Record<string, unknown>, finish: string | null = null) => `data: ${JSON.stringify({id: 'mock', object: 'chat.completion.chunk', choices: [{index: 0, delta, finish_reason: finish}]})}\n\n`;
const stream = (text: string) => [chunk({role: 'assistant', content: ''}), ...(text.match(/.{1,12}/gs) ?? []).map(part => chunk({content: part})), chunk({}, 'stop'), 'data: [DONE]\n\n'].join('');
const systemOf = (body: Body) => body.messages.filter(m => m.role === 'system').map(m => String(m.content)).join('\n');
async function server(page: Page, reply: (body: Body) => string) {
  await page.route('**/api/**', route => route.fulfill({status: 503, json: {error: 'offline fixture'}}));
  await page.route(`${BASE}/**`, async (route: Route) => {
    const url = route.request().url();
    if (url.endsWith('/v1/models')) return route.fulfill({status: 200, contentType: 'application/json', body: JSON.stringify({object: 'list', data: [{id: 'mock-chat'}]})});
    if (url.endsWith('/v1/chat/completions')) return route.fulfill({status: 200, contentType: 'text/event-stream', body: stream(reply(JSON.parse(route.request().postData() ?? '{}') as Body))});
    return route.fulfill({status: 404, body: ''});
  });
}
const settled = {[DASHBOARD_SETTINGS_KEY]: JSON.stringify({...presetSettings('habits-health'), onboarded: true}), [WHATS_NEW_KEY]: JSON.stringify({version: 1, dismissed: [WHATS_NEW_RELEASE]}), 'zigoals:onboarding:v1': JSON.stringify({version: 1, seen: true}), [NOVA_KEY]: JSON.stringify({version: 1, openingSeen: true})};
async function seed(page: Page, values: Record<string, string>) {
  await page.clock.install({time: EVENING});
  await page.goto('/app/settings');
  await page.evaluate(v => { localStorage.clear(); sessionStorage.clear(); for (const [k, x] of Object.entries(v)) localStorage.setItem(k, x); }, {...settled, ...values});
}
const chat = (page: Page) => page.locator('section.nova-chat');
const duo = (page: Page) => page.getByRole('region', {name: 'NOVA and ZIGi'});

test('N1: while NOVA hands a task to ZIGi, the Duo shows both side by side on the dashboard, step by step, then the report', async ({page}) => {
  await server(page, body => systemOf(body).includes('You are on Health:') ? 'Water was steady most days this week.' : 'Hello.');
  const base = defaultAiSettings();
  await seed(page, {...buildShowcase(DAY).records, ...settled, [AI_OPTIONS_KEY]: JSON.stringify({version: 1, toolMode: 'attach'}),
    [AI_SETTINGS_KEY]: JSON.stringify({...base, enabled: true, mode: 'local', provider: 'local', model: 'mock-chat', localServer: 'openai-compatible', baseUrl: BASE, includeHealth: true, pageShare: {...base.pageShare, health: true}})});
  await page.goto('/app/nova');
  await expect(duo(page)).toHaveCount(0);
  await page.getByRole('button', {name: 'Talk to NOVA'}).click();
  // A task, not a lookup: ZIGi first meets its on-device answers (components/nova/chat/nova-chat.tsx runDelegation), so a
  // question the device answers ("How did my water go…") never reaches the model; a request to write goes to the MOCK model.
  const box = chat(page).getByRole('textbox', {name: /^Message /});
  await expect(async () => { await box.fill('Write me a kind note about my water this week.'); await expect(chat(page).getByRole('button', {name: 'Ask ZIGi about a page'})).toBeEnabled({timeout: 1_000}); }).toPass({timeout: 15_000});
  await chat(page).getByRole('button', {name: 'Ask ZIGi about a page'}).click();
  await chat(page).getByLabel('Page', {exact: true}).selectOption('health');
  await chat(page).getByRole('button', {name: 'Let ZIGi answer here'}).click();
  await expect(chat(page).locator('.nova-turn-zigi').last()).toContainText('Water was steady', {timeout: 20_000});
  // The Duo: on the dashboard (outside the chat panel), both figures, the four steps, the last one current.
  const view = duo(page);
  await expect(view).toBeVisible();
  expect(await view.evaluate(el => !!el.closest('.nova-duo-slot') && !el.closest('.nova-chat'))).toBe(true);
  await expect(view).toContainText('NOVA has ZIGi’s answer');
  await expect(view).toContainText('Reported back');
  await expect(view.getByRole('list', {name: 'Steps'}).getByRole('listitem')).toHaveText(['Handed over', 'Reading', 'Answering', 'Reported back']);
  await expect(view.locator('[aria-current=step]')).toHaveText('Reported back');
  // A new chat ends the Duo; nothing stays on the dashboard.
  await chat(page).getByRole('button', {name: 'New chat'}).click();
  await expect(duo(page)).toHaveCount(0);
});

test('T1: a fresh start\'s Tasks widget teaches, adds a task for today, ticks it with Undo; T3: the Focus widget starts and ends a Pomodoro', async ({page}) => {
  await page.route('**/api/**', route => route.fulfill({status: 503, json: {error: 'offline fixture'}}));
  await seed(page, {});
  await page.goto('/app/nova');
  await page.getByRole('button', {name: /View controls/}).click();
  await page.getByRole('checkbox', {name: 'Tasks', exact: true}).check();
  await page.getByRole('checkbox', {name: 'Focus', exact: true}).check();
  await page.getByRole('button', {name: /View controls/}).click();
  const tasks = page.getByRole('article', {name: 'Tasks'});
  await expect(tasks).toContainText('Your list starts here.');
  await expect(tasks.getByRole('link', {name: /Open your tasks/})).toHaveAttribute('href', '/app/tasks');
  await tasks.getByLabel('New task').fill('Fictional call to the library');
  await tasks.getByRole('button', {name: 'Add', exact: true}).click();
  await expect(tasks).toContainText('1 to do today.');
  const stored = () => page.evaluate(k => JSON.parse(localStorage.getItem(k) ?? 'null'), TASKS_KEY);
  expect((await stored()).tasks.map((t: {title: string; due: string}) => [t.title, t.due])).toEqual([['Fictional call to the library', DAY]]);
  await tasks.getByRole('checkbox', {name: 'Mark “Fictional call to the library” done'}).check();
  await expect(tasks).toContainText('Nothing left to do today.');
  await tasks.getByRole('button', {name: 'Undo'}).click();
  await expect(tasks).toContainText('1 to do today.');
  expect((await stored()).tasks[0].doneAt).toBeUndefined();
  // Focus: a fresh week teaches (never "0 min"), then a run shows its time left and ends on End the run.
  const focus = page.getByRole('article', {name: 'Focus'});
  await expect(focus).toContainText('No focus sessions this week yet.');
  await expect(focus).not.toContainText('0 min');
  await focus.getByRole('button', {name: 'Start a 25-minute Pomodoro'}).click();
  await expect(focus.getByRole('timer')).toHaveText(/^2[45]:\d\d$/);
  await expect(focus).toContainText('Block 1 of 4');
  await page.clock.runFor(61_000);
  await expect(focus.getByRole('timer')).toHaveText(/^2[23]:\d\d$/);
  await focus.getByRole('button', {name: 'End the run'}).click();
  await expect(focus).toContainText('Run ended:');
  await focus.getByRole('button', {name: 'OK'}).click();
  await expect(focus.getByRole('button', {name: 'Start a 25-minute Pomodoro'})).toBeVisible();
});

test('the Showcase: Tasks and Focus show its labelled examples; the Hermes guide shows a labelled example connection and asks no gateway', async ({page}) => {
  await page.emulateMedia({reducedMotion: 'reduce'});
  await page.route('**/api/**', route => route.fulfill({status: 503, json: {error: 'offline fixture'}}));
  const gateway: string[] = [];
  page.on('request', r => { if (/127\.0\.0\.1:8642|localhost:8642/.test(r.url())) gateway.push(r.url()); });
  await seed(page, {});
  // A fresh start: no Hermes example on the guide.
  await page.goto('/app/nova/hermes');
  await expect(page.getByRole('heading', {name: 'Your Hermes, step by step'})).toBeVisible();
  await expect(page.getByRole('region', {name: 'What a linked Hermes Agent looks like'})).toHaveCount(0);
  await page.goto('/app/settings');
  await page.getByRole('button', {name: 'Load Showcase Demo', exact: true}).click(); await page.waitForURL('**/app');
  await page.goto('/app/nova');
  await expect(page.getByText('Showcase · fictional example data')).toBeVisible();
  const tasks = page.getByRole('article', {name: 'Tasks'});
  await expect(tasks.getByRole('list', {name: 'Today’s tasks'})).toContainText('Example · Book the dentist');
  await expect(tasks).toContainText('Next for your goals');
  await expect(page.getByRole('article', {name: 'Focus'})).toContainText('this week');
  await page.goto('/app/nova/hermes');
  const example = page.getByRole('region', {name: 'What a linked Hermes Agent looks like'});
  await expect(example).toContainText('Showcase example');
  await expect(example).toContainText('An example connection, not a real gateway.');
  await expect(example.getByRole('list', {name: 'An example exchange'})).toContainText('Example answer.');
  // Nothing in NOVA counts the example as connected.
  await page.goto('/app/nova');
  await expect(page.getByText('Hermes gateway reachable at the last check')).toHaveCount(0);
  expect(gateway).toEqual([]);
});

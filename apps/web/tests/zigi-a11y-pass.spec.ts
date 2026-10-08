import {expect, test, type Locator, type Page} from '@playwright/test';
import {buildShowcase} from '../lib/showcase-data';
import {DASHBOARD_SETTINGS_KEY, presetSettings} from '../lib/dashboard-settings';
import {WHATS_NEW_KEY, WHATS_NEW_RELEASE} from '../lib/whats-new';
import {AI_SETTINGS_KEY, defaultAiSettings} from '../lib/ai/settings';
import {AI_OPTIONS_KEY} from '../lib/ai/store/keys';
import {audit} from './a11y-audit';
import {openMealLog} from './phone-nav';

/**
 * Session V Part 16, the accessibility pass for people using a screen reader and for AI agents that drive a page by
 * its roles and names: food log, water, habit check-in, counters, goal creation and contributions, the add-asset form
 * that ZIGi's money cards pre-fill, ZIGi's panel, proposal cards and Customize. Each surface passes the axe-style audit
 * (tests/a11y-audit.ts: names, labels, ids, ARIA references and roles, groups), and the names a person or an agent uses
 * stay stable: a control is named by what it is, and what changes (a token count, a hint) is its description. Nothing
 * here changes how a page looks.
 */
const DAY = '2026-09-20', EVENING = '2026-09-20T19:00:00.000Z', BASE = 'http://127.0.0.1:1234';
const chunk = (body: Record<string, unknown>) => `data: ${JSON.stringify({id: 'mock', object: 'chat.completion.chunk', ...body})}\n\n`;
const answer = (text: string) => [chunk({choices: [{index: 0, delta: {role: 'assistant', content: text}, finish_reason: null}]}), chunk({choices: [{index: 0, delta: {}, finish_reason: 'stop'}], usage: {prompt_tokens: 10, completion_tokens: 10}}), 'data: [DONE]\n\n'].join('');
const PROPOSALS = 'MOCK: here are your cards.\n```zigoals-action\n{"kind":"log-water","glasses":2}\n```\n```zigoals-action\n{"kind":"check-in","habit":"h4","minutes":5}\n```\n```zigoals-action\n{"kind":"create-habit","title":"Evening stretch","type":"build","measurement":"minutes","target":10,"schedule":"daily","timeOfDay":"evening"}\n```';
async function seed(page: Page) {
  await page.clock.install({time: EVENING});
  await page.goto('/app/settings');
  const settings = {...defaultAiSettings(), enabled: true, mode: 'local', provider: 'local', model: 'mock-chat', localServer: 'openai-compatible', baseUrl: BASE};
  const values = {...buildShowcase(DAY).records, [DASHBOARD_SETTINGS_KEY]: JSON.stringify({...presetSettings('habits-health'), onboarded: true}), [WHATS_NEW_KEY]: JSON.stringify({version: 1, dismissed: [WHATS_NEW_RELEASE]}), [AI_SETTINGS_KEY]: JSON.stringify(settings), [AI_OPTIONS_KEY]: JSON.stringify({version: 1, toolMode: 'attach'})};
  await page.evaluate(v => { localStorage.clear(); sessionStorage.clear(); for (const [k, x] of Object.entries(v)) localStorage.setItem(k, x); }, values);
}
async function clean(scope: Locator, label: string) {
  await expect(scope).toBeVisible();
  expect(await audit(scope), label).toEqual([]);
}
const panel = (page: Page) => page.locator('dialog.ai-chat[open]');
test.beforeEach(async ({page}) => {
  await page.route('**/api/**', route => route.fulfill({status: 503, json: {error: 'offline fixture'}}));
  await page.route(`${BASE}/**`, route => route.request().url().endsWith('/v1/chat/completions') ? route.fulfill({status: 200, contentType: 'text/event-stream', body: answer(PROPOSALS)}) : route.fulfill({status: 404, body: ''}));
});

test('food log, water and counters', async ({page}) => {
  await seed(page);
  await page.goto('/app/health');
  const sheet = await openMealLog(page);
  await clean(sheet ?? page.getByRole('form', {name: 'Log a meal', exact: true}), 'Log a meal');
  if (sheet) { await page.keyboard.press('Escape'); await expect(sheet).toBeHidden(); }
  const water = page.getByRole('region', {name: 'Water journal'});
  await clean(water, 'Water journal');
  // The reminder field is named by its label alone; its note is the description.
  const reminder = water.getByLabel('Reminder time — on this device', {exact: true});
  await expect(reminder).toHaveAccessibleName('Reminder time — on this device');
  await expect(reminder).toHaveAccessibleDescription(/^After this time, Today shows a water reminder card/);
  const counters = page.locator('.exercise-counters').first();
  await clean(counters, 'Counters');
  await expect(counters.getByRole('button', {name: 'Increase Push-ups', exact: true})).toBeVisible();
  await expect(counters.getByRole('status', {name: 'Push-ups today', exact: true})).toBeVisible();
  await page.getByRole('button', {name: '+ Add counter'}).click();
  await clean(page.getByRole('dialog', {name: 'Add a counter'}), 'Add a counter');
});

test('habit check-in on Habits and on Today', async ({page}) => {
  await seed(page);
  await page.goto('/app/habits');
  const list = page.getByRole('region', {name: 'Today habits'});
  await clean(list, 'Habits');
  const meditate = list.getByRole('article', {name: 'Meditate', exact: true});
  await expect(meditate.getByRole('button', {name: 'Add one to Meditate', exact: true})).toBeVisible();
  await expect(meditate.getByRole('button', {name: 'Complete Meditate', exact: true})).toBeVisible();
  await page.goto('/app');
  await clean(page.locator('main'), 'Today');
});

test('goal creation, a contribution and the add-asset form', async ({page}) => {
  await seed(page);
  await page.goto('/app/goals/new');
  await clean(page.locator('main'), 'New goal');
  await expect(page.getByLabel('Goal asset', {exact: true})).toHaveAccessibleDescription(/^Use a symbol such as BTC or ZIG/);
  await page.goto('/app/goals');
  await page.getByRole('link', {name: 'Japan adventure'}).first().click();
  await page.getByRole('button', {name: 'Record contribution', exact: true}).click();
  const fund = page.getByRole('dialog', {name: 'Fund your Goal'});
  await clean(fund, 'Fund your Goal');
  await expect(fund.getByRole('group', {name: 'Contribution mode'}).getByRole('button', {name: 'Record history only'})).toBeVisible();
  await fund.getByRole('button', {name: 'Close dialog'}).click();
  await page.goto('/app/wealth');
  await page.getByRole('button', {name: '+ Add asset'}).first().click();
  const add = page.getByRole('dialog', {name: 'Add to your wealth'});
  await add.getByRole('group', {name: 'Asset categories'}).getByRole('button', {name: 'Cash', exact: true}).click();
  await clean(add, 'Add to your wealth');
  await expect(add.getByRole('group', {name: 'Valuation currency'}).getByRole('button', {name: 'EUR', exact: true})).toBeVisible();
});

test('ZIGi\'s panel, proposal cards and Customize', async ({page}) => {
  await seed(page);
  await page.goto('/app/habits');
  await page.getByRole('button', {name: /Open ZIGi/}).click();
  await expect(panel(page).getByRole('region', {name: 'Your morning brief'})).toBeVisible();
  await clean(panel(page), 'ZIGi panel');
  // The page-data switch keeps one name; the area and its size are its description.
  const share = panel(page).getByRole('checkbox', {name: 'Share this page’s data', exact: true});
  await expect(share).toBeChecked();
  await expect(share).toHaveAccessibleDescription(/^Habits · about [\d,]+ tokens$/);
  await page.getByLabel('Message to your AI').fill('Log two glasses of water, five minutes of meditation and an evening stretch habit');
  await page.getByRole('button', {name: 'Send', exact: true}).click();
  const cards = panel(page).getByTestId('ai-proposals');
  await expect(cards.getByRole('article')).toHaveCount(3);
  await clean(panel(page), 'ZIGi panel with proposal cards');
  // Each card's buttons keep their short names and say which card they act on.
  const water = cards.getByRole('article', {name: 'Add water'});
  await expect(water.getByRole('button', {name: 'Add', exact: true})).toHaveAccessibleDescription('Add water');
  await expect(water.getByRole('button', {name: 'Dismiss', exact: true})).toHaveAccessibleDescription('Add water');
  await water.getByRole('button', {name: 'Edit', exact: true}).click();
  await clean(water.getByRole('form', {name: 'Edit: Add water'}), 'Edit a card');
  await panel(page).getByRole('button', {name: 'Customize ZIGi'}).click();
  const customize = panel(page).getByRole('region', {name: 'Customize ZIGi'});
  // Each option is named by its label alone; its note is the description.
  const calm = customize.getByRole('radio', {name: 'Calm', exact: true});
  await expect(calm).toBeChecked();
  await expect(calm).toHaveAccessibleDescription(/^ZIGi’s idle clip while it waits/);
  await expect(customize.getByRole('switch', {name: 'Knock when a reminder is due'})).toHaveAccessibleDescription(/^ZIGi peeks out above its button/);
  await clean(customize, 'Customize');
});

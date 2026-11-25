import {expect, test, type Locator, type Page} from '@playwright/test';
import {freshDevice, hydrated, offlineApi} from './ah-helpers';
import {at, DAY1, firstFive, freshWeek} from './au/au-helpers';
import {axe, THEMES, applyTheme} from './p6-helpers';
import {MEAL_WORDS_KEY} from '../lib/meal-words/schema';

/**
 * Session AW Part 3 (simplicity c): the search on the Settings page (English and Dutch words, a static index of every
 * section, lib/settings-search), a jump to a lower group that opens its fold, ZIGi's anchors drawn after the jump, Help's
 * competitor words in global Search (lib/search/help-aliases.ts, wired by the integrator in lib/search/static.ts), and
 * each persona's way to their daily thing from a first visit: one tap from the welcome to the form, the action done
 * within three taps, and "Your first five" putting their step first after the setup. 390 on the mobile project and 1440
 * on the desktop project; Nebula, Light and Dark for the field; axe on every new part. Fictional records; every /api call
 * answers 503.
 */
const width = (isMobile: boolean) => isMobile ? 390 : 1440;
const serious = (found: Awaited<ReturnType<typeof axe>>) => found.filter(v => v.impact === 'serious' || v.impact === 'critical');
const searchRegion = (page: Page) => page.getByRole('search', {name: 'Settings'});
const field = (page: Page) => searchRegion(page).getByRole('searchbox', {name: 'Search Settings'});
const results = (page: Page) => searchRegion(page).getByRole('list');
async function settings(page: Page, isMobile: boolean) {
  await offlineApi(page); await freshDevice(page);
  await page.setViewportSize({width: width(isMobile), height: isMobile ? 844 : 900});
  await page.goto('/app/settings'); await hydrated(page);
  await expect(field(page)).toBeVisible();
}
/** The first result's link, once the words have been read against the index. */
async function firstResult(page: Page, words: string): Promise<Locator> {
  await field(page).fill(words);
  const first = results(page).getByRole('link').first();
  await expect(first).toBeVisible();
  return first;
}
const px = (el: Locator, prop: string) => el.evaluate((node, p) => parseFloat(getComputedStyle(node).getPropertyValue(p)), prop);

for (const theme of THEMES) test(`${theme}: Settings search finds settings by English and Dutch words, with readable sizes and no axe findings`, async ({page, isMobile}) => {
  await applyTheme(page, theme);
  await settings(page, isMobile);
  // Labels at 14 px or more, the field at 16 px (no zoom on a phone) and a 44 px target.
  const label = searchRegion(page).locator('label');
  await expect(label).toHaveText('Search Settings');
  expect(await px(label, 'font-size')).toBeGreaterThanOrEqual(14);
  expect(await px(field(page), 'font-size')).toBeGreaterThanOrEqual(16);
  expect((await field(page).boundingBox())!.height).toBeGreaterThanOrEqual(44);
  // English and Dutch words for the same settings.
  for (const [words, name] of [['dark mode', /^Theme: Nebula, Dark or Light/], ['donker', /^Theme: Nebula, Dark or Light/], ['backup', /^Backup & restore/], ['reservekopie', /^Backup & restore/], ['erase', /^Erase everything on this device/], ['wissen', /^Erase everything on this device/], ['notifications', /^Notifications/], ['meldingen', /^Notifications/], ['time zone', /^Time zone/], ['tijdzone', /^Time zone/], ['voice', /^Voice: talk to ZIGi/], ['stem', /^Voice: talk to ZIGi/], ['language', /^Voice: talk to ZIGi/], ['taal', /^Voice: talk to ZIGi/]] as const) {
    const first = await firstResult(page, words);
    await expect(first, words).toHaveAccessibleName(name);
  }
  await expect(searchRegion(page).getByRole('status')).toHaveText(/\d+ settings? found\./);
  // Every result is a 44 px target with its group named at 14 px or more, and nothing in it moves.
  await field(page).fill('backup');
  const rows = results(page).getByRole('link');
  for (let i = 0; i < await rows.count(); i++) {
    expect((await rows.nth(i).boundingBox())!.height).toBeGreaterThanOrEqual(44);
    expect(await px(rows.nth(i).locator('small'), 'font-size')).toBeGreaterThanOrEqual(14);
  }
  expect(await rows.first().evaluate(el => getComputedStyle(el).transitionDuration.split(',').every(d => parseFloat(d) === 0))).toBe(true);
  expect(serious(await axe(page, searchRegion(page))), theme).toEqual([]);
  // Words that name no setting say so, with a way on to Help.
  await field(page).fill('zzqx');
  await expect(searchRegion(page).getByRole('status')).toHaveText('No setting matches “zzqx”. Try another word.');
  await expect(searchRegion(page).getByRole('link', {name: 'Search Help instead →'})).toHaveAttribute('href', '/app/help');
  expect(serious(await axe(page, searchRegion(page)))).toEqual([]);
  // Escape clears the field.
  await field(page).press('Escape');
  await expect(field(page)).toHaveValue('');
  await expect(results(page)).toHaveCount(0);
  // No sideways scroll at 320 with results open.
  await page.setViewportSize({width: 320, height: 720});
  await field(page).fill('herinneringen');
  await expect(results(page).getByRole('link').first()).toHaveAccessibleName(/^Reminders when ZIGoals is closed/);
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
});

test('a result in a lower group, by keyboard: its fold opens and the page lands on it ("meldingen" → Notifications)', async ({page, isMobile}) => {
  await settings(page, isMobile);
  const group = page.locator('#settings-areas');
  // On a computer Settings starts folded (a new device keeps no group open but Your app).
  if (!isMobile) await expect(group).toHaveAttribute('data-folded', '');
  await field(page).focus();
  await page.keyboard.type('meldingen');
  const first = results(page).getByRole('link').first();
  await expect(first).toHaveAccessibleName(/^Notifications/);
  await page.keyboard.press('ArrowDown');
  await expect(first).toBeFocused();
  // ↓ and ↑ move between the results and back to the field.
  await page.keyboard.press('ArrowUp');
  await expect(field(page)).toBeFocused();
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/\/app\/settings#notifications$/);
  await expect(group).not.toHaveAttribute('data-folded');
  if (!isMobile) await expect(page.locator('#settings-areas-title button')).toHaveAttribute('aria-expanded', 'true');
  await expect(page.locator('#notifications')).toBeInViewport({timeout: 10_000});
  // Enter on the field opens the first result too: the Data group's erase.
  await field(page).fill('wissen');
  await expect(results(page).getByRole('link').first()).toHaveAccessibleName(/^Erase everything on this device/);
  await field(page).press('Enter');
  await expect(page).toHaveURL(/#erase-everything$/);
  await expect(page.locator('#erase-everything')).toBeInViewport({timeout: 10_000});
  await expect(page.locator('#settings-data')).not.toHaveAttribute('data-folded');
});

test('ZIGi’s and NOVA’s settings are found too: "stem" lands on Voice once ZIGi’s part is drawn', async ({page, isMobile}) => {
  await settings(page, isMobile);
  await (await firstResult(page, 'stem')).click();
  await expect(page).toHaveURL(/#zigi-voice$/);
  await expect(page.locator('#zigi-voice')).toBeInViewport({timeout: 15_000});
  await expect(page.locator('#settings-zigi')).not.toHaveAttribute('data-folded');
  await (await firstResult(page, 'commandocentrum')).click();
  await expect(page).toHaveURL(/#nova-settings$/);
  await expect(page.locator('#nova-settings')).toBeInViewport({timeout: 10_000});
  // A page of its own opens there: "terugzetten" → Your data's restore.
  await (await firstResult(page, 'reservekopie terugzetten')).click();
  await expect(page).toHaveURL(/\/app\/settings\/data#restore$/);
});

test('Help in global Search by another app’s word: "snowball" finds the debt planner (lib/search/help-aliases.ts)', async ({page, isMobile}) => {
  await offlineApi(page); await freshDevice(page);
  await page.setViewportSize({width: width(isMobile), height: isMobile ? 844 : 900});
  await page.goto('/app'); await hydrated(page);
  await expect(page.locator('.workspace')).not.toHaveAttribute('aria-busy', 'true');
  const palette = page.getByRole('dialog', {name: 'Search'});
  await page.locator('body').press('/');
  await expect(palette).toBeVisible();
  const box = palette.getByRole('combobox');
  for (const [words, question] of [['time blocking', 'What is a time block?'], ['streak freeze', 'Can a habit keep its streak through one missed day, or have no set days?'], ['envelope budget', 'What is “Ready to assign” on Budgets?'], ['snowball', 'Can I plan my debts in my own order, with one-off payments?']] as const) {
    await box.fill(words);
    await expect(palette.getByRole('option').filter({hasText: question}).first(), words).toBeVisible();
  }
  expect(serious(await axe(page, palette))).toEqual([]);
  await palette.getByRole('option').filter({hasText: 'Can I plan my debts in my own order, with one-off payments?'}).first().click();
  await expect(page).toHaveURL(/\/app\/help#help-av-debt-plan$/);
  await expect(page.locator('#help-av-debt-plan')).toHaveAttribute('open', '');
});

type Persona = {name: string; start: string; act: (page: Page, tap: (l: Locator) => Promise<void>) => Promise<void>};
const PERSONAS: Persona[] = [
  {name: 'Sanne (habits)', start: 'Add a habit', act: async (page, tap) => {
    await page.getByLabel('Habit title', {exact: true}).fill('Fictional stretch');
    await tap(page.getByRole('button', {name: 'Create habit', exact: true}));
    const done = page.getByRole('button', {name: 'Complete Fictional stretch', exact: true}).filter({visible: true}).first();
    await tap(done);
    await expect(page.getByRole('button', {name: 'Undo completion for Fictional stretch', exact: true}).filter({visible: true}).first()).toHaveAttribute('aria-pressed', 'true');
  }},
  {name: 'Tom (money)', start: 'Log spending', act: async (page, tap) => {
    const spending = page.locator('#spending');
    const form = spending.getByRole('form', {name: 'Log spending or income'});
    await expect(form).toBeInViewport({timeout: 15_000});
    await spending.getByLabel('Amount').fill('12,50');
    await tap(spending.getByRole('radio', {name: 'Food & drink'}));
    await tap(spending.getByRole('button', {name: 'Save', exact: true}));
    await expect(spending).toContainText('12.50');
  }},
  {name: 'Lina (food)', start: 'Log a meal', act: async (page, tap) => {
    const words = page.getByRole('form', {name: 'Just describe it'}).filter({visible: true}).first();
    await expect(words).toBeVisible({timeout: 15_000});
    await words.getByLabel('What did you eat?').fill('Fictional yoghurt with muesli');
    await tap(words.getByRole('button', {name: 'Log in words'}));
    // Kept as words, calories unknown until added (never counted as zero).
    await expect.poll(() => page.evaluate(k => JSON.stringify(JSON.parse(localStorage.getItem(k) ?? 'null')), MEAL_WORDS_KEY)).toContain('Fictional yoghurt with muesli');
  }},
  {name: 'Max (fitness)', start: 'Start a workout', act: async (page, tap) => {
    await tap(page.getByRole('button', {name: 'Start an empty workout', exact: true}));
    await expect(page.getByText('Workout in progress', {exact: true})).toBeVisible();
  }},
  {name: 'Jules (journal)', start: 'Write in the Journal', act: async (page, tap) => {
    const form = page.getByRole('form', {name: 'Write in your journal'}).first();
    await expect(form).toBeVisible({timeout: 15_000});
    await form.getByLabel('Today’s entry').fill('Fictional quiet morning, a short walk.');
    await tap(form.getByRole('button', {name: 'Save entry', exact: true}));
    await expect(page.locator('main')).toContainText('Fictional quiet morning, a short walk.');
  }},
];
for (const persona of PERSONAS) test(`${persona.name}: from a first visit to the daily thing in three taps, under a minute`, async ({page, isMobile}) => {
  await freshWeek(page, 'nebula', at(DAY1, '08:00'));
  await page.setViewportSize({width: width(isMobile), height: isMobile ? 844 : 900});
  await page.goto('/app'); await hydrated(page);
  const welcome = page.getByRole('region', {name: 'Set up your first goal and habit in about a minute.'});
  await expect(welcome).toBeVisible();
  const quick = welcome.getByRole('group', {name: 'Or start with one thing you do every day:'});
  await expect(quick.getByRole('link')).toHaveText(['Add a habit', 'Log spending', 'Log a meal', 'Start a workout', 'Write in the Journal']);
  for (const link of await quick.getByRole('link').all()) expect((await link.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  expect(serious(await axe(page, welcome))).toEqual([]);
  let taps = 0;
  const started = Date.now();
  const tap = async (target: Locator) => { taps++; await target.click(); };
  await tap(quick.getByRole('link', {name: persona.start, exact: true}));
  await hydrated(page);
  await persona.act(page, tap);
  expect(taps, 'taps from the first visit to the daily thing').toBeLessThanOrEqual(3);
  expect((Date.now() - started) / 1000, 'under a minute').toBeLessThan(60);
});

/** The setup as a person does it, choosing areas and focuses (the focus tiles' names). */
async function setupWith(page: Page, areas: RegExp[], focuses: RegExp[]) {
  await page.goto('/app'); await hydrated(page);
  await page.getByRole('region', {name: 'Set up your first goal and habit in about a minute.'}).getByRole('link', {name: 'Start setup', exact: true}).click();
  await page.waitForURL('**/app/welcome');
  const flow = page.locator('main');
  await flow.getByRole('button', {name: 'Let’s begin', exact: true}).click();
  for (const area of areas) await flow.getByRole('checkbox', {name: area}).check();
  await flow.getByRole('button', {name: 'Continue', exact: true}).click();
  await expect(flow.getByRole('heading', {level: 1, name: 'Two or three things to focus on.'})).toBeFocused();
  for (const focus of focuses) await flow.getByRole('checkbox', {name: focus}).check();
  await flow.getByRole('button', {name: 'Continue', exact: true}).click();
  for (let i = 0; i < 8; i++) {
    const finish = flow.getByRole('button', {name: 'Finish setup', exact: true});
    if (await finish.isVisible()) { await finish.click(); break; }
    await flow.getByRole('button', {name: /^(Continue|Skip the tour|Skip this step)$/}).first().click();
  }
  await page.waitForURL(/\/app$/); await hydrated(page);
}
const AFTER_SETUP: [persona: string, areas: RegExp[], focuses: RegExp[], first: string][] = [
  ['Tom', [/^Goals & money/], [/^Pay off a debt/], 'Log an expense or income'],
  ['Lina', [/^Health & food/], [/^Eat well/], 'Log a meal'],
];
for (const [persona, areas, focuses, first] of AFTER_SETUP) test(`${persona}: after the setup, "Your first five" puts their daily step first`, async ({page, isMobile}) => {
  test.setTimeout(90_000);
  await freshWeek(page, 'light', at(DAY1, '08:00'));
  await page.setViewportSize({width: width(isMobile), height: isMobile ? 844 : 900});
  await setupWith(page, areas, focuses);
  const card = firstFive(page);
  await expect(card).toBeVisible();
  await expect(card.getByRole('link').first()).toHaveText(first);
  await expect(card).toContainText('1 of 5 done');
  expect(serious(await axe(page, card))).toEqual([]);
  // One tap to the step's own form.
  await card.getByRole('link', {name: first, exact: true}).click();
  await expect(page).toHaveURL(first === 'Log a meal' ? /\/app\/health\?add=entry/ : /\/app\/wealth#log-spending/);
});

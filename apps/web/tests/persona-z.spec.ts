import {expect, test, type Page} from '@playwright/test';
import {ALPHA_LABEL,ALPHA_SENTENCE,MODE_LOCAL,alphaNotice,expectAlphaMode,inAboutAlpha,openHabitDetails,openStatusSheet} from './ab-shell';
import {createHabit, emptyHabitData, HABITS_KEY, logHabitValue} from '../lib/habits';
import {scheduleHabitState} from '../lib/habit-actions';
import {createEmptyHealth, HEALTH_STORAGE_KEY, saveWeight} from '../lib/health';
import {addWater, dailyData, saveHealthPreferences} from '../lib/health-daily';
import {DASHBOARD_SETTINGS_KEY, presetSettings, WIDGET_CATALOG, type DashboardSettings} from '../lib/dashboard-settings';
import {localDate} from '../lib/local-date';
import {isPhone,mainNav,openMore,openFold} from './phone-nav';

// Session Z-Cloud Part 4: the owner's persona decisions (docs/product/PERSONA_DECISIONS_Y.md items 1–3 and 5–12; item 4
// skipped), built. Fictional records; every /api request is answered by a fixture.
test.beforeEach(async ({page}) => { await page.route('**/api/**', route => route.fulfill({status: 503, json: {error: 'offline fixture'}})); });

const HABIT = '6c1f0f6a-5d0e-4b8e-9a43-1f2d3c4b5a69';
async function seed(page: Page, records: Record<string, unknown>, settings: DashboardSettings = presetSettings('habits-health')) {
  await page.goto('/app/help');
  await page.evaluate(values => { localStorage.clear(); sessionStorage.clear(); for (const [k, v] of Object.entries(values)) localStorage.setItem(k, JSON.stringify(v)); }, {[DASHBOARD_SETTINGS_KEY]: {...settings, onboarded: true}, ...records});
}
/** "Habits only": the Habits + Health layout with its Health widgets hidden. */
const habitsOnly = (): DashboardSettings => { const s = presetSettings('habits-health'); return {...s, widgets: s.widgets.map(w => WIDGET_CATALOG[w.kind].domain === 'health' ? {...w, hidden: true} : w)}; };
async function showcase(page: Page) { await page.goto('/app/settings'); await page.getByRole('button', {name: 'Load Showcase Demo', exact: true}).click(); await page.waitForURL('**/app'); }
const habit = (title = 'Stretch') => createHabit(emptyHabitData(), {title, category: 'Health', description: '', notes: '', schedule: {kind: 'daily'}, target: 1}, new Date(Date.now() - 3 * 86_400_000), HABIT);

test('1. Habits + Health and Habits only: Today is one centred column at a reading width; the financial layouts keep the rail', async ({page}) => {
  for (const [preset, settings] of [['habits-health', presetSettings('habits-health')], ['habits only', habitsOnly()]] as const) {
    await seed(page, {[HABITS_KEY]: habit()}, settings);
    await page.setViewportSize({width: 1440, height: 900});
    await page.goto('/app');
    const today = page.locator('.today-page');
    await expect(today).toHaveAttribute('data-single', '');
    await expect(page.locator('.today-rail')).toHaveCount(0);
    const box = (await today.boundingBox())!, main = (await page.locator('main').boundingBox())!;
    expect(box.width, preset).toBeLessThanOrEqual(760);
    expect(Math.abs((box.x - main.x) - (main.x + main.width - box.x - box.width)), `${preset}: centred`).toBeLessThanOrEqual(2);
  }
  await showcase(page);
  await page.setViewportSize({width: 1440, height: 900});
  await page.goto('/app');
  await expect(page.locator('.today-page')).not.toHaveAttribute('data-single', '');
  await expect(page.locator('.today-rail')).toHaveCount(1);
});

test('2. phones: one compact Alpha notice on the first screen; More → Status & wallet opens the Status sheet with every notice in full', async ({page}) => {
  // Session AB-Design (owner request 8, ADR-024 D7; assertion re-pointed, as strict): the one status line became the
  // compact notice (closable on the device) and the Status sheet opens from More.
  await page.setViewportSize({width: 390, height: 844});
  await page.goto('/app/goals');
  await expect(page.locator('main h1').first()).toBeVisible();
  const notice = alphaNotice(page);
  await expect(notice.locator('strong')).toHaveText(ALPHA_LABEL);
  const box = (await notice.boundingBox())!, tabs = (await page.locator('.phone-tabbar').boundingBox())!;
  expect(box.height).toBeGreaterThanOrEqual(44); expect(box.height).toBeLessThanOrEqual(72); expect(box.y + box.height).toBeLessThanOrEqual(tabs.y);
  // The long sentences wait in the sheet and in Settings' facts block (Session AC: the footer's line moved there, so this
  // page carries none of them); the first screen carries the label itself.
  await expect(page.locator('.site-footer .network-banner, .site-footer .mode-strip')).toHaveCount(0);
  await inAboutAlpha(page, async about => { await expect(about.locator('.network-banner')).toContainText(ALPHA_SENTENCE); await expect(about.locator('.mode-strip')).toContainText(MODE_LOCAL); });
  const sheet = await openStatusSheet(page);
  await expect(sheet).toContainText(ALPHA_LABEL);
  await expect(sheet).toContainText('LOCAL SIMULATION · Mode: this tab');
  // Session AE (Part 1, ADR-027; owner): the demo balance is no longer repeated in this sheet (nor the top bar); its
  // assertion moved to Today's wallet card below, as strict.
  await expect(sheet).not.toContainText(/demo balance/);
  await expect(sheet.getByRole('button', {name: 'Demo records', exact: true})).toHaveAttribute('aria-pressed', 'true');
  await expect(sheet.getByRole('button', {name: 'Connect Keplr', exact: true})).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(sheet).toBeHidden();
  await expect(page.getByRole('button', {name: 'More', exact: true})).toBeFocused();
  // Moved from the sheet (was: `toContainText(/ZIG demo balance/)`): the amount in ZIG and its simulated kind, on Today's wallet card.
  await page.goto('/app'); await expect(page.locator('main h1').first()).toBeVisible();
  await openFold(page, 'Your wallet');
  await expect(page.locator('.account-panel .account-value')).toContainText(/\d ZIG/);
  await expect(page.locator('.account-panel')).toContainText('Simulated balance · this browser');
  for (const path of ['/app', '/app/wealth', '/app/staking', '/app/settings']) {
    await page.goto(path); await expect(page.locator('main h1').first()).toBeVisible();
    await expect(alphaNotice(page), path).toBeInViewport();
  }
  // Closing the notice keeps it closed on this device; the facts stay in Settings' facts block (the footer until Session AC).
  await notice.getByRole('button', {name: 'Close this notice', exact: true}).click();
  await expect(notice).toHaveCount(0);
  await page.reload(); await expect(page.locator('main h1').first()).toBeVisible();
  await expect(alphaNotice(page)).toHaveCount(0);
  await inAboutAlpha(page, about => expect(about.locator('.network-banner strong')).toHaveText(ALPHA_LABEL));
  // Desktop: the wallet buttons sit in the status row, no sheet.
  await page.setViewportSize({width: 1280, height: 800});
  await page.goto('/app/goals');
  if (!await isPhone(page)) { await expect(page.getByRole('dialog', {name: 'Status'})).toHaveCount(0); await expect(page.locator('.status-row .status-wallet').getByRole('button', {name: 'Connect Keplr', exact: true})).toBeVisible(); }
});

test('3. plain words without a wallet: practice money, Demo records, "Give your savings a purpose"', async ({page, isMobile}) => {
  test.skip(isMobile, 'The desktop top bar shows the words in place; the phone shows them in the Status sheet (test 2).');
  await showcase(page);
  await page.goto('/app');
  await expect(alphaNotice(page).locator('strong')).toHaveText(ALPHA_LABEL); // Session AB-Design: the compact notice
  await expect(page.getByRole('button', {name: 'Demo records', exact: true})).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('button', {name: 'Local demo', exact: true})).toHaveCount(0);
  await expect(page.locator('.hero-pillars')).toContainText('Give your savings a purpose.');
  await expect(page.locator('.hero-pillars')).not.toContainText('Give your ZIG a purpose.');
  // Settings' facts block keeps the strip's words (the hosted verifier reads them; the footer's line until Session AC).
  await expectAlphaMode(page, 'LOCAL SIMULATION');
});

test('5. Wealth: "What you have" lists accounts, assets and debts together, with All · Accounts · Debts · Assets and Portfolio linked', async ({page}) => {
  // Session AC (the owner's decision of 2026-10-15, "show each thing once"): the compact list, "Your assets" and
  // "Accounts, debts & net worth" are one list with one row of chips; each row is the full card or account row with its
  // actions. As strict as before: the same counts per chip, the debts and accounts by name, the asset links, Portfolio.
  await showcase(page);
  await page.goto('/app/wealth');
  const have = page.getByRole('region', {name: 'What you have', exact: true});
  await have.scrollIntoViewIfNeeded();
  await expect(have).toBeVisible();
  if (await isPhone(page)) await openFold(page, 'Accounts, debts & net worth');
  const rows = have.locator('.owned-asset-card, .accounts-group .accounts-list > li');
  const filter = (name: string) => have.getByRole('group', {name: 'Show'}).getByRole('button', {name: new RegExp(`^${name} \\d+$`)});
  await expect(filter('All')).toHaveAttribute('aria-pressed', 'true');
  const all = await rows.count();
  await filter('Debts').click();
  await expect(rows).toHaveCount(2);
  await expect(rows.filter({hasText: 'Car loan'}).getByRole('button', {name: /Record a payment/})).toBeVisible();
  await expect(rows.filter({hasText: 'Credit card'})).toBeVisible();
  await expect(have.locator('.owned-asset-card')).toHaveCount(0);
  await filter('Accounts').click();
  await expect(rows).toHaveCount(3);
  await expect(rows.filter({hasText: 'Rainy-day savings'})).toBeVisible();
  await filter('Assets').click();
  expect(await rows.count()).toBe(all - 5);
  await expect(have.locator('.accounts-section')).toHaveCount(0);
  await expect(rows.first().locator('a.owned-card-link')).toHaveAttribute('href', /^\/app\/wealth\/asset\//);
  await expect(have.getByRole('link', {name: 'Open Portfolio →'})).toHaveAttribute('href', '/app/portfolio');
  // The chips' counts are the rows each one shows.
  await filter('All').click();
  await expect(filter('All')).toHaveAccessibleName(new RegExp(`^All ${all}$`));
});

test('6. Delete for good: an archived habit goes after its name is typed, its stack is undone, Undo brings it back for ten seconds', async ({page}) => {
  test.setTimeout(60_000);
  const READ = '0d1e2f3a-4b5c-4d6e-8f70-819203a4b5c6', day = (n: number) => new Date(Date.now() - n * 86_400_000);
  let data = createHabit(emptyHabitData(), {title: 'Stretch', category: 'Health', description: '', notes: 'my own note', schedule: {kind: 'daily'}, target: 1}, day(12), HABIT);
  data = createHabit(data, {title: 'Read', category: 'Personal', description: '', notes: '', schedule: {kind: 'daily'}, target: 1, stackAfterId: HABIT}, day(12), READ);
  data = logHabitValue(data, HABIT, localDate(day(8)), 1, {note: 'felt good'}, day(7));
  data = scheduleHabitState(data, HABIT, 'archived', localDate(day(5)), day(6));
  await seed(page, {[HABITS_KEY]: data});
  await page.goto('/app/habits');
  await page.getByRole('group', {name: 'Filter habits'}).getByRole('button', {name: 'Archived', exact: true}).click();
  const card = page.getByRole('article', {name: 'Stretch', exact: true});
  await openHabitDetails(card);
  await card.getByRole('button', {name: 'Delete for good…', exact: true}).click();
  const confirm = card.getByRole('form', {name: 'Delete Stretch for good'}), go = confirm.getByRole('button', {name: 'Delete for good', exact: true});
  await expect(go).toBeDisabled();
  await confirm.getByLabel('Type the habit’s name to confirm').fill('Stretc');
  await expect(go).toBeDisabled();
  await confirm.getByLabel('Type the habit’s name to confirm').fill('Stretch');
  await go.click();
  await expect(card).toHaveCount(0);
  const undo = page.getByRole('status').filter({hasText: '“Stretch” was deleted for good.'}).getByRole('button', {name: /^Undo · \d+ s$/});
  await expect(undo).toBeVisible();
  const stored = async () => (await page.evaluate(k => JSON.parse(localStorage.getItem(k)!), HABITS_KEY)) as {habits: {id: string; title: string; notes: string; entries: unknown[]; stackAfterId?: string; ruleRevisions?: unknown[]}[]};
  let record = await stored();
  const shell = record.habits.find(h => h.id === HABIT)!;
  expect(shell).toMatchObject({title: 'Deleted habit', entries: []});
  expect(JSON.stringify(shell)).not.toMatch(/Stretch|my own note|felt good/);
  expect(shell.ruleRevisions?.length).toBeGreaterThan(0);
  expect(record.habits.find(h => h.id === READ)!.stackAfterId).toBeUndefined();
  // Undo: the habit, its check-in and the stack are back.
  await undo.click();
  await expect(page.getByRole('status').filter({hasText: '“Stretch” is back in Archived.'})).toBeVisible();
  await expect(page.getByRole('article', {name: 'Stretch', exact: true})).toBeVisible();
  record = await stored();
  expect(record.habits.find(h => h.id === HABIT)).toMatchObject({title: 'Stretch', notes: 'my own note'});
  expect(record.habits.find(h => h.id === HABIT)!.entries).toHaveLength(1);
  expect(record.habits.find(h => h.id === READ)!.stackAfterId).toBe(HABIT);
  // Deleted again and left: after ten seconds Undo is gone, and the shell shows nowhere (Archived, All, Today).
  await page.getByRole('article', {name: 'Stretch', exact: true}).getByRole('button', {name: 'Delete for good…', exact: true}).click();
  await page.getByLabel('Type the habit’s name to confirm').fill('Stretch');
  await page.getByRole('button', {name: 'Delete for good', exact: true}).click();
  await expect(page.getByRole('button', {name: /^Undo · \d+ s$/})).toHaveCount(0, {timeout: 15_000});
  await expect(page.getByText('Deleted habit')).toHaveCount(0);
  await page.getByRole('group', {name: 'Filter habits'}).getByRole('button', {name: 'All', exact: true}).click();
  await expect(page.getByText('Deleted habit')).toHaveCount(0);
  await page.goto('/app');
  await expect(page.locator('main')).not.toContainText('Deleted habit');
});

// Session Z-Cloud Gate B (Z-Local's `plan.confirm`): a ZIGi card that asks to delete a habit opens Habits with
// #confirm-delete=habit:<id>; the habit's own confirmation opens there, and nothing is deleted until the person confirms.
test('6b. a ZIGi "delete my habit" card opens that habit\'s own confirmation; an active habit says to archive it first', async ({page}) => {
  const WALK = '7d2e1f0a-6b5c-4c3d-9e8f-0a1b2c3d4e5f', day = (n: number) => new Date(Date.now() - n * 86_400_000);
  let data = createHabit(emptyHabitData(), {title: 'Stretch', category: 'Health', description: '', notes: '', schedule: {kind: 'daily'}, target: 1}, day(12), HABIT);
  data = createHabit(data, {title: 'Walk', category: 'Health', description: '', notes: '', schedule: {kind: 'daily'}, target: 1}, day(12), WALK);
  data = scheduleHabitState(data, HABIT, 'archived', localDate(day(5)), day(6));
  await seed(page, {[HABITS_KEY]: data});
  await page.goto(`/app/habits#confirm-delete=habit%3A${HABIT}`);
  const card = page.getByRole('article', {name: 'Stretch', exact: true});
  await expect(card.getByRole('form', {name: 'Delete Stretch for good'})).toBeVisible();
  await expect(card).toBeInViewport();
  await expect.poll(() => page.evaluate(() => window.location.hash)).toBe('');
  const titles = async () => ((await page.evaluate(k => JSON.parse(localStorage.getItem(k)!), HABITS_KEY)) as {habits: {title: string}[]}).habits.map(h => h.title);
  expect(await titles()).toEqual(['Stretch', 'Walk']);
  // An active habit has no deletion of its own yet: its card is shown and says how.
  await page.goto(`/app/habits#confirm-delete=habit%3A${WALK}`);
  const walk = page.getByRole('article', {name: 'Walk', exact: true});
  await expect(walk.getByText('To delete this habit for good, archive it first; then “Delete for good…” appears here.')).toBeVisible();
  await expect(walk.getByRole('button', {name: 'Delete for good…'})).toHaveCount(0);
  expect(await titles()).toEqual(['Stretch', 'Walk']);
});

test('7. lb and fl oz: weight history, the chart and Today read the chosen unit; the records stay in grams and millilitres', async ({page}) => {
  const day = localDate();
  let health = saveHealthPreferences(createEmptyHealth(), {...dailyData(createEmptyHealth()).preferences, weightUnit: 'lb', waterUnit: 'fl-oz-us'});
  health = saveWeight(health, {id: 'health_6f7f6c5e-2c0c-4f0e-9d39-0f6f1e0c1a11', date: day, grams: 72_400}, new Date().toISOString());
  health = addWater(health, {id: 'health_4b1d3f0e-8a2c-4b55-9f5d-2d7f3a9c0b22', date: day, amountMilli: 1_250_000, unit: 'ml'}, new Date().toISOString());
  await seed(page, {[HEALTH_STORAGE_KEY]: health});
  await page.goto('/app/health');
  await page.getByRole('navigation', {name: 'Health views'}).getByRole('button', {name: 'Weight', exact: true}).click();
  const history = page.getByRole('table', {name: 'Weight history'});
  await expect(history).toContainText('159.6 lb');
  await expect(history).not.toContainText('kg');
  await expect(page.locator('.health-weight-stats')).toContainText('159.6 lb');
  await page.getByRole('navigation', {name: 'Health views'}).getByRole('button', {name: 'Diary', exact: true}).click();
  await expect(page.getByRole('region', {name: 'Water journal'}).locator('.health-water-total')).toHaveText('42 fl oz recorded');
  const stored = await page.evaluate(k => JSON.parse(localStorage.getItem(k)!), HEALTH_STORAGE_KEY);
  expect(stored.weights[0].grams).toBe(72_400);
  expect(stored.daily.water[0].amountMilli).toBe(1_250_000);
});

// Gate C, the persona round: a US user typed 64 as the water target meaning fluid ounces and got "2 fl oz"; the week still
// read mL and Activity kg. The target is typed in the chosen unit (kept in mL), the week and Activity follow the units.
test('7b. persona round: the water target is typed in US fl oz; the week reads fl oz and Activity reads lb', async ({page}) => {
  const day = localDate();
  let health = saveHealthPreferences(createEmptyHealth(), {...dailyData(createEmptyHealth()).preferences, weightUnit: 'lb', waterUnit: 'fl-oz-us'});
  health = saveWeight(health, {id: 'health_6f7f6c5e-2c0c-4f0e-9d39-0f6f1e0c1a11', date: day, grams: 72_400}, new Date().toISOString());
  health = addWater(health, {id: 'health_4b1d3f0e-8a2c-4b55-9f5d-2d7f3a9c0b22', date: day, amountMilli: 1_250_000, unit: 'ml'}, new Date().toISOString());
  await seed(page, {[HEALTH_STORAGE_KEY]: health});
  await page.goto('/app/health');
  await expect(page.getByRole('group', {name: 'Water · US fl oz, last 7 days'})).toContainText('42');
  await expect(page.getByRole('group', {name: 'Water · mL, last 7 days'})).toHaveCount(0);
  await page.getByRole('navigation', {name: 'Health views'}).getByRole('button', {name: 'Journal settings', exact: true}).click();
  const form = page.getByRole('form', {name: 'Health preferences'});
  await form.getByLabel('Personal water target (US fl oz, optional)').fill('64');
  await form.getByRole('button', {name: 'Save journal preferences', exact: true}).click();
  await expect.poll(async () => (await page.evaluate(k => JSON.parse(localStorage.getItem(k)!), HEALTH_STORAGE_KEY)).daily.preferences.waterTargetMl).toBe(1893);
  await form.getByLabel('Preferred water unit').selectOption('ml');
  await expect(form.getByLabel('Personal water target (mL, optional)')).toHaveValue('1893');
  await page.goto('/app/activity');
  await expect(page.locator('main')).toContainText('159.6 lb');
  await expect(page.locator('main')).not.toContainText('72.4 kg');
});

test('8. asset quantities are grouped in the person\'s locale ("300,000 ZIG"); the Edit form\'s input stays ungrouped', async ({page}) => {
  await showcase(page);
  await page.goto('/app/wealth');
  const quantities = page.locator('.owned-asset-card .owned-value span');
  await expect(quantities.first()).toBeVisible();
  const texts = await quantities.allTextContents();
  expect(texts.some(t => /\d{1,3}(?:,\d{3})+(?:\.\d+)? [A-Z]/.test(t)), texts.join(' | ')).toBe(true);
  expect(texts.filter(t => /(?:^|[^\d,.])\d{4,}(?:\.\d+)? [A-Z]/.test(t))).toEqual([]);
  // The input: a grouped manual holding's Edit form holds its quantity without separators, the same number.
  const grouped = page.locator('.owned-asset-card').filter({has: page.getByRole('heading', {name: 'USD Coin', exact: true})});
  const shown = (await grouped.locator('.owned-value span').textContent())!.split(' ')[0]!;
  expect(shown).toMatch(/^\d{1,3}(?:,\d{3})+(?:\.\d+)?$/);
  await grouped.getByRole('link', {name: 'View & manage asset →'}).click();
  await page.getByRole('button', {name: 'Edit asset', exact: true}).click();
  const quantity = page.locator('input[name="quantity"]');
  await expect(quantity).toBeVisible();
  const typed = await quantity.inputValue();
  expect(typed).toMatch(/^\d+(?:\.\d+)?$/);
  expect(Number(typed)).toBe(Number(shown.replaceAll(',', '')));
});

test('9. phones: a goal card is about a third of a screen; details open on the goal\'s page', async ({page}) => {
  await page.setViewportSize({width: 390, height: 844});
  await showcase(page);
  await page.goto('/app/goals');
  const card = page.locator('.goals-page .unified-goal-card').first();
  await expect(card).toBeVisible();
  const box = (await card.boundingBox())!;
  expect(box.height).toBeLessThanOrEqual(260);
  await expect(card.locator('h2 a')).toBeVisible();
  await expect(card.locator('.goal-progress-ring')).toBeVisible();
  await expect(card.getByRole('link', {name: 'Open Goal →'})).toBeVisible();
  await expect(card.locator('.card-bottom')).toBeHidden();
  // A computer keeps the accepted card.
  await page.setViewportSize({width: 1440, height: 900});
  await page.goto('/app/goals');
  // Session AB-Design (owner request 18): on every width the card's sources and plan wait behind the Details arrow; open it and they are there.
  if (!await isPhone(page)) { const first = page.locator('.goals-page .unified-goal-card').first(); await first.locator('.goal-card-more > summary').click(); await expect(first.locator('.card-bottom')).toBeVisible(); }
});

test('10. Habits: "Ask ZIGi" about one habit is in its card menu; one "Ask ZIGi about my habits" at the top', async ({page}) => {
  await seed(page, {[HABITS_KEY]: habit('Stretch')});
  await page.goto('/app/habits');
  const card = page.getByRole('article', {name: 'Stretch', exact: true});
  await expect(card.locator('.habit-card-heading .ai-ask-link')).toHaveCount(0);
  await card.getByRole('button', {name: 'Options for Stretch', exact: true}).click();
  await expect(card.getByRole('group', {name: 'Stretch options'}).getByRole('button', {name: 'Ask ZIGi about this habit', exact: true})).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', {name: 'Ask ZIGi about my habits', exact: true})).toHaveCount(1);
});

// Gate C (CI on 001e363e, motion-arrival on the phone): the two links joined "+ New habit"'s row, so the hero is two rows of
// actions from 360 px and the overview's first figure stays on the first screen of an iPhone 13.
test('10b. phones: Habits\' hero actions take at most two rows from 360 px, and the first figure is on the first screen', async ({page, isMobile}) => {
  test.skip(!isMobile, 'phones only');
  await showcase(page);
  for (const width of [360, 390, 430]) {
    await page.setViewportSize({width, height: 664});
    await page.goto('/app/habits');
    // While the page settles, the server's hero and the phone's can both be there for a moment: measure the one that stays.
    await expect(page.locator('.habit-hero-actions')).toHaveCount(1);
    await expect(page.locator('.habit-hero .page-ask-zigi')).toHaveCount(1); // the same settle as the actions above
    await expect(page.locator('.habit-hero .page-ask-zigi')).toBeVisible(); // Session AB-Design (owner request 21): the shared Ask ZIGi action
    const tops = (await page.locator('.habit-hero-actions').evaluate(a => [...a.querySelectorAll('button, a')].map(e => e.getBoundingClientRect().top))).sort((a, b) => a - b);
    expect(tops, `three actions at ${width}`).toHaveLength(3);
    // Session AB-Design (owner request 21): the shared minor actions are short on phones, so the three fit one row at 430 px; never more than two rows.
    expect(1 + tops.slice(1).filter((t, i) => t - tops[i]! > 10).length, `rows of actions at ${width}`).toBeLessThanOrEqual(2);
  }
  await page.setViewportSize({width: 390, height: 664});
  await page.goto('/app/habits');
  const figure = page.locator('.habit-overview strong').first();
  await expect(figure).toBeVisible();
  // With the links stacked it started 656 px down a 664 px screen (and below it while the page arrived); now about 608.
  expect((await figure.boundingBox())!.y, 'the first figure starts well inside the first screen').toBeLessThanOrEqual(634);
});

test('11. Help is the last item of the sidebar and of More; Help\'s "Send feedback" opens the feedback form', async ({page}) => {
  await page.goto('/app');
  await expect(page.locator('main h1').first()).toBeVisible();
  if (await isPhone(page)) {
    const sheet = await openMore(page);
    await expect(sheet.getByRole('link').last()).toHaveText('Help');
    await expect(sheet.getByRole('link', {name: 'Help', exact: true})).toHaveAttribute('href', '/app/help');
    await page.keyboard.press('Escape');
  } else {
    const links = mainNav(page).getByRole('link');
    await expect(links.last()).toHaveText('Help');
  }
  // Session AD (deliberate, the owner's brief Part 1.1; ADR-026): the footer's link columns are gone; "Send feedback" is
  // Help's own topic link, two taps away (Help, then the topic). As strict: the same href, the same landing in view.
  await expect(page.locator('footer').getByRole('link', {name: 'Report a bug'})).toHaveCount(0);
  await page.goto('/app/help');
  const feedback = page.getByRole('navigation', {name: 'Help topics'}).getByRole('link', {name: 'Send feedback', exact: true});
  await expect(feedback).toHaveAttribute('href', '#feedback');
  await feedback.click();
  await page.waitForURL('**/app/help#feedback');
  await expect(page.locator('#feedback')).toBeInViewport();
});

test('12. phones: ZIGi is the one floating button; the music player opens from ZIGi\'s "⋯" menu and the More sheet', async ({page}) => {
  await page.setViewportSize({width: 390, height: 844});
  await showcase(page);
  await page.goto('/app/habits');
  await expect(page.locator('main h1').first()).toBeVisible();
  await expect(page.getByTestId('ai-launcher')).toBeVisible();
  await expect(page.getByRole('button', {name: 'Open the music player', exact: true})).toHaveCount(0);
  await page.getByRole('button', {name: /^Open ZIGi/}).click();
  const panel = page.locator('dialog.ai-chat[open]');
  await expect(panel).toBeVisible();
  await panel.getByRole('button', {name: 'More: history, customize, settings and help'}).click();
  await panel.getByRole('button', {name: 'Open the music player', exact: true}).click();
  await expect(panel).toBeHidden();
  await expect(page.locator('.music-panel[role=dialog]')).toBeVisible();
  // The More sheet's row opens the same player.
  await page.getByRole('button', {name: 'Close the music player', exact: true}).click();
  const sheet = await openMore(page);
  await sheet.getByRole('button', {name: /Your soundtrack/}).click();
  await expect(page.locator('.music-panel[role=dialog]')).toBeVisible();
});

// Gate C, the persona round (docs/verification/z-cloud/PERSONAS_Z.md): two pages scrolled sideways at 320 px (both the same
// on #35): Meet ZIGi (each card's three sizes forced 352 px) and Help with the local-model answer open (a long command).
test('persona round: Meet ZIGi and Help\'s local-model answer never scroll sideways at 320 and 360 px', async ({page, isMobile}) => {
  test.skip(!isMobile, 'phones only');
  for (const width of [320, 360]) {
    await page.setViewportSize({width, height: 640});
    await page.goto('/app/zigi');
    await expect(page.locator('.meet-zigi-card').first()).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth), `Meet ZIGi at ${width}`).toBeLessThanOrEqual(width);
    await page.goto('/app/help#help-your-ai-local');
    await expect(page.locator('#help-your-ai-local')).toHaveAttribute('open', '');
    await expect(page.locator('#help-your-ai-local code').first()).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth), `Help at ${width}`).toBeLessThanOrEqual(width);
  }
});

// Gate C, the persona round: an earlier answer made on this device kept "For example:" but lost its examples (they were
// buttons on the latest answer only); it keeps them as plain words now.
test('persona round: an earlier on-device answer keeps its examples as words; the latest keeps them as buttons', async ({page}) => {
  await seed(page, {});
  await page.goto('/app');
  await page.getByRole('button', {name: /Open ZIGi/}).click();
  const panel = page.locator('dialog.ai-chat[open]');
  await expect(panel).toBeVisible();
  const box = panel.getByRole('textbox', {name: /^(Message to your AI|Ask ZIGi about your records)$/});
  for (const [n, q] of ['Tell me a joke', 'Sing me a song'].entries()) {
    await box.fill(q); await panel.locator('.ai-composer button[type=submit]').click();
    await expect(panel.locator('.ai-turn-local')).toHaveCount(n + 1);
  }
  const first = panel.locator('.ai-turn-local').first(), last = panel.locator('.ai-turn-local').last();
  await expect(first).toContainText('For example');
  await expect(first.getByRole('list', {name: 'Questions ZIGi answers here'}).getByRole('listitem').first()).toBeVisible();
  await expect(first.getByRole('group', {name: 'Questions ZIGi answers here'})).toHaveCount(0);
  await expect(last.getByRole('group', {name: 'Questions ZIGi answers here'}).getByRole('button').first()).toBeVisible();
});

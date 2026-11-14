import { expect, test, type Locator } from '@playwright/test';
import { navLink, openMealLog, openTodayWidgets } from './phone-nav';

test('JRN-01 empty Health-only profile saves meals, water and a pinned metric without financial requests', async ({ page, context, isMobile }, info) => {
  expect(await context.storageState()).toEqual({ cookies: [], origins: [] });
  const requests: { method: string; url: string; type: string }[] = [];
  page.on('request', request => requests.push({ method: request.method(), url: request.url(), type: request.resourceType() }));
  page.on('websocket', socket => requests.push({ method: 'CONNECT', url: socket.url(), type: 'websocket' }));
  const activate = async (locator: Locator) => { if (isMobile) await locator.tap(); else await locator.click(); };
  const nav = page.getByRole('navigation', { name: 'Main navigation', exact: true });
  await page.goto('/app');
  // Session AK (ADR-036 G2, RELEASE_REVIEW_2 R2-11, 15c1e159, deliberate): on a brand-new device "Make Today yours" waits
  // until the welcome is answered, so the welcome is answered first ("Not now"), as a person choosing a layout would.
  await activate(page.getByRole('region', { name: 'Set up your first goal and habit in about a minute.' }).getByRole('button', { name: 'Skip setup', exact: true })); // N-NB-01 (deliberate): was "Not now"
  // Session AL (P-NB-08; NB-002, NB-033; deliberate): after "Not now" an empty device shows one setup entry, and "Make
  // Today yours" waits until something is recorded, so the Health-only layout is chosen from Customize Today's own preset
  // chooser (the same dialog and the same Apply), as tests/run10-widgets.spec.ts does.
  await expect(page.getByRole('region', { name: 'Set up ZIGoals in about a minute.' })).toBeVisible();
  await activate(page.getByRole('button', { name: 'Customize Today', exact: true }));
  await activate(page.getByRole('button', { name: 'Choose preset', exact: true }));
  const preset = page.getByRole('dialog', { name: 'Choose your Today layout' });
  await expect(preset).toBeVisible();
  await preset.getByRole('radio', { name: /^Health-only/ }).check();
  await preset.getByRole('button', { name: 'Apply layout' }).focus();
  await page.keyboard.press('Enter');
  await expect(preset).not.toBeVisible();
  await activate(page.getByRole('button', { name: 'Finish customizing' }));
  await expect(page.locator('.personalized-today')).toHaveAttribute('data-interests', 'health');
  await expect(page.getByRole('region', { name: 'Today financial intelligence' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: /Connect Keplr/ })).toHaveCount(0);
  await expect(page.getByRole('complementary', { name: 'Showcase data' })).toHaveCount(0);
  await activate(nav.getByRole('link', { name: 'Health', exact: true }));
  await expect(page.getByRole('region', { name: 'Breakfast diary' })).toContainText('Nothing logged yet');
  await activate(page.getByRole('tab', { name: 'Foods & recipes', exact: true }));
  await activate(page.getByRole('button', { name: 'New food', exact: true }));
  const food = page.getByRole('form', { name: 'Food details' });
  for (const [label, value] of [['Food name', 'Fictional journey oats'], ['Serving weight (g)', '40'], ['Calories (kcal)', '150'], ['Protein (g)', '5'], ['Carbs (g)', '27'], ['Fat (g)', '3']]) await food.getByLabel(label!).fill(value!);
  await activate(food.getByRole('button', { name: 'Save food', exact: true }));
  await expect(page.getByRole('status').filter({ hasText: 'Food saved' })).toBeVisible();
  await activate(page.getByRole('tab', { name: 'Diary', exact: true }));
  const journalDate = await page.getByLabel('Journal date').inputValue();
  await openMealLog(page);
  const meal = page.getByRole('form', { name: 'Log a meal', exact: true });
  await meal.getByLabel('Food or recipe').selectOption({ label: 'Fictional journey oats · food' });
  await meal.getByLabel('Servings', { exact: true }).fill('1.5');
  // Session AL (A10-2, deliberate): the meal now defaults to the time of day, so the Breakfast this test reads is chosen.
  await meal.getByLabel('Meal', { exact: true }).selectOption('Breakfast');
  await activate(meal.getByRole('button', { name: 'Log to diary' }));
  await expect(page.getByRole('region', { name: 'Breakfast diary' })).toContainText('225 kcal');
  await activate(page.getByRole('button', { name: 'Add 250 mL', exact: true }));
  await expect(page.getByRole('region', { name: 'Water journal' })).toContainText('250 mL recorded');
  await activate(nav.getByRole('link', { name: 'Today', exact: true }));
  await activate(page.getByRole('button', { name: 'Customize Today', exact: true }));
  const add = page.getByRole('button', { name: 'Add widget', exact: true });
  await activate(add);
  await expect(page.getByRole('dialog', { name: 'Add a widget' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(add).toBeFocused();
  // The Health preset already pins water; remove its configuration before choosing our own.
  await activate(page.getByRole('article', { name: 'Water today', exact: true }).getByRole('button', { name: 'Options for Water today' }));
  // Session AO (DV-040g, deliberate): items are menuitems now
  await activate(page.getByRole('article', { name: 'Water today', exact: true }).getByRole('menuitem', { name: 'Remove widget' }));
  await expect(page.getByRole('article', { name: 'Water today', exact: true })).toHaveCount(0);
  await add.focus();
  await page.keyboard.press('Enter');
  const editor = page.getByRole('dialog', { name: 'Add a widget' });
  await editor.getByRole('group', { name: 'Choose a metric' }).getByRole('button', { name: 'Water today' }).click();
  await editor.getByText('Title and display size').click();
  await editor.getByLabel('Card title (optional)').fill('My saved water');
  await expect(editor.getByRole('region', { name: 'Widget preview' })).toContainText('250 mL');
  await activate(editor.getByRole('button', { name: 'Save widget', exact: true }));
  const widget = page.getByRole('article', { name: 'My saved water', exact: true });
  await expect(widget).toContainText('250 mL');
  await activate(page.getByRole('button', { name: 'Finish customizing' }));
  const settings = await navLink(page, 'Settings');
  await settings.focus();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/\/app\/settings$/);
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await activate(nav.getByRole('link', { name: 'Today', exact: true }));
  await expect(page).toHaveURL(/\/app$/);
  await page.reload();
  await expect(page.locator('.personalized-today')).toHaveAttribute('data-interests', 'health');
  await openTodayWidgets(page);
  await expect(widget).toContainText('250 mL');
  await expect(page.getByRole('region', { name: 'Today financial intelligence' })).toHaveCount(0);
  await expect(page.getByRole('complementary', { name: 'Showcase data' })).toHaveCount(0);
  await activate(nav.getByRole('link', { name: 'Health', exact: true }));
  await expect(page).toHaveURL(/\/app\/health$/);
  await page.reload();
  await page.getByLabel('Journal date').fill(journalDate);
  await expect(page.getByRole('region', { name: 'Breakfast diary' })).toContainText('Fictional journey oats');
  await expect(page.getByRole('region', { name: 'Breakfast diary' })).toContainText('225 kcal');
  await expect(page.getByRole('region', { name: 'Water journal' })).toContainText('250 mL recorded');
  await activate(page.getByRole('tab', { name: 'Foods & recipes', exact: true }));
  await expect(page.getByRole('heading', { name: 'Fictional journey oats', exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  const origin = new URL(page.url()).origin;
  const forbidden = requests.filter(request => {
    const url = new URL(request.url);
    const localDevHmr = request.type === 'websocket' && url.host === new URL(origin).host && url.pathname === '/_next/hmr';
    return /\/api\/(?:market|wallet|finance|price|staking|transaction|rpc|chain)/i.test(url.pathname)
      || (!localDevHmr && url.origin !== origin && ['fetch', 'xhr', 'websocket'].includes(request.type));
  });
  await info.attach('journey-request-audit', { body: JSON.stringify({ requests, forbidden }, null, 2), contentType: 'application/json' });
  expect(forbidden, 'Health-only must not request market, wallet, financial or external data').toEqual([]);
  await page.screenshot({ path: info.outputPath('health-only-saved-food.png'), fullPage: true });
});

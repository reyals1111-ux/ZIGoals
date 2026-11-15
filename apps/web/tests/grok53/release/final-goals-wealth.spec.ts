import {expect, test, type Page} from '@playwright/test';
import {books, goal, openModule, seedGoals} from '../goals/goal-fixtures';
import {hydrated} from '../../ah-helpers';
import {AI_SETTINGS_KEY, defaultAiSettings} from '../../../lib/ai/settings';

/**
 * Session AL final fix pass (Goals, Wealth and the money forms): one test per group of the final replay's still-open rows
 * (docs/review/session-al/GROK53_REPLAY_PRIMITIVES_3.md, GROK53_REPLAY_PILLARS_3.md, GROK53_REPLAY_SHELL_3.md), at the
 * replay's width and conditions: a fresh Europe/Brussels device, the API offline, fictional data only.
 */
test.use({timezoneId: 'Europe/Brussels', viewport: {width: 1920, height: 1113}});
test.skip(({isMobile}) => isMobile, 'computer widths: runs in the desktop project (375 and 768 are set per test)');

const DRAFT_KEY = 'zigoals:draft:goal-wizard:v1';
const draft = (page: Page) => page.evaluate(k => JSON.parse(sessionStorage.getItem(k) ?? 'null') as Record<string, unknown> | null, DRAFT_KEY);
const usd = (id: string, quantity = '20000') => ({id, providerId: 'Fictional cash', sourceType: 'MANUAL', network: 'manual', account: 'local', asset: 'USD', denom: 'USD', quantity, decimals: 2, verification: 'MANUAL', sync: 'MANUAL', liquidity: 'LIQUID', observedAt: '2026-11-04T08:00:00.000Z', provenance: 'User entry', assetClass: 'Cash'});
/** Fund Goal opens its sheet (a click that lands while the goal page is still hydrating is tried again; it only ever opens). */
async function openFund(page: Page) {
  await expect(async () => { await page.getByRole('button', {name: 'Fund Goal', exact: true}).first().click(); await expect(page.getByRole('dialog')).toBeVisible({timeout: 2000}); }).toPass({timeout: 30_000});
}
/** Every dialog the page opens (a native confirm() or "Leave site?"), dismissed. */
function dialogs(page: Page) { const seen: string[] = []; page.on('dialog', d => { seen.push(`${d.type()}:${d.message()}`); void d.dismiss(); }); return seen; }

test.describe('1. the goal wizard keeps its draft (BN-155, BUG-076, G-026, DV-056b, DV-064, N-DV-02, D-205)', () => {
  test('BN-155/BUG-076: a reload where the browser itself puts the typed words back brings the draft back, and asks nothing', async ({page}) => {
    await seedGoals(page, [], '/app/goals/new');
    const asked = dialogs(page);
    await page.getByLabel('Goal name', {exact: true}).fill('Berlin draft');
    await page.getByRole('radio', {name: 'Save an amount', exact: true}).check();
    await page.getByLabel('Target amount', {exact: true}).fill('1500');
    await expect.poll(() => draft(page)).toMatchObject({name: 'Berlin draft', target: '1500'});
    // Chrome's form restoration (a reload, Back/Forward): the field holds the typed words before the app reads its draft.
    // This was the cause: the draft was skipped as "typed while loading", then deleted, and the field emptied.
    await page.addInitScript(() => document.addEventListener('DOMContentLoaded', () => { const el = document.querySelector<HTMLInputElement>('.unified-wizard input[id$="name"]'); if (el) el.value = 'Berlin draft'; }));
    await page.reload(); await hydrated(page);
    await expect(page.locator('.wizard-draft-back')).toHaveText('Draft restored · Discard');
    await expect(page.getByLabel('Goal name', {exact: true})).toHaveValue('Berlin draft');
    await expect(page.getByLabel('Target amount', {exact: true})).toHaveValue('1500');
    expect(await draft(page)).toMatchObject({name: 'Berlin draft', target: '1500'});
    expect(asked).toEqual([]);
    await page.getByRole('button', {name: 'Discard', exact: true}).click();
    await expect(page.getByLabel('Goal name', {exact: true})).toHaveValue('');
    await expect(page.locator('.wizard-draft-back')).toHaveCount(0);
    expect(await draft(page)).toBeNull();
  });

  test('G-026/N-DV-02/D-205/DV-056b: leaving by the sidebar or Escape asks nothing (no native confirm) and the draft comes back', async ({page}) => {
    await seedGoals(page, [], '/app/goals/new');
    const asked = dialogs(page);
    await page.getByLabel('Goal name', {exact: true}).fill('Sidebar draft');
    await page.getByRole('navigation', {name: 'Main navigation'}).getByRole('link', {name: 'Habits', exact: true}).click();
    await expect(page).toHaveURL(/\/app\/habits$/);
    await page.goto('/app/goals/new'); await hydrated(page);
    await expect(page.locator('.wizard-draft-back')).toHaveText('Draft restored · Discard');
    await expect(page.getByLabel('Goal name', {exact: true})).toHaveValue('Sidebar draft');
    const name = page.getByLabel('Goal name', {exact: true});
    await name.fill('Esc test');
    await name.press('Escape');
    await expect(page).toHaveURL(/\/app\/goals$/);
    await page.goto('/app/goals/new'); await hydrated(page);
    await expect(page.getByLabel('Goal name', {exact: true})).toHaveValue('Esc test');
    expect(asked).toEqual([]);
  });
});

test.describe('2. one amount wording (BUG-012, M-057, NB-189, DV-144, B-024, DV-003a, DV-049a, MO-121, BN-141, N-DV-16)', () => {
  test('Fund Goal → Cash and Wealth → Add asset → Cash say the shared sentence for -5, abc and 1e3; the wizard preview agrees with its field', async ({page}) => {
    await seedGoals(page, [goal('91', {name: 'Fictional fund', target: '20000'})], '/app/goals/tracked/91');
    await openFund(page);
    const fund = page.getByRole('dialog');
    await fund.getByRole('group', {name: 'Asset categories'}).getByRole('button', {name: 'Cash', exact: true}).click();
    const cash = fund.getByLabel('Cash amount');
    for (const [raw, said] of [['0', 'Enter an amount above 0.'], ['-5', 'Enter an amount above 0.'], ['abc', 'Enter a number, like 1500 or 12.50.'], ['1e3', 'Enter a number, like 1500 or 12.50.']] as const) {
      await cash.fill(raw);
      await fund.getByRole('button', {name: 'Preview contribution'}).click(); // Session AO (DV-010c, deliberate): the Cash form's own button
      await expect(fund.getByText(said, {exact: true}), raw).toBeVisible();
      await expect(cash).toHaveAttribute('aria-invalid', 'true');
      await expect(cash).toBeFocused();
    }
    await expect(fund).not.toContainText('non-negative');
    await page.goto('/app/wealth'); await hydrated(page);
    await page.getByRole('button', {name: '+ Add asset'}).first().click();
    const add = page.getByRole('dialog', {name: 'Add to your wealth'});
    await add.getByRole('group', {name: 'Asset categories'}).getByRole('button', {name: 'Cash', exact: true}).click();
    for (const [raw, said] of [['-50', 'Enter an amount above 0.'], ['abc', 'Enter a number, like 1500 or 12.50.'], ['1e3', 'Enter a number, like 1500 or 12.50.']] as const) {
      await add.getByLabel('Cash amount').fill(raw);
      await add.getByRole('button', {name: 'Save asset'}).click();
      await expect(add.getByText(said, {exact: true}), raw).toBeVisible();
    }
    await expect(add).not.toContainText('non-negative');
    await page.goto('/app/goals/new'); await hydrated(page);
    await page.getByLabel('Goal name', {exact: true}).fill('Fictional preview');
    await page.getByRole('radio', {name: 'Save an amount', exact: true}).check();
    const preview = page.getByRole('region', {name: 'Goal preview'}).locator('strong').first();
    await page.getByLabel('Target amount', {exact: true}).fill('-5');
    await expect(preview).toHaveText('Enter an amount above 0.');
    await page.getByLabel('Target amount', {exact: true}).fill('abc');
    await expect(preview).toHaveText('Unreadable amount · Enter a number, like 1500 or 12.50.');
    await expect(page.locator('main')).not.toContainText('non-negative');
  });
});

test.describe('3 and 4. the plan form: the person’s zone, the shared date, and errors at the field (DV-033c, DV-038d, DV-033d, B-185, M-060, N-155, DV-033a, DV-009, G-007)', () => {
  test('the plan starts in Europe/Brussels, the timeline filters name no UTC, a refused amount is said under its field, and the plan line writes its date', async ({page}) => {
    await seedGoals(page, [goal('92', {name: 'Fictional plan goal', target: '20000'})], '/app/goals/tracked/92');
    const plan = await openModule(page, 'contribution-plan');
    await expect(plan.getByLabel('Plan time zone', {exact: true})).toHaveValue('Europe/Brussels');
    await expect(plan).toContainText('Dates use Europe/Brussels.');
    await expect(plan).not.toContainText('Dates use UTC.');
    const timeline = page.getByRole('region', {name: 'Goal timeline', exact: true});
    await expect(timeline.getByLabel('From date', {exact: true})).toBeVisible();
    await expect(timeline.getByLabel('Through date', {exact: true})).toBeVisible();
    await expect(timeline).not.toContainText('(UTC)');
    await expect(timeline).toContainText('Times and date filters use Europe/Brussels.');
    const amount = plan.getByLabel('Planned amount', {exact: true});
    for (const raw of ['0', '-5']) {
      await amount.fill(raw);
      await plan.getByRole('button', {name: 'Save contribution plan'}).click();
      const alert = plan.locator('#goal-plan-error');
      await expect(alert).toHaveText('Enter an amount above 0.');
      await expect(amount).toHaveAttribute('aria-invalid', 'true');
      await expect(amount).toHaveAttribute('aria-describedby', 'goal-plan-error');
      await expect(amount).toBeFocused();
      // Both measured in the same frame (the field scrolls into view as it takes the focus).
      const gap = await alert.evaluate(el => { const f = document.querySelector('form[data-goal-draft="plan"] [name="amount"]')!.getBoundingClientRect(), a = el.getBoundingClientRect(); return a.top - f.bottom; });
      expect(gap, 'the message sits right under the field').toBeGreaterThanOrEqual(0);
      expect(gap, 'the message sits right under the field').toBeLessThan(40);
    }
    await expect(page.locator('main > [role=alert], .platform-shell > [role=alert]')).toHaveCount(0);
    await amount.fill('25');
    await expect(plan.locator('#goal-plan-error')).toHaveCount(0);
    await plan.getByRole('button', {name: 'Save contribution plan'}).click();
    await expect(page.locator('main')).toContainText(/Plan terms effective (\d{1,2} [A-Z][a-z]{2} \d{4}|[A-Z][a-z]{2} \d{1,2}, \d{4})/);
    await expect(page.locator('main')).not.toContainText(/Plan terms effective \d{4}-\d{2}-\d{2}/);
  });

  test('DV-009: History only 0 is said under the amount field, which is marked and focused', async ({page}) => {
    await seedGoals(page, [goal('93', {name: 'Fictional history goal', target: '20000'})], '/app/goals/tracked/93');
    await openFund(page);
    const sheet = page.getByRole('dialog');
    await sheet.getByRole('button', {name: 'Record history only', exact: true}).click();
    const field = sheet.getByLabel('Actual amount in USD');
    await field.fill('0');
    await sheet.getByRole('button', {name: 'Save history only'}).click();
    await expect(sheet.locator('#history-amount-error')).toHaveText('Enter an amount above 0.');
    await expect(field).toHaveAttribute('aria-invalid', 'true');
    await expect(field).toBeFocused();
    await field.fill('5');
    await expect(sheet.locator('#history-amount-error')).toHaveCount(0);
  });

  test('G-007: a too-big milestone is said at its value field and goes once another milestone action runs', async ({page}) => {
    await seedGoals(page, [goal('94', {name: 'Fictional milestone goal', target: '20000'})], '/app/goals/tracked/94');
    const box = await openModule(page, 'milestones');
    const add = box.getByRole('form', {name: 'Add a milestone'});
    await add.getByLabel('New milestone').fill('Good');
    await add.getByLabel('Value (USD, optional)').fill('50');
    await add.getByRole('button', {name: 'Add milestone'}).click();
    await expect(box.getByRole('checkbox', {name: 'Good'})).toBeVisible();
    await add.getByLabel('New milestone').fill('Too big');
    await add.getByLabel('Value (USD, optional)').fill('300');
    await add.getByRole('button', {name: 'Add milestone'}).click();
    const alert = box.locator('#goal-milestone-error');
    await expect(alert).toHaveText("Enter a milestone value above 0 and at most the goal's target.");
    await expect(add.getByLabel('Value (USD, optional)')).toHaveAttribute('aria-invalid', 'true');
    await expect(add.getByLabel('Value (USD, optional)')).toBeFocused();
    await box.getByRole('checkbox', {name: 'Good'}).check();
    await expect(alert).toHaveCount(0);
    // A repeated name says "goal" in lower case mid-sentence (DV-007b).
    await add.getByLabel('New milestone').fill('Good');
    await add.getByLabel('Value (USD, optional)').fill('');
    await add.getByRole('button', {name: 'Add milestone'}).click();
    await expect(alert).toHaveText('This goal already has a milestone called “Good”. Give this one another name.');
  });
});

test.describe('5. copy (DV-034a, DV-007b, X3-19, L-060, N-NB-23)', () => {
  test('a count goal’s plan names what it counts; a rewards goal says what it tracks; an unnamed custom unit says what it is', async ({page}) => {
    const reward = goal('96', {name: 'Fictional rewards', type: 'REWARD', asset: 'ZIG', denom: 'ZIG', decimals: 6, target: '100000000'});
    const contribution = {id: 'unmatched', goalId: '91', goalScope: 'private', direction: 'IN', quantity: '1', asset: 'CUSTOM', decimals: 0, occurredAt: '2026-11-04T09:00:00.000Z', provenance: 'MANUAL_ATTRIBUTION', fundingMode: 'HISTORY_ONLY'};
    await seedGoals(page, [books('95'), reward, goal('91', {name: 'Emergency fund', target: '20000'})], '/app/goals/tracked/95', {contributions: [contribution]} as never);
    const plan = await openModule(page, 'contribution-plan');
    await expect(plan.getByLabel('What you count', {exact: true})).toBeVisible();
    await expect(plan).not.toContainText('Contribution asset');
    await page.goto('/app/goals/tracked/96'); await hydrated(page);
    const main = page.locator('main');
    await expect(main).toContainText('This goal counts the unclaimed staking rewards you allocate to it. It grows as they arrive; no plan is needed.');
    await expect(main).not.toContainText(/Funding Wealth|Link your wealth|A Reward Goal/);
    await page.goto('/app/activity'); await hydrated(page);
    await expect(main).toContainText('1 unit · a custom asset not in Wealth');
    await expect(main).not.toContainText('1 unit of a custom asset');
    await page.goto('/app/goals'); await hydrated(page);
    await expect(main).not.toContainText(/active Goals? ha|Open Goal →/);
  });
});

test.describe('6. currency (TK-199, N-003, N-MO-03)', () => {
  test('TK-199: a GBP custom asset reads £500.00', async ({page}) => {
    await seedGoals(page, [], '/app/wealth');
    await page.getByRole('button', {name: '+ Add asset'}).first().click();
    const add = page.getByRole('dialog', {name: 'Add to your wealth'});
    await add.getByRole('group', {name: 'Asset categories'}).getByRole('button', {name: 'Custom', exact: true}).click();
    await add.getByLabel('Asset name').fill('Item GBP');
    await add.getByLabel('Quantity').fill('1');
    await add.getByLabel('Other valuation currency').fill('GBP');
    await add.getByLabel('Total holding value').fill('500');
    await add.getByRole('button', {name: 'Save asset'}).click();
    await expect(add).toHaveCount(0);
    await expect(page.locator('main')).toContainText('£500.00');
    await expect(page.locator('main')).not.toContainText('500.00 GBP');
  });

  test('N-003: a name that mentions euros offers the euro; nothing switches without the click', async ({page}) => {
    // The replay's device starts goals in USD: here a USD holding makes USD the default, as there.
    await seedGoals(page, [], '/app/goals/new', {positions: [usd('usd-cash')]} as never);
    await page.getByLabel('Goal name', {exact: true}).fill('Save €5,000 crypto safety fund');
    await page.getByRole('radio', {name: 'Save an amount', exact: true}).check();
    await page.getByLabel('Target amount', {exact: true}).fill('5000');
    const usdRadio = page.getByRole('radio', {name: 'USD · US dollar'}), eurRadio = page.getByRole('radio', {name: 'EUR · Euro'});
    await expect(usdRadio).toBeChecked();
    await expect(page.locator('.goal-currency-offer')).toHaveText('Your goal’s name mentions euros. Use EUR · Euro');
    await page.getByRole('button', {name: 'Use EUR · Euro'}).click();
    await expect(eurRadio).toBeChecked();
    await expect(page.locator('.goal-currency-offer')).toHaveCount(0);
    await expect(page.getByRole('region', {name: 'Goal preview'})).toContainText('€5,000.00');
  });

  test('N-MO-03: the monthly cap starts in the person’s EUR when all their money is in euros', async ({page}) => {
    await seedGoals(page, [], '/app/goals', {positions: [{...usd('eur-cash', '50000'), providerId: 'EUR Cash', asset: 'EUR', denom: 'EUR'}]} as never);
    await page.route('http://127.0.0.1:1234/**', route => route.fulfill({status: 200, contentType: 'application/json', body: JSON.stringify({object: 'list', data: [{id: 'mock-chat'}]})}));
    await page.evaluate(([key, value]) => localStorage.setItem(key!, value!), [AI_SETTINGS_KEY, JSON.stringify({...defaultAiSettings(), enabled: true, mode: 'local', provider: 'local', model: 'mock-chat', localServer: 'openai-compatible', baseUrl: 'http://127.0.0.1:1234'})]);
    await page.goto('/app/settings#your-ai'); await hydrated(page);
    const cap = page.locator('#your-ai fieldset.ai-usage-cap');
    await expect(cap.getByLabel('Currency')).toHaveValue('EUR');
    await expect(cap.getByLabel('Currency')).not.toHaveValue('USD');
  });
});

test.describe('wizard and goal page layout (D-257, D-132, G-023, D-139, DV-025h)', () => {
  test('D-257 at 375: step 1 shows no disabled Back and the category tiles are not an inner scroller', async ({page}) => {
    await page.setViewportSize({width: 375, height: 812});
    await seedGoals(page, [], '/app/goals/new');
    const actions = page.locator('#goal-wizard-actions');
    await expect(actions.getByRole('button', {name: 'Back', exact: true})).toHaveCount(0);
    await expect(actions.getByRole('button', {name: 'Continue →'})).toBeVisible();
    await page.getByRole('radio', {name: 'Save an amount', exact: true}).check();
    await page.locator('.goal-optional > summary').click();
    const tiles = page.locator('.goal-optional .goal-choice-tiles').first();
    expect(await tiles.evaluate(el => el.scrollHeight - el.clientHeight)).toBeLessThanOrEqual(1);
    await page.getByLabel('Goal name', {exact: true}).fill('Fictional step two');
    await page.getByLabel('Target amount', {exact: true}).fill('100');
    await actions.getByRole('button', {name: 'Continue →'}).click();
    await expect(actions.getByRole('button', {name: 'Back', exact: true})).toBeEnabled();
  });

  test('D-132/G-023/D-139 at 768: the form takes the column’s width (no empty 200 px art column) and idea titles line up', async ({page}) => {
    await page.setViewportSize({width: 768, height: 1024});
    await seedGoals(page, [], '/app/goals/new');
    const wizard = (await page.locator('.unified-wizard').boundingBox())!, content = (await page.locator('.unified-wizard .wizard-content').boundingBox())!;
    expect(content.width / wizard.width, 'the form takes the wizard’s width').toBeGreaterThan(0.9);
    const story = (await page.locator('.unified-wizard .wizard-story').boundingBox())!;
    expect(story.y + story.height, 'the art is a banner above the form, not a column beside it').toBeLessThanOrEqual(content.y + 1);
    const offsets = await page.locator('.goal-ideas-list .goal-idea').evaluateAll(cards => cards.map(card => Math.round(card.querySelector('strong')!.getBoundingClientRect().left - card.getBoundingClientRect().left)));
    expect(new Set(offsets).size, `title offsets ${offsets.join(', ')}`).toBe(1);
  });

  test('DV-025h at 1280: Edit goal details stays open after Save and says "Saved" until the next edit', async ({page}) => {
    await page.setViewportSize({width: 1280, height: 900});
    await seedGoals(page, [goal('97', {name: 'Fictional details goal'})], '/app/goals/tracked/97');
    const edit = await openModule(page, 'edit-goal');
    await edit.getByLabel('Edit goal notes').fill('Fictional new note');
    await edit.getByRole('button', {name: 'Save Goal details', exact: true}).click();
    await expect(edit.locator('.goal-details-saved')).toHaveText('Saved');
    await expect(edit).toHaveAttribute('open', '');
    await edit.getByLabel('Edit goal notes').fill('Fictional second note');
    await expect(edit.locator('.goal-details-saved')).toHaveText('');
  });
});

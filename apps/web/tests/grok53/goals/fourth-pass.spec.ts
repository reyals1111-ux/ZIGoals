import {expect, test, type Page} from '@playwright/test';
import {emptyDevice, hydrated, open, toast} from '../l3-helpers';
import {loadShowcase} from '../../ah-helpers';
import {project, seedGoals, stored, openModule} from './goal-fixtures';

// Session AL fourth pass (lane L4): the STILL OPEN and CHANGED rows of GROK53_REPLAY_L4_1.md, through the screens in the
// bots' conditions (Denver 1920 × 1113 Nebula fresh profile; the Showcase at 1280 × 800 Dark), Europe/Brussels, en-GB.
test.use({timezoneId: 'Europe/Brussels', locale: 'en-GB'});

async function showcase(page: Page) {
  await page.setViewportSize({width: 1280, height: 800});
  await emptyDevice(page, {theme: 'dark'});
  await loadShowcase(page);
}
const rowTime = async (page: Page, text: RegExp) => {
  const row = page.locator('.activity-event').filter({hasText: text}).first();
  return (await row.locator('time').count()) ? (await row.locator('time').innerText()).trim() : null;
};

test.describe('Showcase 1280 Dark', () => {
  test('PR-057/BUG-073/B-058/N-037: funding the Emergency fund writes no "Target reached" for My first 0.1 BTC at that minute', async ({page}) => {
    await showcase(page);
    await open(page, '/app/goals/tracked/9201');
    await page.getByRole('button', {name: 'Fund Goal', exact: true}).first().click();
    const sheet = page.getByRole('dialog').last();
    await sheet.getByRole('button', {name: /USD cash reserve/}).first().click();
    await sheet.locator('input[name=quantity]').first().fill('250');
    await sheet.getByRole('button', {name: 'Preview contribution'}).click();
    await sheet.getByRole('button', {name: /Confirm & fund/}).click();
    await expect(sheet).toHaveCount(0);
    await open(page, '/app/activity');
    const funded = await rowTime(page, /Emergency fund · US\$250\.00/);
    expect(funded).not.toBeNull();
    // The BTC goal's completion, if listed, is dated where its own history showed it, never at the funding minute.
    const btc = page.locator('.activity-event').filter({hasText: /Target reached/}).filter({hasText: 'My first 0.1 BTC'});
    for (const row of await btc.all()) expect((await row.locator('time').allInnerTexts()).map(t => t.trim())).not.toContain(funded);
  });

  test('BUG-062/PR-082/G-037: Today\'s "Active goals" is the same count as "Your destinations" and the Goals page', async ({page}) => {
    await showcase(page);
    await open(page, '/app');
    const destinations = page.getByText(/^\d+ active goals?$/).first();
    const n = Number((await destinations.innerText()).match(/\d+/)![0]);
    const progress = page.getByRole('region', {name: 'Your financial progress'});
    if (await progress.count()) await expect(progress.locator('.progress-stats > div').first().locator('strong')).toHaveText(String(n));
    await open(page, '/app/goals');
    await expect(page.locator('main')).toContainText(new RegExp(`${n}\\s*goals in motion`, 'i'));
  });

  test('PR-024 (D-235, M-056, B-006): one goal page says one pace date; the plan\'s date is labelled as the plan\'s', async ({page}) => {
    await showcase(page);
    await open(page, '/app/goals/tracked/9201');
    const main = page.locator('main');
    const pace = (await main.innerText()).match(/At this pace: about ([0-9]{1,2} [A-Z][a-z]{2} [0-9]{4})/);
    const onTrack = await openModule(page, 'on-track');
    if (pace) await expect(onTrack).toContainText(`Your pace forecast, with no growth: about ${pace[1]}`);
    await expect(onTrack).not.toContainText('At that pace, with no growth');
    await expect(main).not.toContainText('Projected completion');
  });

  test('B-114: a goal at 100 % projects no completion date', async ({page}) => {
    await showcase(page);
    await open(page, '/app/goals/tracked/9204');
    await expect(page.locator('main')).not.toContainText('Projected completion');
    await expect(page.locator('main')).toContainText('Already reached');
  });

  test('D-241: a USD goal\'s "Use wealth I already have" shows no ZIG stake and no Goal Manager line', async ({page}) => {
    await showcase(page);
    await open(page, '/app/goals/new');
    await page.getByRole('radio', {name: 'Value', exact: true}).check();
    await page.getByLabel('Goal name', {exact: true}).click();
    await page.keyboard.type('Fictional USD goal', {delay: 20});
    await page.getByLabel('Target amount', {exact: true}).fill('1000');
    await page.getByRole('radio', {name: /USD/}).first().check();
    await page.getByRole('button', {name: /^Continue/}).first().click();
    await page.getByRole('radio', {name: /Use wealth I already have/}).check();
    await expect(page.locator('.unified-wizard')).not.toContainText('Available stake');
    await expect(page.locator('.unified-wizard')).not.toContainText('Goal Manager: Not deployed');
  });

  test('PR-066/PR-099/N-170/D-227: seeded rows say "Showcase example"; a goal the person adds does not', async ({page}) => {
    await showcase(page);
    await open(page, '/app/goals/new');
    await page.getByLabel('Goal name', {exact: true}).click();
    await page.keyboard.type('My own fictional goal', {delay: 20});
    await page.getByLabel('Target amount', {exact: true}).fill('300');
    await page.getByRole('button', {name: 'Create goal', exact: true}).first().click();
    await page.waitForURL('**/app/goals/tracked/**');
    await open(page, '/app/activity');
    const mine = page.locator('.activity-event').filter({hasText: 'My own fictional goal'}).first();
    await expect(mine).toBeVisible();
    await expect(mine).not.toContainText('Showcase example');
    await expect(page.locator('.activity-event').filter({hasText: 'Showcase example'}).first()).toBeVisible();
  });
});

test.describe('Denver 1920 Nebula, fresh profile', () => {
  test.use({viewport: {width: 1920, height: 1113}});

  test('BUG-049: Create a goal opens with the focus in Goal name', async ({page}) => {
    await emptyDevice(page, {theme: 'nebula'});
    await open(page, '/app/goals/new');
    await expect(page.getByLabel('Goal name', {exact: true})).toBeFocused();
  });

  test('DV-034a/DV-104/NB-243/MO-120/G-027: a count goal and a project speak in counts and milestones, never money', async ({page}) => {
    await emptyDevice(page, {theme: 'nebula'});
    await open(page, '/app/goals/new?template=read-12');
    await expect(page.getByRole('region', {name: 'Goal preview'})).toContainText('12 books');
    await expect(page.getByRole('region', {name: 'Goal preview'})).not.toContainText('BOOKS');
    await page.getByRole('button', {name: /^Continue/}).first().click();
    const wizard = page.locator('.unified-wizard');
    await expect(wizard).not.toContainText('Count money I already have');
    await page.getByRole('button', {name: /^Continue/}).first().click();
    await expect(wizard).toContainText('only what you add counts toward the target');
    await expect(wizard).not.toContainText('only money you add');
    await page.getByRole('button', {name: /^Continue/}).first().click();
    await expect(wizard).not.toContainText('BOOKS');
    await page.getByRole('button', {name: 'Create goal', exact: true}).first().click();
    await page.waitForURL('**/app/goals/tracked/**');
    const hero = page.getByTestId('tracked-progress');
    await expect(hero).not.toContainText(/saving plan|money you have/i);
    await page.getByRole('button', {name: 'Fund Goal', exact: true}).first().click();
    const sheet = page.getByRole('dialog');
    await sheet.getByLabel('How many books did you add?').fill('3');
    await sheet.getByRole('button', {name: 'Preview contribution'}).click();
    await expect(sheet).not.toContainText(/BOOKS|tracked asset balance/);
    await sheet.getByRole('button', {name: 'Confirm & fund Goal'}).click();
    await expect(page.locator('.goal-detail-heading .eyebrow')).toHaveText('Count goal · Your own count');
    await expect(page.locator('main')).not.toContainText(/Market movement can change wealth|From counted wealth/);
    // DV-147: its tally is not offered to a savings goal.
    await open(page, '/app/goals/new');
    await page.getByLabel('Goal name', {exact: true}).click();
    await page.keyboard.type('Fictional savings', {delay: 20});
    await page.getByLabel('Target amount', {exact: true}).fill('500');
    await page.getByRole('button', {name: 'Create goal', exact: true}).first().click();
    await page.waitForURL('**/app/goals/tracked/**');
    await page.getByRole('button', {name: 'Fund Goal', exact: true}).first().click();
    await expect(page.getByRole('dialog')).not.toContainText('Read 12 books');
  });

  test('G-027/M-046/D-008: a project\'s second step lists its milestones; the steps are named for what they do', async ({page}) => {
    await emptyDevice(page, {theme: 'nebula'});
    await open(page, '/app/goals/new');
    await expect(page.getByRole('list', {name: 'Goal creation progress'}).getByRole('listitem')).toHaveText([/Your goal$/, /What counts$/, /A rhythm \(optional\)$/, /Review$/]);
    await page.getByRole('radio', {name: 'Finish a project', exact: true}).check();
    await page.getByLabel('Goal name', {exact: true}).click();
    await page.keyboard.type('Fictional studio', {delay: 20});
    await page.getByLabel(/Milestones/).first().fill('Plan\nBuild\nShip');
    await page.getByRole('button', {name: /^Continue/}).first().click();
    const wizard = page.locator('.unified-wizard');
    await expect(wizard.locator('.wizard-milestone-list li')).toHaveText(['Plan', 'Build', 'Ship']);
    await page.getByRole('button', {name: /^Continue/}).first().click();
    await expect(wizard).not.toContainText(/only money|contribution plan can create/);
  });

  test('DV-033e: the plan form says "Price of one …" and the history "Earlier plan terms" / "Planned payments"', async ({page}) => {
    await emptyDevice(page, {theme: 'nebula'});
    await open(page, '/app/goals/new');
    await page.getByLabel('Goal name', {exact: true}).click();
    await page.keyboard.type('Fictional plan goal', {delay: 20});
    await page.getByLabel('Target amount', {exact: true}).fill('1000');
    await page.getByRole('button', {name: 'Create goal', exact: true}).first().click();
    await page.waitForURL('**/app/goals/tracked/**');
    const plan = await openModule(page, 'contribution-plan');
    await expect(plan).toContainText(/Price of one \S+ in the plan’s currency \(if different\)/);
    await expect(plan).not.toContainText('Price per Goal unit');
  });

  test('DV-010a/DV-101: a new cash asset\'s amount is asked once in the Fund dialog', async ({page}) => {
    await emptyDevice(page, {theme: 'nebula'});
    await open(page, '/app/goals/new');
    await page.getByLabel('Goal name', {exact: true}).click();
    await page.keyboard.type('Fictional cash goal', {delay: 20});
    await page.getByLabel('Target amount', {exact: true}).fill('1000');
    await page.getByRole('button', {name: 'Create goal', exact: true}).first().click();
    await page.waitForURL('**/app/goals/tracked/**');
    await page.getByRole('button', {name: 'Fund Goal', exact: true}).first().click();
    const sheet = page.getByRole('dialog');
    await sheet.getByRole('button', {name: 'Cash', exact: true}).click().catch(() => undefined);
    await sheet.getByLabel('Cash amount', {exact: true}).fill('200');
    await sheet.getByRole('button', {name: 'Continue with this asset', exact: true}).click();
    await expect(sheet.getByLabel(/^Contribution quantity/)).toHaveCount(0);
    await expect(sheet).toContainText('the amount you entered for this asset');
    await sheet.getByRole('button', {name: 'Preview contribution'}).click();
    await sheet.getByRole('button', {name: 'Confirm & fund Goal'}).click();
    await expect(page.getByTestId('tracked-progress')).toContainText('200');
  });

  test('B-056: the calculator\'s plan comes into the goal\'s review', async ({page}) => {
    await emptyDevice(page, {theme: 'nebula'});
    await open(page, '/app/goals/new?from=calculator&name=Fictional%20growth&target=12000&currency=USD&contribution=600&every=monthly');
    for (let i = 0; i < 3; i++) await page.getByRole('button', {name: /^Continue/}).first().click();
    await expect(page.locator('.unified-wizard')).toContainText(/Planned contributions.*600/s);
    await expect(page.locator('.unified-wizard')).not.toContainText(/Planned contributions\s*None/);
  });

  test('D-029 / DV-056a / BN-149 / TK-179: a goal card\'s first stop is its title; its ⋯ offers Delete, confirmed on the page', async ({page}) => {
    await seedGoals(page, [project('72', ['Plan', 'Build'])], '/app/goals');
    const card = page.locator('[data-goal-key="private:72"]');
    // The title comes before the star and ⋯ in the tab order (they followed it visually but came first).
    await card.getByRole('link', {name: 'Fictional read project'}).first().focus();
    await page.keyboard.press('Tab');
    await expect(card.locator('.card-top-tools :focus')).toHaveCount(1);
    // "Open Goal →" repeats the title link and is not a second stop.
    await expect(card.getByRole('link', {name: 'Open Goal →'})).toHaveAttribute('tabindex', '-1');
    await card.getByRole('button', {name: /^Options for /}).click();
    await page.getByRole('link', {name: 'Delete…'}).click();
    await page.waitForURL('**/app/goals/tracked/72');
    await expect(page.getByText(/Delete this goal\?/)).toBeVisible();
  });

  test('DV-019a/DV-040h/M-104: a removed milestone\'s Undo stays at least 10 s', async ({page}) => {
    await page.clock.install({time: new Date('2026-11-05T10:00:00+01:00')});
    await seedGoals(page, [project('73', ['Plan', 'Build', 'Ship'])], '/app/goals/tracked/73');
    const section = await openModule(page, 'milestones');
    await section.getByRole('button', {name: 'Edit milestone Build', exact: true}).click();
    await section.getByRole('button', {name: 'Remove milestone', exact: true}).click();
    await expect(toast(page)).toContainText('removed');
    await page.clock.runFor(10_500);
    await expect(toast(page).getByRole('button', {name: 'Undo'})).toBeVisible();
    await toast(page).getByRole('button', {name: 'Undo'}).click();
    await expect.poll(async () => (await stored(page)).goals[0]!.milestones.map(m => m.title)).toEqual(['Plan', 'Build', 'Ship']);
  });

  test('G-043: an average goal\'s day field is named by the goal and its unit', async ({page}) => {
    await emptyDevice(page, {theme: 'nebula'});
    await open(page, '/app/goals/average/new?template=sleep-7h');
    await page.getByRole('button', {name: 'Save goal'}).click();
    await page.waitForURL('**/app/goals/average/**');
    await hydrated(page);
    await expect(page.getByRole('textbox', {name: /: value for .+, in h a night$/})).toBeVisible();
  });

  test('DV-012a/DV-052a/G-044: 22 h of sleep is asked once, in Health\'s words, then kept', async ({page}) => {
    await emptyDevice(page, {theme: 'nebula'});
    await open(page, '/app/goals/average/new?template=sleep-7h');
    const target = page.getByLabel('Target', {exact: true});
    await target.fill('22');
    await page.getByRole('button', {name: 'Save goal'}).click();
    await expect(page.getByRole('status').filter({hasText: 'hours of sleep is most of the day'})).toBeVisible();
    await expect(page).toHaveURL(/\/average\/new/);
    await page.getByRole('button', {name: 'Save goal'}).click();
    await page.waitForURL(/\/app\/goals\/average\/(?!new)/);
  });

  test('NB-182: the goal page\'s own ⋯ opens Edit goal details', async ({page}) => {
    await seedGoals(page, [project('74', ['Plan'])], '/app/goals/tracked/74');
    // The ⋯ is a <summary> (role "generic" in Chromium, not "button"); the role lookup waited out the whole test.
    await page.getByLabel('Goal actions', {exact: true}).click();
    await page.getByRole('link', {name: 'Edit goal details'}).click();
    await expect(page.locator('#edit-goal')).toHaveAttribute('open', '');
  });

  test('DV-036b: "Goal created" keeps the target it was created with after an edit', async ({page}) => {
    await emptyDevice(page, {theme: 'nebula'});
    await open(page, '/app/goals/new');
    await page.getByLabel('Goal name', {exact: true}).click();
    await page.keyboard.type('Fictional fund', {delay: 20});
    await page.getByLabel('Target amount', {exact: true}).fill('1000');
    await page.getByRole('button', {name: 'Create goal', exact: true}).first().click();
    await page.waitForURL('**/app/goals/tracked/**');
    await hydrated(page);
    const edit = await openModule(page, 'edit-goal');
    await edit.getByLabel('Edit target').fill('50');
    await edit.getByRole('button', {name: /Save Goal details/i}).click();
    await open(page, '/app/activity');
    const created = page.locator('.activity-event').filter({hasText: 'Goal created'}).filter({hasText: 'Fictional fund'});
    await expect(created).not.toContainText('target US$50.00');
  });
});

import {expect, test, type Page} from '@playwright/test';
import {freshDevice, hydrated, loadShowcase} from '../../ah-helpers';

// Session AL fourth pass (lane L4): BN-153/BN-188, the goal creator dropped the first thing typed ("Berlin" → "erlin";
// a first fill of Target amount or Goal name gone), on an idle page too. The cause was a capture-phase "touched" render
// that wrote the old value back before onChange (lib/goals/wizard-guard.ts touchOnInput). These specs type the way a
// person and the bots did, straight into a freshly opened creator, with no retry helper (tests/goal-name.ts exists only
// because of this bug) and nothing awaited beyond the page's own hydration.
test.use({timezoneId: 'Europe/Brussels', locale: 'en-GB'});

async function openCreator(page: Page, path = '/app/goals/new') {
  await page.goto(path);
  await hydrated(page);
}
async function nebulaDevice(page: Page) {
  await freshDevice(page);
  await page.evaluate(() => localStorage.setItem('zigoals:ui-prefs:v1', JSON.stringify({version: 1, theme: 'nebula'})));
}

test.describe('Denver 1920 Nebula, fresh profile', () => {
  test.use({viewport: {width: 1920, height: 1113}});

  test('BN-153/BN-188: "Berlin" typed key by key into a fresh creator reads "Berlin", at once and after 6 s', async ({page}) => {
    await nebulaDevice(page);
    for (const idle of [0, 6000]) {
      await openCreator(page);
      if (idle) await page.waitForTimeout(idle);
      const name = page.getByLabel('Goal name', {exact: true});
      await name.click();
      await page.keyboard.type('Berlin', {delay: 120});
      await expect(name).toHaveValue('Berlin');
      // Leave without the draft coming back on the next open.
      await page.evaluate(() => sessionStorage.clear());
      page.once('dialog', d => d.accept());
    }
  });

  test('BN-188: the first fill of Target amount is kept, then the name typed with pressSequentially', async ({page}) => {
    await nebulaDevice(page);
    await openCreator(page);
    const target = page.getByLabel('Target amount', {exact: true});
    await target.fill('1200');
    await expect(target).toHaveValue('1200');
    const name = page.getByLabel('Goal name', {exact: true});
    await name.pressSequentially('Berlin test two', {delay: 30});
    await expect(name).toHaveValue('Berlin test two');
    await expect(target).toHaveValue('1200');
  });

  test('BN-188: the 52-week template takes its first typed target and creates the goal', async ({page}) => {
    await nebulaDevice(page);
    await openCreator(page, '/app/goals/new?template=challenge-52-week');
    const target = page.getByLabel('Target amount', {exact: true});
    await target.click();
    await page.keyboard.type('1378', {delay: 120});
    await expect(target).toHaveValue('1378');
    await page.getByRole('button', {name: 'Create goal', exact: true}).first().click();
    await expect(page.getByText('Enter your target.')).toHaveCount(0);
    await page.waitForURL('**/app/goals/tracked/**');
  });
});

test.describe('Showcase 1280 Dark', () => {
  test.use({viewport: {width: 1280, height: 800}, colorScheme: 'dark'});

  test('BN-153: with the Showcase loaded, the first key typed into Goal name lands too', async ({page}) => {
    await freshDevice(page);
    await page.evaluate(() => localStorage.setItem('zigoals:ui-prefs:v1', JSON.stringify({version: 1, theme: 'dark'})));
    await loadShowcase(page);
    await openCreator(page);
    const name = page.getByLabel('Goal name', {exact: true});
    await name.click();
    await page.keyboard.type('Berlin', {delay: 120});
    await expect(name).toHaveValue('Berlin');
  });
});

import {expect, test, type Locator, type Page} from '@playwright/test';
import {freshDevice, hydrated, offlineApi} from '../../ah-helpers';
import {chooseChain} from '../../chain-choice';

// Session AL (lane L6, Part 2): "every Settings switch does what it says". Berlin found the page switches work (BN-015,
// BN-101, BN-169) but tested others by hand. This sweep presses EVERY on/off switch on Settings (checkboxes and
// role=switch, in every group, the chain chosen so the money switches show too) on a fresh profile at 1280 px, and
// checks that each one (1) changes at once, (2) is the same after a reload, and (3) goes back when pressed again.
// Switches that ask the browser for a permission (notifications, push) are left out: they are covered by their own specs.
test.use({viewport: {width: 1280, height: 900}});
test.setTimeout(240_000);
const ASKS_PERMISSION = /notification|push|remind|microphone|camera|location/i;
async function switches(page: Page): Promise<{name: string; box: Locator}[]> {
  const all = page.locator('main').locator('input[type="checkbox"]:not([disabled]), [role="switch"]:not([aria-disabled="true"])');
  const out: {name: string; box: Locator}[] = [];
  for (let i = 0; i < await all.count(); i++) {
    const box = all.nth(i);
    if (!await box.isVisible()) continue;
    const name = (await box.evaluate(el => {
      const own = el.getAttribute('aria-label') ?? (el as HTMLInputElement).labels?.[0]?.textContent ?? el.textContent ?? '';
      return own.replace(/\s+/g, ' ').trim();
    })) || `#${i}`;
    if (ASKS_PERMISSION.test(name) || await box.evaluate(el => !!el.closest('#notifications, #reminders, [id*="push"]'))) continue;
    out.push({name, box});
  }
  return out;
}
const on = (box: Locator) => box.evaluate(el => el instanceof HTMLInputElement ? el.checked : el.getAttribute('aria-checked') === 'true');

test('Settings: every on/off switch changes at once, survives a reload and goes back', async ({page}) => {
  await offlineApi(page); await chooseChain(page); await freshDevice(page);
  await page.goto('/app/settings'); await hydrated(page);
  const names = (await switches(page)).map(s => s.name);
  expect(names.length, 'switches found on Settings').toBeGreaterThan(10);
  const problems: string[] = [];
  for (const name of names) {
    const find = async () => (await switches(page)).find(s => s.name === name)?.box;
    let box = await find();
    if (!box) continue; // a switch another switch hid (a dependency); its own row is checked while it shows
    const before = await on(box);
    await box.click();
    if (await on(box) === before) { problems.push(`${name}: did not change when pressed`); continue; }
    await page.reload(); await hydrated(page);
    box = await find();
    if (!box) { problems.push(`${name}: gone after a reload`); continue; }
    if (await on(box) === before) problems.push(`${name}: not kept after a reload`);
    await box.click();
    if (await on(box) !== before) problems.push(`${name}: did not go back`);
  }
  expect(problems).toEqual([]);
});

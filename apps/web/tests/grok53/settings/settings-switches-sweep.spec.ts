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
// Not settings: a choice made for one action and, by design, never saved (consent asked again each time). Run 2 found
// the encrypted download's Health consent (components/private-vault-tools.tsx) and the readable export's acknowledgement
// (components/export-everything.tsx) "not kept after a reload", as intended: each is asked again for each download.
const ONE_ACTION = /^Include my Health records in this encrypted download|^I understand this file is readable|^Add details about this device to the email/;
/**
 * Session AL (P14-A, run 2 fix-up): the sweep timed out at 240 s on both projects. Each lookup re-read every switch with
 * three round trips per switch (O(n²) over ~50 switches, plus a reload each). Now one page-side pass names and tags the
 * visible switches (same rules: enabled, a non-empty box, not hidden, the permission ones left out; the first switch of a
 * name), and the sweep runs in three parts, each with its own time budget. Every switch is still pressed, reloaded and
 * pressed back, with the same three checks.
 */
async function scan(page: Page): Promise<string[]> {
  return page.evaluate(([source, oneAction]) => {
    const asks = new RegExp(source, 'i'), one = new RegExp(oneAction), seen = new Set<string>(), names: string[] = [];
    // Tags from an earlier scan go first: a switch disabled since (a dependency) must not keep one.
    for (const old of document.querySelectorAll('[data-sweep]')) old.removeAttribute('data-sweep');
    const all = [...document.querySelectorAll<HTMLElement>('main input[type="checkbox"]:not([disabled]), main [role="switch"]:not([aria-disabled="true"])')];
    all.forEach((el, i) => {
      const box = el.getBoundingClientRect();
      if (!box.width || !box.height || getComputedStyle(el).visibility === 'hidden') return;
      const own = el.getAttribute('aria-label') ?? (el as HTMLInputElement).labels?.[0]?.textContent ?? el.textContent ?? '';
      const name = own.replace(/\s+/g, ' ').trim() || `#${i}`;
      if (asks.test(name) || one.test(name) || el.closest('#notifications, #reminders, [id*="push"]') || seen.has(name)) return;
      seen.add(name); names.push(name); el.setAttribute('data-sweep', name);
    });
    return names;
  }, [ASKS_PERMISSION.source, ONE_ACTION.source] as const);
}
const tagged = (page: Page, name: string) => page.locator(`[data-sweep="${name.replace(/["\\]/g, '\\$&')}"]`);
const on = (box: Locator) => box.evaluate(el => el instanceof HTMLInputElement ? el.checked : el.getAttribute('aria-checked') === 'true');
const PARTS = 3;

for (let part = 0; part < PARTS; part++) test(`Settings: every on/off switch changes at once, survives a reload and goes back (part ${part + 1} of ${PARTS})`, async ({page}) => {
  await offlineApi(page); await chooseChain(page); await freshDevice(page);
  await page.goto('/app/settings'); await hydrated(page);
  const all = await scan(page);
  expect(all.length, 'switches found on Settings').toBeGreaterThan(10);
  const names = all.filter((_, i) => i % PARTS === part);
  const problems: string[] = [];
  for (const name of names) {
    await scan(page);
    let box = tagged(page, name);
    // A switch another switch hid or disabled (a dependency, e.g. "tucked into the edge" needs the Earn dock on): its own
    // row is checked while it can be used. Run 2: a disabled one was clicked and the click waited out the test.
    if (!await box.count() || !await box.isEnabled()) continue;
    const before = await on(box);
    await box.click();
    // A controlled switch shows the saved choice once it is saved: "at once" is within two seconds.
    const changed = await expect.poll(() => on(box), {timeout: 2_000}).not.toBe(before).then(() => true, () => false);
    if (!changed) { problems.push(`${name}: did not change when pressed`); continue; }
    await page.reload();
    try { await hydrated(page); } catch { problems.push(`${name}: Settings did not finish loading after a reload`); await page.goto('/app/settings'); await hydrated(page); }
    await scan(page);
    box = tagged(page, name);
    if (!await box.count() || !await box.isEnabled()) { problems.push(`${name}: gone or unusable after a reload`); continue; }
    if (await on(box) === before) problems.push(`${name}: not kept after a reload`);
    await box.click();
    const back = await expect.poll(() => on(box), {timeout: 2_000}).toBe(before).then(() => true, () => false);
    if (!back) problems.push(`${name}: did not go back`);
  }
  expect(problems).toEqual([]);
});

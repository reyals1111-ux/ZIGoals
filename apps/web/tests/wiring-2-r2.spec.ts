import {expect, test, type Page} from '@playwright/test';
import {freshDevice, hydrated, loadShowcase, offlineApi} from './ah-helpers';
import {HABITS_KEY} from '../lib/habits';

/**
 * Session AK, lane WB (WIRING_AUDIT_2.md): the RELEASE_REVIEW_2 fixes the audit found with no test, pinned on the UI path.
 * - R2-1 (Blocker): on a phone, a question in NOVA's chat sheet is answered from the records, never "Paused on this
 *   private screen" (the sheet is ZIGi's own dialog, components/nova/nova-sheet.tsx `data-ai-dialog`).
 * - R2-15: unknown is not zero — fresh Health shows "—" / "No entry" (not "0 kcal", "Protein 0 g") until the first entry,
 *   and Habits hides the weekday strip until there is a habit.
 * - R2-18: Notes' one-line intro (Journal vs a note), one primary Save, and the photo and voice as named icon buttons.
 * - R2-19: Health's header offers Log weight, Log water and Log food (no settings link); Log weight lands in the field.
 * - R2-21: each Showcase habit carries its own "why", never the old filler line.
 * - R2-25: Habits' empty card offers three one-tap ideas; one tap adds the habit.
 * The app's /api routes answer 503. Fictional data only (the Showcase, or a fresh device).
 */
const OLD_FILLER = 'A small daily step toward tomorrow.';
const dash = (scope: ReturnType<Page['locator']>) => expect(scope).toContainText('No entry');

test('R2-1: on a phone, a NOVA question in the chat sheet is answered from the records, not paused', async ({page}) => {
  await page.setViewportSize({width: 390, height: 844});
  await page.emulateMedia({reducedMotion: 'reduce'});
  await offlineApi(page);
  await loadShowcase(page);
  await page.goto('/app/nova');
  await hydrated(page);
  await page.getByRole('textbox', {name: 'Message NOVA'}).fill('How far am I on my Emergency fund goal?');
  await page.getByRole('button', {name: 'Send to NOVA'}).click();
  const sheet = page.getByRole('dialog', {name: 'NOVA'});
  await expect(sheet).toBeVisible();
  const reply = sheet.locator('.nova-turn-assistant').last();
  await expect(reply).toContainText(/\d+% of the target/, {timeout: 20_000});
  await expect(reply.locator('.ai-turn-source')).toContainText('On-device answers · no AI used');
  await expect(sheet).not.toContainText('Paused on this private screen');
});

test.describe('pinned release-review fixes', () => {
  test.skip(({isMobile}) => isMobile, 'the copy and controls are the same on a phone; R2-1 above is the phone check');
  test.beforeEach(async ({page}) => { await offlineApi(page); });

  test('R2-15: fresh Health shows a dash and "No entry", never 0 kcal; the Showcase with entries shows its numbers', async ({page}) => {
    await freshDevice(page);
    await page.goto('/app/health');
    await hydrated(page);
    const gauge = page.locator('.health-gauge');
    await expect(gauge).toContainText('—');
    await expect(gauge).toContainText('no entries yet');
    await dash(gauge);
    await expect(gauge).not.toContainText('kcal logged');
    for (const macro of await page.locator('.health-macro').all()) await dash(macro);
    await expect(page.locator('.health-macro').first()).toBeVisible();
    await expect(page.locator('main')).not.toContainText(/\b0 kcal\b|Protein\s*0 g/);
    await dash(page.locator('section[aria-label="Breakfast diary"] .health-section-heading'));
    // With the day's entries (the Showcase), the numbers show and the dash goes.
    await loadShowcase(page);
    await page.goto('/app/health');
    await hydrated(page);
    await expect(page.locator('.health-gauge')).toContainText(/kcal/);
    await expect(page.locator('.health-gauge')).not.toContainText('no entries yet');
  });

  test('R2-15 + R2-25: fresh Habits has no weekday strip and offers three one-tap ideas; one tap adds the habit and the strip appears', async ({page}) => {
    await freshDevice(page);
    await page.goto('/app/habits');
    await hydrated(page);
    const ideas = page.getByRole('group', {name: 'Start with an idea'});
    await expect(ideas.getByRole('button')).toHaveCount(3);
    await expect(ideas.getByRole('button', {name: 'Add Drink water: 2 liters a day'})).toContainText('+ Drink water');
    await expect(ideas.getByRole('button', {name: 'Add Walk: 8,000 steps a day'})).toContainText('+ Walk');
    await expect(ideas.getByRole('button', {name: 'Add Read: 30 minutes a day'})).toContainText('+ Read');
    for (const button of await ideas.getByRole('button').all()) expect((await button.boundingBox())!.height).toBeGreaterThanOrEqual(44);
    await expect(page.locator('#bottom-habit-rhythm')).toHaveCount(0);
    expect(await page.evaluate(k => localStorage.getItem(k), HABITS_KEY)).toBeNull();
    await ideas.getByRole('button', {name: /^Add Drink water/}).click();
    await expect(page.getByText('Drink water added. Change anything about it from its card.')).toBeVisible();
    await expect.poll(async () => (JSON.parse(await page.evaluate(k => localStorage.getItem(k), HABITS_KEY) ?? '{"habits":[]}') as {habits: {title: string}[]}).habits.map(h => h.title)).toEqual(['Drink water']);
    await expect(ideas).toHaveCount(0);
    await expect(page.locator('#bottom-habit-rhythm')).toBeAttached();
  });

  test('R2-18: Notes says Journal vs a note in one line; one Save; the photo and voice are named icon buttons', async ({page}) => {
    await freshDevice(page);
    await page.goto('/app/notes');
    await hydrated(page);
    await expect(page.locator('.page-heading')).toContainText('Journal is how the day felt; a note is anything you want to keep.');
    await expect(page.locator('.page-heading')).not.toContainText('[[');
    const capture = page.locator('.note-capture-actions').first();
    await expect(capture.getByRole('button', {name: 'Save to inbox', exact: true})).toBeVisible();
    for (const name of ['Add a photo', 'Speak a note']) {
      const button = capture.getByRole('button', {name, exact: true});
      await expect(button).toBeVisible();
      await expect(button).toHaveClass(/note-icon-button/);
      expect((await button.innerText()).trim(), `${name} shows an icon, its name is for assistive technology`).toBe('');
      const box = (await button.boundingBox())!;
      expect(Math.min(box.width, box.height)).toBeGreaterThanOrEqual(44);
    }
  });

  test('R2-19: Health\'s header logs weight, water and food (no settings link); Log weight puts the focus in the weight field', async ({page}) => {
    await freshDevice(page);
    await page.goto('/app/health');
    await hydrated(page);
    const header = page.locator('.health-heading');
    await expect(header.getByRole('button', {name: 'Log weight', exact: true})).toBeVisible();
    await expect(header.getByRole('button', {name: 'Log water', exact: true})).toBeVisible();
    await expect(header.getByRole('button', {name: 'Log food', exact: true})).toBeVisible();
    await expect(header.getByRole('link', {name: /Privacy/})).toHaveCount(0);
    await header.getByRole('button', {name: 'Log weight', exact: true}).click();
    const entry = page.locator('#health-weight-entry');
    await expect(entry).toBeInViewport();
    await expect.poll(() => page.evaluate(() => !!document.activeElement?.closest('#health-weight-entry') && ['INPUT', 'SELECT'].includes(document.activeElement.tagName))).toBe(true);
    await header.getByRole('button', {name: 'Log water', exact: true}).click();
    await expect(page.locator('#water')).toBeInViewport();
    await header.getByRole('button', {name: 'Log food', exact: true}).click();
    await expect(page.locator('#health-entry-action')).toBeInViewport();
  });

  test('R2-21: each Showcase habit has its own why, never the old filler line', async ({page}) => {
    await loadShowcase(page);
    await page.goto('/app/habits');
    await hydrated(page);
    for (const why of ['One chapter at a time.', 'Strength and energy for the years ahead.', 'Fresh air and a clearer head.', 'Ten calm minutes before the day starts.', 'A little set aside for what matters.', 'Steady energy through the day.']) await expect(page.getByText(why, {exact: true}).first()).toBeVisible();
    await expect(page.getByText(OLD_FILLER)).toHaveCount(0);
  });
});

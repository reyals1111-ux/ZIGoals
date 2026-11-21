import {expect, test} from '@playwright/test';
import {card, device, notes, reminder} from './av-keep-helpers';

/**
 * Session AV Part 3 (ADR-045 D-KEEP): no lost data on a friend's device. On a computer: one gentle offer of a copy after
 * real new data (never on view alone, at most every two weeks, a one-tap export, an off switch), and the one automatic
 * request to keep this site's data after the person's own save (never on view). The iPhone cards: webkit-av-keep.spec.ts.
 */
test.skip(({isMobile}) => isMobile, 'a computer: the phone project is an iPhone, whose own cards are in webkit-av-keep.spec.ts');

test('after 30 new records Today offers a copy below the hero: Not now quiets it, and viewing writes nothing', async ({page}) => {
  await device(page, {'zigoals:notes:v1': notes(30)});
  await page.goto('/app');
  const offer = card(page);
  await expect(offer.getByRole('heading', {name: 'Keep a copy of what you’ve added'})).toBeVisible();
  // Below the hero, never on it.
  const hero = await page.locator('.today-hero').first().boundingBox(), box = await offer.boundingBox();
  expect(box!.y).toBeGreaterThanOrEqual(hero!.y + hero!.height - 1);
  await expect(offer).toContainText('one readable file made on this device');
  expect(await reminder(page)).toBeNull(); // shown, never written
  await offer.getByRole('button', {name: 'Not now', exact: true}).click();
  await expect(offer).toHaveCount(0);
  expect((await reminder(page))?.remindedOn).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  await page.reload();
  await expect(page.locator('main h1').first()).toBeVisible();
  await expect(card(page)).toHaveCount(0);
});

test('one notice at a time: while Today shows "What\'s new" the copy waits', async ({page}) => {
  await device(page, {'zigoals:notes:v1': notes(30)}, {whatsNew: true});
  await page.goto('/app');
  await expect(page.locator('main h1').first()).toBeVisible();
  await page.waitForTimeout(1500);
  await expect(card(page)).toHaveCount(0);
});

test('"Export a backup" makes the whole readable file in one tap and marks the copy; "Turn these reminders off" ends them', async ({page}) => {
  await device(page, {'zigoals:notes:v1': notes(30)});
  await page.goto('/app');
  const offer = card(page);
  const [download] = await Promise.all([page.waitForEvent('download'), offer.getByRole('button', {name: 'Export a backup', exact: true}).click()]);
  expect(download.suggestedFilename()).toMatch(/\.zip$/);
  await expect(offer.getByRole('status')).toContainText('Your backup is downloading. Keep it private');
  await expect(offer.getByRole('status')).toContainText('Settings → Your data → Restore from a backup');
  const marked = await reminder(page);
  expect(marked?.savedOn).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  expect(marked?.countAt).toBeGreaterThanOrEqual(30);
  // Another device's turn: the reminders off.
  await page.evaluate(() => localStorage.removeItem('zigoals:backup-reminder:v1'));
  await page.reload();
  await card(page).getByRole('button', {name: 'Turn these reminders off', exact: true}).click();
  await expect(card(page)).toHaveCount(0);
  expect((await reminder(page))?.off).toBe(true);
});

test('fewer than 25 records: no offer; the request to keep this site\'s data comes after the person\'s save, never on view', async ({page}) => {
  await device(page, {'zigoals:notes:v1': notes(3)});
  for (const path of ['/app', '/app/notes', '/app/habits']) { await page.goto(path); await expect(page.locator('main h1').first()).toBeVisible(); }
  await expect(card(page)).toHaveCount(0);
  await page.waitForTimeout(1500);
  expect(await reminder(page)).toBeNull();
  // The person saves a task (a record of their own): the browser is asked once, the answer kept.
  await page.goto('/app/tasks');
  const add = page.getByRole('form', {name: 'Add a task'}).getByRole('textbox').first();
  await add.fill('Fictional task to keep');
  await add.press('Enter');
  await expect.poll(async () => (await reminder(page))?.persistAskedOn, {timeout: 10_000}).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  expect(['kept', 'not-kept', 'unsupported', 'error']).toContain((await reminder(page))?.persistResult);
});

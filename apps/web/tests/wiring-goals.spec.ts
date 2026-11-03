import {readFile} from 'node:fs/promises';
import {expect, test, type Page} from '@playwright/test';
import {hydrated, offlineApis, seedRecords, stored} from './journeys/journey-helpers';
import {loadShowcase} from './wiring-helpers';

/**
 * Session AK Q1 (WIRING_AUDIT 6.1, 6.3, 6.4): goals that worked in the build but had no browser test on the UI path: a
 * goal bundle typed into Quick add (every part checked, only the ticked ones created, the money plan unticked), a goal's
 * progress shared as an image made on the device (title and percent by default, amounts only when ticked), and the
 * suggested milestones with a habit linked to one. Fictional data; every /api route answers 503.
 */
test.use({timezoneId: 'UTC'});
test.beforeEach(({page: _page}, info) => { void _page; test.skip(info.project.name !== 'desktop', 'these wiring specs run once, on the desktop project'); });
type Habits = {habits: {id: string; title: string}[]};

test('6.1: "save €5,000 for a trip by June and walk 8k steps most days" in Quick add → each part checked; the habit and its rule are made, the goal form opens filled in', async ({page}) => {
  await page.clock.install({time: new Date('2026-11-04T09:00:00.000Z')});
  await offlineApis(page);
  await seedRecords(page, {});
  await page.goto('/app'); await hydrated(page);
  await page.getByRole('button', {name: '+ Quick add', exact: true}).first().click();
  const line = page.getByRole('form', {name: 'Type a line'}).filter({visible: true});
  await line.getByLabel('Type a line').fill('save €5,000 for a trip by June and walk 8k steps most days');
  await line.getByRole('button', {name: 'Preview'}).click();
  const review = page.getByRole('region', {name: 'Check each part'});
  await expect(review).toBeVisible({timeout: 15_000});
  const parts = review.getByRole('listitem');
  await expect(parts.filter({hasText: /^Goal: .*trip/i})).toBeVisible();
  await expect(review.getByLabel(/^Target \(EUR\)/)).toHaveValue('5000');
  await expect(parts.filter({hasText: /^Habit: .*8,000 steps/i})).toBeVisible();
  // The money plan is a suggestion that starts unticked: nothing is planned unless the person ticks it.
  await expect(parts.filter({hasText: /^Suggested: .* a month for \d+ months?/}).getByRole('checkbox')).not.toBeChecked();
  await review.getByRole('button', {name: 'Create 2 parts'}).click();
  await page.waitForURL('**/app/goals/new');
  await hydrated(page);
  const habits = (await stored<Habits>(page, 'zigoals:habits:v1'))!.habits;
  expect(habits.map(h => h.title)).toEqual([expect.stringMatching(/8,000 steps/i)]);
  expect(JSON.stringify(await stored(page, 'zigoals:auto-rules:v1'))).toContain(habits[0]!.id);
  await expect.poll(() => page.locator('main input').evaluateAll(els => els.map(e => (e as HTMLInputElement).value))).toContainEqual(expect.stringMatching(/trip/i));
  // Nothing is saved as a goal until the person creates it in the form.
  expect(await stored(page, 'zigoals:platform:v1').then(p => JSON.stringify(p ?? {}))).not.toMatch(/trip/i);
});

/** The Showcase's tracked goals, by their links on Goals. */
async function goalLinks(page: Page) {
  await page.goto('/app/goals'); await hydrated(page);
  await expect(page.locator('main a[href^="/app/goals/tracked/"]').first()).toBeVisible();
  return [...new Set(await page.locator('main a[href^="/app/goals/tracked/"]').evaluateAll(as => as.map(a => a.getAttribute('href')!)))].filter(h => /^\/app\/goals\/tracked\/[^/]+$/.test(h));
}

test.describe('on the Showcase', () => {
  test.beforeEach(async ({page}) => { await offlineApis(page); await loadShowcase(page); });

  test('6.3: a goal\'s progress card shows the title and percent only; amounts by choice; the image is made on the device and saved', async ({page}) => {
    // No share sheet in this browser, so the image is saved as a download (as on a desktop without one).
    await page.addInitScript(() => { Object.defineProperty(Navigator.prototype, 'canShare', {configurable: true, value: undefined}); Object.defineProperty(Navigator.prototype, 'share', {configurable: true, value: undefined}); });
    const [first] = await goalLinks(page);
    await page.goto(first!); await hydrated(page);
    await page.getByRole('button', {name: 'Share progress'}).click();
    const card = page.getByRole('region', {name: 'Share your progress'});
    const preview = card.getByRole('figure', {name: 'What the image shows'});
    await expect(preview).toContainText(/(\d{1,3}% of the way|Reached · 100%|Progress not recorded yet)/);
    const before = await preview.locator('.progress-card-line').count();
    expect(before).toBe(1); // title and how far along, nothing else by default
    const amounts = card.getByLabel('Amounts');
    if (await amounts.isEnabled()) {
      await amounts.check();
      await expect(preview.locator('.progress-card-line')).toHaveCount(2);
      await expect(preview.locator('.progress-card-line').nth(1)).toContainText(/ of /);
    }
    const saving = page.waitForEvent('download');
    await card.getByRole('button', {name: 'Save or share image'}).click();
    const file = await saving;
    expect(file.suggestedFilename()).toMatch(/-progress\.png$/);
    const bytes = await readFile((await file.path())!);
    expect(bytes.subarray(1, 4).toString('latin1')).toBe('PNG');
    expect(bytes.length).toBeGreaterThan(5_000);
    await expect(card.getByRole('status')).toHaveText('Image saved to your downloads.');
  });

  test('6.4: suggested milestones are added to a goal (one left out by choice), and a habit is linked to one of them', async ({page}) => {
    test.setTimeout(90_000);
    let found = false;
    for (const href of await goalLinks(page)) {
      await page.goto(href); await hydrated(page);
      // The milestones sit in the goal's "Milestones · Manage" module.
      await page.locator('details.goal-management-module > summary').filter({hasText: /^Milestones/}).click();
      const suggest = page.locator('section.milestone-suggest');
      if (!await suggest.waitFor({timeout: 6_000}).then(() => true, () => false)) continue;
      found = true;
      await expect(suggest.getByRole('heading', {name: /^Suggested milestones · /})).toBeVisible();
      const boxes = suggest.getByRole('checkbox');
      const total = await boxes.count();
      expect(total).toBeGreaterThan(1);
      const leftOut = (await suggest.getByRole('listitem').last().textContent())!.split(' · ')[0]!.trim();
      await boxes.last().uncheck();
      await suggest.getByRole('button', {name: `Add ${total - 1} ${total - 1 === 1 ? 'milestone' : 'milestones'}`}).click();
      await expect(page.getByText(`${total - 1} ${total - 1 === 1 ? 'milestone' : 'milestones'} added. Edit or remove any of them above.`)).toBeVisible();
      await expect(page.locator('section.milestone-suggest')).toHaveCount(0);
      const links = page.locator('section.milestone-habits');
      const rows = links.locator('.milestone-habits-list > li');
      await expect(rows).toHaveCount(total - 1);
      await expect(links).not.toContainText(leftOut);
      const first = rows.first(), milestone = (await first.locator('strong').first().textContent())!;
      const select = first.getByRole('combobox', {name: `Habit for “${milestone}”`});
      const habit = (await select.locator('option').nth(1).textContent())!;
      await select.selectOption({label: habit});
      await first.getByRole('button', {name: 'Link'}).click();
      await expect(page.getByText(`${habit} now works toward “${milestone}”.`)).toBeVisible();
      await expect(first.getByRole('button', {name: `Unlink ${habit} from ${milestone}`})).toBeVisible();
      await page.reload(); await hydrated(page);
      await page.locator('details.goal-management-module > summary').filter({hasText: /^Milestones/}).click();
      await expect(page.locator('section.milestone-habits .milestone-habits-list > li').first().getByRole('button', {name: `Unlink ${habit} from ${milestone}`})).toBeVisible();
      break;
    }
    expect(found, 'a Showcase goal without milestones offers a suggested set').toBe(true);
  });
});

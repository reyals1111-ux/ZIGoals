import {readFile} from 'node:fs/promises';
import {expect, test, type Page} from '@playwright/test';
import {HABITBULL_HEADER, habitsToHabitBullCsv} from '../lib/export/bridges/loop';
import type {HabitData} from '../lib/habits';
import {JOURNAL_KEY} from '../lib/journal/schema';
import {browserToday, hydrated, offlineApis, seedRecords, stored} from './journeys/journey-helpers';
import {loadShowcase, showcaseRecord} from './wiring-helpers';

/**
 * Session AK Q1 (WIRING_AUDIT 8.2, 8.3, 8.4, 8.8/#16/A16, #14, #19, F5, 1d/#6/#13 discoverability): the review, export and
 * journal features that worked in the build but had no browser test on the UI path: the Daily orbit card, ZIGi's note on
 * the week and the month's balance note, the rewards shelf, the report for a visit, the file for Loop (its contents
 * checked against the habits themselves), the agenda's .ics file, "On this day", and Search finding the Journal and Music
 * pages. Fictional data; every /api route answers 503.
 */
test.use({timezoneId: 'UTC'});
test.beforeEach(({page: _page}, info) => { void _page; test.skip(info.project.name !== 'desktop', 'these wiring specs run once, on the desktop project'); });

async function newHabitDoneToday(page: Page, title: string) {
  await page.goto('/app/habits'); await hydrated(page);
  await page.getByRole('button', {name: /^(\+ New habit|Create a habit)$/}).first().click();
  await page.getByLabel('Habit title', {exact: true}).fill(title);
  await page.getByRole('button', {name: 'Create habit', exact: true}).click();
  await page.getByRole('article', {name: title, exact: true}).getByRole('button', {name: `Complete ${title}`}).click();
  await expect(page.getByRole('article', {name: title, exact: true}).getByRole('button', {name: `Complete ${title}`})).toHaveCount(0);
}

test('8.3 and 8.4: ZIGi\'s note on the week and the month\'s balance note start quiet and count a habit check-in made today', async ({page}) => {
  await offlineApis(page);
  await seedRecords(page, {});
  await page.goto('/app/review'); await hydrated(page);
  const week = page.getByRole('group', {name: 'ZIGi’s note on your week'});
  await expect(week).toContainText('A quiet week in your records.');
  await newHabitDoneToday(page, 'Fictional reading');
  await page.goto('/app/review'); await hydrated(page);
  await expect(week).toContainText('This week: 1 habit check-in.');
  await expect(week).toContainText('It counts what happened together; it never says why. Not advice.');
  await page.getByRole('group', {name: 'Review period'}).getByRole('button', {name: 'This month'}).click();
  const balance = page.getByRole('group', {name: /^A note on your balance · /});
  await expect(balance).toContainText(/This month your records gathered in .+ \(1 record\)\./);
  await expect(balance).not.toContainText('Your wheel is still empty this month.');
});

test('F5 "On this day": last year\'s entry shows at the top of the Journal; "Not this one" sets it aside for good', async ({page}) => {
  await offlineApis(page);
  await seedRecords(page, {});
  const today = await browserToday(page);
  const lastYear = `${Number(today.slice(0, 4)) - 1}${today.slice(4)}`;
  await seedRecords(page, {[JOURNAL_KEY]: {version: 1, shareWithAi: false, followUps: true, entries: [
    {id: 'entry-1', date: lastYear, text: 'A fictional walk by the sea with an old friend.', createdAt: `${lastYear}T20:00:00.000Z`},
    {id: 'entry-2', date: '2020-02-03', text: 'A fictional ordinary day.', createdAt: '2020-02-03T20:00:00.000Z'},
  ]}});
  await page.goto('/app/journal'); await hydrated(page);
  const memory = page.locator('details.on-this-day');
  await expect(memory.locator('summary')).toContainText('On this day');
  await expect(memory.getByRole('listitem')).toHaveCount(1);
  await expect(memory.getByRole('listitem')).toContainText('A fictional walk by the sea with an old friend.');
  await memory.getByRole('button', {name: 'Not this one'}).click();
  await expect(page.getByText('Set aside: it will not show here again. The entry stays in your journal.')).toBeVisible();
  expect(await stored(page, 'zigoals:journal-display:v1')).toMatchObject({hidden: ['entry-1']});
  await page.reload(); await hydrated(page);
  await expect(page.locator('details.on-this-day')).toHaveCount(0);
  expect((await stored<{entries: unknown[]}>(page, JOURNAL_KEY))!.entries).toHaveLength(2); // the entry itself stays
});

test('1d, #6, #13: Search finds the Journal and Music pages by name and opens them', async ({page}) => {
  await offlineApis(page);
  await seedRecords(page, {});
  for (const [query, path, heading] of [['Journal', '/app/journal', 'Journal'], ['Music', '/app/music', 'Music']] as const) {
    await page.goto('/app'); await hydrated(page);
    await page.locator('body').press('/');
    const palette = page.getByRole('dialog', {name: 'Search'});
    await palette.getByRole('combobox').fill(query);
    const option = palette.getByRole('listbox').getByRole('group', {name: 'Pages'}).getByRole('option', {name: new RegExp(`^${query}`)});
    await expect(option).toBeVisible();
    await option.click();
    await page.waitForURL(`**${path}`);
    await expect(page.getByRole('heading', {level: 1, name: heading})).toBeVisible();
  }
});

test.describe('on the Showcase', () => {
  test.beforeEach(async ({page}) => { await offlineApis(page); await loadShowcase(page); });

  test('8.2: the Daily orbit card is kept on Today by choice and counts the same planets as the Checklist', async ({page}) => {
    await page.goto('/app'); await hydrated(page);
    await page.getByRole('button', {name: /Customize Today/}).first().click();
    const chooser = page.getByRole('group', {name: 'Cards kept on this device'});
    const orbitChoice = chooser.getByRole('button', {name: /^Daily orbit/});
    await expect(orbitChoice).toHaveAttribute('aria-pressed', 'false');
    await orbitChoice.click();
    await expect(orbitChoice).toHaveAttribute('aria-pressed', 'true');
    const card = page.locator('section.orbit-card');
    await expect(card.getByRole('heading', {name: 'Daily orbit'})).toBeVisible();
    const bar = card.getByRole('progressbar');
    await expect(bar).toHaveAttribute('aria-valuemax', /^[1-9]\d*$/);
    const done = Number(await bar.getAttribute('aria-valuenow')), total = Number(await bar.getAttribute('aria-valuemax'));
    expect(done).toBeLessThanOrEqual(total);
    await expect(card.locator('.orbit-card-count')).toContainText(String(total));
    await expect(card.getByRole('list', {name: 'Next in your day'}).getByRole('link').first()).toBeVisible();
    expect(JSON.stringify(await showcaseRecord(page, 'zigoals:today-cards:v1'))).toContain('orbit');
    await page.reload(); await hydrated(page);
    await expect(page.locator('section.orbit-card').getByRole('heading', {name: 'Daily orbit'})).toBeVisible();
  });

  test('#19: a treat added to the rewards shelf is claimed with points from the XP already earned', async ({page}) => {
    await page.goto('/app/journey'); await hydrated(page);
    const shelf = page.getByRole('region', {name: 'Rewards shelf'});
    await shelf.scrollIntoViewIfNeeded();
    const points = async () => Number((await shelf.locator('.rewards-points strong').textContent())!.replace(/[^\d]/g, ''));
    const before = await points();
    expect(before).toBeGreaterThan(300);
    await shelf.getByRole('textbox', {name: 'A treat'}).fill('Fictional cinema evening');
    await shelf.getByRole('spinbutton', {name: 'Points'}).fill('300');
    await shelf.getByRole('button', {name: 'Add to the shelf'}).click();
    const treats = shelf.getByRole('list', {name: 'Your treats'});
    await expect(treats.getByRole('listitem').filter({hasText: 'Fictional cinema evening'})).toContainText('300 points');
    await treats.getByRole('button', {name: 'Claim Fictional cinema evening'}).click();
    await expect.poll(points).toBe(before - 300);
    await expect(shelf.locator('.rewards-points')).toContainText(/300 claimed/);
    expect(JSON.stringify(await showcaseRecord(page, 'zigoals:rewards-shelf:v1'))).toContain('Fictional cinema evening');
  });

  test('#14: a report for a visit shows only the chosen parts over the page and prints from there', async ({page}) => {
    await page.addInitScript(() => { (window as unknown as {__printed: number}).__printed = 0; window.print = () => { (window as unknown as {__printed: number}).__printed++; }; });
    await page.goto('/app/settings/data'); await hydrated(page);
    await page.getByRole('button', {name: 'Make a report'}).click();
    const builder = page.locator('.report-builder');
    await builder.getByRole('group', {name: 'Quick ranges'}).getByRole('button', {name: '90 days'}).click();
    const include = builder.getByRole('group', {name: 'Include'});
    const boxes = include.getByRole('checkbox');
    for (let i = 0; i < await boxes.count(); i++) await boxes.nth(i).uncheck();
    await expect(builder.getByRole('button', {name: 'Show the report'})).toBeDisabled();
    await include.getByRole('checkbox', {name: /^Sleep/}).check();
    await include.getByRole('checkbox', {name: /^Habits/}).check();
    await builder.getByRole('button', {name: 'Show the report'}).click();
    const report = page.getByRole('dialog').filter({has: page.getByRole('article', {name: 'Report'})});
    const sheet = report.getByRole('article', {name: 'Report'});
    await expect(sheet.getByRole('heading', {level: 2, name: 'Sleep'})).toBeVisible();
    await expect(sheet.getByRole('heading', {level: 2, name: 'Habits'})).toBeVisible();
    await expect(sheet.getByRole('heading', {level: 2, name: 'Weight'})).toHaveCount(0);
    await expect(sheet.getByRole('heading', {level: 2, name: 'Mood and energy'})).toHaveCount(0);
    await expect(sheet.getByRole('img', {name: /^Time asleep per night, \d+ of 90 nights logged/})).toBeVisible();
    await report.getByRole('button', {name: 'Print or save as PDF'}).click();
    expect(await page.evaluate(() => (window as unknown as {__printed: number}).__printed)).toBe(1);
    await report.getByRole('button', {name: 'Close'}).click();
    await expect(page.getByRole('article', {name: 'Report'})).toHaveCount(0);
    await expect(builder.getByRole('button', {name: 'Show the report'})).toBeFocused();
  });

  test('8.8, #16, A16: "Save the file for Loop" saves exactly the habits\' check-ins as a HabitBull CSV', async ({page}) => {
    await page.goto('/app/settings/data'); await hydrated(page);
    const saving = page.waitForEvent('download');
    await page.getByRole('button', {name: 'Save the file for Loop'}).click();
    const file = await saving;
    expect(file.suggestedFilename()).toMatch(/\.csv$/);
    const csv = await readFile((await file.path())!, 'utf8');
    const habits = (await showcaseRecord<HabitData>(page, 'zigoals:habits:v1'))!;
    const expected = habitsToHabitBullCsv(habits, await browserToday(page));
    expect(csv.split('\n')[0]).toBe(HABITBULL_HEADER);
    expect(expected.rows).toBeGreaterThan(10);
    expect(csv).toBe(expected.csv);
    // Every row is a logged day of a real habit: the name, the date and a value above zero.
    const titles = new Set(habits.habits.map(h => h.title));
    for (const line of csv.trim().split('\n').slice(1)) {
      const [name, , , date, value] = line.split(',');
      expect(titles.has(name!.replace(/^"|"$/g, '')), line).toBe(true);
      expect(date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(Number(value)).toBeGreaterThan(0);
    }
  });

  test('F5 .ics export: the agenda\'s chosen days and sources become calendar events, each marked as an example in the Showcase', async ({page}) => {
    await page.goto('/app/agenda'); await hydrated(page);
    await page.getByRole('button', {name: 'Choose what to export'}).click();
    const choices = page.locator('.agenda-export');
    await choices.getByRole('radio', {name: 'The next 30 days'}).check();
    const sum = choices.locator('.agenda-export-sum');
    await expect(sum).toContainText(/^\d+ events?: titles and days/);
    const all = Number((await sum.textContent())!.match(/^(\d+)/)![1]);
    // Leave one source out: fewer events go in.
    const sources = choices.getByRole('group', {name: 'What goes in'}).getByRole('checkbox');
    let left = all;
    for (let i = 0; i < await sources.count() && left === all; i++) {
      const n = Number((await sources.nth(i).locator('xpath=..').locator('small').textContent()) ?? '0');
      if (n > 0 && n < all) { await sources.nth(i).uncheck(); left = all - n; }
    }
    await expect(sum).toContainText(new RegExp(`^${left} events?:`));
    const saving = page.waitForEvent('download');
    await choices.getByRole('button', {name: 'Download .ics'}).click();
    const file = await saving;
    expect(file.suggestedFilename()).toMatch(/\.ics$/);
    const ics = (await readFile((await file.path())!, 'utf8')).replace(/\r\n[ \t]/g, '');
    expect(ics.startsWith('BEGIN:VCALENDAR')).toBe(true);
    expect(ics.trimEnd().endsWith('END:VCALENDAR')).toBe(true);
    expect(ics).toContain('ZIGoals agenda (Example)');
    const summaries = [...ics.matchAll(/^SUMMARY:(.*)$/gm)].map(m => m[1]!);
    expect(summaries).toHaveLength(left);
    for (const s of summaries) expect(s.startsWith('Example · ')).toBe(true);
    expect((ics.match(/^BEGIN:VEVENT$/gm) ?? []).length).toBe(left);
    await expect(choices.getByRole('status')).toContainText(`with ${left} ${left === 1 ? 'event' : 'events'}. Open it with your calendar app to add them.`);
  });
});

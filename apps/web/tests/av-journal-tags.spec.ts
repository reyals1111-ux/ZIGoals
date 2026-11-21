import {expect, test} from '@playwright/test';
import {axe, THEMES, applyTheme, offline, settle} from './p6-helpers';

/**
 * Session AV, owner follow-up 1 (F-JOURNAL-TAGS; Day One): tags as an entry is written, "Add a tag" and × under an entry,
 * and "Filter by tag" with counts — at 390 and 1440, in Nebula, Light and Dark, axe-clean, no sideways scroll at 320.
 * Fictional data; every /api call answers 503.
 */
test.use({timezoneId: 'Europe/Amsterdam'});
for (const theme of THEMES) test(`${theme}: tag while writing, add and remove a tag, filter by tag`, async ({page, isMobile}) => {
  await applyTheme(page, theme);
  await offline(page);
  if (!isMobile) await page.setViewportSize({width: 1440, height: 900});
  await page.clock.install({time: new Date('2026-11-23T20:00:00+01:00')});
  await page.goto('/app/journal'); await settle(page);
  const write = page.getByRole('form', {name: 'Write in your journal'});
  for (const [text, tags] of [['A fictional busy day at the office.', 'work'], ['Fictional dinner with my sister.', 'family, #evening']] as const) {
    await write.getByLabel('Today’s entry').fill(text);
    await write.getByLabel('Tags — optional').fill(tags);
    await write.getByRole('button', {name: 'Save entry'}).click();
    const later = page.getByRole('form', {name: 'ZIGi\'s question'});
    if (await later.isVisible().catch(() => false)) await later.getByRole('button', {name: 'Not now'}).click();
  }
  const filter = page.getByRole('group', {name: 'Filter by tag'});
  await expect(filter.getByRole('button')).toHaveText(['All entries', /^#evening\s*1$/, /^#family\s*1$/, /^#work\s*1$/]);
  const list = page.locator('ol.journal-entries'), rows = list.locator(':scope > li');
  await expect(rows).toHaveCount(2);
  // Add a tag to the office entry, then filter by it.
  const office = rows.filter({hasText: 'busy day at the office'});
  await office.getByRole('button', {name: /^Add a tag to the entry of/}).click();
  await office.getByLabel('Tag', {exact: true}).fill('#tired');
  await office.getByRole('button', {name: 'Add', exact: true}).click();
  await expect(office.getByRole('list', {name: /^Tags of the entry of/})).toContainText('#tired');
  // Session AV (1c, q4 #5): focus goes back to "Add a tag", never to the page; the tags in use are offered in the field.
  await expect(office.getByRole('button', {name: /^Add a tag to the entry of/})).toBeFocused();
  await office.getByRole('button', {name: /^Add a tag to the entry of/}).click();
  await expect(office.locator('datalist option')).toHaveCount(2); // evening and family: the entry's own work and tired are left out
  await office.getByLabel('Tag', {exact: true}).press('Escape');
  await expect(office.getByRole('button', {name: /^Add a tag to the entry of/})).toBeFocused();
  await filter.getByRole('button', {name: /^#tired/}).click();
  await expect(rows).toHaveCount(1);
  await expect(filter.getByRole('button', {name: /^#tired/})).toHaveAttribute('aria-pressed', 'true');
  const findings = await axe(page, page.locator('section').filter({has: list}));
  expect(findings.filter(v => v.impact === 'serious' || v.impact === 'critical'), JSON.stringify(findings)).toEqual([]);
  // Remove it: the filter falls back to every entry.
  await office.getByRole('button', {name: /^Remove the tag tired from the entry of/}).click();
  await expect(rows).toHaveCount(2);
  // Session AV (1c, q4 #5): after a remove, focus moves to the entry's other tag.
  await expect(office.getByRole('button', {name: /^Remove the tag work from the entry of/})).toBeFocused();
  const saved = await page.evaluate(() => (JSON.parse(localStorage.getItem('zigoals:journal:v1') ?? '{"entries":[]}').entries as {text: string; tags?: string[]}[]).map(e => [e.text, e.tags ?? []]));
  expect(saved).toEqual([['A fictional busy day at the office.', ['work']], ['Fictional dinner with my sister.', ['family', 'evening']]]);
  await page.setViewportSize({width: 320, height: 720});
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
});

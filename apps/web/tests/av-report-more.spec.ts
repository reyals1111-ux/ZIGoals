import {expect, test} from '@playwright/test';
import {axe, THEMES, applyTheme} from './p6-helpers';
import {hydrated} from './ah-helpers';
import {SYMPTOMS_KEY} from '../lib/symptoms/schema';
import {SUPPLEMENTS_KEY} from '../lib/supplements/schema';

/**
 * Session AV, owner follow-up 1 (F-REPORT-MORE; Bearable's visit report): Settings → Your data → Make a report with only
 * "Symptoms and factors" and "Supplements and medication" ticked shows the headache as rated (3 days, 1 strong, average
 * Mild) and vitamin D's planned doses against those logged — at 390 and 1440, in Nebula, Light and Dark, axe-clean, no
 * sideways scroll at 320. Fictional records.
 */
test.use({timezoneId: 'UTC'});
const symptoms = {version: 1, items: [{id: 'headache', name: 'Fictional headache', kind: 'symptom', createdAt: '2026-10-01T10:00:00.000Z'}], days: {'2026-11-10': {headache: 3}, '2026-11-11': {headache: 0}, '2026-11-12': {headache: 1}}};
const supplements = {version: 1, items: [{id: 'supp_fictional-d', name: 'Fictional vitamin D', dose: '1 tablet', kind: 'supplement', times: ['08:00'], weekdays: 127, createdAt: '2026-11-08T10:00:00.000Z'}],
  log: [{itemId: 'supp_fictional-d', date: '2026-11-10', slot: '08:00', status: 'taken', at: '2026-11-10T08:00:00.000Z'}]};
for (const theme of THEMES) test(`${theme}: symptoms as rated and supplements as logged, in the report`, async ({page, isMobile}) => {
  await applyTheme(page, theme);
  if (!isMobile) await page.setViewportSize({width: 1440, height: 900});
  await page.clock.install({time: new Date('2026-11-14T10:00:00Z')});
  await page.addInitScript(() => { window.print = () => undefined; });
  await page.goto('/app/settings'); await hydrated(page);
  await page.evaluate(([a, av, b, bv]) => { localStorage.setItem(a, av); localStorage.setItem(b, bv); localStorage.setItem('zigoals:onboarding:v1', JSON.stringify({version: 1, seen: true})); }, [SYMPTOMS_KEY, JSON.stringify(symptoms), SUPPLEMENTS_KEY, JSON.stringify(supplements)] as const);
  await page.goto('/app/settings/data'); await hydrated(page);
  await page.getByRole('button', {name: 'Make a report'}).click();
  const builder = page.locator('.report-builder'), include = builder.getByRole('group', {name: 'Include'});
  const boxes = include.getByRole('checkbox');
  await expect(boxes).toHaveCount(8); // the builder loads on demand: every section's box is there before any is changed
  for (let i = 0; i < await boxes.count(); i++) await boxes.nth(i).uncheck();
  await include.getByRole('checkbox', {name: /^Symptoms and factors/}).check();
  await include.getByRole('checkbox', {name: /^Supplements and medication/}).check();
  const findings = await axe(page, builder);
  expect(findings.filter(v => v.impact === 'serious' || v.impact === 'critical'), JSON.stringify(findings)).toEqual([]);
  await builder.getByRole('button', {name: 'Show the report'}).click();
  const sheet = page.getByRole('article', {name: 'Report'});
  const sym = sheet.getByRole('region', {name: 'Symptoms and factors'});
  await expect(sym.getByRole('row').nth(1)).toHaveText(/^Fictional headache\s*3\s*2\s*1\s*1\.3 \(Mild\)$/);
  const sup = sheet.getByRole('region', {name: 'Supplements and medication'});
  await expect(sup.getByRole('row').nth(1)).toHaveText(/^Fictional vitamin D\s*1 tablet\s*7\s*1\s*0\s*6$/);
  await expect(sheet.getByRole('heading', {level: 2, name: 'Sleep', exact: true})).toHaveCount(0);
  // q3 #48 (Blocker): the shown report is axe-clean too (a table wider than a phone scrolls in a focusable frame), and the
  // builder and launcher name the two new parts instead of saying there is no symptom or medication list.
  const shownFindings = await axe(page, sheet);
  expect(shownFindings.filter(v => v.impact === 'serious' || v.impact === 'critical'), JSON.stringify(shownFindings)).toEqual([]);
  await page.setViewportSize({width: 390, height: 844});
  const atPhone = await axe(page, sheet);
  expect(atPhone.filter(v => v.impact === 'serious' || v.impact === 'critical'), JSON.stringify(atPhone)).toEqual([]);
  expect(await sheet.locator('.report-table').evaluateAll(els => els.filter(el => el.scrollWidth > el.clientWidth + 1 && (el as HTMLElement).tabIndex !== 0).length)).toBe(0);
  await expect(page.getByText(/keeps no medication or symptom list/)).toHaveCount(0);
  await expect(page.getByText(/symptoms, supplements and medication\)/)).toHaveCount(1);
  await page.setViewportSize({width: 320, height: 720});
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
});

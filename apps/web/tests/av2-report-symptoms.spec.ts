import {expect, test} from '@playwright/test';
import {axe, THEMES, applyTheme} from './p6-helpers';
import {hydrated} from './ah-helpers';
import {SYMPTOMS_KEY} from '../lib/symptoms/schema';

/**
 * Session AV lane 2 (body; q3 #48, Bearable's report charts symptoms over time): the visit report's "Symptoms and factors"
 * draws each symptom's daily level as a line, told apart by line style and marker (named in its key), gaps for days not
 * rated, beside the table — at 390 and 1440, in Nebula, Light and Dark, axe-clean, no sideways scroll at 320. Fictional.
 */
test.use({timezoneId: 'UTC'});
const symptoms = {version: 1, items: [{id: 'headache', name: 'Fictional headache', kind: 'symptom', createdAt: '2026-10-01T10:00:00.000Z'}, {id: 'tired', name: 'Fictional tiredness', kind: 'symptom', createdAt: '2026-10-01T10:00:00.000Z'}],
  days: {'2026-11-10': {headache: 3, tired: 1}, '2026-11-11': {headache: 0}, '2026-11-12': {headache: 1, tired: 2}}};
for (const theme of THEMES) test(`${theme}: symptoms as lines in the visit report`, async ({page, isMobile}) => {
  await applyTheme(page, theme);
  if (!isMobile) await page.setViewportSize({width: 1440, height: 900});
  await page.clock.install({time: new Date('2026-11-14T10:00:00Z')});
  await page.addInitScript(() => { window.print = () => undefined; });
  await page.goto('/app/settings'); await hydrated(page);
  await page.evaluate(([a, av]) => { localStorage.setItem(a, av); localStorage.setItem('zigoals:onboarding:v1', JSON.stringify({version: 1, seen: true})); }, [SYMPTOMS_KEY, JSON.stringify(symptoms)] as const);
  await page.goto('/app/settings/data'); await hydrated(page);
  await page.getByRole('button', {name: 'Make a report'}).click();
  const builder = page.locator('.report-builder'), include = builder.getByRole('group', {name: 'Include'});
  const boxes = include.getByRole('checkbox');
  await expect(boxes).toHaveCount(8);
  for (let i = 0; i < await boxes.count(); i++) await boxes.nth(i).uncheck();
  await include.getByRole('checkbox', {name: /^Symptoms and factors/}).check();
  await builder.getByRole('button', {name: 'Show the report'}).click();
  const sym = page.getByRole('article', {name: 'Report'}).getByRole('region', {name: 'Symptoms and factors'});
  await expect(sym.getByRole('img')).toHaveAttribute('aria-label', 'Symptom levels per day, 0 None to 3 Strong: Fictional headache (solid line, circles); Fictional tiredness (dashed line, squares). Gaps are days without a rating.');
  await expect(sym.locator('.report-key li')).toHaveText(['Fictional headache: solid line, circles', 'Fictional tiredness: dashed line, squares']);
  const findings = await axe(page, sym);
  expect(findings.filter(v => v.impact === 'serious' || v.impact === 'critical'), JSON.stringify(findings)).toEqual([]);
  await page.setViewportSize({width: 320, height: 720});
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
});

import {expect, test} from '@playwright/test';
import {createEmptyHealth, HEALTH_STORAGE_KEY} from '../lib/health';
import {BODY_EXTRAS_KEY} from '../lib/body-extras/schema';
import {hydrated} from './ah-helpers';
import {axe, THEMES, applyTheme, offline} from './p6-helpers';

/**
 * Session AV lane 2 (body; LEDGER #205, #210; Yazio): Health → Weight → "BMI and milestones": a typed height gives a BMI
 * figure, the number only (no word such as "normal" or "overweight", no ideal weight); milestones every 2 kg towards the
 * 78 kg goal are turned on, and a reading past the first step is celebrated once ("Thanks") — at 390 and 1440, in Nebula,
 * Light and Dark, axe-clean, no sideways scroll at 320. Fictional readings; every /api call 503.
 */
test.use({timezoneId: 'UTC'});
const at = '2026-11-01T08:00:00.000Z';
const reading = (date: string, grams: number) => ({id: `health_fictional-${date}`, date, grams, createdAt: at, updatedAt: at});
const health = (weights: ReturnType<typeof reading>[]) => ({...createEmptyHealth(), targets: {...createEmptyHealth().targets, weightGrams: 78_000}, weights});
for (const theme of THEMES) test(`${theme}: a BMI figure and weight milestones`, async ({page, isMobile}) => {
  await applyTheme(page, theme);
  await offline(page);
  if (!isMobile) await page.setViewportSize({width: 1440, height: 900});
  await page.clock.install({time: new Date('2026-11-20T10:00:00Z')});
  await page.goto('/app/settings'); await hydrated(page);
  await page.evaluate(([k, v]) => { localStorage.setItem(k, v); localStorage.setItem('zigoals:onboarding:v1', JSON.stringify({version: 1, seen: true})); }, [HEALTH_STORAGE_KEY, JSON.stringify(health([reading('2026-11-01', 84_000)]))] as const);
  await page.goto('/app/health'); await hydrated(page);
  await page.getByRole('tablist', {name: 'Health views'}).getByRole('tab', {name: 'Weight', exact: true}).click();
  const panel = page.getByRole('region', {name: 'BMI and milestones'});
  await panel.getByRole('textbox', {name: 'Your height (cm), for a BMI figure'}).fill('180');
  await panel.getByRole('button', {name: 'Save my height'}).click();
  await expect(panel.locator('.body-figures-big strong')).toHaveText('25.9');
  await expect(panel.locator('.body-figures-big')).toHaveAttribute('data-body-figure', '');
  const words = (await panel.innerText()).toLowerCase();
  for (const w of ['overweight', 'underweight', 'obese', 'healthy weight', 'ideal weight']) expect(words).not.toContain(w);
  await panel.getByRole('radio', {name: /^Every 2 kg$/}).check();
  await panel.getByRole('button', {name: 'Turn on milestones'}).click();
  // Session AV lane 2 (a mark that is not next keeps an empty note after its weight, so its text ends in a space: the weight
  // alone, and nothing else, deliberate)
  await expect(panel.locator('.body-figures-marks li')).toHaveText([/^82 kg\s*next$/, /^80 kg\s*$/, /^78 kg\s*$/]);
  expect(await page.evaluate(k => JSON.parse(localStorage.getItem(k)!).milestones, BODY_EXTRAS_KEY)).toMatchObject({step: '2kg', startGrams: 84_000, goalGrams: 78_000, reached: []});
  const findings = await axe(page, panel);
  expect(findings.filter(v => v.impact === 'serious' || v.impact === 'critical'), JSON.stringify(findings)).toEqual([]);
  // A later reading past the first step: celebrated once.
  await page.evaluate(([k, v]) => localStorage.setItem(k, v), [HEALTH_STORAGE_KEY, JSON.stringify(health([reading('2026-11-01', 84_000), reading('2026-11-18', 81_600)]))] as const);
  await page.reload(); await hydrated(page);
  await page.getByRole('tablist', {name: 'Health views'}).getByRole('tab', {name: 'Weight', exact: true}).click();
  await expect(panel.locator('.body-figures-cheer')).toContainText('A milestone reached: 82 kg');
  await panel.getByRole('button', {name: 'Thanks'}).click();
  await expect(panel.locator('.body-figures-cheer')).toHaveCount(0);
  await expect(panel.locator('.body-figures-marks li').first()).toContainText('reached Nov 18');
  await page.reload(); await hydrated(page);
  await page.getByRole('tablist', {name: 'Health views'}).getByRole('tab', {name: 'Weight', exact: true}).click();
  await expect(panel.locator('.body-figures-marks li').first()).toContainText('reached Nov 18');
  await expect(panel.locator('.body-figures-cheer')).toHaveCount(0);
  await page.setViewportSize({width: 320, height: 720});
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
});

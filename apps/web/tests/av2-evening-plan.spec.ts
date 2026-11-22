import {expect, test} from '@playwright/test';
import {createEmptyHealth, HEALTH_STORAGE_KEY} from '../lib/health';
import {EVENING_PLAN_KEY} from '../lib/evening-plan/schema';
import {hydrated} from './ah-helpers';
import {axe, THEMES, applyTheme, offline} from './p6-helpers';

/**
 * Session AV lane 2 (body; LEDGER #83, Calm Sleep's evening plan): Health → Sleep → Tonight → "Your evening plan": three
 * questions (asleep by 23:00, screens and a busy head, 45 minutes to wind down) make five steps; ticking two fills the
 * "Ready for bed" bar to 2 of 5 and is kept on the device — at 390 and 1440, in Nebula, Light and Dark, axe-clean, no
 * sideways scroll at 320. Every /api call 503.
 */
test.use({timezoneId: 'UTC'});
for (const theme of THEMES) test(`${theme}: an evening plan from three questions, two steps ticked`, async ({page, isMobile}) => {
  await applyTheme(page, theme);
  await offline(page);
  if (!isMobile) await page.setViewportSize({width: 1440, height: 900});
  await page.clock.install({time: new Date('2026-11-20T21:00:00Z')});
  await page.goto('/app/settings'); await hydrated(page);
  await page.evaluate(([k, v]) => { localStorage.setItem(k, v); localStorage.setItem('zigoals:onboarding:v1', JSON.stringify({version: 1, seen: true})); }, [HEALTH_STORAGE_KEY, JSON.stringify(createEmptyHealth())] as const);
  await page.goto('/app/health?view=sleep'); await hydrated(page);
  const plan = page.getByRole('region', {name: 'Tonight'}).getByRole('region', {name: 'Your evening plan'});
  await expect(plan).toContainText('not medical advice');
  await plan.getByRole('button', {name: 'Make an evening plan'}).click();
  await plan.getByLabel('1. When do you want to be asleep?').fill('23:00');
  await plan.getByRole('checkbox', {name: 'A busy head'}).check();
  await plan.getByRole('combobox', {name: '3. How long would you like to wind down?'}).selectOption('45');
  const formFindings = await axe(page, plan);
  expect(formFindings.filter(v => v.impact === 'serious' || v.impact === 'critical'), JSON.stringify(formFindings)).toEqual([]);
  await plan.getByRole('button', {name: 'Save my evening plan'}).click();
  await expect(plan.getByRole('status')).toHaveText('Your evening plan is saved. Tick each step as you go tonight.');
  await expect(plan.locator('.evening-steps li')).toHaveCount(5);
  await plan.getByRole('checkbox', {name: /Write down what is on your mind/}).check();
  await plan.getByRole('checkbox', {name: /Screens away/}).check();
  const bar = plan.getByRole('progressbar', {name: 'Ready for bed'});
  await expect(bar).toHaveAttribute('aria-valuenow', '2');
  await expect(plan.locator('.evening-ready-line')).toHaveText('Ready for bed: 2 of 5 steps.');
  expect(await page.evaluate(k => JSON.parse(localStorage.getItem(k)!).days, EVENING_PLAN_KEY)).toEqual({'2026-11-20': ['write-down', 'screens-away']});
  const findings = await axe(page, plan);
  expect(findings.filter(v => v.impact === 'serious' || v.impact === 'critical'), JSON.stringify(findings)).toEqual([]);
  expect(await plan.evaluate(el => [...el.querySelectorAll<HTMLElement>('p, li, label, time, span')].filter(e => e.offsetParent && (e.textContent ?? '').trim() && parseFloat(getComputedStyle(e).fontSize) < 14).length)).toBe(0);
  await page.setViewportSize({width: 320, height: 720});
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
});

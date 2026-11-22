import {expect, test} from '@playwright/test';
import {createEmptyHealth, HEALTH_STORAGE_KEY} from '../lib/health';
import {withHealthGroup} from '../lib/vault/w-homes';
import {EVENING_PLAN_KEY} from '../lib/evening-plan/schema';
import {NOTIFY_KEY} from '../lib/notify/prefs';
import type {Sleep} from '../lib/sleep/schema';
import {hydrated} from './ah-helpers';
import {axe, THEMES, applyTheme, offline} from './p6-helpers';

/**
 * Session AV lane 2 (bodymind-r2; LEDGER #235, #236, Rise): Health → Sleep → Tonight → "Your morning steps" (daylight and
 * the first coffee, timed from today's 07:00 wake), one ticked, a reminder at one step; and under the energy curve "Remind
 * me from my curve" (the focus window's start), which says that notifications are off on this device — kept in the
 * evening plan and the notification prefs; at 390 and 1440, in Nebula, Light and Dark, axe-clean, no sideways scroll at
 * 320. Fictional nights; every /api call 503.
 */
test.use({timezoneId: 'UTC'});
const AT = '2026-11-01T10:00:00.000Z';
const day = (n: number) => new Date(Date.parse('2026-11-20T12:00:00Z') - n * 86_400_000).toISOString().slice(0, 10);
const nights = Array.from({length: 10}, (_, i) => ({id: `health_sleep-fictional-${day(i)}`, kind: 'night', source: 'manual', start: `${day(i + 1)}T23:00:00.000Z`, end: `${day(i)}T07:00:00.000Z`, timeZone: 'UTC', createdAt: AT, updatedAt: AT, latencyMin: 0, awakeMin: 0}));

for (const theme of THEMES) test(`${theme}: morning steps from the wake time, step reminders, reminders from the curve`, async ({page, isMobile}) => {
  await applyTheme(page, theme);
  await offline(page);
  if (!isMobile) await page.setViewportSize({width: 1440, height: 900});
  await page.clock.install({time: new Date('2026-11-20T08:00:00Z')});
  const health = withHealthGroup(createEmptyHealth(), 'sleep', {version: 1, nights, goal: {minutes: 480, updatedAt: AT}} as Sleep, false);
  await page.goto('/app/settings'); await hydrated(page);
  await page.evaluate(([k, v]) => { localStorage.setItem(k, v); localStorage.setItem('zigoals:onboarding:v1', JSON.stringify({version: 1, seen: true})); }, [HEALTH_STORAGE_KEY, JSON.stringify(health)] as const);
  await page.goto('/app/health?view=sleep'); await hydrated(page);

  const morning = page.getByRole('region', {name: 'Tonight'}).getByRole('region', {name: 'Your morning steps'});
  await expect(morning).toContainText('not medical advice');
  await morning.getByRole('button', {name: 'Choose morning steps'}).click();
  await expect(morning.getByRole('checkbox', {name: /Daylight outside, or by a bright window/})).toBeChecked();
  await expect(morning.getByRole('checkbox', {name: /First coffee or tea/})).toBeChecked();
  const formFindings = await axe(page, morning);
  expect(formFindings.filter(v => v.impact === 'serious' || v.impact === 'critical'), JSON.stringify(formFindings)).toEqual([]);
  await morning.getByRole('button', {name: 'Save my morning steps'}).click();
  await expect(morning.getByRole('status')).toHaveText('Your morning steps are saved.');
  await expect(morning).toContainText('Timed from your wake time today');
  await expect(morning.locator('ul').first().locator('li')).toHaveCount(2);
  await morning.getByRole('checkbox', {name: /Daylight outside/}).first().check();
  await morning.locator('.morning-step-reminders > summary').click();
  await morning.getByRole('checkbox', {name: /Remind me: .* First coffee or tea/}).check();
  await expect(morning.locator('.morning-step-reminders > summary')).toContainText('(1 on)');
  await expect(morning).toContainText('Notifications are off on this device');
  const plan = await page.evaluate(k => JSON.parse(localStorage.getItem(k)!), EVENING_PLAN_KEY);
  expect(plan.morning.steps.map((s: {id: string}) => s.id)).toEqual(['m-daylight', 'm-coffee']);
  expect(plan.mornings).toEqual({'2026-11-20': ['m-daylight']});
  expect(plan.remind).toEqual(['m-coffee']);

  // Reminders from the curve.
  await page.locator('.energy-curve-fold > summary').click();
  const curve = page.getByRole('region', {name: 'Remind me from my curve'});
  await curve.getByRole('checkbox', {name: /When the good focus window starts/}).check();
  await expect(curve.getByRole('status')).toHaveText('Reminder on: when the good focus window starts.');
  await expect(curve).toContainText('Notifications are off on this device');
  const prefs = await page.evaluate(k => JSON.parse(localStorage.getItem(k)!), NOTIFY_KEY);
  expect(prefs.energy).toEqual({focus: true});
  expect(prefs.types.energy).toBe(true);
  for (const part of [morning, curve]) {
    const findings = await axe(page, part);
    expect(findings.filter(v => v.impact === 'serious' || v.impact === 'critical'), JSON.stringify(findings)).toEqual([]);
    expect(await part.evaluate(el => [...el.querySelectorAll<HTMLElement>('p, li, label, time, span, summary')].filter(e => e.offsetParent && (e.textContent ?? '').trim() && parseFloat(getComputedStyle(e).fontSize) < 14).length)).toBe(0);
  }
  await page.setViewportSize({width: 320, height: 720});
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
});

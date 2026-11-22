import {expect, test} from '@playwright/test';
import {axe, THEMES, applyTheme, offline, settle} from './p6-helpers';
import {WORKOUTS_KEY} from '../lib/workouts/schema';
import {PLANNED_KEY} from '../lib/workouts/planned';

/**
 * Session AV lane 2, round 5 (gym; Gentler Streak, LEDGER #374): Health → Workouts → "Your status": a break set from
 * Monday sets Tuesday's planned workout aside (never missed: no "I missed some"), the Health page's Workouts card says it
 * is paused (without the reason), and "I'm back" clears it, with Undo — at 390 and 1440, in Nebula, Light and Dark,
 * axe-clean, no sideways scroll at 320. Fictional data; /api 503.
 */
test.use({timezoneId: 'Europe/Amsterdam'});
for (const theme of THEMES) test(`${theme}: a status for a break sets planned workouts aside`, async ({page, isMobile}) => {
  await applyTheme(page, theme);
  await offline(page);
  if (!isMobile) await page.setViewportSize({width: 1440, height: 900});
  await page.clock.install({time: new Date('2026-11-19T10:00:00+01:00')}); // a Thursday
  await page.goto('/app/settings'); await settle(page);
  await page.evaluate(([k, p]) => {
    localStorage.setItem('zigoals:onboarding:v1', JSON.stringify({version: 1, seen: true}));
    localStorage.setItem(k!, JSON.stringify({version: 1, workouts: [], templates: [], exercises: [], restSeconds: 90}));
    localStorage.setItem(p!, JSON.stringify({version: 1, items: [{id: 'plan-1', date: '2026-11-17', kind: 'other', name: 'Fictional swim', createdAt: '2026-11-15T08:00:00.000Z'}]}));
  }, [WORKOUTS_KEY, PLANNED_KEY]);
  await page.goto('/app/health?view=workouts'); await settle(page);
  const start = page.getByRole('region', {name: 'Start a workout'});
  const fold = start.locator('details.workouts-status-fold');
  await expect(fold.locator('summary')).toHaveText('Your status: ill, injured, a break or travelling');
  await fold.locator('summary').click();
  const panel = fold.locator('.r5-status');
  await expect(panel).toContainText('never put in a notification');
  await panel.getByRole('radio', {name: 'On a break'}).check();
  await panel.getByLabel('Since').fill('2026-11-16');
  await panel.getByRole('button', {name: 'Set this status'}).click();
  await expect(panel).toContainText('On a break since Mon, Nov 16. Planned workouts are set aside until you clear it.');
  await expect(page.getByRole('button', {name: 'I’m back: clear the status'})).toBeFocused();
  // Review B5J-2: Change it focuses the form; Cancel goes back to Change it (focus is never dropped to the page).
  await panel.getByRole('button', {name: 'Change it'}).click();
  await expect(panel.getByRole('radio', {name: 'On a break'})).toBeFocused();
  await panel.getByRole('button', {name: 'Cancel'}).click();
  await expect(panel.getByRole('button', {name: 'Change it'})).toBeFocused();
  const stored = await page.evaluate(k => JSON.parse(localStorage.getItem(k)!), PLANNED_KEY);
  expect(stored.statuses).toMatchObject([{kind: 'break', from: '2026-11-16'}]);
  expect(stored.statuses[0].to).toBeUndefined();

  // Tuesday's planned workout is set aside, never missed.
  await start.locator('details.workouts-plan-fold > summary').click();
  const plan = start.locator('.r4-plan');
  await expect(plan.getByRole('button', {name: /^Fictional swim, set aside while you are away or a status is set\./})).toBeVisible();
  await expect(plan.getByRole('button', {name: 'I missed some: move them on'})).toHaveCount(0);

  const findings = await axe(page, fold);
  expect(findings.filter(v => v.impact === 'serious' || v.impact === 'critical'), JSON.stringify(findings)).toEqual([]);
  await page.setViewportSize({width: 320, height: 800});
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
  if (!isMobile) await page.setViewportSize({width: 1440, height: 900});

  // The Health page's card: paused, without the reason.
  await page.goto('/app/health'); await settle(page);
  const card = page.locator('.workouts-card');
  await expect(card).toContainText('Paused since Mon, Nov 16: planned workouts are set aside');
  await expect(card).not.toContainText('break');

  // Back: clear it, with Undo.
  await page.goto('/app/health?view=workouts'); await settle(page);
  await page.locator('details.workouts-status-fold > summary').click();
  await expect(page.locator('details.workouts-status-fold > summary')).toHaveText('Your status: on a break since Mon, Nov 16');
  await page.getByRole('button', {name: 'I’m back: clear the status'}).click();
  await expect(page.locator('.r5-status')).not.toContainText('Planned workouts are set aside until you clear it.');
  expect((await page.evaluate(k => JSON.parse(localStorage.getItem(k)!), PLANNED_KEY)).statuses[0].to).toBe('2026-11-18');
  await page.getByRole('button', {name: 'Undo'}).last().click();
  await expect(page.locator('.r5-status')).toContainText('On a break since Mon, Nov 16.');
});

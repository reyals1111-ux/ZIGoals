import {expect, test} from '@playwright/test';
import {HABIT_EXTRAS_KEY} from '../lib/aa-device-keys';
import {MOTION_PREFERENCE_KEY} from '../components/use-entrance';
import {health, healthRecord, openHealth, stored} from './ap/ap-health-fixtures';
import {axe, THEMES, applyTheme} from './p6-helpers';

/**
 * Session AV lane 2 (habits pillar; LEDGER #79 Calm Shift, #80 Calm Scenes, #81 Calm Daily Move): Health → Meditation →
 * "Behind your sitting: a calm visual" (the slow left-right light with its pace, or a scene) shown above the clock while
 * a sitting runs, standing still under Motion Off; and "Move gently", a written stretch sequence with a timer whose
 * minutes are saved to Health's activity (never calories) — at 390 and 1440, in Nebula, Light and Dark, axe-clean, no
 * sideways scroll at 320, the focus never dropped. Fictional data.
 */
const sum = (page: import('@playwright/test').Page, text: string) => page.locator('summary', {hasText: text});

for (const theme of THEMES) test(`${theme}: choose the slow left-right light, then sit with it`, async ({page, isMobile}) => {
  await applyTheme(page, theme);
  if (!isMobile) await page.setViewportSize({width: 1440, height: 900});
  await openHealth(page, healthRecord(health()), '/app/health?view=meditation');
  await sum(page, 'Behind your sitting: a calm visual').click();
  const shift = page.getByRole('radio', {name: /^Slow left and right/});
  await expect(page.getByRole('radio', {name: /^No visual/})).toBeChecked();
  await shift.check();
  await expect(page.getByText('Saved: Slow left and right, slow (3 s a side). It shows from your next session.')).toBeVisible();
  await expect(shift).toBeFocused();
  await page.getByRole('radio', {name: 'Slower (5 s a side)'}).check();
  expect((await stored<{calm?: unknown}>(page, HABIT_EXTRAS_KEY)).calm).toEqual({visual: 'shift', pace: 'slower'});
  const findings = await axe(page, page.locator('.calm-chooser'));
  expect(findings.filter(v => v.impact === 'serious' || v.impact === 'critical'), JSON.stringify(findings)).toEqual([]);
  await page.setViewportSize({width: 320, height: 720});
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
  await page.getByRole('form', {name: 'Begin a session'}).getByRole('button', {name: 'Begin', exact: true}).click();
  await expect(page.locator('.meditation-focus')).toBeVisible();
  await expect(page.getByRole('img', {name: /^Slow left and right: A soft light glides/})).toBeVisible();
  await expect(page.locator('.calm-shift')).toHaveAttribute('data-motion', /on|off/);
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
  await page.getByRole('button', {name: 'Hide the visual'}).click();
  await expect(page.getByRole('button', {name: 'Show the visual (Slow left and right)'})).toBeFocused();
});

test('under Motion Off a scene stands still and says so', async ({page}) => {
  await openHealth(page, {...healthRecord(health()), [HABIT_EXTRAS_KEY]: {version: 1, calm: {visual: 'sea'}}}, '/app/health?view=meditation');
  await page.evaluate(k => localStorage.setItem(k, 'off'), MOTION_PREFERENCE_KEY);
  await page.reload();
  await page.getByRole('form', {name: 'Begin a session'}).getByRole('button', {name: 'Begin', exact: true}).click();
  await expect(page.getByRole('img', {name: /^Sea: A quiet sea/})).toBeVisible();
  await expect(page.locator('.calm-scene')).toHaveAttribute('data-motion', 'off');
  await expect(page.locator('.calm-layer figcaption')).toContainText('Motion is off on this device, so it stands still.');
});

for (const theme of THEMES) test(`${theme}: Move gently, step by step, saved as minutes`, async ({page, isMobile}) => {
  await applyTheme(page, theme);
  if (!isMobile) await page.setViewportSize({width: 1440, height: 900});
  await openHealth(page, healthRecord(health()), '/app/health?view=meditation');
  await sum(page, 'Move gently: a short guided stretch').click();
  await page.getByRole('radio', {name: /^Desk break/}).check();
  await expect(page.locator('.move-pick .meditation-today-steps li')).toHaveCount(6);
  const findings = await axe(page, page.locator('.move-pick'));
  expect(findings.filter(v => v.impact === 'serious' || v.impact === 'critical'), JSON.stringify(findings)).toEqual([]);
  await page.getByRole('button', {name: 'In het Nederlands'}).click();
  await expect(page.getByRole('radio', {name: /^Pauze aan je bureau/})).toBeChecked();
  await page.getByRole('button', {name: 'In English'}).click();
  await page.getByRole('button', {name: 'Begin · 3 min'}).click();
  await expect(page.getByRole('heading', {name: 'Neck tilt'})).toBeFocused();
  await expect(page.getByRole('timer')).toHaveAccessibleName(/seconds left of this step/);
  await page.clock.fastForward(31_000);
  await expect(page.getByRole('heading', {name: 'Chest opener'})).toBeVisible();
  const runFindings = await axe(page, page.locator('.move-run'));
  expect(runFindings.filter(v => v.impact === 'serious' || v.impact === 'critical'), JSON.stringify(runFindings)).toEqual([]);
  await page.setViewportSize({width: 320, height: 720});
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
  await page.getByRole('button', {name: 'Pause'}).click();
  await expect(page.getByRole('button', {name: 'Resume'})).toBeVisible();
  await page.getByRole('button', {name: 'Resume'}).click();
  await page.getByRole('button', {name: 'End now'}).click();
  await expect(page.getByRole('heading', {name: 'Desk break: done'})).toBeFocused();
  await expect(page.locator('.move-run')).not.toContainText(/kcal|calorie/i);
  await page.getByRole('button', {name: 'Save 1 min'}).click();
  await expect(page.getByText('Saved to Health’s activity: 1 min of stretching.')).toBeVisible();
  await expect(page.getByRole('button', {name: 'Begin · 3 min'})).toBeFocused();
});

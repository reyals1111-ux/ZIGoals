import {expect, test} from '@playwright/test';
import {HABIT_EXTRAS_KEY} from '../lib/aa-device-keys';
import {health, healthRecord, openHealth, stored} from './ap/ap-health-fixtures';
import {axe, THEMES, applyTheme} from './p6-helpers';

/**
 * Session AV lane 2 (rest, LEDGER #79; Calm's Shift): Health → Meditation → "Behind your sitting" offers the slow
 * left-right sound, off until ticked, with its volume and "Try it"; a sitting then shows its line, "Sound off for this
 * session" and "Sound on" (the focus kept), and it is quiet while paused — at 390 and 1440, in Nebula, Light and Dark,
 * axe-clean, no sideways scroll at 320. The sound itself is made by Web Audio (lib/audio/shift-sound.ts, unit-tested);
 * here the page's controls and what is kept. Fictional data.
 */
const sum = (page: import('@playwright/test').Page, text: string) => page.locator('summary', {hasText: text});

for (const theme of THEMES) test(`${theme}: turn on the slow left-right sound, set its volume, sit with it`, async ({page, isMobile}) => {
  await applyTheme(page, theme);
  if (!isMobile) await page.setViewportSize({width: 1440, height: 900});
  await openHealth(page, healthRecord(health()), '/app/health?view=meditation');
  await sum(page, 'Behind your sitting: a calm visual').click();
  const box = page.getByRole('checkbox', {name: /^Play a soft sound that moves slowly between your left and right ear/});
  // Opt-in: off until ticked.
  await expect(box).not.toBeChecked();
  expect((await stored<{calm?: unknown}>(page, HABIT_EXTRAS_KEY))?.calm).toBeUndefined();
  await box.check();
  await expect(page.getByText('Saved: the slow left-right sound at volume 40. It plays from your next session.')).toBeVisible();
  await expect(box).toBeFocused();
  const volume = page.getByRole('slider', {name: /^Volume of the sound/});
  await volume.fill('25');
  await expect.poll(async () => (await stored<{calm?: {sound?: number}}>(page, HABIT_EXTRAS_KEY)).calm?.sound).toBe(25);
  await expect(page.getByRole('group', {name: 'Pace of the sound'})).toBeVisible();
  await page.getByRole('button', {name: 'Try it (6 seconds)'}).click();
  await expect(page.locator('.calm-chooser [role="status"]')).toContainText(/Playing for 6 seconds|cannot move a sound/);
  const findings = await axe(page, page.locator('.calm-chooser'));
  expect(findings.filter(v => v.impact === 'serious' || v.impact === 'critical'), JSON.stringify(findings)).toEqual([]);
  await page.setViewportSize({width: 320, height: 720});
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);

  // A sitting with the sound and no visual: its line, and "Sound off for this session" with the focus kept.
  await page.getByRole('form', {name: 'Begin a session'}).getByRole('button', {name: 'Begin', exact: true}).click();
  await expect(page.locator('.meditation-focus')).toBeVisible();
  const line = page.locator('.calm-sound-line');
  await expect(line).toContainText(/Slow left-right sound · volume 25|waits for a tap|cannot move a sound/);
  const off = line.getByRole('button', {name: 'Sound off for this session'});
  if (await off.isVisible()) {
    await off.click();
    await expect(line.getByRole('button', {name: 'Sound on'})).toBeFocused();
    await expect(line).toContainText('The slow left-right sound is off for this session.');
    await line.getByRole('button', {name: 'Sound on'}).click();
    await expect(line.getByRole('button', {name: 'Sound off for this session'})).toBeFocused();
  }
  const session = await axe(page, page.locator('.meditation-session'));
  expect(session.filter(v => v.impact === 'serious' || v.impact === 'critical'), JSON.stringify(session)).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
});

test('turned off again, it is gone from the record and from the sitting', async ({page}) => {
  await openHealth(page, {...healthRecord(health()), [HABIT_EXTRAS_KEY]: {version: 1, calm: {sound: 30}}}, '/app/health?view=meditation');
  await sum(page, 'Behind your sitting: a calm visual').click();
  const box = page.getByRole('checkbox', {name: /^Play a soft sound/});
  await expect(box).toBeChecked();
  await box.uncheck();
  await expect(page.getByText('Saved: no sound. Sessions stay as quiet as your bells.')).toBeVisible();
  expect((await stored<{calm?: unknown}>(page, HABIT_EXTRAS_KEY)).calm).toBeUndefined();
  await page.getByRole('form', {name: 'Begin a session'}).getByRole('button', {name: 'Begin', exact: true}).click();
  await expect(page.locator('.meditation-focus')).toBeVisible();
  await expect(page.locator('.calm-sound-line')).toHaveCount(0);
});

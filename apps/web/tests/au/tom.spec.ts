import {expect, test} from '@playwright/test';
import {at, DAY1, freshWeek, hydrated, novaSays, openAt, setup, ZONE} from './au-helpers';

/**
 * Session AU (ADR-044, the friends dress rehearsal): Tom at 1440 in Nebula. In the rehearsal NOVA's header said
 * "READS · … Health off" while its Day at a glance showed "2 food entries logged today" (T-6, privacy), and "What did I lift
 * today?" got "On the stage: Day at a glance." (R-2). Now the glance reads no Health record while NOVA's Health permission
 * is off, and once he allows Health NOVA names today's lifts.
 */
test.skip(({isMobile}) => isMobile, 'the desktop part of Tom\'s week (his phone part is tests/au/webkit-au-tom.spec.ts)');
test.use({timezoneId: ZONE, viewport: {width: 1440, height: 900}, actionTimeout: 15_000});

test('Tom at 1440: Health stays closed in NOVA\'s glance until he allows it, and then NOVA names today\'s lifts', async ({page}) => {
  test.setTimeout(180_000);
  await freshWeek(page, 'nebula', at(DAY1, '07:00'));
  await setup(page, [/^Health/, /^Habits/]);
  // A squat set, logged as he did it.
  await page.goto('/app/health?view=workouts'); await hydrated(page);
  await page.getByRole('button', {name: 'Start an empty workout'}).click();
  const now = page.getByRole('region', {name: 'Workout in progress'});
  await now.getByLabel('Find an exercise').fill('squat');
  await now.getByRole('button', {name: /^(Back squat|Squat)/}).first().click();
  await now.getByLabel(/set 1: weight in kg/).first().fill('80');
  await now.getByLabel(/set 1: reps/).first().fill('5');
  await now.getByRole('button', {name: /set 1 done/}).first().click();
  await now.getByRole('button', {name: 'Skip rest'}).click().catch(() => undefined);
  await now.getByRole('button', {name: 'Finish workout'}).click();
  await expect(page.getByRole('region', {name: 'Workout, done'})).toBeVisible();
  // Water, so a leak would show.
  await page.goto('/app/health'); await hydrated(page);
  await page.getByRole('button', {name: 'Add 250 mL', exact: true}).first().click();
  await expect.poll(() => page.evaluate(() => (JSON.parse(localStorage.getItem('zigoals:health:v1') ?? '{}').daily?.water ?? []).length)).toBe(1);

  // T-6: Health is off for NOVA; its glance says nothing from Health.
  await openAt(page, at(DAY1, '20:30'), '/app/nova');
  await page.keyboard.press('Shift');
  await expect(page.locator('.nova-frame')).toHaveAttribute('data-opening', 'done', {timeout: 20_000});
  await novaSays(page, 'Show my day at a glance');
  // With Health closed and nothing else logged today, the glance has no line to show: its own empty notice, never a Health line.
  const glance = page.locator('.nova-stage-area .nova-widget[data-widget="glance"]').first();
  await expect(glance).toBeVisible({timeout: 15_000});
  await expect(glance).not.toContainText(/water|food entr|meals? logged|You slept/i);

  // R-2: once he allows Health (NOVA → Permissions), NOVA names today's lifts.
  const closed = await novaSays(page, 'How many calories did I eat today?');
  expect(closed).toContain('Health is off for NOVA');
  const conversation = page.locator('section.nova-chat');
  if (!await conversation.isVisible()) await page.locator('.ns-answer').getByRole('button', {name: 'Open the conversation'}).click();
  await conversation.locator('.nova-turn-assistant').last().getByRole('button', {name: /Permissions/}).first().click();
  await page.getByRole('button', {name: 'Allow Health', exact: true}).click();
  await expect(page.getByText('Health is open to NOVA and ZIGi now. Close it with the switches below.')).toBeVisible();
  await page.goto('/app/nova'); await hydrated(page);
  await page.keyboard.press('Shift');
  const lifted = await novaSays(page, 'What did I lift today?');
  expect(lifted).toContain('Lifted today');
  expect(lifted).toMatch(/Squat[^.]*80 kg × 5/);
});

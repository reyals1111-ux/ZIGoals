import {expect, test} from '@playwright/test';
import {AT, TODAY, health, healthRecord, openHealth, openTab} from './ap-health-fixtures';

// Session AP (feature 3, DRAFT for the integrator): orbits from the person's own goals, in Health → Activity.
test('the steps orbit follows the daily step target, in words; no calories and no other app\'s ring names', async ({page}) => {
  const h = health({targets: {...health().targets, steps: 8000}, activity: [{id: 'health_activity-ap-0001', date: TODAY, name: 'Walk', steps: 6000, minutes: 40, createdAt: AT, updatedAt: AT}]});
  await openHealth(page, healthRecord(h));
  await openTab(page, 'Activity');
  const card = page.getByRole('region', {name: 'Your orbits'});
  await expect(card).toContainText('6,000 of 8,000 steps today');
  await expect(card).toContainText('75% of the way');
  await expect(card).toContainText('Your daily step target (Health → Targets)');
  await expect(card).not.toContainText(/kcal|calorie|\bMove\b|\bExercise\b|\bStand\b/i);
  // One planet per goal, side by side: never nested rings.
  await expect(card.locator('.ap-orbit svg')).toHaveCount(1);
});

import {expect, test} from '@playwright/test';
import {AT, back, health, healthRecord, openHealth, openTab} from './ap-health-fixtures';

// Session AP (feature 4, DRAFT for the integrator): the last 90 days against the last 365, with arrow and words.
test('steps up over a full year of records; the days on each side are said', async ({page}) => {
  const activity = Array.from({length: 365}, (_, i) => ({id: `health_activity-ap-${String(i).padStart(4, '0')}`, date: back(i), name: 'Walk', steps: i < 90 ? 10_000 : 6_000, minutes: 30, createdAt: AT, updatedAt: AT}));
  await openHealth(page, healthRecord(health({activity})));
  await openTab(page, 'Activity');
  const card = page.getByRole('region', {name: 'Trends'});
  await expect(card).toContainText('Steps a day: Up');
  await expect(card).toContainText('Last 90 days: 10,000 steps on average (90 days recorded)');
  await expect(card).toContainText('(365 days)');
  await expect(card).not.toContainText(/better|worse/i);
});

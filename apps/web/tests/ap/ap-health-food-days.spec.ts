import {expect, test} from '@playwright/test';
import {healthRecord, openHealth, openTab, withDiary} from './ap-health-fixtures';

// Session AP (feature 7, DRAFT for the integrator): days with food logged this month, derived from the diary.
test('three logged days of fourteen, each day marked, nothing judged', async ({page}) => {
  await openHealth(page, healthRecord(withDiary([{date: '2026-11-01', meal: 'Breakfast'}, {date: '2026-11-01', meal: 'Lunch'}, {date: '2026-11-07', meal: 'Dinner'}, {date: '2026-11-14', meal: 'Snacks'}, {date: '2026-10-31', meal: 'Lunch'}])));
  await openTab(page, 'Insights');
  const card = page.getByRole('region', {name: 'Days you logged food'});
  await expect(card).toContainText('3 of 14 days so far this month');
  await expect(card.getByRole('listitem')).toHaveCount(14);
  await expect(card.getByRole('listitem', {name: /food logged$/})).toHaveCount(3);
});

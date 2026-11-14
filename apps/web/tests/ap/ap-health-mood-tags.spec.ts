import {expect, test} from '@playwright/test';
import {MOOD_TAGS_KEY} from '../../lib/mood-tags/schema';
import {AT, back, health, healthRecord, openHealth, openTab, stored} from './ap-health-fixtures';

// Session AP (feature 1, DRAFT for the integrator): tags on a mood check-in, and "What goes with your good days".
test('a tag is added to today\'s mood in its own record, and Insights shows what goes with good days, in counts', async ({page}, info) => {
  test.skip(info.project.name !== 'desktop', 'the mood card is folded on a phone; one project is enough');
  const days: Record<string, {mood: number; at: string}> = {};
  const tags: Record<string, string[]> = {};
  for (let i = 0; i < 20; i++) days[back(i)] = {mood: i > 0 && i < 7 ? 5 : 3, at: AT};
  for (let i = 1; i < 7; i++) tags[back(i)] = ['walk'];
  await openHealth(page, {...healthRecord(health({moods: {version: 1, days}})), [MOOD_TAGS_KEY]: {version: 1, entries: tags}});
  const card = page.getByRole('region', {name: 'How does today feel?'});
  await card.getByLabel(/^A tag, up to 24 characters/).fill('friends');
  await card.getByRole('button', {name: 'Add tag'}).click();
  await expect(card.getByRole('button', {name: 'Remove the tag friends'})).toBeVisible();
  expect((await stored<{entries: Record<string, string[]>}>(page, MOOD_TAGS_KEY)).entries['2026-11-14']).toEqual(['friends']);
  // A tag over 24 characters is a field error, and nothing is saved.
  await card.getByLabel(/^A tag, up to 24 characters/).fill('x'.repeat(30));
  await card.getByRole('button', {name: 'Add tag'}).click();
  await expect(card.getByRole('alert')).toHaveText('A tag is up to 24 characters.');
  await openTab(page, 'Insights');
  const insight = page.getByRole('region', {name: 'What goes with your good days'});
  await expect(insight).toContainText('On 6 of the 6 days you tagged “walk”, your mood was Good or Great; on the other 14 days with a mood, 0. Goes with, not a cause.');
});

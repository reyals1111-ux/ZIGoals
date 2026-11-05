import {expect, test} from '@playwright/test';
import {hydrated, loadShowcase} from '../../ah-helpers';

// Session AL sweep 4 (C-BN-23): Goals lists the rating goals set on Chess (settings v3 `chess.goals`) as read-only cards
// that open Chess. The Showcase has one: chess.com Rapid, 1,600. Nothing on the card edits or removes it.
test.use({viewport: {width: 1440, height: 900}, timezoneId: 'Europe/Brussels', locale: 'en-GB'});

test('C-BN-23: the Showcase\'s chess rating goal is on Goals, read-only, and opens Chess', async ({page}) => {
  await loadShowcase(page);
  await page.goto('/app/goals'); await hydrated(page);
  const section = page.getByRole('region', {name: 'Chess rating goals'});
  await expect(section).toBeVisible();
  const card = section.getByRole('link', {name: /^chess\.com Rapid: reach 1,600/});
  await expect(card).toHaveAttribute('href', '/app/chess');
  await expect(card).toContainText(/now|No rating read yet/);
  await expect(section.getByRole('button')).toHaveCount(0);
  // Completed shows none (the Showcase's goal is active); All shows it again.
  await page.getByRole('navigation', {name: 'Goal views'}).getByRole('button', {name: 'Completed', exact: true}).click();
  await expect(page.getByRole('region', {name: 'Chess rating goals'})).toHaveCount(0);
  await page.getByRole('navigation', {name: 'Goal views'}).getByRole('button', {name: 'All', exact: true}).click();
  await expect(page.getByRole('region', {name: 'Chess rating goals'}).getByRole('link')).toHaveCount(1);
  await card.click();
  await expect(page).toHaveURL(/\/app\/chess$/);
});

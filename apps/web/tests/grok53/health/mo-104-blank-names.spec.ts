import {expect, test} from '@playwright/test';
import {freshHealth, openHealth} from './al-health-helpers';

// Session AL lane L2 (P-MO-44, P-MO-47): Moscow MO-104 (a food named only with spaces came back as "Could not save…
// available browser storage") and MO-108 ("Save recipe" greyed out with no reason). Desktop, fresh profile.
test.use({timezoneId: 'Europe/Brussels', viewport: {width: 1280, height: 900}});

test('MO-104: a name of only spaces is refused at the field, never as storage', async ({page}) => {
  await freshHealth(page);
  await openHealth(page, '?view=foods');
  await page.getByRole('button', {name: 'New food', exact: true}).click();
  const form = page.getByRole('form', {name: 'Food details'});
  await form.getByLabel('Food name').fill('   ');
  // The serving weight is a required field: left empty, the browser's own bubble stops the submit before the app sees
  // the name. Moscow filled it (the save reached storage), so the name is the only thing wrong here.
  await form.getByLabel('Serving weight (g)').fill('100');
  await form.getByLabel('Calories (kcal)').fill('100');
  await form.getByRole('button', {name: 'Save food'}).click();
  await expect(form.getByRole('alert')).toHaveText('Enter a name with at least one visible character.');
  await expect(form.getByLabel('Food name')).toHaveAttribute('aria-invalid', 'true');
  await expect(page.getByText(/browser storage/)).toHaveCount(0);
});

import {expect, test} from '@playwright/test';
import {SYMPTOMS_KEY} from '../../lib/symptoms/schema';
import {health, healthRecord, openHealth, stored} from './ap-health-fixtures';

// Session AP (feature 2, DRAFT for the integrator): the symptom and factor tracker in Health → Diary.
test('an item is added and given a level today; a bad name is a field error; it stays on this device', async ({page}) => {
  await openHealth(page, healthRecord(health()));
  await page.getByText('Symptoms and factors (optional)', {exact: true}).click();
  const panel = page.getByRole('region', {name: 'Symptoms and factors'});
  const form = panel.getByRole('form', {name: 'Add something to follow'});
  await form.getByLabel('Name').fill('x'.repeat(45));
  await form.getByRole('button', {name: 'Add'}).click();
  await expect(panel.getByRole('alert')).toHaveText('A name is up to 40 characters.');
  await expect(form.getByLabel('Name')).toHaveAttribute('aria-invalid', 'true');
  await form.getByLabel('Name').fill('Fictional headache');
  await form.getByRole('button', {name: 'Add'}).click();
  await panel.getByRole('group', {name: 'Fictional headache today'}).getByRole('button', {name: 'Mild'}).click();
  await expect(panel.getByRole('group', {name: 'Fictional headache today'}).getByRole('button', {name: 'Mild'})).toHaveAttribute('aria-pressed', 'true');
  const r = await stored<{items: {id: string; name: string}[]; days: Record<string, Record<string, number>>}>(page, SYMPTOMS_KEY);
  expect(r.items.map(i => i.name)).toEqual(['Fictional headache']);
  expect(r.days['2026-11-14']).toEqual({'fictional-headache': 1});
  await expect(panel).toContainText('ZIGi and NOVA do not read it');
});

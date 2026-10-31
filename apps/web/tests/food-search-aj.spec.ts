import {expect, test} from '@playwright/test';
import {DASHBOARD_SETTINGS_KEY, presetSettings} from '../lib/dashboard-settings';

// Session AJ (item 22): a barcode that is not found offers the Swiss food database; the search sends only the words;
// each result names its source; a pick fills the same review form. The app's food route is MOCKED (fictional values).
const RESULT = {id: '1234', name: 'Apple, raw (fixture)', basis: 'per-100g', nutrients: {kcal: 52, proteinMg: 300, carbsMg: 11400, fatMg: 200, fiberMg: 2400, sugarMg: 10400, saltMg: 0}, source: 'Swiss Food Composition Database', datasetVersion: 'V 7.1', attribution: 'Source: Swiss Food Composition Database V 7.1, Federal Food Safety and Veterinary Office FSVO (naehrwertdaten.ch)', link: 'https://naehrwertdaten.ch/en/'};

test('not found → search the Swiss food database → pick a food → the review form is filled, with its source', async ({page}) => {
  const asked: string[] = [];
  await page.route('**/api/**', route => {
    const url = new URL(route.request().url()); asked.push(url.pathname + url.search);
    if (url.pathname === '/api/food-lookup' && url.searchParams.has('q')) return route.fulfill({status: 200, json: {results: [RESULT]}});
    if (url.pathname === '/api/food-lookup') return route.fulfill({status: 404, json: {error: 'NOT_FOUND'}});
    return route.fulfill({status: 503, json: {error: 'offline fixture'}});
  });
  await page.addInitScript(([k, v]) => { try { localStorage.setItem(k!, v!); localStorage.setItem('zigoals:onboarding:v1', JSON.stringify({version: 1, seen: true})); } catch { /* storage denied */ } }, [DASHBOARD_SETTINGS_KEY, JSON.stringify({...presetSettings('health'), onboarded: true})]);
  await page.goto('/app/health');
  await page.getByText('Scan or look up a food barcode', {exact: true}).click();
  const lookup = page.getByRole('region', {name: 'Barcode food lookup'});
  await lookup.getByLabel('Product barcode').fill('4000000000000');
  await lookup.getByRole('button', {name: 'Look up barcode', exact: true}).click();
  await expect(lookup).toContainText('Not found. Search the Swiss food database instead?');
  await lookup.getByRole('button', {name: 'Search the Swiss food database'}).click();
  const search = lookup.getByRole('search', {name: 'Swiss food database search'});
  // Session AK Part 1c: the offline library is searched on the device first; then only the typed words leave it.
  await expect(search).toContainText('only the words you type go to the Swiss food database');
  await search.getByLabel('Food name').fill('apple');
  await search.getByLabel('Food name').press('Enter');
  const results = lookup.getByRole('list', {name: 'Swiss food database results'});
  await expect(results.getByRole('link', {name: RESULT.attribution})).toHaveAttribute('href', RESULT.link);
  await results.getByRole('button', {name: 'Use Apple, raw (fixture)'}).click();
  await expect(lookup.getByLabel('Calories (kcal)', {exact: true})).toHaveValue('52');
  await expect(lookup).toContainText('Values per 100 g of the food as eaten.');
  const searches = asked.filter(a => a.startsWith('/api/food-lookup?q='));
  expect(searches).toHaveLength(1);
  expect(searches[0]).toMatch(/^\/api\/food-lookup\?q=apple&lang=en$/);
});

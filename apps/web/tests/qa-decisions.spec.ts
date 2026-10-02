import {expect, test} from '@playwright/test';
import {navLink} from './phone-nav';
import {buildShowcase} from '../lib/showcase-data';

// Session I, Part 10: the owner's QA decisions that show in the browser (QA-23 and QA-38; QA-35, QA-36 and QA-37 are
// pinned by unit tests in lib/).

test('QA-23: offline, in-app links keep the page, which keeps saving; back online they work again', async ({page, context}) => {
  await page.route('**/api/**', route => route.fulfill({status: 503, json: {error: 'offline fixture'}}));
  await page.addInitScript(() => { try { localStorage.setItem('zigoals:onboarding:v1', JSON.stringify({version: 1, seen: true})); } catch { /* storage denied */ } });
  await page.goto('/app/health');
  await expect(page.getByRole('heading', {level: 1})).toBeVisible();
  const notice = page.getByRole('alert').filter({hasText: 'You’re offline.'});
  await expect(notice).toHaveCount(0);
  await context.setOffline(true);
  await expect(notice).toHaveText('You’re offline. This page keeps working and saves on this device; other pages open again when you’re back online.');
  await (await navLink(page, 'Habits')).click();
  await page.waitForTimeout(500);
  await expect(page).toHaveURL(/\/app\/health$/);
  // The open page still works and saves.
  await page.getByRole('button', {name: 'Add 250 mL', exact: true}).click();
  await expect(page.getByRole('status').filter({hasText: 'Water recorded.'})).toBeVisible();
  await context.setOffline(false);
  await expect(notice).toHaveCount(0);
  await (await navLink(page, 'Habits')).click();
  await expect(page).toHaveURL(/\/app\/habits$/);
});

test('QA-38: a Goal with a source that has no value shows its progress as a lower bound, and says why', async ({page}) => {
  await page.route('**/api/**', route => route.fulfill({status: 503, json: {error: 'offline fixture'}}));
  // The Showcase emergency fund, with its USDC source's saved value removed: one source valued, one not.
  const data = JSON.parse(buildShowcase('2026-10-01').records['zigoals:platform:v1']!);
  data.positions = data.positions.map((p: {id: string}) => p.id === 'showcase-usdc' ? {...p, valuation: undefined, valuationMode: 'automatic'} : p);
  await page.addInitScript(raw => { try { localStorage.setItem('zigoals:onboarding:v1', JSON.stringify({version: 1, seen: true})); localStorage.setItem('zigoals:platform:v1', raw); } catch { /* storage denied */ } }, JSON.stringify(data));
  await page.goto('/app/goals/tracked');
  const card = page.locator('[data-goal-key="private:9201"]');
  await expect(card).toContainText(/At least \$[\d,]+\.\d{2}/);
  await expect(card).toContainText(/At least \d+(\.\d+)?% of your goal funded/);
  await expect(card).toContainText('1 source has no value yet, so progress may be higher.');
  await expect(card).toContainText(/At most \$[\d,]+\.\d{2} remaining/);
  const ring = card.getByRole('progressbar');
  await expect(ring).toHaveAttribute('aria-valuetext', /^At least \d+(\.\d+)?% · some sources have no value yet$/);
  await page.goto('/app/goals/tracked/9201');
  await expect(page.locator('.goal-detail-current')).toHaveText(/^At least /);
  await expect(page.locator('.goal-detail-facts')).toContainText(/At most \$/);
});

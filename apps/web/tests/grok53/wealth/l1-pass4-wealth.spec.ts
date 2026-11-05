import {expect, test, type Page} from '@playwright/test';
import {chooseChain} from '../../chain-choice';
import {hydrated, loadShowcase} from '../../ah-helpers';

/**
 * Session AL, lane L1 fourth pass (GROK53_REPLAY_L1_1.md "STILL OPEN / CHANGED"): the Wealth rows in the replay's
 * conditions (1280×800 Dark unless a row says otherwise, en-GB, Europe/Brussels; fresh profile or the Showcase as the
 * replay used). Market answers are offline (503), as on the replay's offline runs.
 */
test.use({viewport: {width: 1280, height: 800}, colorScheme: 'dark', locale: 'en-GB', timezoneId: 'Europe/Brussels'});
test.beforeEach(async ({page}) => {
  await chooseChain(page);
  await page.route('**/api/**', route => route.fulfill({status: 503, json: {error: 'offline fixture'}}));
  await page.addInitScript(() => { try { localStorage.setItem('zigoals:onboarding:v1', JSON.stringify({version: 1, seen: true})); } catch { /* storage denied */ } });
});

async function addCash(page: Page, amount: string) {
  await page.getByRole('button', {name: '+ Add asset'}).first().click();
  const sheet = page.getByRole('dialog', {name: 'Add to your wealth'});
  await sheet.getByRole('group', {name: 'Asset categories'}).getByRole('button', {name: 'Cash', exact: true}).click();
  await sheet.getByLabel('Cash amount').fill(amount);
  await sheet.getByRole('button', {name: 'Save asset'}).click();
  return sheet;
}

test('TK-041 / W7: cash past the trillion cap is refused under the amount field (marked, described), never a rounded "check this?"', async ({page}) => {
  await page.goto('/app/wealth'); await hydrated(page);
  const sheet = await addCash(page, '999999999999999999');
  const field = sheet.getByLabel('Cash amount');
  await expect(field).toHaveAttribute('aria-invalid', 'true');
  const described = await field.getAttribute('aria-describedby');
  expect(described).toBeTruthy();
  await expect(page.locator(`[id="${described!.split(' ').at(-1)}"]`)).toHaveText('Enter an amount up to a trillion.');
  await expect(sheet.getByText(/is more than a billion/)).toHaveCount(0);
  // The message sits under the field, above Save.
  const message = (await page.locator(`[id="${described!.split(' ').at(-1)}"]`).boundingBox())!, save = (await sheet.getByRole('button', {name: 'Save asset'}).boundingBox())!;
  expect(message.y).toBeLessThan(save.y);
  await expect(field).toBeFocused();
});

test('TK-190: an archived debt offers "Unarchive", the word an archived asset uses', async ({page}) => {
  await page.goto('/app/wealth'); await hydrated(page);
  await page.getByRole('button', {name: 'Add an account or debt'}).click();
  const add = page.getByRole('form', {name: 'Add an account or debt'});
  await add.getByLabel('Kind').selectOption({label: 'Credit card'});
  await add.getByLabel('Name', {exact: true}).fill('Visa');
  await add.getByLabel('Currency').fill('EUR');
  await add.getByLabel(/What you owe now|Balance now/).fill('1200');
  await add.getByRole('button', {name: 'Add', exact: true}).click();
  await page.locator('.accounts-list li').filter({hasText: 'Visa'}).getByRole('button', {name: 'Archive', exact: true}).click();
  const archived = page.locator('details.accounts-archived');
  await archived.locator('summary').click();
  await expect(archived.getByRole('button', {name: 'Unarchive', exact: true})).toBeVisible();
  await expect(archived.getByRole('button', {name: 'Restore', exact: true})).toHaveCount(0);
});

test('PR-053 (P-PR-28): an archived asset can be deleted for good from its page, with Undo', async ({page}) => {
  await page.goto('/app/wealth'); await hydrated(page);
  await page.getByRole('button', {name: '+ Add asset'}).first().click();
  const sheet = page.getByRole('dialog', {name: 'Add to your wealth'});
  await sheet.getByRole('group', {name: 'Asset categories'}).getByRole('button', {name: 'Custom', exact: true}).click();
  await sheet.getByLabel('Asset name').fill('Old camera');
  await sheet.getByLabel('Total holding value').fill('300');
  await sheet.getByRole('button', {name: 'Save asset'}).click();
  await page.getByRole('link', {name: /Old camera/}).first().click();
  await page.getByRole('button', {name: 'Archive asset'}).click();
  await page.getByRole('button', {name: 'Confirm archive'}).click();
  await page.getByRole('button', {name: 'Delete for good…'}).click();
  await expect(page.getByRole('group', {name: 'Delete Old camera for good'})).toContainText('Its price records and Activity lines go with it.');
  await page.getByRole('button', {name: 'Delete for good', exact: true}).click();
  await page.waitForURL('**/app/wealth');
  await expect(page.locator('.aa-toast')).toContainText('Old camera deleted.');
  await page.locator('.aa-toast').getByRole('button', {name: /Undo/}).click();
  await expect(page.locator('.aa-toast')).toContainText('Old camera is back, archived.');
  await page.goto('/app/wealth'); await hydrated(page);
  await page.getByRole('link', {name: /Old camera/}).first().click();
  await expect(page.locator('.asset-archived-notice')).toContainText('Archived.');
});

test('PR-001 / PR-048 / PR-081: Showcase Nebula — the pulse never says "n of n current" beside "price older than 15 minutes"', async ({page}) => {
  await page.emulateMedia({colorScheme: 'dark'});
  await loadShowcase(page);
  await page.goto('/app/wealth'); await hydrated(page);
  const pulse = page.getByRole('region', {name: 'Portfolio pulse'}).or(page.locator('section.portfolio-pulse'));
  const text = await pulse.first().innerText();
  const counted = /(\d+) of (\d+) market prices? current/.exec(text);
  if (counted && counted[1] === counted[2]) expect(text).not.toMatch(/older than 15 minutes/);
});

test('PR-049 / PR-007: Showcase — the camera page has no market-price sentence and counts "1 item"; Apple states both values', async ({page}) => {
  await loadShowcase(page);
  await page.goto('/app/wealth/asset/showcase-custom'); await hydrated(page);
  await expect(page.locator('main')).not.toContainText('CoinGecko reference price and provider chart');
  await expect(page.locator('main')).toContainText('It has no market price: its value is the one entered by hand.');
  await expect(page.locator('main')).not.toContainText(/\b1 CUSTOM\b/);
  await page.goto('/app/wealth/asset/showcase-aapl'); await hydrated(page);
  const gap = page.locator('.asset-reference-gap');
  if (await gap.count()) await expect(gap).toContainText(/At this reference price, 30 AAPL would be .*Your own value, .*7,500\.00, is the one your wealth counts\./);
});

test('TK-181 / W24: Showcase — Gold 10 → 2 asks once and names the Goal it would cut', async ({page}) => {
  await loadShowcase(page);
  await page.goto('/app/wealth/asset/showcase-gold'); await hydrated(page);
  await page.getByRole('button', {name: 'Edit asset'}).click();
  const sheet = page.getByRole('dialog', {name: /^Edit /});
  await sheet.getByLabel('Asset quantity').fill('2');
  await sheet.getByRole('button', {name: 'Save changes'}).click();
  await expect(sheet.getByText(/is less than the .* your Goals have allocated/)).toBeVisible();
  await expect(sheet.getByRole('button', {name: 'Keep this amount'})).toBeVisible();
});

test('TK-196 / W24: Showcase — archiving USD Coin (it released Emergency fund) flags that Goal for review', async ({page}) => {
  await loadShowcase(page);
  await page.goto('/app/wealth/asset/showcase-usdc'); await hydrated(page);
  await page.getByRole('button', {name: 'Archive asset'}).click();
  await page.getByRole('button', {name: 'Release allocations & archive'}).click();
  await page.goto('/app/goals'); await hydrated(page);
  await expect(page.locator('article, li, section').filter({hasText: 'Emergency fund'}).filter({hasText: 'An archived asset no longer counts toward this goal.'}).first()).toBeVisible();
});

test('TK-226: Showcase Today — the over-allocation notice can be dismissed', async ({page}) => {
  await loadShowcase(page);
  await page.goto('/app/wealth/asset/showcase-gold'); await hydrated(page);
  await page.getByRole('button', {name: 'Edit asset'}).click();
  const sheet = page.getByRole('dialog', {name: /^Edit /});
  await sheet.getByLabel('Asset quantity').fill('2');
  await sheet.getByRole('button', {name: 'Save changes'}).click();
  await sheet.getByRole('button', {name: 'Keep this amount'}).click();
  await page.goto('/app'); await hydrated(page);
  const notice = page.getByRole('alert').filter({hasText: 'A saved allocation exceeds its current source balance'});
  await expect(notice).toBeVisible();
  await notice.getByRole('button', {name: 'Dismiss this notice in this tab'}).click();
  await expect(notice).toHaveCount(0);
});

test('TK-6B-09: Light Showcase — the "Hide amounts" edge is at least 3:1 against the page', async ({page}) => {
  await page.addInitScript(() => { try { const k = 'zigoals:ui-prefs:v1', raw = localStorage.getItem(k), v = raw ? JSON.parse(raw) : {version: 1}; localStorage.setItem(k, JSON.stringify({...v, theme: 'light'})); } catch { /* storage denied */ } });
  await page.emulateMedia({colorScheme: 'light'});
  await loadShowcase(page);
  await page.goto('/app/wealth'); await hydrated(page);
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  const button = page.getByRole('button', {name: 'Hide amounts'}).first();
  const ratio = await button.evaluate(el => {
    const rgb = (c: string) => (c.match(/[\d.]+/g) ?? []).map(Number);
    const lum = ([r, g, b]: number[]) => { const f = (v: number) => { const s = v / 255; return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r!) + 0.7152 * f(g!) + 0.0722 * f(b!); };
    let bg = 'rgb(255,255,255)';
    for (let at = el.parentElement; at; at = at.parentElement) { const c = getComputedStyle(at).backgroundColor; const v = rgb(c); if (v.length >= 3 && (v[3] ?? 1) > 0.9) { bg = c; break; } }
    const edge = rgb(getComputedStyle(el).borderTopColor), alpha = edge[3] ?? 1, base = rgb(bg);
    const mixed = [0, 1, 2].map(i => edge[i]! * alpha + base[i]! * (1 - alpha));
    const [a, b] = [lum(mixed), lum(base)].sort((x, y) => y - x);
    return (a! + 0.05) / (b! + 0.05);
  });
  expect(ratio).toBeGreaterThanOrEqual(3);
});

test('TK-036: the calculator Years field takes at most two digits, so "10100" cannot be typed by a slip', async ({page}) => {
  await page.goto('/app/wealth/calculator'); await hydrated(page);
  const years = page.getByRole('textbox', {name: 'Years', exact: true});
  await years.fill('');
  await years.pressSequentially('10100');
  await expect(years).toHaveValue('10');
});

test('TK-127: a net worth of a trillion reads short in the hero, exact for screen readers', async ({page}) => {
  await page.goto('/app/wealth'); await hydrated(page);
  await page.getByRole('button', {name: 'Add an account or debt'}).click();
  const add = page.getByRole('form', {name: 'Add an account or debt'});
  await add.getByLabel('Kind').selectOption({label: 'Credit card'});
  await add.getByLabel('Name', {exact: true}).fill('Car loan');
  await add.getByLabel('Currency').fill('EUR');
  await add.getByLabel(/What you owe now|Balance now/).fill('999999999999.99');
  await add.getByRole('button', {name: 'Add', exact: true}).click();
  await add.getByRole('button', {name: 'Keep this amount'}).click();
  const hero = page.getByRole('group', {name: 'Net worth after debts'});
  await expect(hero.locator('[aria-hidden=true]').first()).toHaveText(/^−€1(T|tn)$/);
  await expect(hero.locator('.sr-only')).toContainText('-€999,999,999,999.99');
});

/** TK-224 / TK-210 / W18 / W19 (spec WE10 failed at 375 with the crypto modules on): no L1 page scrolls sideways. */
test.describe('375 px, crypto modules chosen, Showcase', () => {
  test.use({viewport: {width: 375, height: 812}});
  test('TK-224 / W18 / W19: Wealth, Portfolio, Markets, Add money and the calculator fit 375 px', async ({page}) => {
    await loadShowcase(page);
    for (const path of ['/app/wealth', '/app/portfolio', '/app/markets', '/app/wealth/add-money', '/app/wealth/calculator', '/app/wealth/asset/showcase-btc']) {
      await page.goto(path); await hydrated(page);
      const wide = await page.evaluate(() => ({scroll: document.documentElement.scrollWidth, past: [...document.querySelectorAll<HTMLElement>('main *, .alpha-notice, .alpha-notice *')].filter(el => { const r = el.getBoundingClientRect(); if (r.width === 0 || r.right <= innerWidth + 1) return false; for (let at = el.parentElement; at; at = at.parentElement) { const o = getComputedStyle(at).overflowX; if (o === 'auto' || o === 'scroll' || o === 'hidden' || o === 'clip') return false; } return true; }).slice(0, 3).map(el => `${el.tagName.toLowerCase()}.${el.className}`)}));
      expect(wide.past, path).toEqual([]);
      expect(wide.scroll, path).toBeLessThanOrEqual(375);
    }
  });
});

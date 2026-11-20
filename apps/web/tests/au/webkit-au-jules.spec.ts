import {expect, test} from '@playwright/test';
import {at, DAY1, freshWeek, hydrated, setup, ZONE} from './au-helpers';

/**
 * Session AU (ADR-044, the friends dress rehearsal): Jules on his phone, in the Light theme. Curious about crypto, he wanted
 * to watch one public Bitcoin address. In the rehearsal no search word found it ("watch", "address", "xpub"), and the form
 * sat behind "Look up an address" in Wealth's fourth section (J-6). Now Search offers "Watch a Bitcoin address
 * (view-only)", and it leads to the form, which says it never takes a private key. No wallet, no signing.
 * Phone only (the mobile project); named webkit-au-* so CI's WebKit job runs it on an iPhone profile too.
 */
test.skip(({isMobile}) => !isMobile, 'the phone part of Jules\'s week (his desktop part is tests/au/jules.spec.ts)');
test.use({timezoneId: ZONE, actionTimeout: 15_000});

test('Jules on the phone: Search finds the view-only Bitcoin address by "watch", and it leads to the form', async ({page}) => {
  test.setTimeout(120_000);
  await freshWeek(page, 'light', at(DAY1, '09:00'));
  const signing: string[] = [];
  page.on('request', r => { if (/\/api\/(chain\/(?!attestations)|positions)/.test(r.url()) && r.method() === 'POST') signing.push(r.url()); });
  await setup(page, [/^Goals & money/, /^Crypto & ZIGChain/]);
  for (const words of ['watch', 'bitcoin address', 'xpub']) {
    await page.getByRole('button', {name: 'Search'}).filter({visible: true}).first().click();
    const palette = page.getByRole('dialog', {name: 'Search'});
    await palette.getByRole('combobox').fill(words);
    await expect(palette.getByRole('option', {name: /^Watch a Bitcoin address \(view-only\)/})).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(palette).toBeHidden();
  }
  await page.getByRole('button', {name: 'Search'}).filter({visible: true}).first().click();
  await page.getByRole('dialog', {name: 'Search'}).getByRole('combobox').fill('watch');
  await page.getByRole('dialog', {name: 'Search'}).getByRole('option', {name: /^Watch a Bitcoin address/}).click();
  await page.waitForURL(/\/app\/wealth/); await hydrated(page);
  const lookup = page.getByRole('button', {name: 'Look up an address', exact: true});
  await lookup.scrollIntoViewIfNeeded();
  await lookup.click();
  await expect(page.getByRole('form', {name: 'Look up an address'}).getByLabel('Public address')).toBeVisible();
  expect(signing).toEqual([]);
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
});

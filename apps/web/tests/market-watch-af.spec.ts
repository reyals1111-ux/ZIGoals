import {expect, test, type Page} from '@playwright/test';
import {openDevice, openIn, THEMES} from './parity/session';
import {nativeZigIdentity} from '../lib/market-quotes';

/**
 * Session AF (the owner's decision of 19 Oct, ADR-028 H131): Today's market watch never breaks a word, never runs out of a
 * card, keeps a price on one line and shows each figure of a card once, at every width from 320 to 1920 px, in every
 * theme, with prices and without them (the Showcase's own state: every price unavailable). A name too long for two lines
 * ends in an ellipsis and keeps its full text in a hover title (and on the asset's page, a tap away).
 */
const WIDTHS = [320, 390, 768, 1024, 1280, 1440, 1600, 1920];

/** Quotes in the shape the app verifies (lib/market-quotes.ts verifiedMarketQuote), for every favourite: long prices
 *  (eight-digit dollars) to stress a narrow card. Stamped a minute before the test's fixed clock. */
async function prices(page: Page) {
  const at = new Date(Date.now() - 60_000).toISOString();
  await page.route(url => url.pathname === '/api/market-quotes', async route => {
    const body = JSON.parse(route.request().postData() ?? '{}') as {requests?: {marketRef: {kind: string; id: string}; currency: string}[]};
    await route.fulfill({json: {quotes: (body.requests ?? []).map((q, i) => ({
      base: q.marketRef.kind === 'coin' && q.marketRef.id === 'zignaly' ? nativeZigIdentity : {network: `coingecko-${q.marketRef.kind}`, denom: q.marketRef.id, decimals: 0},
      marketRef: q.marketRef, currency: q.currency, price: String(Math.floor(1_082_345_678 / (i * 7 + 1))), priceDecimals: 2,
      source: q.marketRef.kind === 'rwa' ? 'CoinGecko tokenized RWA reference' : 'CoinGecko', providerAssetId: q.marketRef.id, observedAt: at, fetchedAt: at, verification: 'VERIFIED'}))}});
  });
}

/** Opens the watch where a phone folds it, then reads every card. */
async function read(page: Page) {
  const watch = page.locator('.market-watch').first();
  if (!(await watch.isVisible())) await page.locator('.phone-fold').filter({has: page.getByRole('button', {name: /^Your market watch/})}).first().locator('.phone-fold-toggle').click();
  await expect(watch).toBeVisible();
  await page.waitForTimeout(150);
  return watch.evaluate(root => {
    // A word is broken when its own text lands on more than one line.
    const broken: string[] = [];
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      for (const m of node.textContent!.matchAll(/\S+/g)) {
        const range = document.createRange(); range.setStart(node, m.index!); range.setEnd(node, m.index! + m[0].length);
        if (new Set([...range.getClientRects()].filter(r => r.width > 0).map(r => Math.round(r.top))).size > 1) broken.push(m[0]);
      }
    }
    const cards = [...root.querySelectorAll<HTMLElement>('.watch-card')].map(card => {
      const box = card.getBoundingClientRect(), name = card.querySelector('h3')!, price = card.querySelector<HTMLElement>('.watch-price')!;
      const out = [...card.querySelectorAll<HTMLElement>('*')].filter(e => { const r = e.getBoundingClientRect(); return r.width > 0 && (r.right > box.right + 0.5 || r.left < box.left - 0.5); }).map(e => e.className || e.tagName);
      const figures = (card.innerText.match(/[\d][\d,.]*%?/g) ?? []).filter(f => /\d{2}|%/.test(f));
      return {name: name.textContent, title: name.getAttribute('title'), nameFits: name.scrollWidth <= name.clientWidth + 1, price: price.textContent, priceLines: Math.round(price.getBoundingClientRect().height / parseFloat(getComputedStyle(price).lineHeight)), priceFits: price.scrollWidth <= price.clientWidth + 1, out, figures, width: box.width};
    });
    return {broken, cards};
  });
}

for (const withPrices of [false, true]) {
  for (const theme of THEMES) {
    test(`Today's market watch, ${theme}, ${withPrices ? 'with prices' : 'without prices'}: no broken word, nothing out of a card, each figure once, 320–1920 px`, async ({page}, info) => {
      test.skip(info.project.name !== 'desktop', 'One sweep of every width; phone widths are set on the desktop project.');
      test.setTimeout(150_000);
      await openDevice(page);
      if (withPrices) await prices(page); // after openDevice's catch-all, so it answers first
      await openIn(page, '/app', theme);
      for (const width of WIDTHS) {
        await page.setViewportSize({width, height: 900});
        await page.evaluate(() => scrollTo(0, 0));
        const {broken, cards} = await read(page);
        expect(cards.length, `${width}`).toBeGreaterThanOrEqual(3);
        expect(broken, `${width} px: words split across lines`).toEqual([]);
        for (const card of cards) {
          const where = `${width} px · ${card.name}`;
          expect(card.title, where).toBe(card.name);
          expect(card.out, `${where}: out of its card`).toEqual([]);
          expect(card.priceFits, `${where}: the price fits`).toBe(true);
          if (withPrices) { expect(card.price, where).toMatch(/\d/); expect(card.priceLines, `${where}: one line`).toBe(1); }
          else expect(card.price, where).toBe('Price unavailable');
          expect(new Set(card.figures).size, `${where}: a figure twice (${card.figures.join(' ')})`).toBe(card.figures.length);
        }
        // On a computer or tablet each card has room for its words: at least 220 px.
        if (width >= 768) for (const card of cards) expect(card.width, `${width} px · ${card.name}`).toBeGreaterThanOrEqual(220);
      }
    });
  }
}

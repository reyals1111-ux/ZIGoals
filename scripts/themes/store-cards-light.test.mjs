import {expect, it} from 'vitest';
import {buildAll} from './build-themes.mjs';

/**
 * Session AV lane 2 (fixb2): a store card's barcode is black on white in every theme, so a till's scanner can read it.
 * Light's sheet had mapped its white to near-black (#242424) behind black bars (tests/av2-money-store-cards.spec.ts found
 * it); the card's own rules for Light are carried into Light's sheet as written and outweigh the mapped ones.
 */
const {sheets} = buildAll(); // built once, as build-themes.test.mjs does
it('Light keeps a store card black on white', () => {
  const rule = selector => { const at = sheets.light.indexOf(`${selector}:not(#\\-) {`); expect(at, selector).toBeGreaterThan(-1); return sheets.light.slice(at, sheets.light.indexOf('}', at)); };
  expect(rule(':scope[data-theme=light] .store-card-dialog')).toMatch(/background(-color)?: #fff/);
  expect(rule(':scope[data-theme=light] .store-card-dialog')).toMatch(/color: #000/);
  expect(rule(':scope[data-theme=light] .store-card-bars')).toMatch(/background(-color)?: #fff/);
  expect(rule(':scope[data-theme=light] .store-card-full .primary')).toMatch(/background(-color)?: #000/);
  // Dark has no copy of Light's own rules.
  expect(sheets.dark).not.toContain('[data-theme=light] .store-card');
});

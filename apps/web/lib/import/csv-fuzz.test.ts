import {describe, expect, test} from 'vitest';
import {parseCsv} from '../csv/parse';
import {guessMapping, HOLDINGS_FIELDS, TRANSACTION_FIELDS} from '../csv/mapping';
import {createEmptyHealth, healthSchema, HEALTH_STORAGE_KEY} from '../health';
import {emptyHabitData, HABITS_KEY} from '../habits';
import {emptyPlatform, platformSchema, PLATFORM_KEY} from '../positions';
import {emptyPortfolioData, portfolioDataSchema, type PortfolioCoin} from '../portfolio/schema';
import {createPortfolio} from '../portfolio/store';
import {CSV_FORMULA_START} from '../export/csv-safe';
import {collectEverything} from '../export/everything';
import {exportHealthCsv} from '../health-daily';
import {encryptBackup, decryptBackup} from '../vault/backup';
import {applyNutritionImport, NUTRITION_FIELDS, planNutritionImport} from './nutrition';
import {applyHoldingsImport, applyTransactionImport, planHoldingsImport, planTransactionImport, resolveCoinWith} from './holdings';

// Session X P2.4: hostile files into the CSV importers (meals, holdings, Portfolio transactions), hostile names out
// through every CSV the app writes, and damaged files into backup restore. Seeded, fictional, nothing leaves the test.
function rng(seed: number) { return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const pick = <T,>(list: readonly T[], r: () => number) => list[Math.floor(r() * list.length)]!;
const AT = '2026-10-01T10:00:00.000Z', TODAY = '2026-10-01', IMPORT = '0f1e2d3c-4b5a-4697-8899-aabbccddeeff';
const HOSTILE = ['=cmd|" /C calc"!A0', '+SUM(A1:A9)', '-2+3', '@SUM(1)', '\t=1', '\r=1', '＝HYPERLINK("x")', '‮evil‬', 'نوم', 'שינה', '🏃‍♀️', '"quoted, with comma"', 'line\nbreak', '\u0000'];
const PIECES = [',', ';', '\t', '"', '""', '\n', '\r\n', '\r', '﻿', '\u0000', 'é', '日本', '1e308', '-0', 'NaN', '2026-02-30', '31/12/2026', '9999-99-99', ...HOSTILE];
const INTERNAL = /undefined|is not a function|Cannot read|Unexpected token|in JSON|RangeError|TypeError|ZodError|"code":|operation-specific|OperationError|Maximum call stack/;
const MEALS = 'Date,Meal,Food,Brand,Serving size,Servings,Calories,Protein (g),Carbohydrates (g),Fat (g),Sodium\n2026-09-28,Breakfast,Oats,Mill,100 g,0.5,380,13,67,7,120\n2026-09-29,Dinner,Soup,,250 ml,1,120,4,10,2,800\n';
const HOLDINGS = 'Name,Symbol,Quantity,Category,Value,Currency\nGold,XAU,2,Precious metals,,EUR\nApple,AAPL,10,Stocks,1500,USD\nBank,,500,Cash,,EUR\n';
const TRADES = 'Date,Type,Pair,Amount,Price,Fee,Note\n2026-09-01,Buy,BTC,0.5,60000,10,first\n2026-09-02,Deposit,ETH,2,,,\n2026-09-03,Sell,BTC,0.2,65000,,\n';
const BTC: PortfolioCoin = {ref: {kind: 'coin', provider: 'coingecko', id: 'bitcoin'}, name: 'Bitcoin', symbol: 'BTC'};
const ETH: PortfolioCoin = {ref: {kind: 'coin', provider: 'coingecko', id: 'ethereum'}, name: 'Ethereum', symbol: 'ETH'};
const resolve = resolveCoinWith([{ref: BTC.ref, name: 'Bitcoin', symbol: 'BTC'}, {ref: ETH.ref, name: 'Ethereum', symbol: 'ETH'}], [BTC]);
/** A file damaged on purpose: pieces inserted, cut short, or cells replaced with hostile values. */
function damage(text: string, r: () => number): string {
  const kind = Math.floor(r() * 3);
  if (kind === 0) { let t = text; for (let i = 0; i < 1 + Math.floor(r() * 8); i++) { const at = Math.floor(r() * t.length); t = t.slice(0, at) + pick(PIECES, r) + t.slice(at); } return t; }
  if (kind === 1) return text.slice(0, Math.floor(r() * text.length));
  return text.split('\n').map((line, i) => i === 0 ? line : line.split(',').map(cell => r() < 0.3 ? pick(PIECES, r) : cell).join(',')).join('\n');
}

describe('CSV importers, fed broken and hostile files', () => {
  test('the parser, on 400 damaged files: rows of strings, or a refusal in words (no header, too many columns or rows)', () => {
    let refused = 0;
    for (let seed = 1; seed <= 400; seed++) {
      const r = rng(seed), text = damage(pick([MEALS, HOLDINGS, TRADES], r), r);
      let parsed;
      try { parsed = parseCsv(text); } catch (error) { refused++; expect(error).toBeInstanceOf(Error); expect((error as Error).message).toMatch(/^This file /); continue; }
      expect(parsed.header.every(c => typeof c === 'string')).toBe(true);
      expect(parsed.rows.every(row => row.every(c => typeof c === 'string'))).toBe(true);
    }
    expect(refused).toBeLessThan(400);
  });
  // An apply step may refuse the whole import in words ("… Nothing was imported."); otherwise its result passes the schema.
  const appliesOrRefuses = (apply: () => unknown, schema: {safeParse: (v: unknown) => {success: boolean}}, label: string) => {
    let next;
    try { next = apply(); } catch (error) { expect(error).toBeInstanceOf(Error); expect((error as Error).message, label).not.toMatch(INTERNAL); expect((error as Error).message, label).toMatch(/Nothing was imported|ZIGoals keeps up to/); return; }
    expect(schema.safeParse(next).success, label).toBe(true);
  };
  const parsedOrEmpty = (text: string) => { try { return parseCsv(text); } catch { return {header: [] as string[], rows: [] as string[][]}; } };
  test('meals, holdings and transactions: 200 damaged files each are planned without a throw, refusals in words, and what applies passes the store\'s schema', () => {
    for (let seed = 1; seed <= 200; seed++) {
      const r = rng(seed + 1000);
      const meals = parsedOrEmpty(damage(MEALS, r)), mealPlan = planNutritionImport({rows: meals.rows, mapping: guessMapping(meals.header, NUTRITION_FIELDS), numberStyle: 'point', dateFormat: 'iso', basis: 'serving', today: TODAY, importId: IMPORT, at: AT});
      for (const refused of mealPlan.refused) expect(refused.reason).not.toMatch(INTERNAL);
      appliesOrRefuses(() => applyNutritionImport(createEmptyHealth(), mealPlan), healthSchema, `meals #${seed}`);
      const holdings = parsedOrEmpty(damage(HOLDINGS, r)), holdingPlan = planHoldingsImport({rows: holdings.rows, mapping: guessMapping(holdings.header, HOLDINGS_FIELDS), numberStyle: 'point'});
      for (const refused of holdingPlan.refused) expect(refused.reason).not.toMatch(INTERNAL);
      appliesOrRefuses(() => applyHoldingsImport(emptyPlatform(), holdingPlan.ready, {importId: IMPORT, at: AT}), platformSchema, `holdings #${seed}`);
      const trades = parsedOrEmpty(damage(TRADES, r)), tradePlan = planTransactionImport({rows: trades.rows, mapping: guessMapping(trades.header, TRANSACTION_FIELDS), numberStyle: 'point', dateFormat: 'iso', today: TODAY, resolveCoin: resolve});
      for (const refused of tradePlan.refused) expect(refused.reason).not.toMatch(INTERNAL);
      const base = createPortfolio(emptyPortfolioData(), {id: 'p1', name: 'Fictional', kind: 'real', currency: 'USD', createdAt: AT});
      appliesOrRefuses(() => applyTransactionImport(base, 'p1', tradePlan.ready, {importId: IMPORT, at: AT}), portfolioDataSchema, `transactions #${seed}`);
    }
  });
});

describe('every CSV the app writes is formula-safe, whatever the names', () => {
  test('hostile names in Goals, Habits, Health and links come out with no cell a spreadsheet would run', () => {
    const health = createEmptyHealth();
    const records: Record<string, string> = {
      [HABITS_KEY]: JSON.stringify(emptyHabitData()),
      [HEALTH_STORAGE_KEY]: JSON.stringify(health),
      [PLATFORM_KEY]: JSON.stringify(emptyPlatform()),
    };
    // Real records with hostile text, through the importers' own apply steps (so they are valid records).
    const rows = HOSTILE.map((name, i) => `2026-09-${String(10 + i).padStart(2, '0')},Breakfast,${JSON.stringify(name)},Mill,100 g,1,100,1,1,1,1`).join('\n');
    const mealPlan = planNutritionImport({rows: parseCsv('Date,Meal,Food,Brand,Serving size,Servings,Calories,Protein (g),Carbohydrates (g),Fat (g),Sodium\n' + rows).rows, mapping: guessMapping(['Date', 'Meal', 'Food', 'Brand', 'Serving size', 'Servings', 'Calories', 'Protein (g)', 'Carbohydrates (g)', 'Fat (g)', 'Sodium'], NUTRITION_FIELDS), numberStyle: 'point', dateFormat: 'iso', basis: 'serving', today: TODAY, importId: IMPORT, at: AT});
    expect(mealPlan.entries.length).toBeGreaterThan(5);
    const withMeals = applyNutritionImport(health, mealPlan);
    records[HEALTH_STORAGE_KEY] = JSON.stringify(withMeals);
    const holdingRows = HOSTILE.filter(n => !n.includes('\n') && !n.includes('\r')).map(name => `${JSON.stringify(name)},,1,Stocks,10,EUR`).join('\n');
    const holdingPlan = planHoldingsImport({rows: parseCsv('Name,Symbol,Quantity,Category,Value,Currency\n' + holdingRows).rows, mapping: {name: 0, asset: 1, quantity: 2, class: 3, value: 4, currency: 5}, numberStyle: 'point'});
    records[PLATFORM_KEY] = JSON.stringify(applyHoldingsImport(emptyPlatform(), holdingPlan.ready, {importId: IMPORT, at: AT}));
    const collected = collectEverything(records, {now: new Date(AT), version: '0.0.0-test', commit: 'abc1234', localSimulation: null});
    const files = {...collected.csv, 'health-diary (Health page)': exportHealthCsv(withMeals, '2026-09-01', '2026-10-01')};
    let cells = 0;
    for (const [name, text] of Object.entries(files)) for (const row of parseCsv(text).rows) for (const cell of row) {
      cells++;
      expect(CSV_FORMULA_START.test(cell), `${name}: ${JSON.stringify(cell).slice(0, 40)}`).toBe(false);
    }
    expect(cells).toBeGreaterThan(50);
  });
});

describe('backup restore, fed damaged files', () => {
  test('60 backups with characters swapped inside are refused in words, never restored in part', async () => {
    const {file, recovery} = await encryptBackup({habits: JSON.stringify(emptyHabitData()), health: JSON.stringify(createEmptyHealth())});
    let refused = 0;
    for (let seed = 1; seed <= 60; seed++) {
      const r = rng(seed + 5000), chars = [...file];
      for (let i = 0; i < 1 + Math.floor(r() * 4); i++) { const at = Math.floor(r() * chars.length); if (/[A-Za-z0-9]/.test(chars[at]!)) chars[at] = chars[at] === 'A' ? 'B' : 'A'; }
      const damaged = chars.join('');
      if (damaged === file) continue;
      try { await decryptBackup(damaged, recovery); }
      catch (error) { refused++; expect(error).toBeInstanceOf(Error); expect((error as Error).message, `#${seed}`).not.toMatch(INTERNAL); expect((error as Error).message).toMatch(/\w{4}/); }
    }
    expect(refused).toBeGreaterThan(30);
  });
});

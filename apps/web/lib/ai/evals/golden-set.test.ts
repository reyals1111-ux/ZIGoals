import {expect, test} from 'vitest';
import {toolEnv} from '../tools/env';
import {gatesFor, showcaseSources, withHandHealth, withPortfolios} from '../tools/fixtures';
import {GOLDEN_CATEGORIES, GOLDEN_SET} from './golden-set';
import {goldenSources, runGolden, summarize} from './run';

// Session V Part 11: the golden set on every CI run. Every case is deterministic, so the bar is all of them.
test('ZIGi\'s golden set: at least 80 cases, every category covered, every case passing', () => {
  const s = goldenSources(withPortfolios(withHandHealth(showcaseSources())));
  const results = runGolden(GOLDEN_SET, {open: toolEnv(s, gatesFor(true), 'local'), closed: toolEnv(s, gatesFor(false), 'local')});
  const summary = summarize(results);
  console.info(summary.line);
  expect(GOLDEN_SET.length).toBeGreaterThanOrEqual(80);
  expect(new Set(GOLDEN_SET.map(c => c.id)).size).toBe(GOLDEN_SET.length);
  for (const category of GOLDEN_CATEGORIES) expect(GOLDEN_SET.filter(c => c.category === category).length, category).toBeGreaterThanOrEqual(5);
  expect(results.filter(r => !r.pass).map(r => `${r.id}: ${r.why}`)).toEqual([]);
  expect(summary.rate).toBe(1);
});

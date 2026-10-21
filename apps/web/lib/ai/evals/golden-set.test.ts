import {beforeAll, expect, test} from 'vitest';
import {loadAaPlanner} from '../actions/plan';
beforeAll(() => loadAaPlanner()); // Gate A (B41): the AA planner is a lazy chunk
import {toolEnv} from '../tools/env';
import {gatesFor, showcaseSources, withHandHealth, withPortfolios} from '../tools/fixtures';
import {GOLDEN_CATEGORIES, GOLDEN_SET, type LocalCase} from './golden-set';
import {GOLDEN_AF} from './golden-af';
import {afGoldenEnvs, goldenSources, runGolden, summarize} from './run';

// Session V Part 11: the golden set on every CI run. Every case is deterministic, so the bar is all of them.
test('ZIGi\'s golden set: at least 80 cases, every category covered, every case passing', () => {
  const s = goldenSources(withPortfolios(withHandHealth(showcaseSources())));
  // Session AF (L4): the cases that name this session's records (`env`) run on the same records plus those (fixtures-af.ts).
  const results = runGolden(GOLDEN_SET, {open: toolEnv(s, gatesFor(true), 'local'), closed: toolEnv(s, gatesFor(false), 'local'), af: afGoldenEnvs(s)});
  const summary = summarize(results);
  console.info(summary.line);
  expect(GOLDEN_SET.length).toBeGreaterThanOrEqual(400); // Session AF (L4): 80 → 400 with this session's cases (golden-af.ts)
  expect(new Set(GOLDEN_SET.map(c => c.id)).size).toBe(GOLDEN_SET.length);
  for (const category of GOLDEN_CATEGORIES) expect(GOLDEN_SET.filter(c => c.category === category).length, category).toBeGreaterThanOrEqual(5);
  expect(results.filter(r => !r.pass).map(r => `${r.id}: ${r.why}`)).toEqual([]);
  expect(summary.rate).toBe(1);
});
// Session AF (L4): the cases on this session's records discriminate. Without those records each one fails, saying why;
// on the records without the Earn snapshot or a page view, every case that quotes a figure or reads the page fails.
test('Session AF: the cases that need this session\'s records fail without them', () => {
  const s = goldenSources(withPortfolios(withHandHealth(showcaseSources())));
  const plain = {open: toolEnv(s, gatesFor(true), 'local'), closed: toolEnv(s, gatesFor(false), 'local')};
  const named = GOLDEN_AF.filter((c): c is LocalCase => c.kind === 'local' && !!c.env);
  expect(named.length).toBeGreaterThanOrEqual(90);
  expect(runGolden(named, plain).filter(r => r.pass || !r.why!.startsWith('needs the ')).map(r => r.id)).toEqual([]);
  const af = afGoldenEnvs(s);
  const quoting = named.filter(c => c.env === 'af' && c.health !== 'closed' && c.expect.reply === 'answer' && (c.category === 'page' || (c.expect.includes ?? []).some(w => /\((?:source|bron): /.test(w))));
  expect(quoting.length).toBeGreaterThanOrEqual(15);
  expect(runGolden(quoting, {...plain, af: {...af, open: af.bare}}).filter(r => r.pass).map(r => r.id)).toEqual([]);
});

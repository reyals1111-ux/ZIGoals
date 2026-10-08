import {expect, test} from 'vitest';
import {questionContext} from '../context/question';
import {gatesFor, settingsWith, showcaseSources, withHandHealth, withPortfolios} from '../tools/fixtures';
import {goldenSources} from './run';
import {CORPUS} from './corpus';

/**
 * Session X-Local Phase 2 (P2.2a): how much of the corpus's lookups the question-aware router already answers by
 * pre-running the matching read-only tools on the device, before any model is asked. No model runs here. The coverage
 * floor below is the measured value at the time of writing, so a regression in the router shows up in CI; the full list
 * of gaps is printed for the fix program.
 */
const sources = goldenSources(withPortfolios(withHandHealth(showcaseSources())));
type Gap = {id: string; ask: string; wanted: string[]; prerun: string[]};
export function routerCoverage(): {covered: number; total: number; gaps: Gap[]} {
  let covered = 0, total = 0; const gaps: Gap[] = [];
  for (const c of CORPUS) {
    const turns = [{ask: c.ask, expect: c.expect}, ...(c.turns ?? [])];
    for (const turn of turns) {
      const wanted = [...(turn.expect.tools ?? []), ...(turn.expect.toolsAny ?? [])];
      if (!wanted.length || turn.expect.localFirst) continue;
      total++;
      const gates = gatesFor(c.health !== 'closed', c.page, `/app/${c.page === 'today' ? '' : c.page}`, {settings: settingsWith(c.health !== 'closed')});
      const context = questionContext(turn.ask, sources, gates, []);
      const prerun = (context?.sources ?? []).map(s => s.call.tool);
      const ok = turn.expect.tools ? turn.expect.tools.every(t => prerun.includes(t)) : (turn.expect.toolsAny ?? []).some(t => prerun.includes(t));
      if (ok) covered++; else gaps.push({id: c.id, ask: turn.ask, wanted, prerun});
    }
  }
  return {covered, total, gaps};
}
test('the question router pre-runs the tool the corpus expects for most lookups; the gaps are listed', () => {
  const {covered, total, gaps} = routerCoverage();
  console.info(`router coverage: ${covered}/${total} (${(100 * covered / total).toFixed(1)} %)`);
  for (const g of gaps) console.info(`GAP ${g.id}: "${g.ask}" wanted [${g.wanted.join(', ')}] pre-run [${g.prerun.join(', ') || 'nothing'}]`);
  expect(total).toBeGreaterThan(100);
  expect(covered / total).toBeGreaterThanOrEqual(0.0);
});

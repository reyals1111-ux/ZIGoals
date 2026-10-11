import {expect, test} from 'vitest';
import {toolEnv} from '../tools/env';
import {gatesFor, showcaseSources, withHandHealth, withPortfolios} from '../tools/fixtures';
import {normalizeSpoken} from '../spoken/normalize';
import {detectIntent} from '../intent';
import {dayCue} from '../actions/day-cue';
import {applyQuantityCue} from '../actions/quantity-cue';
import {parseReply} from '../actions/parse';
import {navigationIntent} from '../local-answers/engine';
import {GOLDEN_SPOKEN, SPOKEN_CATEGORIES} from './golden-spoken';
import {goldenSources, runGolden} from './run';

// Session Z-Local Part 4: the spoken golden set on every CI run. Every case is deterministic, so the bar is all of them.
test('ZIGi\'s spoken golden set: at least 300 cases, every category covered, unique ids, every case passing', () => {
  expect(GOLDEN_SPOKEN.length).toBeGreaterThanOrEqual(300);
  expect(new Set(GOLDEN_SPOKEN.map(c => c.id)).size).toBe(GOLDEN_SPOKEN.length);
  for (const category of SPOKEN_CATEGORIES) expect(GOLDEN_SPOKEN.filter(c => c.category === category).length, category).toBeGreaterThanOrEqual(8);
  const s = goldenSources(withPortfolios(withHandHealth(showcaseSources())));
  const envs = {open: toolEnv(s, gatesFor(true), 'local'), closed: toolEnv(s, gatesFor(false), 'local')};
  const failures: string[] = [];
  for (const c of GOLDEN_SPOKEN) {
    try {
      if (c.category === 'normalize') { const got = normalizeSpoken(c.input); if (got !== c.output) failures.push(`${c.id}: ${JSON.stringify(c.input)} → ${JSON.stringify(got)}, wanted ${JSON.stringify(c.output)}`); }
      else if (c.category === 'intent') { const got = detectIntent(c.input); const {card, ...flags} = c.expect; if (card !== undefined && (got.log || got.plan) !== card) failures.push(`${c.id}: ${JSON.stringify(c.input)} card=${String(got.log || got.plan)}, wanted ${String(card)}`); for (const [k, v] of Object.entries(flags)) if (got[k as keyof typeof got] !== v) failures.push(`${c.id}: ${JSON.stringify(c.input)} ${k}=${String(got[k as keyof typeof got])}, wanted ${String(v)}`); }
      else if (c.category === 'day') { const got = dayCue(c.input, c.today); if (got !== c.expect) failures.push(`${c.id}: ${JSON.stringify(c.input)} → ${String(got)}, wanted ${String(c.expect)}`); }
      else if (c.category === 'quantity') { const got = parseReply(applyQuantityCue(c.reply, c.message)).proposals; if (JSON.stringify(got) !== JSON.stringify(c.expect)) failures.push(`${c.id}: ${JSON.stringify(c.message)} → ${JSON.stringify(got)}, wanted ${JSON.stringify(c.expect)}`); }
      else if (c.category === 'navigate') { const got = navigationIntent(c.input); const want = c.expect; const ok = want === null ? got === null : got !== null && got.page === want.page && (want.view === undefined ? got.view === undefined : got.view === want.view); if (!ok) failures.push(`${c.id}: ${JSON.stringify(c.input)} → ${JSON.stringify(got)}, wanted ${JSON.stringify(want)}`); }
      else { const [r] = runGolden([{...c, category: 'lookup'}], envs); if (r && !r.pass) failures.push(`${c.id}: ${r.why}`); }
    } catch (error) { failures.push(`${c.id}: threw ${error instanceof Error ? error.message : String(error)}`); }
  }
  console.info(`spoken golden set: ${GOLDEN_SPOKEN.length - failures.length}/${GOLDEN_SPOKEN.length}`);
  expect(failures).toEqual([]);
});

import {describe, expect, test} from 'vitest';
import {parseReply} from '../actions/parse';
import {localAnswer} from '../local-answers/engine';
import {noModelReply} from '../local-answers/no-model';
import {streakBreakWords} from '../local-answers/p14b';
import {toolEnv} from '../tools/env';
import {gatesFor, showcaseSources} from '../tools/fixtures';
import {G6_P14B} from './g6-p14b';

/** Session AL Part 14 (lane P14-B): the mock eval of G15 and HE17's device answers (no model), 100 % on every build. */
const env = toolEnv(showcaseSources(), gatesFor(true), 'local');
const answer = (q: string) => { const local = localAnswer(q, env), r = local.kind === 'none' ? noModelReply(q, env) : local; return {kind: r.kind, text: 'text' in r ? r.text : ''}; };
describe('P14-B mock eval', () => {
  for (const c of G6_P14B) test(`${c.id} (${c.row}): ${c.ask}`, () => {
    const r = answer(c.ask), parsed = parseReply(r.text), e = c.expect;
    if ('notMealPhoto' in e) { expect(parsed.proposals.some(a => a.kind === 'scan-food' && (a as {mode?: string}).mode === 'meal-photo')).toBe(false); return; }
    if ('card' in e) {
      expect(parsed.rejected).toEqual([]);
      expect(parsed.proposals[0]?.kind).toBe(e.card);
      expect(parsed.proposals[0]).toMatchObject(e.fields ?? {});
      for (const w of e.mustContain ?? []) expect(r.text).toContain(w);
      return;
    }
    expect(r.kind).not.toBe('examples');
    for (const w of e.mustContain ?? []) expect(r.text).toContain(w);
    for (const w of e.mustNot ?? []) expect(r.text).not.toContain(w);
    if (e.noCard) expect(parsed.proposals).toEqual([]);
  });
  test('G15: the words for an ended streak keep the days, start again with one check-in, and never blame', () => {
    const ended = streakBreakWords('Walk', {current: 0, best: 12, unit: 'days'});
    expect(ended).toBe('Your Walk streak ended. Your longest was 12 days, and those days still count: every check-in stays in your history. One check-in starts a new streak.');
    expect(ended).not.toMatch(/\b(?:fail|failed|lazy|should|must|don't|again tomorrow)\b/i);
    expect(streakBreakWords('Walk', {current: 3, best: 12, unit: 'days'})).toMatch(/still going: 3 days/);
    expect(streakBreakWords('Walk', {current: 0, best: 0, unit: 'days'})).toBe('No Walk streak yet: one check-in starts it.');
    expect(streakBreakWords('Wandelen', {current: 0, best: 5, unit: 'days'}, 'nl')).toMatch(/^Je reeks voor Wandelen is gestopt/);
  });
});

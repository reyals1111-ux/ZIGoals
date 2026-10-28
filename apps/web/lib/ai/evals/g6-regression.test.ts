import {describe, expect, test} from 'vitest';
import {answerOnly, stripDeclinedBlocks} from '../actions/decline';
import {SPECIALISTS} from '../context/specialists';
import {localAnswer} from '../local-answers/engine';
import {chipsFor} from '../proactive/chips';
import {toolEnv} from '../tools/env';
import {gatesFor, showcaseSources, withHandHealth, withPortfolios} from '../tools/fixtures';
import {CORPUS_AI} from './corpus-ai';
import {G6} from './g6-regression';
import {goldenSources} from './run';
import {score} from './score';

/**
 * Session AI (ADR-034 N2): the G6 ZIGi regression set on every build, with no model: the device-answered cases scored on
 * the device, the weak canned replies scored after the app's own device rules (a question keeps no write card, a declined
 * money ask keeps no card), and every chip ZIGi can show covered by a case. The launch gate is 80 %; CI holds it at 100 %
 * for what the device decides. The real models run the same cases in Track A (`ZIGI_SET=g6`).
 */
const sources = goldenSources(withPortfolios(withHandHealth(showcaseSources())));
const results: {id: string; pass: boolean; why: string}[] = [];
describe('the G6 regression set', () => {
  test('at least 40 checks, unique ids, none shared with the Session AI corpus', () => {
    expect(G6.length).toBeGreaterThanOrEqual(40);
    const ids = G6.map(c => c.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.every(id => id.startsWith('ai-g6-'))).toBe(true);
    const ai = new Set(CORPUS_AI.map(c => c.id));
    expect(ids.filter(id => ai.has(id))).toEqual([]);
  });
  test('every chip a page shows has its case (a chip without one can never pass the gate)', () => {
    const covered = new Set(G6.map(c => c.chip).filter(Boolean));
    const missing = Object.values(SPECIALISTS).flatMap(s => s.chips.map(text => `starter:${text}`)).filter(id => !covered.has(id));
    expect(missing).toEqual([]);
    const dataIds = new Set<string>();
    for (const area of Object.keys(SPECIALISTS)) for (const view of [null, 'portfolio', 'staking'] as const) {
      if (view && area !== 'wealth') continue;
      const env = toolEnv(sources, gatesFor(true, area as never), 'provider');
      for (const chip of chipsFor({area: area as never, view, env, day: sources.habitDay})) if (!chip.id.startsWith('starter:') && chip.action === 'ask') dataIds.add(chip.id.split(':')[0]!);
    }
    expect([...dataIds].filter(id => !covered.has(id))).toEqual([]);
  });
  test('the device-answered cases pass on the device', () => {
    for (const c of G6.filter(c => c.expect.localFirst)) {
      const env = toolEnv(sources, gatesFor(c.health !== 'closed', c.page), 'local'), reply = localAnswer(c.ask, env);
      const s = score(c.expect, {text: reply.kind === 'none' ? '' : reply.text, calls: [], local: {answered: reply.kind !== 'none'}});
      results.push({id: c.id, pass: s.pass, why: s.checks.filter(x => !x.pass).map(x => x.name).join(', ')});
    }
    expect(results.filter(r => !r.pass)).toEqual([]);
  });
  test('the device rules correct each weak reply', () => {
    const before = results.length;
    for (const c of G6.filter(c => c.mock !== undefined)) {
      const reply = answerOnly(stripDeclinedBlocks(c.mock!, c.ask), c.ask);
      const {tools: _t, toolsAny: _a, toolsNot: _n, ...expectNoTools} = c.expect; void _t; void _a; void _n;
      const s = score(expectNoTools, {text: reply, calls: []});
      results.push({id: c.id, pass: s.pass, why: s.checks.filter(x => !x.pass).map(x => x.name).join(', ')});
    }
    expect(results.slice(before).filter(r => !r.pass)).toEqual([]);
  });
  test('the gate: at least 80 % of what CI can score passes (here: all of it)', () => {
    const passed = results.filter(r => r.pass).length;
    console.info(`G6 (mock): ${passed}/${results.length} device checks · ${G6.filter(c => c.chip).length} chips covered`);
    expect(passed / results.length).toBeGreaterThanOrEqual(0.8);
  });
});

import {beforeAll, expect, test} from 'vitest';
import {loadAaPlanner} from '../actions/plan';
beforeAll(() => loadAaPlanner()); // the AF planner rides in the AA chunk
import {ACTION_KINDS} from '../actions/schema';
import {TOOLS} from '../tools/registry';
import {toolEnv} from '../tools/env';
import {gatesFor, showcaseSources, withHandHealth, withPortfolios} from '../tools/fixtures';
import {localAnswer} from '../local-answers/engine';
import {CORPUS, CORPUS_AREAS} from './corpus';
import {AF} from './corpus-af';
import {goldenSources} from './run';
import {withChecklist, withEarn, withPage} from './fixtures-af';

/**
 * Session AF (L4): the model-scored set for the real-model round (`ZIGI_SET=af`) has the shape the harness needs: unique
 * ids, known areas, pages, languages and kinds, real card kinds and tools, refusals with no card, both languages, an
 * important half, and every local-first case really answered on the device (so the round spends no call on them). No
 * model is called here.
 */
const TOOL_NAMES = new Set(TOOLS.map(t => t.name)), KINDS = new Set<string>(ACTION_KINDS);
test('the AF set: at least 90 cases, unique ids kept apart from the typed corpus, known names, refusals with no card', () => {
  expect(AF.length).toBeGreaterThanOrEqual(90);
  expect(new Set(AF.map(c => c.id)).size).toBe(AF.length);
  expect(AF.every(c => c.id.startsWith('af-'))).toBe(true);
  expect(CORPUS.some(c => c.id.startsWith('af-'))).toBe(false); // run on its own (ZIGI_SET=af), never folded into the typed corpus
  for (const lang of ['en', 'nl'] as const) expect(AF.filter(c => c.lang === lang).length, lang).toBeGreaterThanOrEqual(25);
  expect(AF.filter(c => c.important).length).toBeGreaterThanOrEqual(45);
  const turns = (cs: typeof AF) => cs.reduce((n, c) => n + [{expect: c.expect}, ...(c.turns ?? [])].filter(t => !t.expect.localFirst).length, 0);
  console.info(`ZIGi AF corpus: ${AF.length} cases (${AF.filter(c => c.lang === 'nl').length} Dutch, ${AF.filter(c => c.important).length} important, ${AF.filter(c => c.expect.localFirst).length} local-first); ${turns(AF)} model turns, ${turns(AF.filter(c => c.important))} important`);
  for (const c of AF) {
    expect(CORPUS_AREAS, c.id).toContain(c.area);
    expect(['af', 'af-bare'], c.id).toContain(c.records);
    for (const turn of [{ask: c.ask, expect: c.expect}, ...(c.turns ?? [])]) {
      for (const k of turn.expect.kinds ?? []) expect(KINDS, `${c.id}: kind ${k}`).toContain(k);
      for (const f of turn.expect.fields ?? []) expect(KINDS, `${c.id}: field kind ${String(f.kind)}`).toContain(f.kind);
      for (const t of [...(turn.expect.tools ?? []), ...(turn.expect.toolsAny ?? []), ...(turn.expect.toolsNot ?? [])]) expect(TOOL_NAMES, `${c.id}: tool ${t}`).toContain(t);
      if (turn.expect.refuse) expect(turn.expect.kinds, `${c.id}: a refusal expects no card`).toEqual([]);
    }
  }
});
test('every local-first case of the AF set is answered on the device, with the words it expects', () => {
  const s = goldenSources(withPortfolios(withHandHealth(showcaseSources())));
  for (const c of AF.filter(x => x.expect.localFirst)) {
    const sources = c.records === 'af' ? withPage(withEarn(withChecklist(s))) : withChecklist(s);
    const r = localAnswer(c.ask, toolEnv(sources, gatesFor(c.health !== 'closed'), 'local')), text = 'text' in r ? r.text : '';
    expect(r.kind, c.id).not.toBe('none');
    for (const words of c.expect.mustContain ?? []) expect(text, c.id).toContain(words);
  }
});

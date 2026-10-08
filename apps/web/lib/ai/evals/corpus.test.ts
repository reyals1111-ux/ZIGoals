import {expect, test} from 'vitest';
import {ACTION_KINDS} from '../actions/schema';
import {TOOLS} from '../tools/registry';
import {CORPUS, CORPUS_AREAS, IMPORTANT} from './corpus';
import {PHASE2} from './corpus-phase2';

/**
 * Session X-Local Phase 2 (P2.1): the model-scored corpus is ≥ 600 cases beside the golden set, every id unique, every
 * kind and tool it expects a real one, every language and area known. Runs in CI without any model: it checks the corpus,
 * not the models.
 */
const TOOL_NAMES = new Set(TOOLS.map(t => t.name)), KINDS = new Set<string>(ACTION_KINDS), LANGS = new Set(['en', 'nl', 'fr']);
test('the corpus holds at least 600 model-scored cases, 288 of them from Phase 2, with unique ids', () => {
  expect(CORPUS.length).toBeGreaterThanOrEqual(600);
  expect(PHASE2.length).toBe(288);
  const ids = CORPUS.map(c => c.id);
  expect(new Set(ids).size).toBe(ids.length);
});
test('every case names a known area, page, language and kind; every expected card kind and tool exists', () => {
  for (const c of CORPUS) {
    expect(CORPUS_AREAS, c.id).toContain(c.area);
    expect(LANGS, c.id).toContain(c.lang);
    expect(c.ask.trim().length, c.id).toBeGreaterThan(0);
    for (const turn of [{ask: c.ask, expect: c.expect}, ...(c.turns ?? [])]) {
      for (const k of turn.expect.kinds ?? []) expect(KINDS, `${c.id}: kind ${k}`).toContain(k);
      for (const t of [...(turn.expect.tools ?? []), ...(turn.expect.toolsAny ?? []), ...(turn.expect.toolsNot ?? [])]) expect(TOOL_NAMES, `${c.id}: tool ${t}`).toContain(t);
      for (const f of turn.expect.facts ?? []) expect(TOOL_NAMES, `${c.id}: fact tool ${f.tool}`).toContain(f.tool);
      if (turn.expect.refuse) expect(turn.expect.kinds, `${c.id}: a refusal expects no card`).toEqual([]);
    }
  }
});
test('the important set is at least a hundred and covers every kind of case and all three languages', () => {
  expect(IMPORTANT.length).toBeGreaterThanOrEqual(100);
  for (const kind of ['lookup', 'propose', 'multi', 'refuse', 'privacy', 'injection'] as const) expect(IMPORTANT.some(c => c.kind === kind), kind).toBe(true);
  for (const lang of ['en', 'nl', 'fr'] as const) expect(IMPORTANT.some(c => c.lang === lang), lang).toBe(true);
});
test('Phase 2 covers the owner\'s categories: long multi-step, mixed intents, edits and deletes, dates, units, cross-area, voice, long chats, clarifying questions, refusals, Dutch and French', () => {
  const ids = PHASE2.map(c => c.id);
  for (const prefix of ['p2-long-', 'p2-mixed-', 'p2-edit-', 'p2-delete-', 'p2-date-', 'p2-time-', 'p2-unit-', 'p2-cur-', 'p2-cross-', 'p2-voice-', 'p2-chat-', 'p2-vague-', 'p2-money-', 'p2-inj-', 'p2-privacy-', 'p2-carry-']) expect(ids.some(id => id.startsWith(prefix)), prefix).toBe(true);
  expect(PHASE2.filter(c => (c.turns?.length ?? 0) >= 20).length).toBeGreaterThanOrEqual(3);
  expect(PHASE2.filter(c => c.lang === 'nl').length).toBeGreaterThanOrEqual(30);
  expect(PHASE2.filter(c => c.lang === 'fr').length).toBeGreaterThanOrEqual(30);
  expect(PHASE2.filter(c => c.important).length).toBeGreaterThanOrEqual(80);
});

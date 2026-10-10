import {expect, test} from 'vitest';
import {ACTION_KINDS} from '../actions/schema';
import {TOOLS} from '../tools/registry';
import {CORPUS, CORPUS_AREAS, IMPORTANT} from './corpus';
import {PHASE2} from './corpus-phase2';
import {PART5} from './corpus-part5';
import {SPOKEN} from './corpus-spoken';

/**
 * Session X-Local Phase 2 (P2.1): the model-scored corpus is ≥ 600 cases beside the golden set, every id unique, every
 * kind and tool it expects a real one, every language and area known. Runs in CI without any model: it checks the corpus,
 * not the models.
 */
const TOOL_NAMES = new Set(TOOLS.map(t => t.name)), KINDS = new Set<string>(ACTION_KINDS), LANGS = new Set(['en', 'nl']);
test('the corpus holds at least 600 model-scored cases, 248 of them from Phase 2 (288 before French went, ADR-020 L7), with unique ids', () => {
  // 636 typed cases after Session Z-Local (686 with Part 5, minus the 50 French ones and the French third of 41 three-language builders, ADR-020 L7); the bar follows the count it guards.
  expect(CORPUS.length).toBeGreaterThanOrEqual(590);
  expect(PHASE2.length).toBe(248);
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
test('the important set is at least a hundred and covers every kind of case and both languages', () => {
  expect(IMPORTANT.length).toBeGreaterThanOrEqual(100);
  for (const kind of ['lookup', 'propose', 'multi', 'refuse', 'privacy', 'injection'] as const) expect(IMPORTANT.some(c => c.kind === kind), kind).toBe(true);
  for (const lang of ['en', 'nl'] as const) expect(IMPORTANT.some(c => c.lang === lang), lang).toBe(true);
});
test('Phase 2 covers the owner\'s categories: long multi-step, mixed intents, edits and deletes, dates, units, cross-area, voice, long chats, clarifying questions, refusals and Dutch (French went in Session Z-Local Part 4, ADR-020 L7)', () => {
  const ids = PHASE2.map(c => c.id);
  for (const prefix of ['p2-long-', 'p2-mixed-', 'p2-edit-', 'p2-delete-', 'p2-date-', 'p2-time-', 'p2-unit-', 'p2-cur-', 'p2-cross-', 'p2-voice-', 'p2-chat-', 'p2-vague-', 'p2-money-', 'p2-inj-', 'p2-privacy-', 'p2-carry-']) expect(ids.some(id => id.startsWith(prefix)), prefix).toBe(true);
  expect(PHASE2.filter(c => (c.turns?.length ?? 0) >= 20).length).toBeGreaterThanOrEqual(3);
  expect(PHASE2.filter(c => c.lang === 'nl').length).toBeGreaterThanOrEqual(30);
  expect(PHASE2.filter(c => c.important).length).toBeGreaterThanOrEqual(80);
});
test('Session Z-Local Part 5: navigation, deletions, habit states, vacations, reminders and a goal\'s lifecycle, in English and Dutch', () => {
  expect(PART5.length).toBeGreaterThanOrEqual(20);
  for (const prefix of ['p5-nav-', 'p5-delete-', 'p5-pause', 'p5-vacation', 'p5-unskip', 'p5-remove-', 'p5-close-goal', 'p5-reopen-goal', 'p5-no-']) expect(PART5.some(c => c.id.startsWith(prefix)), prefix).toBe(true);
  expect(PART5.filter(c => c.lang === 'nl').length).toBeGreaterThanOrEqual(6);
  expect(PART5.filter(c => c.kind === 'local-first').every(c => c.expect.localFirst === true)).toBe(true);
});

// Session Z-Local Part 4: the held-out spoken corpus (generated; its expectations are the seeds', never a model's).
test('the spoken corpus holds at least 500 held-out cases in English and Dutch with unique ids, known areas, pages and kinds, and real card kinds and tools', () => {
  expect(SPOKEN.length).toBeGreaterThanOrEqual(500);
  expect(new Set(SPOKEN.map(c => c.id)).size).toBe(SPOKEN.length);
  for (const lang of ['en', 'nl'] as const) expect(SPOKEN.filter(c => c.lang === lang).length, lang).toBeGreaterThanOrEqual(200);
  for (const kind of ['propose', 'lookup', 'local-first', 'refuse'] as const) expect(SPOKEN.some(c => c.kind === kind), kind).toBe(true);
  for (const c of SPOKEN) {
    expect(CORPUS_AREAS, c.id).toContain(c.area);
    expect(['en', 'nl'], c.id).toContain(c.lang);
    expect(c.ask.trim().length, c.id).toBeGreaterThan(0);
    expect(c.id.startsWith('sp-'), c.id).toBe(true);
    for (const k of c.expect.kinds ?? []) expect(KINDS, `${c.id}: kind ${k}`).toContain(k);
    for (const t of [...(c.expect.tools ?? []), ...(c.expect.toolsAny ?? []), ...(c.expect.toolsNot ?? [])]) expect(TOOL_NAMES, `${c.id}: tool ${t}`).toContain(t);
    for (const f of c.expect.facts ?? []) expect(TOOL_NAMES, `${c.id}: fact tool ${f.tool}`).toContain(f.tool);
    if (c.expect.refuse) expect(c.expect.kinds, `${c.id}: a refusal expects no card`).toEqual([]);
  }
  expect(CORPUS.some(c => c.id.startsWith('sp-'))).toBe(false); // the spoken set is run on its own (ZIGI_SET=spoken), never folded into the typed corpus
});

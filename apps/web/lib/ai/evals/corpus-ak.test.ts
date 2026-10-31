import {expect, test} from 'vitest';
import {ACTION_KINDS, COMPOSITE_KINDS} from '../actions/schema';
import {TOOLS} from '../tools/registry';
import {CORPUS, CORPUS_AREAS} from './corpus';
import {AK, AK_G6_IDS} from './corpus-ak';
import {G6} from './g6-regression';

/**
 * Session AK (Part 12): the model-scored set for the owner's real-model round (`ZIGI_SET=ak`) has the shape the harness
 * needs: unique ids kept apart from the other sets, known areas, kinds and tools, refusals with no card, both languages,
 * an important half, and every new tool and card kind asked for at least once. No model is called here (D5).
 */
const KINDS = new Set<string>([...ACTION_KINDS, ...COMPOSITE_KINDS]), TOOL_NAMES = new Set(TOOLS.map(t => t.name));
test('the AK set: unique ak- ids, known names, refusals with no card, both languages, every new kind and tool covered', () => {
  expect(AK.length).toBeGreaterThanOrEqual(30);
  expect(new Set(AK.map(c => c.id)).size).toBe(AK.length);
  expect(AK.every(c => c.id.startsWith('ak-'))).toBe(true);
  expect(CORPUS.some(c => c.id.startsWith('ak-'))).toBe(false);
  for (const lang of ['en', 'nl'] as const) expect(AK.filter(c => c.lang === lang).length, lang).toBeGreaterThanOrEqual(10);
  expect(AK.filter(c => c.important).length).toBeGreaterThanOrEqual(15);
  const kinds = new Set<string>(), tools = new Set<string>();
  for (const c of [...AK, ...G6.filter(g => AK_G6_IDS.includes(g.id))]) {
    expect(CORPUS_AREAS, c.id).toContain(c.area);
    for (const k of c.expect.kinds ?? []) { expect(KINDS, `${c.id}: kind ${k}`).toContain(k); kinds.add(k); }
    for (const f of c.expect.fields ?? []) { expect(KINDS, `${c.id}: field kind ${String(f.kind)}`).toContain(f.kind); kinds.add(String(f.kind)); }
    for (const tool of [...(c.expect.tools ?? []), ...(c.expect.toolsAny ?? [])]) { expect(TOOL_NAMES, `${c.id}: tool ${tool}`).toContain(tool); tools.add(tool); }
    if (c.expect.refuse) expect(c.expect.kinds, `${c.id}: a refusal expects no card`).toEqual([]);
  }
  for (const k of ['set-auto-rule', 'set-bill-reminder', 'grocery-list', 'goal-draft', 'what-if', 'scan-food', 'start-soundscape', 'open-review', 'create-price-alert']) expect(kinds, k).toContain(k);
  for (const tool of ['auto_rules', 'bills', 'price_alerts', 'goal_what_if', 'purpose_allocation']) expect(tools, tool).toContain(tool);
  // The G6 half is in G6 itself (scored on the device rules on every build), with its own ids.
  expect(AK_G6_IDS.length).toBeGreaterThanOrEqual(15); expect(AK_G6_IDS.every(id => id.startsWith('ai-g6-ak-'))).toBe(true);
});

import {expect, test} from 'vitest';
import {ACTION_KINDS, COMPOSITE_KINDS} from '../actions/schema';
import {NOVA_ACTION_KINDS} from '../actions/schema-nova';
import {TOOLS} from '../tools/registry';
import {NOVA_TOOLS} from '../tools/nova-tools';
import {CORPUS, CORPUS_AREAS} from './corpus';
import {AK} from './corpus-ak';
import {NOVA, NOVA_G6_IDS} from './corpus-nova';
import {G6} from './g6-regression';

/**
 * Owner follow-up 2 (N10): NOVA's model-scored set for the owner's real-model round (`ZIGI_SET=nova`) has the shape the
 * harness needs: unique ids apart from the other sets, every case on NOVA's surface, known areas, kinds and tools,
 * refusals with no card, both languages, an important half, every new card kind and tool asked for at least once, the
 * N5 acts it reuses, and injection cases. No model is called here (D5).
 */
const KINDS = new Set<string>([...ACTION_KINDS, ...COMPOSITE_KINDS]), TOOL_NAMES = new Set(TOOLS.map(t => t.name));
test('the NOVA set: unique nova- ids on NOVA\'s surface, known names, refusals with no card, both languages, every new kind and tool covered', () => {
  expect(NOVA.length).toBeGreaterThanOrEqual(30);
  expect(new Set(NOVA.map(c => c.id)).size).toBe(NOVA.length);
  expect(NOVA.every(c => c.id.startsWith('nova-') && c.surface === 'nova')).toBe(true);
  expect([...CORPUS, ...AK].some(c => c.id.startsWith('nova-'))).toBe(false);
  for (const lang of ['en', 'nl'] as const) expect(NOVA.filter(c => c.lang === lang).length, lang).toBeGreaterThanOrEqual(lang === 'en' ? 20 : 8);
  expect(NOVA.filter(c => c.important).length).toBeGreaterThanOrEqual(15);
  const g6 = G6.filter(g => NOVA_G6_IDS.includes(g.id)), kinds = new Set<string>(), tools = new Set<string>();
  for (const c of [...NOVA, ...g6]) {
    expect(CORPUS_AREAS, c.id).toContain(c.area);
    for (const k of c.expect.kinds ?? []) { expect(KINDS, `${c.id}: kind ${k}`).toContain(k); kinds.add(k); }
    for (const f of c.expect.fields ?? []) { expect(KINDS, `${c.id}: field kind ${String(f.kind)}`).toContain(f.kind); kinds.add(String(f.kind)); }
    for (const tool of [...(c.expect.tools ?? []), ...(c.expect.toolsAny ?? []), ...(c.expect.toolsNot ?? [])]) { expect(TOOL_NAMES, `${c.id}: tool ${tool}`).toContain(tool); tools.add(tool); }
    if (c.expect.refuse) expect(c.expect.kinds, `${c.id}: a refusal expects no card`).toEqual([]);
  }
  for (const k of NOVA_ACTION_KINDS) expect(kinds, k).toContain(k);
  // N5's reused acts: a goal bundle, a habit check is ZIGi's; meals, water, a measurement, a supplement, the grocery list, a soundscape, a page, a contribution pre-fill, the staking review.
  for (const k of ['goal-bundle', 'plan-meal', 'grocery-list', 'log-water', 'log-measurement', 'log-supplement', 'start-soundscape', 'open-page', 'prefill-contribution', 'prefill-staking']) expect(kinds, k).toContain(k);
  for (const tool of NOVA_TOOLS.map(t => t.name)) expect(tools, tool).toContain(tool);
  expect(NOVA.filter(c => c.kind === 'injection').length).toBeGreaterThanOrEqual(4);
  // The G6 half is in G6 itself (scored on the device rules on every build), with its own ids, on NOVA's surface.
  expect(NOVA_G6_IDS.length).toBeGreaterThanOrEqual(15); expect(g6.every(c => c.id.startsWith('ai-g6-nova-') && c.surface === 'nova')).toBe(true);
});

import {expect, test} from 'vitest';
import {ACTION_KINDS, COMPOSITE_KINDS} from '../actions/schema';
import {G1_ACTION_KINDS} from '../actions/schema-g1';
import {TOOLS} from '../tools/registry';
import {G1_TOOLS} from '../tools/g1-tools';
import {toolEnv} from '../tools/env';
import {gatesFor, showcaseSources, withG1} from '../tools/fixtures';
import {runTool} from '../tools/registry';
import {CORPUS, CORPUS_AREAS} from './corpus';
import {AK} from './corpus-ak';
import {NOVA} from './corpus-nova';
import {G1, G1_G6_IDS} from './corpus-g1';
import {G6} from './g6-regression';

/**
 * Owner follow-up 2 (G8): BUILD list 2's model-scored set for the owner's real-model round (`ZIGI_SET=g1`) has the shape
 * the harness needs: unique g1- ids apart from the other sets, known areas, kinds and tools, refusals with no card, both
 * languages, ZIGi's pages and NOVA, every new card kind and read tool asked for, the Health gate closed for the numbers
 * and the cycle, an injection case, and the Showcase's records (`records: 'g1'`) so each tool has something to read.
 */
const KINDS = new Set<string>([...ACTION_KINDS, ...COMPOSITE_KINDS]), TOOL_NAMES = new Set(TOOLS.map(t => t.name));
test('the G1 set: unique ids, known names, both languages, both surfaces, every new kind and tool covered', () => {
  expect(G1.length).toBeGreaterThanOrEqual(25);
  expect(new Set(G1.map(c => c.id)).size).toBe(G1.length);
  expect(G1.every(c => c.id.startsWith('g1-') && c.records === 'g1')).toBe(true);
  expect([...CORPUS, ...AK, ...NOVA].some(c => c.id.startsWith('g1-'))).toBe(false);
  for (const lang of ['en', 'nl'] as const) expect(G1.filter(c => c.lang === lang).length, lang).toBeGreaterThanOrEqual(lang === 'en' ? 15 : 8);
  expect(G1.filter(c => c.surface === 'nova').length).toBeGreaterThanOrEqual(3); expect(G1.filter(c => c.important).length).toBeGreaterThanOrEqual(12);
  const g6 = G6.filter(g => G1_G6_IDS.includes(g.id)), kinds = new Set<string>(), tools = new Set<string>();
  for (const c of [...G1, ...g6]) {
    expect(CORPUS_AREAS, c.id).toContain(c.area);
    for (const k of c.expect.kinds ?? []) { expect(KINDS, `${c.id}: kind ${k}`).toContain(k); kinds.add(k); }
    for (const f of c.expect.fields ?? []) { expect(KINDS, `${c.id}: field kind ${String(f.kind)}`).toContain(f.kind); kinds.add(String(f.kind)); }
    for (const tool of [...(c.expect.tools ?? []), ...(c.expect.toolsAny ?? []), ...(c.expect.toolsNot ?? [])]) { expect(TOOL_NAMES, `${c.id}: tool ${tool}`).toContain(tool); tools.add(tool); }
    if (c.expect.refuse) expect(c.expect.kinds, `${c.id}: a refusal expects no card`).toEqual([]);
  }
  for (const k of [...G1_ACTION_KINDS, 'log-expense']) expect(kinds, k).toContain(k);
  for (const tool of G1_TOOLS.map(t => t.name)) expect(tools, tool).toContain(tool);
  for (const tool of ['your_numbers', 'cycle_log']) expect(G1.some(c => c.health === 'closed' && c.expect.toolsNot?.includes(tool)), tool).toBe(true);
  expect(G1.filter(c => c.kind === 'injection').length).toBeGreaterThanOrEqual(1);
  expect(G1_G6_IDS.length).toBeGreaterThanOrEqual(15); expect(g6.every(c => c.id.startsWith('ai-g6-g1-'))).toBe(true);
});
test('the harness\'s records for the set (withG1): every BUILD list 2 tool has the Showcase\'s fictional data to read', () => {
  const env = toolEnv(withG1(showcaseSources()), gatesFor(true), 'provider');
  for (const t of G1_TOOLS) { const r = runTool(t.name, {}, env); expect(r.ok, t.name).toBe(true); expect(JSON.stringify(r.ok && r.data), t.name).not.toMatch(/unknown here/); }
});

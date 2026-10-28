import {describe, expect, test} from 'vitest';
import {ACTION_KINDS, COMPOSITE_KINDS} from '../actions/schema';
import {TOOLS} from '../tools/registry';
import {AA} from './corpus-aa';
import {AF} from './corpus-af';
import {CORPUS, type Expect} from './corpus';
import {CORPUS_AI} from './corpus-ai';
import {SPOKEN} from './corpus-spoken';

/** Session AI (ADR-034 N3): the shape of this session's model-scored set (no model is called here). */
const KINDS = new Set<string>([...ACTION_KINDS, ...COMPOSITE_KINDS]);
// Tools this session adds land in the registry with their features; a case may name one only once it exists.
const TOOL_NAMES = new Set<string>(TOOLS.map(t => t.name));
const expects = (c: (typeof CORPUS_AI)[number]): Expect[] => [c.expect, ...(c.turns ?? []).map(t => t.expect)];
describe('the Session AI corpus', () => {
  test('ids are unique across every model-scored set, and prefixed ai-', () => {
    const ids = CORPUS_AI.map(c => c.id);
    expect(ids.every(id => id.startsWith('ai-'))).toBe(true);
    expect(new Set(ids).size).toBe(ids.length);
    const others = new Set([...CORPUS, ...AA, ...AF, ...SPOKEN].map(c => c.id));
    expect(ids.filter(id => others.has(id))).toEqual([]);
  });
  test('English and Dutch, important cases in both', () => {
    const nl = CORPUS_AI.filter(c => c.lang === 'nl'), en = CORPUS_AI.filter(c => c.lang === 'en');
    expect(en.length).toBeGreaterThanOrEqual(50);
    expect(nl.length).toBeGreaterThanOrEqual(30);
    expect(nl.filter(c => c.important).length).toBeGreaterThanOrEqual(10);
  });
  test('every card kind and tool a case names exists', () => {
    const badKinds = CORPUS_AI.flatMap(c => expects(c).flatMap(e => [...(e.kinds ?? []), ...(e.fields ?? []).map(f => String(f.kind ?? ''))].filter(k => k && !KINDS.has(k)).map(k => `${c.id}:${k}`)));
    expect(badKinds).toEqual([]);
    const known = (name: string) => TOOL_NAMES.has(name) || name === 'net_worth_change';
    const badTools = CORPUS_AI.flatMap(c => expects(c).flatMap(e => [...(e.tools ?? []), ...(e.toolsAny ?? []), ...(e.toolsNot ?? []), ...(e.facts ?? []).map(f => f.tool)].filter(t => !known(t)).map(t => `${c.id}:${t}`)));
    expect(badTools).toEqual([]);
  });
  test('AA-Cloud\'s nine kinds and AB-Cloud\'s three seeds are each covered in English and Dutch', () => {
    for (const prefix of ['ai-aac-area', 'ai-aac-plan', 'ai-aac-sub', 'ai-aac-average', 'ai-aac-log-average', 'ai-aac-calculator', 'ai-aac-search', 'ai-aac-review', 'ai-aac-template', 'ai-ab-food', 'ai-ab-meal-plan', 'ai-ab-plan-goal']) {
      expect(CORPUS_AI.some(c => c.id === prefix), prefix).toBe(true);
      expect(CORPUS_AI.some(c => c.id === `${prefix}-nl` && c.lang === 'nl'), `${prefix}-nl`).toBe(true);
    }
  });
});

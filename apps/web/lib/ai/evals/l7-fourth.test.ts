import {beforeAll, describe, expect, test} from 'vitest';
import {loadAaPlanner} from '../actions/plan';
import {showcaseSources, withG1, withHandHealth, withPortfolios} from '../tools/fixtures';
import type {ToolEnv} from '../tools/env';
import {L7_FOURTH, type FourthCase, type FourthSet} from './l7-fourth';
import {denver, lisbon, novaEnv, typed, zigiEnv} from './l7-fourth-fixtures';
beforeAll(() => loadAaPlanner());

/**
 * Session AL fourth pass (lane L7-4b): the replay's open phrasing families on every build, in ZIGi's panel and NOVA's chat,
 * in the bots' own conditions, with no model. 100 % is held here; a case that fails names its finding ids.
 */
const sources = (set: FourthSet) => set === 'L1' ? lisbon('L1') : set === 'L2' || set === 'LHO' ? lisbon('L2') : set === 'DV' ? denver() : withG1(withPortfolios(withHandHealth(showcaseSources())));
const envFor = (set: FourthSet, surface: 'zigi' | 'nova'): ToolEnv => {
  const src = sources(set), health = set === 'Sc+H', off = set === 'LHO';
  return surface === 'zigi' ? zigiEnv(src, {health, habits: !off}) : novaEnv(src, {health, ...(off ? {scopes: {habits: false}, habitsPage: false} : {})});
};
function why(c: FourthCase, surface: 'zigi' | 'nova'): string | null {
  const t = typed(c.ask, envFor(c.set, surface), c.previous ?? null), e = c.expect, text = t.text;
  const kinds = e.kind ? [e.kind] : c.family === 'language' ? ['answer', 'refusal', 'choices', 'examples'] : ['answer', 'refusal', 'choices'];
  if (!kinds.includes(t.reply.kind)) return `${surface}: expected ${kinds.join('/')}, got ${t.reply.kind}: "${text.slice(0, 140)}"`;
  for (const w of e.mustContain ?? []) if (!text.includes(w)) return `${surface}: missing "${w}" in "${text.slice(0, 220)}"`;
  for (const w of e.mustNot ?? []) if (text.includes(w)) return `${surface}: must not say "${w}": "${text.slice(0, 220)}"`;
  if (e.noCard && t.proposals.some(k => k !== 'open-page')) return `${surface}: no write card expected, got ${t.proposals.join(', ')}`;
  if (e.card) {
    if (t.proposals[0] !== e.card) return `${surface}: expected the ${e.card} card, got ${t.proposals.join(', ') || 'none'}`;
    const block = /```zigoals-action\n([\s\S]*?)\n```/.exec(text)?.[1], action = block ? JSON.parse(block) as Record<string, unknown> : {};
    for (const [k, v] of Object.entries(e.fields ?? {})) if (JSON.stringify(action[k]) !== JSON.stringify(v)) return `${surface}: card field ${k} is ${JSON.stringify(action[k])}, expected ${JSON.stringify(v)}`;
  }
  if (e.quickAdd !== undefined && t.quickAdd !== e.quickAdd) return `${surface}: Quick add ${t.quickAdd ? `shows (${t.quickAddKind})` : 'does not show'}, expected ${e.quickAdd ? 'shown' : 'none'}`;
  return null;
}
describe('L7 fourth pass: the replay\'s open families, ZIGi and NOVA, no model', () => {
  test('ids are unique, every case names its findings, and the families are covered in both surfaces', () => {
    expect(new Set(L7_FOURTH.map(c => c.id)).size).toBe(L7_FOURTH.length);
    for (const c of L7_FOURTH) expect(c.ids.length, c.id).toBeGreaterThan(2);
    for (const family of ['checklist', 'habits-left', 'habits', 'habit-edit', 'habit-create', 'stray-write', 'tasks', 'goals-ask', 'goals-write', 'privacy', 'trust', 'small-talk', 'wealth', 'health', 'follow-up', 'language', 'food']) expect(L7_FOURTH.filter(c => c.family === family).length, family).toBeGreaterThanOrEqual(2);
    expect(L7_FOURTH.some(c => c.lang === 'nl')).toBe(true);
  });
  test('every case passes (failures name their finding ids)', {timeout: 60_000}, () => {
    const failed: string[] = [];
    for (const c of L7_FOURTH) for (const surface of c.surface && c.surface !== 'both' ? [c.surface] : ['zigi', 'nova'] as const) { const w = why(c, surface); if (w) failed.push(`${c.id} (${c.ids}) "${c.ask}": ${w}`); }
    expect(failed).toEqual([]);
  });
});

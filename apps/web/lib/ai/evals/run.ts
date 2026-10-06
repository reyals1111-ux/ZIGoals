import {parseReply} from '../actions/parse';
import {DATA_CLOSE, DATA_OPEN, escapeData} from '../context/specialists';
import {localAnswer} from '../local-answers/engine';
import {detectRisk} from '../safety';
import {createHabit} from '../../habits';
import type {ToolEnv, ToolSources} from '../tools/env';
import {GOLDEN_CATEGORIES, type GoldenCase, type GoldenCategory} from './golden-set';

/**
 * Runs ZIGi's golden set (Session V Part 11) on the device's own deciders: no provider, no network, no storage. Each
 * case passes or says why not, in words a reviewer can act on.
 */
export type GoldenResult = {id: string; category: GoldenCategory; pass: boolean; why: string | null};
const count = (text: string, part: string) => text.split(part).length - 1;
function check(c: GoldenCase, envs: {open: ToolEnv; closed: ToolEnv}): string | null {
  switch (c.kind) {
    case 'local': {
      const r = localAnswer(c.question, c.health === 'closed' ? envs.closed : envs.open), text = 'text' in r ? r.text : '';
      if (r.kind !== c.expect.reply) return `expected ${c.expect.reply}, got ${r.kind}${text ? `: "${text.slice(0, 80)}"` : ''}`;
      for (const words of c.expect.includes ?? []) if (!text.includes(words)) return `missing "${words}" in "${text.slice(0, 120)}"`;
      for (const words of c.expect.excludes ?? []) if (text.includes(words)) return `must not say "${words}"`;
      const tools = r.kind === 'none' ? [] : r.calls.map(call => call.tool);
      for (const tool of c.expect.tools ?? []) if (!tools.includes(tool)) return `expected the ${tool} tool, used ${tools.join(', ') || 'none'}`;
      if (c.expect.choices) { const offered = (r.kind === 'choices' || r.kind === 'refusal' ? (r.choices ?? []).map(choice => choice.label) : []).sort(); if (JSON.stringify(offered) !== JSON.stringify([...c.expect.choices].sort())) return `expected choices ${c.expect.choices.join(', ')}, got ${offered.join(', ') || 'none'}`; }
      return null;
    }
    case 'reply': {
      const parsed = parseReply(c.reply), kinds = parsed.proposals.map(p => p.kind);
      if (JSON.stringify(kinds) !== JSON.stringify(c.expect.kinds)) return `expected cards [${c.expect.kinds.join(', ')}], got [${kinds.join(', ')}]`;
      if (parsed.rejected.length !== (c.expect.rejected ?? 0)) return `expected ${c.expect.rejected ?? 0} refused blocks, got ${parsed.rejected.length}`;
      for (const words of c.expect.textExcludes ?? []) if (parsed.text.includes(words)) return `the shown text carries "${words}"`;
      return null;
    }
    case 'safety': { const found = detectRisk(c.text); return found === c.expect ? null : `expected ${c.expect ?? 'no topic'}, got ${found ?? 'no topic'}`; }
    case 'data': {
      const wrapped = `${DATA_OPEN}\n${escapeData(c.record)}\n${DATA_CLOSE}`;
      return count(wrapped, DATA_OPEN) === 1 && count(wrapped, DATA_CLOSE) === 1 ? null : 'the record could close the data marks';
    }
  }
}
/** The golden set's records: the given ones plus two "Stretch" habits and a second "fund" goal, for real ambiguities. */
export function goldenSources(base: ToolSources): ToolSources {
  let habits = base.habits;
  for (const title of ['Stretch morning', 'Stretch evening']) habits = createHabit(habits, {title, category: 'Health', description: '', notes: '', schedule: {kind: 'daily'}, target: 1}, base.now);
  const fund = base.platform.goals.find(g => g.name === 'Emergency fund');
  const goals = fund ? [...base.platform.goals, {...fund, id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', name: 'Holiday fund'}] : base.platform.goals;
  return {...base, habits, platform: {...base.platform, goals}};
}
export function runGolden(cases: readonly GoldenCase[], envs: {open: ToolEnv; closed: ToolEnv}): GoldenResult[] {
  return cases.map(c => { let why: string | null; try { why = check(c, envs); } catch (error) { why = `threw: ${error instanceof Error ? error.message : String(error)}`; } return {id: c.id, category: c.category, pass: why === null, why}; });
}
/** The pass rate, overall and per category, and one line for the CI log. */
export function summarize(results: readonly GoldenResult[]) {
  const passed = results.filter(r => r.pass).length, byCategory = Object.fromEntries(GOLDEN_CATEGORIES.map(category => { const of = results.filter(r => r.category === category); return [category, {passed: of.filter(r => r.pass).length, total: of.length}]; })) as Record<GoldenCategory, {passed: number; total: number}>;
  const rate = results.length ? passed / results.length : 0;
  return {passed, total: results.length, rate, byCategory, line: `ZIGi golden set: ${passed}/${results.length} passed (${(rate * 100).toFixed(1)}%) · ${GOLDEN_CATEGORIES.map(c => `${c} ${byCategory[c].passed}/${byCategory[c].total}`).join(' · ')}`};
}

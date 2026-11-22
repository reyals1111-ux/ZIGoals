import {describe, expect, test} from 'vitest';
import type {ToolEnv, ToolSources} from '../tools/env';
import {DAY, freshAll, novaEnv, showcaseAll, zigiEnv} from '../evals/as/harness';
import {av2MoneyAnswer} from './av2-money';
import {AV2_MONEY} from '../evals/as/cases-av2-money';
import type {LocalReply} from './engine';

/**
 * Session AV lane 2 (money): the money pillar's lane 2 answers, read straight from `av2MoneyAnswer` (the lead wires it
 * into engine.ts and records the corpus): each in English and Dutch, from the feature's own figures, refused while
 * Wealth is not shared, and never claiming a question that is not its own.
 */
const text = (r: LocalReply | null) => r && 'text' in r ? r.text : '';
export const withLog = (s: ToolSources, patch: (log: NonNullable<ToolSources['moneyLog']>) => NonNullable<ToolSources['moneyLog']>): ToolSources => ({...s, moneyLog: patch(s.moneyLog!)});
export const shut = (env: ToolEnv): ToolEnv => ({...env, areas: {...env.areas, wealth: false}});
export const zigi = (q: string, s: ToolSources = showcaseAll()) => av2MoneyAnswer(q, zigiEnv(s));
export const nova = (q: string, s: ToolSources = showcaseAll()) => av2MoneyAnswer(q, novaEnv(s));

describe('group 5: the money log tools', () => {
  const marked = withLog(showcaseAll(), log => ({...log, own: {expense: ['Pets']}, entries: log.entries.map((e, i) => i === 1 ? {...e, excluded: true as const} : i === 2 ? {...e, taxDeductible: true as const} : e)}));
  test('left out: what, how much, where it stays (EN and NL)', () => {
    expect(text(zigi('what did I leave out of my spending', marked))).toMatch(/^1 entry left out, together €12\.50\./);
    expect(text(zigi('wat telt niet mee in mijn uitgaven', marked))).toMatch(/^1 post weggelaten, samen €12,50|^1 post weggelaten, samen €12\.50/);
    expect(text(zigi('what did I leave out of my spending'))).toContain('Nothing is left out');
  });
  test('tax-deductible: the marked entries this year, never advice', () => {
    expect(text(zigi('what is tax deductible this year', marked))).toContain(`1 entry marked tax-deductible in ${DAY.slice(0, 4)}`);
    expect(text(nova('wat is aftrekbaar dit jaar', marked))).toContain('geen belastingadvies');
  });
  test('own categories', () => {
    expect(text(zigi('what are my own categories', marked))).toBe('For spending: Pets.');
    expect(text(zigi('welke eigen categorieën heb ik', marked))).toBe('Voor uitgaven: Pets.');
    expect(text(zigi('what are my own categories', freshAll()))).toContain('no categories of your own yet');
  });
});

describe('group 5: transfers', () => {
  test('marked pairs and pairs that look like one', () => {
    const s = withLog(freshAll(), log => ({...log, entries: [
      {id: 'o', kind: 'expense', amount: '450.00', currency: 'EUR', category: 'Other', date: '2026-11-10', createdAt: '2026-11-10T10:00:00.000Z', account: 'Checking'},
      {id: 'i', kind: 'income', amount: '450.00', currency: 'EUR', category: 'Other income', date: '2026-11-11', createdAt: '2026-11-11T10:00:00.000Z', account: 'Card'}]}));
    expect(text(zigi('which card payments are marked as transfers', s))).toBe('No entry is marked as a transfer yet. 1 pair looks like one (the same amount out of one imported account and into another): Wealth → Spending → Money tools → To review.');
    const m = withLog(s, log => ({...log, entries: log.entries.map(e => ({...e, transfer: e.id === 'o' ? 'i' : 'o'}))}));
    expect(text(zigi('welke overboekingen tussen mijn rekeningen zijn er', m))).toMatch(/^1 overboeking gemarkeerd, buiten uitgaven en inkomsten gelaten: €450[.,]00 \(2026-11-10\)\./);
  });
});

describe('every answer under the Wealth switch, and only its own questions', () => {
  test('Wealth off: the refusal, never a figure', () => {
    for (const c of AV2_MONEY) for (const q of [...c.en, ...c.nl]) {
      const r = av2MoneyAnswer(q, shut(zigiEnv(showcaseAll())));
      expect(r, q).not.toBeNull();
      expect(r!.kind, q).toBe('refusal');
    }
  });
  test('every corpus question is answered on the Showcase, EN and NL', () => {
    for (const c of AV2_MONEY) for (const q of [...c.en, ...c.nl]) expect(text(zigi(q)), q).not.toBe('');
  });
  test('not its questions', () => {
    for (const q of ['what did I spend this week', 'log 12 lunch', 'how are my habits', 'wat heb ik deze week uitgegeven']) expect(zigi(q), q).toBeNull();
  });
});

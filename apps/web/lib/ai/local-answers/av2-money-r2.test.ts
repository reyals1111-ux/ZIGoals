import {describe, expect, test} from 'vitest';
import type {ToolEnv, ToolSources} from '../tools/env';
import {DAY, freshAll, novaEnv, showcaseAll, zigiEnv} from '../evals/as/harness';
import {av2MoneyR2Answer} from './av2-money-r2';
import {AV2_MONEY_R2} from '../evals/as/cases-av2-money-r2';
import type {LocalReply} from './engine';
import type {MoneyMore} from '../../money-more/schema';

/**
 * Session AV lane 2, round 2 (money): round 2's answers, read straight from `av2MoneyR2Answer` (the lead wires it into
 * engine.ts and records the corpus): each in English and Dutch, from the feature's own figures, refused while Wealth is
 * not shared, and never claiming a question that is not its own.
 */
const text = (r: LocalReply | null) => r && 'text' in r ? r.text : '';
const withLog = (s: ToolSources, patch: (log: NonNullable<ToolSources['moneyLog']>) => NonNullable<ToolSources['moneyLog']>): ToolSources => ({...s, moneyLog: patch(s.moneyLog!)});
const withMore = (env: ToolEnv, more: MoneyMore): ToolEnv => ({...env, moneyMore: more} as ToolEnv);
const shut = (env: ToolEnv): ToolEnv => ({...env, areas: {...env.areas, wealth: false}});
const zigi = (q: string, s: ToolSources = showcaseAll(), more?: MoneyMore) => av2MoneyR2Answer(q, more ? withMore(zigiEnv(s), more) : zigiEnv(s));
const nova = (q: string, s: ToolSources = showcaseAll(), more?: MoneyMore) => av2MoneyR2Answer(q, more ? withMore(novaEnv(s), more) : novaEnv(s));
const month = DAY.slice(0, 7), at = `${DAY}T10:00:00.000Z`;
const mine = (over: Record<string, unknown>) => ({id: 'x', kind: 'expense' as const, amount: '10.00', currency: 'EUR', category: 'Food & drink', date: `${month}-05`, createdAt: at, ...over});

describe('every corpus question is answered, EN and NL, and refused while Wealth is closed', () => {
  for (const intent of AV2_MONEY_R2) test(intent.id, () => {
    for (const q of [...intent.en, ...intent.nl]) {
      expect(text(zigi(q)), q).not.toBe('');
      expect(text(nova(q)), q).not.toBe('');
      expect(text(av2MoneyR2Answer(q, shut(zigiEnv(showcaseAll())))), q).not.toMatch(/€/);
    }
  });
});

describe('quick logging', () => {
  const more: MoneyMore = {version: 1, saved: [{id: 's1', name: 'Coffee', kind: 'expense', amount: '3.20', currency: 'EUR', category: 'Food & drink'}]};
  test('saved entries', () => {
    expect(text(zigi('what are my saved entries', freshAll(), more))).toBe('1 saved entry: Coffee €3.20. One tap beside Log spending logs it today, with Undo.');
    expect(text(zigi('welke opgeslagen posten heb ik', freshAll(), more))).toMatch(/^1 opgeslagen post: Coffee €3[.,]20\./);
    expect(text(zigi('what are my saved entries', freshAll()))).toContain('no saved entries yet');
  });
  test('paid with and subcategories, this month', () => {
    const s = withLog(freshAll(), log => ({...log, entries: [mine({id: 'a', paidWith: 'cash', sub: 'Coffee', amount: '3.00'}), mine({id: 'b', paidWith: 'credit', amount: '40.00'}), mine({id: 'c', sub: 'Coffee', amount: '2.00'})]}));
    expect(text(zigi('how did I pay this month', s))).toBe('Spent this month by how you paid: Credit card €40.00, Cash €3.00 and not said €2.00. Each currency on its own; only what counts in your spending.');
    expect(text(zigi('hoeveel heb ik deze maand contant betaald', s))).toMatch(/^Deze maand uitgegeven per betaalwijze: Creditcard €40[.,]00, Contant €3[.,]00 en niet gezegd €2[.,]00\./);
    expect(text(zigi('how did I pay this month', freshAll()))).toContain('No entry this month says how it was paid');
    expect(text(zigi('what did I spend per subcategory this month', s))).toBe('This month by subcategory — Food & drink: Coffee €5.00 and other €40.00.');
    expect(text(zigi('wat gaf ik uit per subcategorie', s))).toMatch(/^Deze maand per subcategorie — Food & drink: Coffee €5[.,]00 en overig €40[.,]00\.$/);
  });
  test('never claims another question', () => {
    for (const q of ['what did I spend this month', 'log coffee 3.20', 'how much is left in my budgets', 'hoeveel heb ik uitgegeven']) expect(zigi(q), q).toBeNull();
  });
});

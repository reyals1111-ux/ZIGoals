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
  test('budgets: a day left, your own budgets, payee budgets', () => {
    const s: ToolSources = {...withLog(freshAll(), log => ({...log, entries: [mine({id: 'a', category: 'Groceries', note: 'Albert Heijn', amount: '80.00'}), mine({id: 'b', category: 'Fun', amount: '20.00'})]})),
      nova: {...freshAll().nova, budgets: {version: 1, budgets: [{id: 'g', category: 'Groceries', currency: 'EUR', monthly: '300.00', rollover: false, since: month}], payees: [{payee: 'Albert Heijn', currency: 'EUR', amount: '100.00'}]}}};
    const days = 30 - Number(DAY.slice(8)) + 1; // DAY is in November
    expect(text(zigi('how much can I spend per day', s))).toMatch(new RegExp(`^About this much a day is left for the ${days} days to go: Groceries €\\d+\\.\\d\\d\\.`));
    expect(text(zigi('hoeveel heb ik per dag over', s))).toMatch(/^Ongeveer zoveel per dag is er over/);
    expect(text(zigi('how much can I spend per day', freshAll()))).toContain('no budgets yet');
    expect(text(zigi('how are my payee budgets', s))).toBe('This month — Albert Heijn: €80.00 of €100.00, €20.00 left, near the limit.');
    expect(text(zigi('hoe staan mijn winkelbudgetten', s))).toMatch(/^Deze maand — Albert Heijn: €80[.,]00 van €100[.,]00, €20[.,]00 over, bijna op\.$/);
    const more: MoneyMore = {version: 1, budgets: [{id: 'o', name: 'Out', currency: 'EUR', amount: '50.00', categories: ['Fun'], every: 'month'}]};
    expect(text(zigi('how are my own budgets', s, more))).toMatch(/^Out: €20\.00 of €50\.00, €30\.00 left, \d+ days to go \(about €[\d.]+ a day\)\.$/);
    expect(text(zigi('hoe staan mijn eigen budgetten', s, more))).toMatch(/^Out: €20[.,]00 van €50[.,]00, €30[.,]00 over, \d+ dagen te gaan/);
    expect(text(zigi('how are my own budgets', s))).toContain('none of your own budgets yet');
  });
  test('alerts: above the usual, balance lines, bills to record', () => {
    const hist = ['09-01', '09-15', '10-01', '10-15'].map((d, i) => mine({id: `h${i}`, category: 'Groceries', note: 'Market', amount: '40.00', date: `2026-${d}`}));
    const s = withLog(freshAll(), log => ({...log, entries: [...hist, mine({id: 'big', category: 'Groceries', note: 'Market', amount: '150.00', date: DAY})]}));
    expect(text(zigi('is there any unusual spending', s))).toMatch(/^Above its usual in the last two weeks: Market €150\.00 \([^;]+; usually €40\.00\)\./);
    expect(text(zigi('zijn er ongewone uitgaven', s))).toMatch(/^Boven het gewone in de afgelopen twee weken: Market €150[.,]00 \([^;]+; meestal €40[.,]00\)\./);
    expect(text(zigi('is there any unusual spending', freshAll()))).toContain('Nothing in the last two weeks');
    expect(text(zigi('show my balance alerts', freshAll()))).toContain('No account has a balance line yet');
    expect(text(zigi('which bills do I still need to record', freshAll()))).toContain('No bill due in the last three days');
  });
  test('between you and others: who owes you, lent and borrowed', () => {
    const more: MoneyMore = {version: 1, owed: [{id: 'o1', name: 'Sam', amount: '20.00', currency: 'EUR', date: `${month}-03`, entryId: 'd1'}],
      loans: [{id: 'l1', kind: 'borrowed', name: 'Mum', amount: '50.00', currency: 'EUR', date: `${month}-01`}]};
    expect(text(zigi('who owes me money', freshAll(), more))).toBe('Owed to you: Sam €20.00 for shared costs. Kept on this device only.');
    expect(text(zigi('wie is mij nog geld schuldig', freshAll(), more))).toMatch(/^Je tegoed: Sam €20[.,]00 voor gedeelde kosten\./);
    expect(text(zigi('what have I lent and borrowed', freshAll(), more))).toBe('Borrowed from Mum €50.00 left. Beside your net worth: −€30.00.');
    expect(text(zigi('who owes me money', freshAll()))).toContain('Nobody owes you anything here');
  });
  test('never claims another question', () => {
    for (const q of ['what did I spend this month', 'log coffee 3.20', 'how much is left in my budgets', 'hoeveel heb ik uitgegeven']) expect(zigi(q), q).toBeNull();
  });
});

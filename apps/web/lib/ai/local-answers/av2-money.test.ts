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
    // Session AV lane 2 (review b2a #6: a Dutch answer writes its money the Dutch way, "€ 40,00"; each Dutch figure is now matched exactly in that form, deliberate)
    expect(text(zigi('wat telt niet mee in mijn uitgaven', marked))).toMatch(/^1 post weggelaten, samen €\s12,50/);
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
    // Session AV lane 2 (review b2a #6: a Dutch answer writes its money the Dutch way, "€ 40,00"; each Dutch figure is now matched exactly in that form, deliberate)
    expect(text(zigi('welke overboekingen tussen mijn rekeningen zijn er', m))).toMatch(/^1 overboeking gemarkeerd, buiten uitgaven en inkomsten gelaten: €\s450,00 \(2026-11-10\)\./);
  });
});

describe('group 5: notices', () => {
  const withBudgets = (s: ToolSources, patch: Partial<NonNullable<NonNullable<ToolSources['nova']>['budgets']>>): ToolSources => ({...s, nova: {...s.nova, budgets: {...s.nova!.budgets!, ...patch}}});
  test('watched payees and challenges, from the Showcase money log', () => {
    const s = withBudgets(showcaseAll(), {payees: [{payee: 'Weekly shop', currency: 'EUR'}], challenges: [{id: 'c1', category: 'Food & drink', currency: 'EUR', month: DAY.slice(0, 7)}]});
    expect(text(zigi('which payees am I watching', s))).toMatch(/^Weekly shop: €[\d.,]+ so far/);
    // Session AV lane 2 (review b2a #6: a Dutch answer writes its money the Dutch way, "€ 40,00"; each Dutch figure is now matched exactly in that form, deliberate)
    expect(text(zigi('welke winkels volg ik', s))).toMatch(/^Weekly shop: €\s[\d.]+,\d{2} tot nu toe/);
    expect(text(zigi('how is my spending challenge going', s))).toMatch(/^Food & drink \(Nov 2026\): €[\d.,]+ against €[\d.,]+ last month: /);
    expect(text(zigi('hoe gaat mijn uitdaging', s))).toMatch(/^Food & drink \(november 2026\): /);
    expect(text(zigi('how is my spending challenge going'))).toContain('No spending challenge is running');
  });
  test('until payday and the low-balance line: the forecast\'s own figures, said as a model', () => {
    expect(text(zigi('how much will I have left until payday'))).toContain('no regular monthly income yet');
    const paid = withLog(showcaseAll(), log => { const salary = log.entries.find(e => e.category === 'Salary')!; return {...log, entries: [...log.entries, {...salary, id: 'av2-salary-before', date: '2026-10-15', createdAt: '2026-10-15T12:00:00.000Z'}]}; });
    expect(text(zigi('how much will I have left until payday', paid))).toMatch(/^Your next payday is .*\. (The 60-day forecast leaves about €[\d.,]+ the day before|What is left before it needs a EUR cash)/);
    expect(text(zigi('hoeveel houd ik over tot mijn salaris', paid))).toMatch(/^Je volgende salarisdag is /);
    expect(text(zigi('will my cash go below my line'))).toContain('You have not set a low-balance line');
    const s = withLog(showcaseAll(), log => ({...log, lowBalance: {amount: '1000000.00', currency: 'EUR'}}));
    const said = text(zigi('zakt mijn geld onder mijn grens', s));
    expect(said).toMatch(/^(Ja: de prognose|Nee: de prognose)/);
  });
  test('the year in review and account notes', () => {
    expect(text(zigi('how was my year for money'))).toMatch(/^2026 so far in EUR: €[\d.,]+ spent, €[\d.,]+ came in; most on /);
    expect(text(zigi('hoe was mijn jaar voor mijn geld'))).toMatch(/^2026 tot nu toe in EUR: /);
    const s = showcaseAll(), first = s.accounts!.items[0]!;
    const noted = withLog(s, log => ({...log, accounts: {notes: {[first.id]: 'Joint with Sam'}}}));
    expect(text(zigi('what notes do I have on my accounts', noted))).toBe(`${first.name}: Joint with Sam`);
    expect(text(zigi('welke notities heb ik bij mijn rekeningen'))).toContain('Geen van je rekeningen heeft een notitie');
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

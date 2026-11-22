import {describe, expect, test} from 'vitest';
import type {ToolEnv, ToolSources} from '../tools/env';
import {DAY, freshAll, novaEnv, showcaseAll, zigiEnv} from '../evals/as/harness';
import {av2R6MoneyAnswer} from './av2-r6-money';
import {AV2_R6_MONEY} from '../evals/as/cases-av2-r6-money';
import {CORPUS} from '../evals/as/cases';
import {avAnswer} from './av-answers';
import {av2MoneyAnswer} from './av2-money';
import {av2MoneyR2Answer} from './av2-money-r2';
import {av2R3MoneyAnswer} from './av2-r3-money';
import {av2R4MoneyAnswer} from './av2-r4-money';
import {av2R5MoneyAnswer} from './av2-r5-money';
import {av2RestAnswer} from './av2-rest';
import {av2SyncAnswer} from './av2-sync';
import {rehearsalAnswer} from './au-answers';
import type {LocalReply} from './engine';
import type {MoneyEntry} from '../../money-log/schema';
import {emptyBudgets, type BudgetsRecord} from '../../budgets/schema';
import {emptyBudgetPeriods} from '../../budgets/periods';

/**
 * Session AV lane 2, round 6 (money; EveryDollar, Banktivity): round 6's answers, read straight from `av2R6MoneyAnswer` (the
 * lead wires it into engine.ts before `av2R5MoneyAnswer` and records the corpus): each in English and Dutch — Dutch money as
 * "€ 12,50" and Dutch month words — from the feature's own figures, refused while Wealth is not shared, and never claiming
 * a question of the corpus that is not its own (its own intents are left out of that check, as they will be in the corpus);
 * the answers that run before it in engine.ts claim none of its questions.
 */
const text = (r: LocalReply | null) => r && 'text' in r ? r.text.replace(/[  ]/g, ' ') : '';
const shut = (env: ToolEnv): ToolEnv => ({...env, areas: {...env.areas, wealth: false}});
const zigi = (q: string, s: ToolSources = showcaseAll()) => av2R6MoneyAnswer(q, zigiEnv(s));
const nova = (q: string, s: ToolSources = showcaseAll()) => av2R6MoneyAnswer(q, novaEnv(s));
const month = DAY.slice(0, 7), at = `${DAY}T10:00:00.000Z`;
let n = 0;
const mine = (over: Partial<MoneyEntry>): MoneyEntry => ({id: `r6-${n++}`, kind: 'expense', amount: '10.00', currency: 'EUR', category: 'Groceries', date: `${month}-05`, createdAt: at, ...over});
const withLog = (s: ToolSources, entries: MoneyEntry[], extra: Record<string, unknown> = {}): ToolSources => ({...s, moneyLog: {...s.moneyLog!, entries, ...extra}});
const withNova = (s: ToolSources, more: Record<string, unknown>): ToolSources => ({...s, nova: {...(s.nova ?? {}), ...more} as ToolSources['nova']});
const withAk = (s: ToolSources, ak: Record<string, unknown>): ToolSources => ({...s, ak: {...(s.ak ?? {}), ...ak} as ToolSources['ak']});
const EARLIER = [['au-answers', rehearsalAnswer], ['av2-rest', (q: string, env: ToolEnv) => av2RestAnswer(q, env)], ['av2-sync', (q: string, env: ToolEnv) => av2SyncAnswer(q, env)], ['av2-r5-money', av2R5MoneyAnswer], ['av2-r4-money', av2R4MoneyAnswer], ['av2-r3-money', av2R3MoneyAnswer], ['av2-money-r2', av2MoneyR2Answer], ['av2-money', av2MoneyAnswer], ['av-answers', avAnswer]] as const;

describe('every question is answered, EN and NL, and refused while Wealth is closed', () => {
  for (const intent of AV2_R6_MONEY) test(intent.id, () => {
    for (const q of [...intent.en, ...intent.nl]) {
      expect(text(zigi(q)), q).not.toBe('');
      expect(text(nova(q)), q).not.toBe('');
      expect(text(zigi(q, freshAll())), q).not.toBe('');
      expect(text(av2R6MoneyAnswer(q, shut(zigiEnv(showcaseAll())))), q).not.toMatch(/€/);
    }
    for (const q of intent.nl) expect(text(zigi(q)), q).not.toMatch(/\b(?:January|February|March|April|May|June|July|August|September|October|November|December)\b/);
  });
});
describe('claims none of the corpus questions (its own intents left out)', () => {
  test('every other intent of the corpus', () => {
    const own = new Set(AV2_R6_MONEY.map(i => i.id)), env = zigiEnv(showcaseAll());
    for (const intent of CORPUS.filter(i => !own.has(i.id))) for (const q of [...intent.en, ...intent.nl]) expect(av2R6MoneyAnswer(q, env), `${intent.id}: ${q}`).toBeNull();
  }, 120_000);
});
describe('the answers before it in engine.ts claim none of round 6’s questions', () => {
  for (const intent of AV2_R6_MONEY) test(intent.id, () => {
    for (const q of [...intent.en, ...intent.nl]) for (const [name, fn] of EARLIER) expect(fn(q, zigiEnv(showcaseAll())), `${name}: ${q}`).toBeNull();
  });
});

describe('refunds (#425): by the shared rule, never income', () => {
  const s = withLog(freshAll(), [mine({amount: '100.00'}), mine({kind: 'income', refund: true, amount: '30.00', date: `${month}-06`}), mine({kind: 'income', category: 'Salary', amount: '1000.00', date: `${month}-01`})]);
  test('English and Dutch', () => {
    expect(text(zigi('how much did I get refunded this month', s))).toMatch(/^1 refund in Nov 2026: Groceries €30\.00\. Spending this month after them: €70\.00\. A refund lowers/);
    const nl = text(zigi('hoeveel geld heb ik deze maand terug gekregen', s));
    expect(nl).toContain('1 terugbetaling in november 2026: Groceries € 30,00. Uitgaven deze maand na aftrek: € 70,00.');
  });
  test('none logged says how', () => expect(text(zigi('does a refund count as income', withLog(freshAll(), [])))).toMatch(/^No refunds logged in Nov 2026\. A refund lowers its category’s spending/));
});

const budgets: BudgetsRecord = {...emptyBudgets(), budgets: [
  {id: 'rent', category: 'Home', currency: 'EUR', monthly: '900.00', rollover: false, since: '2026-01', order: 0},
  {id: 'food', category: 'Groceries', currency: 'EUR', monthly: '300.00', rollover: false, since: '2026-01', order: 1},
], ahead: [{id: 'a1', from: month, budgetId: 'food', amount: '120.00', at}]};
describe('budgets: paychecks (#426), set aside (#428), order (#429)', () => {
  const plan = {...emptyBudgetPeriods(), paychecks: {items: [{id: 'p1', name: '1st', every: 'month' as const, day: 1, amount: '1000.00', currency: 'EUR'}, {id: 'p15', name: '15th', every: 'month' as const, day: 15, amount: '800.00', currency: 'EUR'}], lines: {'b:rent': 'p1', 'b:food': 'p15'}}};
  const s = withNova(freshAll(), {budgets, budgetPeriods: plan});
  test('each paycheck: what it holds, what is set against it, what is left', () => {
    expect(text(zigi('what is left of each paycheck', s))).toBe('Your paychecks in Nov 2026: 1st: holds €1,000.00, €900.00 set against it, €100.00 left and 15th: holds €800.00, €300.00 set against it, €500.00 left. From your own amounts.');
    expect(text(zigi('wat staat er per salaris gepland', s))).toContain('1st: € 1.000,00 binnen, € 900,00 gepland, € 100,00 over');
  });
  test('set aside for next month, and the order', () => {
    expect(text(zigi('what did I set aside for next month', s))).toBe('Set aside for Dec 2026: €120.00 (Groceries €120.00). It is held this month and covers those budgets then.');
    expect(text(zigi('wat heb ik opzij gezet voor volgende maand', s))).toContain('Opzij gezet voor december 2026: € 120,00');
    expect(text(zigi('how do I reorder my budgets', s))).toMatch(/^Your own order: Home and Groceries\. Open Wealth → Budgets → Reorder budgets/);
  });
});
describe('the streak (#427), the check (#430) and put away (#431)', () => {
  test('the streak is off by default and says where it lives; on, it counts days', () => {
    expect(text(zigi('what is my money streak', freshAll()))).toMatch(/^The money streak is off\./);
    const on = withAk(withLog(freshAll(), [mine({createdAt: `${DAY}T09:00:00.000Z`}), mine({createdAt: '2026-11-16T09:00:00.000Z'})]), {moneyMore: {version: 1, streak: {on: true}}});
    expect(text(zigi('what is my money streak', on))).toBe('2 days in a row you looked at your money, today too. A day off is fine.');
    expect(text(zigi('wat is mijn geldreeks', on))).toBe('2 dagen op rij naar je geld gekeken, vandaag ook. Een dag overslaan mag.');
  });
  test('the check names what it finds and changes nothing', () => {
    const s = withLog(freshAll(), [mine({id: 'a', note: 'Shop'}), mine({id: 'b', note: 'Shop'}), mine({id: 'c', transfer: 'gone'})]);
    expect(text(zigi('are there duplicate entries in my money log', s))).toBe('The check finds 2 things to look at: 1 × entries that look the same twice and 1 × a transfer missing its other side. Nothing changes until you choose a repair in Wealth → Spending → Check and tidy your money records; each has Undo.');
    expect(text(zigi('zijn er dubbele boekingen in mijn geldlog', s))).toContain('De controle vindt 2 punten');
  });
  test('put away: the years that can go and the years put away', () => {
    const s = withLog(freshAll(), [mine({date: '2024-03-01'}), mine({date: '2025-03-01'})], {putAway: {years: [{id: 'y', year: '2023', at, entries: [mine({date: '2023-01-01'})]}]}});
    expect(text(zigi('which years did I put away', s))).toContain('Put away now: 2023 (1 entry); Bring back returns them. Years you can put away: 2025 (1) and 2024 (1).');
    expect(text(zigi('welke jaren heb ik opgeborgen', s))).toContain('Nu opgeborgen: 2023 (1 boeking);'); // Review B6Q-19: one entry, one boeking (was “1 entries”, “1 boekingen”)
  });
});

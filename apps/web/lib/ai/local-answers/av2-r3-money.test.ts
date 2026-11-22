import {describe, expect, test} from 'vitest';
import type {ToolEnv, ToolSources} from '../tools/env';
import {DAY, freshAll, novaEnv, showcaseAll, zigiEnv} from '../evals/as/harness';
import {av2R3MoneyAnswer, LABEL_NL} from './av2-r3-money';
import {AV2_R3_MONEY} from '../evals/as/cases-av2-r3-money';
import {CORPUS} from '../evals/as/cases';
import {avAnswer} from './av-answers';
import {av2MoneyAnswer} from './av2-money';
import {av2MoneyR2Answer} from './av2-money-r2';
import type {LocalReply} from './engine';
import type {MoneyMore} from '../../money-more/schema';
import type {MoneyEntry} from '../../money-log/schema';
import {createHabit, emptyHabitData, logHabitCount, type HabitData} from '../../habits';
import {addLocalDays} from '../../local-date';

/**
 * Session AV lane 2, round 3 (money): round 3's answers, read straight from `av2R3MoneyAnswer` (the lead wires it into
 * engine.ts before `av2MoneyR2Answer` and records the corpus): each in English and Dutch — Dutch money as "€ 12,50" and
 * Dutch day and month words — from the feature's own figures, refused while Wealth is not shared, and never claiming a
 * question of the corpus that is not its own.
 */
/** The reply's text, with the no-break space Dutch money writes after € shown as a plain space. */
export const text = (r: LocalReply | null) => r && 'text' in r ? r.text.replace(/\u00a0/g, ' ') : '';
export const withLog = (s: ToolSources, entries: MoneyEntry[], extra: Partial<NonNullable<ToolSources['moneyLog']>> = {}): ToolSources => ({...s, moneyLog: {...s.moneyLog!, entries, ...extra}});
export const withMore = (env: ToolEnv, more: MoneyMore): ToolEnv => ({...env, moneyMore: more} as ToolEnv);
const shut = (env: ToolEnv): ToolEnv => ({...env, areas: {...env.areas, wealth: false}});
export const zigi = (q: string, s: ToolSources = showcaseAll(), more?: MoneyMore) => av2R3MoneyAnswer(q, more ? withMore(zigiEnv(s), more) : zigiEnv(s));
const nova = (q: string, s: ToolSources = showcaseAll(), more?: MoneyMore) => av2R3MoneyAnswer(q, more ? withMore(novaEnv(s), more) : novaEnv(s));
export const month = DAY.slice(0, 7), at = `${DAY}T10:00:00.000Z`;
export const mine = (over: Partial<MoneyEntry>): MoneyEntry => ({id: Math.random().toString(36).slice(2, 10), kind: 'expense', amount: '10.00', currency: 'EUR', category: 'Food & drink', date: `${month}-05`, createdAt: at, ...over});

describe('every corpus question is answered, EN and NL, and refused while Wealth is closed', () => {
  for (const intent of AV2_R3_MONEY) test(intent.id, () => {
    for (const q of [...intent.en, ...intent.nl]) {
      expect(text(zigi(q)), q).not.toBe('');
      expect(text(nova(q)), q).not.toBe('');
      expect(text(zigi(q, freshAll())), q).not.toBe('');
      expect(text(av2R3MoneyAnswer(q, shut(zigiEnv(showcaseAll())))), q).not.toMatch(/€/);
    }
  });
});
describe('claims none of the earlier corpus questions', () => {
  test('every other intent of the corpus', () => {
    const own = new Set(AV2_R3_MONEY.map(i => i.id)), env = zigiEnv(showcaseAll());
    for (const intent of CORPUS.filter(i => !own.has(i.id))) for (const q of [...intent.en, ...intent.nl]) expect(av2R3MoneyAnswer(q, env), `${intent.id}: ${q}`).toBeNull();
  }, 120_000);
});

describe('the earlier money answers claim none of round 3’s questions', () => {
  for (const intent of AV2_R3_MONEY) test(intent.id, () => {
    for (const q of [...intent.en, ...intent.nl]) for (const [name, fn] of [['av-answers', avAnswer], ['av2-money', av2MoneyAnswer], ['av2-money-r2', av2MoneyR2Answer]] as const) expect(fn(q, zigiEnv(showcaseAll())), `${name}: ${q}`).toBeNull();
  });
});

describe('left this month, planned costs, the forecast by month', () => {
  const entries = [mine({kind: 'income', amount: '2000.00', category: 'Salary', date: `${month}-01`}), mine({amount: '120.00', category: 'Groceries'}), mine({amount: '50.00', excluded: true}), mine({amount: '90.00', share: '30.00'})];
  const s: ToolSources = {...withLog(freshAll(), entries), nova: {...freshAll().nova!, budgets: {version: 1, budgets: [{id: 'g', category: 'Groceries', currency: 'EUR', monthly: '300.00', rollover: false, since: month}]}}};
  const more: MoneyMore = {version: 1, planned: [{id: 'p', name: 'Birthday present', amount: '60.00', currency: 'EUR', date: `${month}-28`}]};
  test('left this month, with each part, by Wealth → Spending’s figures', () => {
    expect(text(zigi('how much is left this month', s, more))).toBe('Left this month in EUR: €1,610.00 — €2,000.00 income logged, less €150.00 spent, €180.00 still in your budgets and €60.00 in planned costs. From your own records; a figure, not advice.');
    expect(text(zigi('hoeveel heb ik deze maand over', s, more))).toBe('Deze maand over in EUR: € 1.610,00 — € 2.000,00 inkomen gelogd, min € 150,00 uitgegeven, € 180,00 nog in je budgetten en € 60,00 aan geplande kosten. Uit je eigen gegevens; een bedrag, geen advies.');
    expect(text(zigi('how much is left this month', freshAll()))).toContain('Nothing to work out for this month yet');
  });
  test('planned costs: still to come, with Dutch days', () => {
    expect(text(zigi('which planned costs do I have', s, more))).toMatch(/^Still to come: Birthday present €60\.00 on .+28.*\. Each counts in your forecast and in Left this month\.$/);
    expect(text(zigi('welke geplande kosten heb ik', s, more))).toMatch(/^Nog te gaan: Birthday present € 60,00 op .*28 nov.*\. Elk telt mee/);
    expect(text(zigi('which planned costs do I have', s))).toContain('no planned one-off costs');
  });
  test('the forecast by month needs a cash balance; then each month’s lowest point', () => {
    expect(text(zigi('what is my lowest cash in the next 6 months', freshAll()))).toContain('needs a cash or savings account');
    const acc = '00000000-0000-4000-8000-0000000000a1';
    const withCash: ToolSources = {...s, accounts: {version: 1, items: [{id: acc, kind: 'cash', name: 'Current', currency: 'EUR', snapshots: [{id: '00000000-0000-4000-8000-0000000000b1', date: DAY, value: '100000', decimals: 2}], payments: [], createdAt: at, updatedAt: at}]}};
    const en = text(zigi('what is my lowest cash in the next 6 months', withCash, more)), nl = text(zigi('wat is mijn laagste saldo de komende 6 maanden', withCash, more));
    expect(en).toMatch(/^EUR, the next 6 months: lowest about €[\d,]+ around .+\. Each month's lowest: Nov 2026 €[\d,]+, Dec 2026 €[\d,]+, .+ and May 2027 €[\d,]+\. An estimate from your own records, not a promise\.$/);
    expect(nl).toMatch(/^EUR, de komende 6 maanden: het laagst ongeveer € [\d.]+ rond .+\. Het laagste punt per maand: november 2026 € [\d.]+, december 2026 € [\d.]+, .+ en mei 2027 € [\d.]+\. Een schatting uit je eigen gegevens, geen belofte\.$/);
  });
});

describe('a credit card’s limit and use', () => {
  const ID = '00000000-0000-4000-8000-0000000000c1';
  const s: ToolSources = {...freshAll(), accounts: {version: 1, items: [{id: ID, kind: 'credit-card', name: 'Everyday Card', currency: 'EUR', snapshots: [{id: '00000000-0000-4000-8000-0000000000d1', date: DAY, value: '45000', decimals: 2}], payments: [], createdAt: at, updatedAt: at}]}};
  const sheet = {version: 1 as const, cards: {[ID]: {limit: '2000.00', statementDay: 5, dueDay: 25}}};
  const withSheet = (q: string) => av2R3MoneyAnswer(q, {...zigiEnv(s), wealthSheet: sheet} as ToolEnv);
  test('the share used, what is available and the days, EN and NL', () => {
    expect(text(withSheet('how much of my credit card limit have I used'))).toMatch(/^Everyday Card: €450\.00 of €2,000\.00 used \(23%\), €1,550\.00 available; statement .+5.*; due .+25.*\. From the numbers you typed\.$/);
    expect(text(withSheet('hoeveel van mijn creditcardlimiet heb ik gebruikt'))).toMatch(/^Everyday Card: € 450,00 van € 2\.000,00 gebruikt \(23%\), € 1\.550,00 beschikbaar; afschrift .*5 dec.*; te betalen .*25 nov.*\. Uit de getallen die je invulde\.$/);
    expect(text(zigi('when is my credit card due', s))).toContain('no limit kept yet');
    expect(text(zigi('when is my credit card due', freshAll()))).toContain('no credit card in What you owe');
  });
});

describe('needs, wants and saving: the person’s own shares, never a target', () => {
  const entries = [mine({kind: 'income', amount: '2000.00', category: 'Salary', date: `${month}-01`}), mine({amount: '800.00', category: 'Home'}), mine({amount: '200.00', category: 'Fun'}), mine({amount: '40.00', category: 'Gifts'})];
  const s = withLog(freshAll(), entries, {needWant: {Home: 'need', Fun: 'want'}});
  test('EN and NL, with each share of income', () => {
    expect(text(zigi('how much went to needs and wants this month', s))).toBe('This month in EUR, of €2,000.00 income logged: needs €800.00 (40%), wants €200.00 (10%), saving €0.00 (0%) and not marked €40.00 (2%). Your own marks and figures, not a target.');
    expect(text(zigi('hoeveel ging er deze maand naar nodig en wensen', s))).toBe('Deze maand in EUR, van € 2.000,00 gelogd inkomen: nodig € 800,00 (40%), wensen € 200,00 (10%), sparen € 0,00 (0%) en niet gemarkeerd € 40,00 (2%). Je eigen markeringen en bedragen, geen doel.');
    expect(text(zigi('am I on track for 50/30/20', s))).toContain('never a split to aim for');
    // Review b3a #9: without income the Dutch answer says there is no share of income (never "aandelen", stocks).
    const noIncome = withLog(freshAll(), [mine({amount: '800.00', category: 'Home'})], {needWant: {Home: 'need'}});
    expect(text(zigi('hoeveel ging er deze maand naar nodig en wensen', noIncome))).toBe('Deze maand in EUR (geen inkomen gelogd, dus geen deel van je inkomen): nodig € 800,00, wensen € 0,00 en sparen € 0,00. Je eigen markeringen en bedragen, geen doel.');
    expect(text(zigi('hoeveel ging er deze maand naar nodig en wensen', noIncome))).not.toMatch(/aandelen/);
    expect(text(zigi('how much went to needs and wants this month', withLog(freshAll(), entries)))).toContain('No category is marked');
  });
});

describe('what changed in my spending since last month', () => {
  const s = withLog(freshAll(), [mine({amount: '100.00', category: 'Groceries', date: '2026-10-05'}), mine({amount: '150.00', category: 'Groceries'}), mine({amount: '20.00', category: 'Fun'})]);
  test('EN and NL, largest move first', () => {
    expect(text(zigi('what changed in my spending since last month', s))).toMatch(/^In EUR: €100\.00 last month to .+17.*, €170\.00 this month so far \(\+€70\.00\); most moved by Groceries \+€50\.00 and Fun \+€20\.00\. From your own entries; a comparison, not a forecast\.$/);
    expect(text(zigi('wat is er veranderd in mijn uitgaven sinds vorige maand', s))).toMatch(/^In EUR: € 100,00 vorige maand t\/m .*17 okt.*, € 170,00 deze maand tot nu toe \(\+€ 70,00\); het meest door Groceries \+€ 50,00 en Fun \+€ 20,00\. Uit je eigen invoer; een vergelijking, geen voorspelling\.$/);
    expect(text(zigi('show my spending waterfall', freshAll()))).toContain('nothing to compare yet');
  });
});

describe('spending beside a done habit, under Compare’s rules', () => {
  const HABIT = '92000000-0000-4000-8000-000000000701', start = addLocalDays(DAY, -40);
  let habits: HabitData = createHabit(emptyHabitData(), {title: 'Walk', category: 'Health', description: '', notes: '', schedule: {kind: 'daily'}, target: 1}, new Date(`${addLocalDays(start, -1)}T08:00:00Z`), HABIT);
  const entries: MoneyEntry[] = [];
  for (let i = 0; i < 40; i++) { const day = addLocalDays(start, i), even = i % 2 === 0; if (even) habits = logHabitCount(habits, HABIT, day, 1, '', new Date(`${day}T20:00:00Z`)); entries.push(mine({amount: even ? '10.00' : '30.00', date: day})); }
  const s: ToolSources = {...withLog(freshAll(), entries), habits};
  test('EN and NL, never a cause', () => {
    expect(text(zigi('do I spend less on days I do my habits', s))).toMatch(/^On days you completed “Walk”, you spent €10\.00 that day on average; on other days, €30\.00 \(.+\)\. From the last 90 days of your own records; days that happened together are not proof that one brings the other\.$/);
    expect(text(zigi('geef ik minder uit op dagen dat ik mijn gewoontes doe', s))).toBe('Op dagen dat je “Walk” deed, gaf je die dag gemiddeld € 10,00 uit; op andere dagen € 30,00 (een eerste teken). Uit de laatste 90 dagen van je eigen gegevens; dagen die samen vielen bewijzen niet dat het een het ander brengt.');
    expect(text(zigi('do I spend less on days I do my habits', freshAll()))).toContain('This needs habits you tick');
    // Review b3a #10: the Dutch finding carries Compare's confidence label as the English does.
    expect(text(zigi('do I spend less on days I do my habits', s))).toContain('(early sign)');
    expect(LABEL_NL).toEqual({early: 'een eerste teken', consistent: 'bestendig'});
  });
});

describe('what moved net worth this month', () => {
  const acct = (id: string, kind: 'savings' | 'credit-card', name: string, snaps: [string, string][]) => ({id, kind, name, currency: 'EUR', snapshots: snaps.map(([date, value], i) => ({id: `${id.slice(0, -4)}${9000 + i}`, date, value, decimals: 2})), payments: [], createdAt: at, updatedAt: at});
  const s: ToolSources = {...freshAll(), accounts: {version: 1, items: [acct('00000000-0000-4000-8000-00000000b001', 'savings', 'Savings', [['2026-10-20', '500000'], [DAY, '560000']]), acct('00000000-0000-4000-8000-00000000b002', 'credit-card', 'Card', [['2026-10-30', '20000'], [DAY, '45000']])]}};
  test('EN and NL, largest first', () => {
    expect(text(zigi('what moved my net worth this month', s))).toBe('In EUR, +€350.00 since the end of last month; most by Savings +€600.00 and Card −€250.00. From your own balances; never converted, not a return.');
    expect(text(zigi('wat bewoog mijn vermogen deze maand', s))).toBe('In EUR, +€ 350,00 sinds eind vorige maand; het meest door Savings +€ 600,00 en Card −€ 250,00. Uit je eigen saldi; nooit omgerekend, geen rendement.');
    expect(text(zigi('how did my net worth change this month', freshAll()))).toContain('Nothing to compare yet');
  });
});

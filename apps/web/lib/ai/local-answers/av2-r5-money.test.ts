import {describe, expect, test} from 'vitest';
import type {ToolEnv, ToolSources} from '../tools/env';
import {DAY, freshAll, novaEnv, showcaseAll, zigiEnv} from '../evals/as/harness';
import {av2R5MoneyAnswer} from './av2-r5-money';
import {AV2_R5_MONEY} from '../evals/as/cases-av2-r5-money';
import {CORPUS} from '../evals/as/cases';
import {AV2_R4_MONEY} from '../evals/as/cases-av2-r4-money';
import {avAnswer} from './av-answers';
import {av2MoneyAnswer} from './av2-money';
import {av2MoneyR2Answer} from './av2-money-r2';
import {av2R3MoneyAnswer} from './av2-r3-money';
import {av2R4MoneyAnswer} from './av2-r4-money';
import {av2RestAnswer} from './av2-rest';
import {av2SyncAnswer} from './av2-sync';
import {rehearsalAnswer} from './au-answers';
import type {LocalReply} from './engine';
import type {MoneyEntry} from '../../money-log/schema';
import type {Accounts} from '../../accounts/schema';
import {emptyNotifyPrefs, setType} from '../../notify/prefs';

/**
 * Session AV lane 2, round 5 (money; Tiller, PocketSmith): round 5's answers, read straight from `av2R5MoneyAnswer` (the
 * lead wires it into engine.ts before `av2R4MoneyAnswer` and records the corpus): each in English and Dutch — Dutch money
 * as "€ 12,50" and Dutch day and month words — from the feature's own figures, refused while Wealth is not shared, and
 * never claiming a question of the corpus or of round 4 that is not its own; the answers that run before it in engine.ts
 * (and round 4's, which it runs before) claim none of its questions.
 */
export const text = (r: LocalReply | null) => r && 'text' in r ? r.text.replace(/[\u00a0\u202f]/g, ' ') : '';
export const withLog = (s: ToolSources, entries: MoneyEntry[], extra: Partial<NonNullable<ToolSources['moneyLog']>> = {}): ToolSources => ({...s, moneyLog: {...s.moneyLog!, entries, ...extra}});
export const withAk = (s: ToolSources, ak: Record<string, unknown>): ToolSources => ({...s, ak: {...(s.ak ?? {}), ...ak} as ToolSources['ak']});
const shut = (env: ToolEnv): ToolEnv => ({...env, areas: {...env.areas, wealth: false}});
export const zigi = (q: string, s: ToolSources = showcaseAll()) => av2R5MoneyAnswer(q, zigiEnv(s));
export const nova = (q: string, s: ToolSources = showcaseAll()) => av2R5MoneyAnswer(q, novaEnv(s));
export const month = DAY.slice(0, 7), at = `${DAY}T10:00:00.000Z`, AT = '2026-01-01T09:00:00.000Z';
let n = 0;
export const mine = (over: Partial<MoneyEntry>): MoneyEntry => ({id: `r5-${n++}`, kind: 'expense', amount: '10.00', currency: 'EUR', category: 'Food & drink', date: `${month}-05`, createdAt: at, ...over});
export const cashAccount = (name: string, cents: string, id = '00000000-0000-4000-8000-0000000a0001'): Accounts['items'][number] => ({id, kind: 'cash', name, currency: 'EUR', snapshots: [{id: id.replace(/.$/, '9'), date: '2026-11-01', value: cents, decimals: 2}], payments: [], createdAt: AT, updatedAt: AT});
const EARLIER = [['au-answers', rehearsalAnswer], ['av2-rest', (q: string, env: ToolEnv) => av2RestAnswer(q, env)], ['av2-sync', (q: string, env: ToolEnv) => av2SyncAnswer(q, env)], ['av2-r4-money', av2R4MoneyAnswer], ['av2-r3-money', av2R3MoneyAnswer], ['av2-money-r2', av2MoneyR2Answer], ['av2-money', av2MoneyAnswer], ['av-answers', avAnswer]] as const;

describe('every corpus question is answered, EN and NL, and refused while Wealth is closed', () => {
  for (const intent of AV2_R5_MONEY) test(intent.id, () => {
    for (const q of [...intent.en, ...intent.nl]) {
      expect(text(zigi(q)), q).not.toBe('');
      expect(text(nova(q)), q).not.toBe('');
      expect(text(zigi(q, freshAll())), q).not.toBe('');
      expect(text(av2R5MoneyAnswer(q, shut(zigiEnv(showcaseAll())))), q).not.toMatch(/€/);
    }
  });
});
describe('claims none of the earlier corpus questions, nor round 4’s', () => {
  test('every other intent of the corpus and of round 4', () => {
    const own = new Set(AV2_R5_MONEY.map(i => i.id)), env = zigiEnv(showcaseAll());
    for (const intent of [...CORPUS, ...AV2_R4_MONEY].filter(i => !own.has(i.id))) for (const q of [...intent.en, ...intent.nl]) expect(av2R5MoneyAnswer(q, env), `${intent.id}: ${q}`).toBeNull();
  }, 120_000);
});
describe('the answers before it in engine.ts (and round 4’s) claim none of round 5’s questions', () => {
  for (const intent of AV2_R5_MONEY) test(intent.id, () => {
    for (const q of [...intent.en, ...intent.nl]) for (const [name, fn] of EARLIER) expect(fn(q, zigiEnv(showcaseAll())), `${name}: ${q}`).toBeNull();
  });
});

describe('yesterday’s money (#384)', () => {
  const y = '2026-11-16';
  const entries = [mine({amount: '42.10', date: y}), mine({amount: '90.00', share: '30.00', date: y}), mine({amount: '50.00', excluded: true, date: y}),
    mine({kind: 'income', amount: '2000.00', category: 'Salary', date: y}), mine({amount: '5.00', date: DAY})];
  const s = {...withLog(freshAll(), entries), accounts: {version: 1 as const, items: [cashAccount('Current account', '123000')]}};
  test('English: the count, the counted figures and the cash balance', () => {
    expect(text(zigi('what was yesterday\'s money', s))).toBe('Mon, Nov 16: 4 entries, spent €72.10, received €2,000.00. Cash and savings: Current account €1,230.00. Counted as Spending counts it. Wealth → Spending → Yesterday’s money can send it each morning, or show it on Today.');
  });
  test('Dutch money and day words', () => {
    const nl = text(zigi('wat was mijn geld van gisteren', s));
    expect(nl).toContain('4 invoeren, € 72,10 uitgegeven, € 2.000,00 ontvangen.');
    expect(nl).toContain('Current account € 1.230,00');
    expect(nl).not.toMatch(/Mon|Nov /);
  });
  test('says the morning notification is on when it is; an empty day says so', () => {
    const on = withAk(s, {notifyPrefs: setType(emptyNotifyPrefs(), 'moneyMorning', true)});
    expect(text(zigi('give me my money summary for yesterday', on))).toContain('Your morning notification says it too.');
    expect(text(zigi('give me my money summary for yesterday', withLog(freshAll(), [])))).toBe('Nothing was logged for Mon, Nov 16. Wealth → Spending → Yesterday’s money can send it each morning, or show it on Today.');
  });
});

describe('review b5k #10: yesterday holding only a spread share', () => {
  test('never "0 entries", EN and NL', () => {
    const s = withLog(freshAll(), [mine({amount: '1200.00', date: '2026-10-16', spread: 12, category: 'Bills'})]);
    const en = text(zigi('what was yesterday\'s money', s)), nl = text(zigi('wat was mijn geld van gisteren', s));
    expect(en).toContain('Mon, Nov 16: nothing logged, a cost spread over months counts its share, spent €100.00.');
    expect(nl).toContain('niets gelogd, een kost verspreid over maanden telt zijn deel, € 100,00 uitgegeven.');
    expect(`${en} ${nl}`).not.toMatch(/\b0 (?:entries|invoeren)\b/);
  });
});

describe('this year so far against the budgets (#385)', () => {
  const budgets = {version: 1 as const, budgets: [
    {id: 'b1', category: 'Groceries', currency: 'EUR', monthly: '300.00', rollover: false, since: '2026-01'},
    {id: 'b2', category: 'Fun', currency: 'EUR', monthly: '50.00', rollover: false, since: '2026-10'},
  ]};
  const entries = [mine({category: 'Groceries', amount: '3000.00', date: '2026-06-10'}), mine({category: 'Groceries', amount: '90.00', share: '30.00', date: '2026-11-02'}),
    mine({category: 'Fun', amount: '130.00', date: '2026-10-04'}), mine({category: 'Fun', amount: '40.00', excluded: true, date: '2026-11-04'})];
  const s = {...withLog(freshAll(), entries), nova: {...(freshAll().nova ?? {}), budgets} as ToolSources['nova']};
  test('English: per currency and per budget, the difference as a fact', () => {
    expect(text(zigi('how are my budgets doing this year so far', s))).toBe('2026 so far: €3,160.00 spent against €3,400.00 budgeted, €240.00 under so far. By budget: Fun €30.00 over and Groceries €270.00 under. Each month\'s budget beside what was spent, counted as your budgets count it; it is in Wealth → Budgets → "2026 so far against your budgets".');
  });
  test('Dutch money', () => {
    expect(text(zigi('hoe staan mijn budgetten dit jaar tot nu toe', s))).toContain('2026 tot nu toe: € 3.160,00 uitgegeven tegenover € 3.400,00 gebudgetteerd, tot nu toe € 240,00 onder budget.');
  });
  test('no budgets teaches where to set one', () => {
    expect(text(zigi('show my budgets year to date', freshAll()))).toContain('No budgets yet.');
  });
});

describe('a bill paid early (#386)', () => {
  const bills = {version: 1 as const, dismissed: [], bills: [
    {id: 'rent', title: 'Rent', amount: '800.00', currency: 'EUR', cadence: 'monthly' as const, nextDue: '2026-12-15', origin: 'manual' as const, matchKey: 'EUR|Home|landlord|monthly', createdAt: AT},
    {id: 'gym', title: 'Gym', amount: '30.00', currency: 'EUR', cadence: 'monthly' as const, nextDue: '2026-12-10', origin: 'manual' as const, createdAt: AT},
  ]};
  const entries = [mine({category: 'Home', amount: '800.00', note: 'Landlord', date: '2026-11-03'})];
  const s = withAk(withLog(freshAll(), entries), {bills});
  test('English: the bill, its due day, the day it was paid; a passed date points to Paid early?', () => {
    expect(text(zigi('did I pay any bill early', s))).toBe('Paid early this month: Rent (due Sun, Nov 15, paid Tue, Nov 3, €800.00). 1 date has passed without a payment in your money log: "Paid early?" beside it in Wealth → Upcoming bills → Bill tracker lists the expenses of the days before.');
  });
  test('Dutch', () => {
    const nl = text(zigi('welke rekeningen zijn te vroeg afgeschreven', s));
    expect(nl).toContain('Deze maand vroeg betaald: Rent (vervaldag');
    expect(nl).toContain('€ 800,00');
  });
  test('no bills teaches where to add one', () => {
    expect(text(zigi('which bill did I pay ahead of its due date', freshAll()))).toContain('No bills are tracked yet.');
  });
});

describe('merge two accounts (#387)', () => {
  const items = [cashAccount('ING Current', '100000', '00000000-0000-4000-8000-0000000a0001'), cashAccount('ING Betaalrekening', '50000', '00000000-0000-4000-8000-0000000a0002'), {...cashAccount('Wise', '1000', '00000000-0000-4000-8000-0000000a0003'), currency: 'USD'}];
  const s = {...freshAll(), accounts: {version: 1 as const, items}};
  test('English: the pairs that could be merged and how', () => {
    const en = text(zigi('how do I merge two accounts', s));
    expect(en).toMatch(/^These could be merged: ING Current and ING Betaalrekening \(EUR\)\. In Wealth → Accounts, tap "Merge two"/);
    expect(en).not.toContain('Wise');
  });
  test('Dutch; none to merge says why', () => {
    expect(text(zigi('hoe voeg ik twee rekeningen samen', s))).toContain('Deze kun je samenvoegen: ING Current en ING Betaalrekening (EUR).');
    expect(text(zigi('can I merge my accounts', freshAll()))).toMatch(/^No two of your accounts can be merged now/);
  });
});

describe('try a change on the forecast (#388)', () => {
  const more = {version: 1 as const, whatIfs: [{id: 'w1', name: 'A trip', currency: 'EUR', changes: [{kind: 'once' as const, dir: 'out' as const, amount: '2000.00', from: '2027-01-10'}]}]};
  const s = withAk({...freshAll(), accounts: {version: 1 as const, items: [cashAccount('Current account', '500000')]}}, {bills: {version: 1, bills: [], dismissed: []}, moneyMore: more});
  test('English: each kept set, its lowest point beside the forecast’s', () => {
    expect(text(zigi('what changes have I tried on my forecast', s))).toMatch(/^Kept changes, over the next 12 months: "A trip" \(1 change\): lowest about €3,000\.00 around .+, against €5,000\.00 without\. A model from your own records, not a plan; nothing is written to your records\.$/);
  });
  test('Dutch; none kept teaches', () => {
    expect(text(zigi('welke wijzigingen heb ik op mijn prognose geprobeerd', s))).toContain('"A trip" (1 wijziging): het laagst ongeveer € 3.000,00');
    expect(text(zigi('show my what if scenarios', freshAll()))).toMatch(/^No changes are kept\./);
  });
  // Session AV lane 2 (CI run 2011, journey 8): a hypothetical "what if …" is a request for the person's AI and its what-if
  // card, not the kept sets; only the feature's own name ("my what if scenarios", "mijn wat als scenario's") is answered here.
  test('a hypothetical what-if is not answered here, EN and NL', () => {
    for (const env of [freshAll(), s, showcaseAll()]) {
      expect(zigi('What if I add 50 a month, scan this barcode, and some focus sound', env)).toBeNull();
      expect(zigi('What if I add 50 a month', env)).toBeNull();
      expect(zigi('what if I put 100 extra into my bike fund each month, how does my forecast look', env)).toBeNull();
      expect(zigi('Wat als ik 50 per maand extra inleg, scan deze barcode en wat focusgeluid', env)).toBeNull();
      expect(zigi('wat als ik elke maand 50 euro meer spaar voor mijn prognose', env)).toBeNull();
    }
    expect(text(zigi('toon mijn wat als scenario\'s', freshAll()))).toMatch(/^Er zijn geen wijzigingen bewaard\./);
    expect(text(zigi('what ifs have I kept', freshAll()))).toMatch(/^No changes are kept\./);
  });
});

describe('your money as a spreadsheet (#389)', () => {
  const s = withLog(freshAll(), [mine({amount: '42.10', date: '2026-11-03'}), mine({amount: '90.00', share: '30.00', date: '2026-10-03'}), mine({amount: '50.00', excluded: true, date: '2026-10-04'})]);
  test('English: this year’s entries and counted spending, and where the files are made', () => {
    expect(text(zigi('can I get my money as a spreadsheet', s))).toMatch(/^This year so far: 3 entries, €72\.10 spent as your figures count it\. Wealth → Spending → "Your money as a spreadsheet"/);
  });
  test('Dutch; nothing logged teaches', () => {
    expect(text(zigi('kan ik mijn uitgaven als spreadsheet krijgen', s))).toContain('Dit jaar tot nu toe: 3 invoeren, € 72,10 uitgegeven');
    expect(text(zigi('how do I open my spending in excel', freshAll()))).toMatch(/^Nothing is logged this year yet\./);
  });
});

describe('categories and rules in a file (#390)', () => {
  const s = withAk(withLog(freshAll(), [], {own: {expense: ['Pets', 'Car']}, subs: {Groceries: ['Market']}}), {moneyRules: {version: 1, rules: [{id: 'r1', field: 'payee', op: 'contains', text: 'Albert Heijn', direction: 'out', category: 'Groceries', enabled: true}]}});
  test('English: what the file would hold, where it is made and read', () => {
    expect(text(zigi('how do I save my categories and rules to a file', s))).toMatch(/^Your file would hold 2 categories of your own, 1 subcategory and 1 rule — never an entry or an amount\. In Wealth → Spending → Log spending → Your own categories, "Save categories and rules" makes it;/);
  });
  test('Dutch; without the rules record it still says where', () => {
    expect(text(zigi('hoe bewaar ik mijn categorieën en regels in een bestand', s))).toContain('Je bestand zou 2 eigen categorieën, 1 subcategorie en 1 regel bevatten');
    expect(text(zigi('can I share my categories with a friend', freshAll()))).toContain('0 categories of your own, 0 subcategories');
  });
});

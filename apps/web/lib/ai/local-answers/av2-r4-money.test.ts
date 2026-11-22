import {describe, expect, test} from 'vitest';
import type {ToolEnv, ToolSources} from '../tools/env';
import {DAY, freshAll, novaEnv, showcaseAll, zigiEnv} from '../evals/as/harness';
import {av2R4MoneyAnswer} from './av2-r4-money';
import {AV2_R4_MONEY} from '../evals/as/cases-av2-r4-money';
import {CORPUS} from '../evals/as/cases';
import {avAnswer} from './av-answers';
import {av2MoneyAnswer} from './av2-money';
import {av2MoneyR2Answer} from './av2-money-r2';
import {av2R3MoneyAnswer} from './av2-r3-money';
import {av2RestAnswer} from './av2-rest';
import {av2SyncAnswer} from './av2-sync';
import {rehearsalAnswer} from './au-answers';
import type {LocalReply} from './engine';
import type {MoneyMore} from '../../money-more/schema';
import type {MoneyEntry} from '../../money-log/schema';

/**
 * Session AV lane 2, round 4 (money): round 4's answers, read straight from `av2R4MoneyAnswer` (the lead wires it into
 * engine.ts before `av2R3MoneyAnswer` and records the corpus): each in English and Dutch — Dutch money as "€ 12,50" and
 * Dutch day and month words — from the feature's own figures, refused while Wealth is not shared, and never claiming a
 * question of the corpus that is not its own; the answers that run before it in engine.ts claim none of its questions.
 */
/** The reply's text, with the no-break space Dutch money writes after € shown as a plain space. */
export const text = (r: LocalReply | null) => r && 'text' in r ? r.text.replace(/ /g, ' ') : '';
export const withLog = (s: ToolSources, entries: MoneyEntry[], extra: Partial<NonNullable<ToolSources['moneyLog']>> = {}): ToolSources => ({...s, moneyLog: {...s.moneyLog!, entries, ...extra}});
export const withMore = (env: ToolEnv, more: MoneyMore): ToolEnv => ({...env, moneyMore: more} as ToolEnv);
const shut = (env: ToolEnv): ToolEnv => ({...env, areas: {...env.areas, wealth: false}});
export const zigi = (q: string, s: ToolSources = showcaseAll(), more?: MoneyMore) => av2R4MoneyAnswer(q, more ? withMore(zigiEnv(s), more) : zigiEnv(s));
export const nova = (q: string, s: ToolSources = showcaseAll(), more?: MoneyMore) => av2R4MoneyAnswer(q, more ? withMore(novaEnv(s), more) : novaEnv(s));
export const month = DAY.slice(0, 7), at = `${DAY}T10:00:00.000Z`;
let n = 0;
export const mine = (over: Partial<MoneyEntry>): MoneyEntry => ({id: `r4-${n++}`, kind: 'expense', amount: '10.00', currency: 'EUR', category: 'Food & drink', date: `${month}-05`, createdAt: at, ...over});
const EARLIER = [['au-answers', rehearsalAnswer], ['av2-rest', (q: string, env: ToolEnv) => av2RestAnswer(q, env)], ['av2-sync', (q: string, env: ToolEnv) => av2SyncAnswer(q, env)], ['av2-r3-money', av2R3MoneyAnswer], ['av2-money-r2', av2MoneyR2Answer], ['av2-money', av2MoneyAnswer], ['av-answers', avAnswer]] as const;

describe('every corpus question is answered, EN and NL, and refused while Wealth is closed', () => {
  for (const intent of AV2_R4_MONEY) test(intent.id, () => {
    for (const q of [...intent.en, ...intent.nl]) {
      expect(text(zigi(q)), q).not.toBe('');
      expect(text(nova(q)), q).not.toBe('');
      expect(text(zigi(q, freshAll())), q).not.toBe('');
      expect(text(av2R4MoneyAnswer(q, shut(zigiEnv(showcaseAll())))), q).not.toMatch(/€/);
    }
  });
});
describe('claims none of the earlier corpus questions', () => {
  test('every other intent of the corpus', () => {
    const own = new Set(AV2_R4_MONEY.map(i => i.id)), env = zigiEnv(showcaseAll());
    for (const intent of CORPUS.filter(i => !own.has(i.id))) for (const q of [...intent.en, ...intent.nl]) expect(av2R4MoneyAnswer(q, env), `${intent.id}: ${q}`).toBeNull();
  }, 120_000);
});
describe('the answers before it in engine.ts claim none of round 4’s questions', () => {
  for (const intent of AV2_R4_MONEY) test(intent.id, () => {
    for (const q of [...intent.en, ...intent.nl]) for (const [name, fn] of EARLIER) expect(fn(q, zigiEnv(showcaseAll())), `${name}: ${q}`).toBeNull();
  });
});

describe('a calendar of the month (#338)', () => {
  const entries = [mine({amount: '42.10', date: `${month}-03`}), mine({amount: '7.90', date: `${month}-03`}), mine({amount: '120.00', date: `${month}-05`, category: 'Home'}),
    mine({amount: '90.00', share: '30.00', date: `${month}-06`}), mine({amount: '50.00', excluded: true, date: `${month}-06`}), mine({kind: 'income', amount: '2000.00', category: 'Salary', date: `${month}-01`})];
  const s = withLog(freshAll(), entries);
  test('English: the month’s days by Wealth → Spending’s rule, the largest first', () => {
    expect(text(zigi('which day did I spend the most this month', s))).toBe('This month in EUR: €200.00 spent on 3 days, €2,000.00 received; the largest days: Thu, Nov 5 €120.00, Tue, Nov 3 €50.00 and Fri, Nov 6 €30.00. Each day is on Wealth → Spending → Your money over time → A calendar of the month; a cost spread over months counts its share each month, as your budgets do.');
  });
  test('Dutch money and day words', () => {
    const nl = text(zigi('welke dag gaf ik deze maand het meest uit', s));
    expect(nl).toContain('Deze maand in EUR: € 200,00 uitgegeven op 3 dagen, € 2.000,00 ontvangen; de grootste dagen:');
    expect(nl).toContain('€ 120,00');
    expect(nl).not.toMatch(/Thu|Nov /);
  });
  test('an empty month teaches where the calendar is', () => {
    expect(text(zigi('show the calendar of my spending', withLog(freshAll(), [])))).toContain('Nothing logged this month yet.');
  });
});

describe('archived categories and starter sets (#342, #347)', () => {
  test('the archived categories with their entries, EN and NL', () => {
    const s = withLog(freshAll(), [mine({category: 'Gifts'}), mine({category: 'Gifts'})], {archived: {expense: ['Gifts'], income: ['Freelance']}});
    expect(text(zigi('which categories have I archived', s))).toBe('Archived: Gifts, 2 entries and Freelance (money received). They are no longer offered in the pickers; their entries keep them, and reports and search still show them. "Bring back" offers one again.');
    expect(text(zigi('welke categorieën heb ik gearchiveerd', s))).toContain('Gearchiveerd: Gifts, 2 invoeren en Freelance (inkomsten).');
    expect(text(zigi('show my archived categories', withLog(freshAll(), [])))).toContain('No category is archived.');
  });
  test('the four sets, EN and NL', () => {
    expect(text(zigi('what starter category sets are there'))).toContain('Four written starter sets: a student (study costs, a room and a side job), a household');
    expect(text(zigi('welke startsets met categorieën zijn er'))).toContain('Vier geschreven startsets: een student (studiekosten, een kamer en een bijbaan)');
  });
});

describe('groups of entries (#341)', () => {
  const g = {id: 'g1', name: 'Weekend in Ghent'};
  const s = withLog(freshAll(), [mine({amount: '120.00', date: `${month}-07`, group: g}), mine({amount: '30.00', share: '15.00', date: `${month}-08`, group: g}), mine({kind: 'income', amount: '20.00', category: 'Refund', date: `${month}-09`, group: g}), mine({amount: '9.00'})]);
  test('each group with its total by Wealth → Spending’s rule, EN and NL', () => {
    expect(text(zigi('which groups of entries do I have', s))).toBe('Weekend in Ghent: 3 entries, €135.00 spent, €20.00 received (Sat, Nov 7 – Mon, Nov 9). Each entry still counts on its own in your totals and budgets.');
    expect(text(zigi('welke groepen van invoer heb ik', s))).toContain('Weekend in Ghent: 3 invoeren, € 135,00 uitgegeven, € 20,00 ontvangen');
    expect(text(zigi('show my grouped transactions', withLog(freshAll(), [])))).toContain('You have no groups yet.');
  });
});

describe('payee places, typed names only (#346)', () => {
  const more: MoneyMore = {version: 1, places: [{id: 'p1', name: 'Work', payees: ['Canteen', 'Coffee corner']}, {id: 'p2', name: 'The market'}]};
  test('each place with its payees, EN and NL; never a location', () => {
    expect(text(zigi('which places have I kept for my payees', freshAll(), more))).toBe('Work: Canteen and Coffee corner. The market: no payee kept yet. Places are names you typed, kept on this device; "Forget places" clears them.');
    expect(text(zigi('welke plekken heb ik voor mijn betalingen', freshAll(), more))).toBe('Work: Canteen en Coffee corner. The market: nog geen ontvanger bewaard. Plekken zijn namen die je typte, bewaard op dit apparaat; "Forget places" wist ze.');
    expect(text(zigi('show my payee places', freshAll(), {version: 1}))).toContain('ZIGoals never reads where you are.');
  });
});

describe('checked against the bank (#340)', () => {
  test('how far it is checked, and what waits, EN and NL', () => {
    const s = withLog(freshAll(), [mine({date: `${month}-02`, checked: `${month}-10`}), mine({date: `${month}-09`, checked: `${month}-10`}), mine({date: `${month}-12`}), mine({date: `${month}-13`})]);
    expect(text(zigi('when did I last check my entries against my bank', s))).toBe('In EUR: checked up to Tue, Nov 10 (2 entries); 2 entries since then not yet checked.');
    expect(text(zigi('wanneer is mijn rekening voor het laatst afgestemd met de bank', s))).toContain('In EUR: gecontroleerd tot');
    expect(text(zigi('how far have I reconciled my account', withLog(freshAll(), [])))).toContain('Nothing is checked against your bank yet.');
  });
});

describe('saved searches with a chart (#344)', () => {
  test('each saved search with its total and monthly average by Wealth → Spending’s rule, EN and NL', () => {
    const s = withLog(freshAll(), [mine({note: 'Café Noël', date: `${month}-03`}), mine({note: 'Café Noël', amount: '24.00', share: '12.00', date: '2026-10-10'}), mine({note: 'Café Noël', amount: '50.00', excluded: true, date: '2026-10-11'}), mine({note: 'Rent', amount: '900.00', category: 'Home'})]);
    const more: MoneyMore = {version: 1, questions: [{id: 'q1', name: 'Eating out', text: 'café', kind: 'expense'}, {id: 'q2', name: 'Taxis', text: 'taxi'}]};
    expect(text(zigi('what are my saved searches', s, more))).toBe('Eating out: €22.00 spent since Sat, Oct 10, €11.00 a month on average. Taxis: nothing found right now. Counted as Wealth → Spending counts; each is drawn in Wealth → Spending → Your money over time → Saved searches.');
    expect(text(zigi('wat zijn mijn opgeslagen zoekopdrachten', s, more))).toContain('Eating out: € 22,00 uitgegeven sinds');
    expect(text(zigi('show my saved money searches', freshAll(), {version: 1}))).toContain('You have no saved searches yet.');
  });
});

describe('the monthly average and investment income beside spending (#343, #345)', () => {
  const entries = [mine({date: '2026-09-05', amount: '150.00'}), mine({date: '2026-10-05', amount: '150.00'}), mine({date: `${month}-02`, amount: '120.00'}),
    mine({kind: 'income', amount: '9.00', category: 'Interest', date: '2026-10-01'}), mine({kind: 'income', amount: '6.00', category: 'Dividends', date: `${month}-01`})];
  test('this month beside the average, as a fact, EN and NL', () => {
    const s = withLog(freshAll(), entries);
    expect(text(zigi('how does this month compare to my 6 month average spending', s))).toBe('In EUR, Nov 2026 so far: €120.00, €30.00 below your 6-month average of €150.00 (over the 2 months with records). A figure from your own entries, not a target.');
    expect(text(zigi('wat is mijn maandgemiddelde aan uitgaven', s))).toContain('€ 30,00 onder je gemiddelde over 6 maanden van € 150,00');
  });
  test('the marked income beside spending as a share, EN and NL', () => {
    const s = withLog(freshAll(), entries, {investIncome: ['Interest', 'Dividends']});
    expect(text(zigi('how much of my spending does my investment income cover', s))).toBe('In EUR, the last 24 months: €15.00 investment income beside €420.00 spending, so it covers 3.6% of spending; in Oct 2026, 6%. From your own records and marks; not a forecast.');
    expect(text(zigi('welk deel van mijn uitgaven dekken mijn beleggingsinkomsten', s))).toContain('dus het dekt 3,6% van je uitgaven; in oktober 2026 6%');
    expect(text(zigi('show my investment income beside spending', withLog(freshAll(), entries)))).toContain('No income category is marked as investment income yet.');
  });
});

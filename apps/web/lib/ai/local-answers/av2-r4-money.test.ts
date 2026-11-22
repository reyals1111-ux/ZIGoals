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

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

import {describe, expect, test} from 'vitest';
import type {ToolEnv, ToolSources} from '../tools/env';
import {DAY, freshAll, novaEnv, showcaseAll, zigiEnv} from '../evals/as/harness';
import {awX7MoneyAnswer} from './aw-x7-money';
import {AW_X7_MONEY} from '../evals/as/cases-aw-x7';
import {CORPUS} from '../evals/as/cases';
import {av2RestAnswer} from './av2-rest';
import {av2SyncAnswer} from './av2-sync';
import {rehearsalAnswer} from './au-answers';
import {mealWordsAnswer} from './fr-meal-words';
import type {LocalReply} from './engine';
import type {MoneyEntry} from '../../money-log/schema';
import {accountsSchema} from '../../accounts/schema';
import {billsSchema} from '../../bills/schema';

/**
 * Session AW X7 (money; Cashew, Money Manager): this group's answers, read straight from `awX7MoneyAnswer` (wired in
 * engine.ts before round 6's money answers): each in English and Dutch from the feature's own figures, refused while
 * Wealth is not shared, never claiming a question of the corpus, and not claimed by the answers that run before it.
 */
const text = (r: LocalReply | null) => r && 'text' in r ? r.text.replace(/[  ]/g, ' ') : '';
const shut = (env: ToolEnv): ToolEnv => ({...env, areas: {...env.areas, wealth: false}});
const zigi = (q: string, s: ToolSources = showcaseAll()) => awX7MoneyAnswer(q, zigiEnv(s));
const nova = (q: string, s: ToolSources = showcaseAll()) => awX7MoneyAnswer(q, novaEnv(s));
const at = `${DAY}T10:00:00.000Z`;
const withAk = (s: ToolSources, ak: Record<string, unknown>): ToolSources => ({...s, ak: {...(s.ak ?? {}), ...ak} as ToolSources['ak']});
const EARLIER = [['au-answers', rehearsalAnswer], ['av2-rest', (q: string, env: ToolEnv) => av2RestAnswer(q, env)], ['av2-sync', (q: string, env: ToolEnv) => av2SyncAnswer(q, env)], ['fr-meal-words', mealWordsAnswer]] as const;

describe('every question is answered, EN and NL, and refused while Wealth is closed', () => {
  for (const intent of AW_X7_MONEY) test(intent.id, () => {
    for (const q of [...intent.en, ...intent.nl]) {
      expect(text(zigi(q)), q).not.toBe('');
      expect(text(nova(q)), q).not.toBe('');
      expect(text(zigi(q, freshAll())), q).not.toBe('');
      const refused = awX7MoneyAnswer(q, shut(zigiEnv(showcaseAll())));
      expect(refused?.kind, q).toBe('refusal');
      expect(text(refused), q).not.toMatch(/€|\$/);
    }
    for (const q of intent.nl) expect(text(zigi(q)), q).not.toMatch(/\b(?:January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\b/);
  });
});
describe('claims none of the corpus questions', () => {
  test('every intent of the corpus', () => {
    const env = zigiEnv(showcaseAll());
    for (const intent of CORPUS) for (const q of [...intent.en, ...intent.nl]) expect(awX7MoneyAnswer(q, env), `${intent.id}: ${q}`).toBeNull();
  }, 120_000);
});
describe('the answers before it in engine.ts claim none of its questions', () => {
  for (const intent of AW_X7_MONEY) test(intent.id, () => {
    for (const q of [...intent.en, ...intent.nl]) for (const [name, fn] of EARLIER) expect(fn(q, zigiEnv(showcaseAll())), `${name}: ${q}`).toBeNull();
  });
});

describe('Removed recently (#461)', () => {
  test('the Showcase\'s two, newest first, in EN and NL; none says how it works', () => {
    expect(text(zigi('what did I remove recently'))).toMatch(/^2 entries removed in the last 30 days: Phone case €19\.90 \([^)]+\) and Bakery \(logged twice\) €6\.40 \([^)]+\)\. Put any of them back in Wealth → Spending → Removed recently/);
    expect(text(zigi('wat heb ik onlangs verwijderd'))).toMatch(/^2 boekingen verwijderd in de laatste 30 dagen: Phone case € 19,90 \(/);
    expect(text(zigi('what did I remove recently', freshAll()))).toMatch(/^Nothing removed in the last 30 days\. An entry you remove in Wealth → Spending stays/);
  });
  test('notes, tasks and the like are not money', () => {
    expect(zigi('which notes did I delete recently')).toBeNull();
    expect(zigi('welke taken heb ik onlangs verwijderd')).toBeNull();
  });
});

describe('a bill that ends (#462)', () => {
  const phone = (s: ToolSources) => withAk(s, {bills: billsSchema.parse({version: 1, dismissed: [], bills: [
    {id: 'p', title: 'Phone contract', amount: '25.00', currency: 'EUR', cadence: 'monthly', nextDue: '2026-12-05', origin: 'manual', createdAt: at, ends: {after: 24, from: '2025-03-05'}},
    {id: 'r', title: 'Rent', amount: '900.00', currency: 'EUR', cadence: 'monthly', nextDue: '2026-12-01', origin: 'manual', createdAt: at},
  ]})});
  test('the bill named: 3 of 24 left and the last day', () => {
    expect(text(zigi('when does my phone contract bill end', phone(freshAll())))).toMatch(/^Phone contract: 3 of 24 payments left, the last on .+2027 \(€25\.00 each\)\.$/);
    expect(text(zigi('when does my rent end', phone(freshAll())))).toMatch(/^Rent has no end set, so it keeps coming round\. Set when a bill ends in Wealth → Upcoming bills → Bill tracker → Edit/);
    expect(text(zigi('wanneer stopt mijn telefoonabonnement', phone(freshAll())))).toMatch(/^Rekeningen met een einde: Phone contract: nog 3 van 24 betalingen, de laatste op .+ 2027 \(€ 25,00 per keer\)\.$/);
  });
  test('the Showcase\'s Music bill, and no bills at all', () => {
    expect(text(zigi('how many payments are left on my bills'))).toMatch(/^Bills with an end: Music: 3 of 24 payments left/);
    expect(text(zigi('how many payments are left on my bills', freshAll()))).toMatch(/^No bills are kept yet\./);
  });
});

describe('a card\'s next payment (#464)', () => {
  const ID = '93000000-0000-4000-8000-000000000009';
  const card = (s: ToolSources, entries: MoneyEntry[]): ToolSources => withAk({...s, accounts: accountsSchema.parse({version: 1, items: [{id: ID, kind: 'credit-card', name: 'Visa', currency: 'EUR', snapshots: [], payments: [], createdAt: at, updatedAt: at}]}), moneyLog: {...s.moneyLog!, entries}}, {wealthSheet: {version: 1, cards: {[ID]: {statementDay: 5, dueDay: 25}}}});
  const e = (date: string, amount: string): MoneyEntry => ({id: `${date}-${amount}`, kind: 'expense', amount, currency: 'EUR', category: 'Shopping', date, createdAt: at, account: 'Visa'});
  test('the payment and so far this statement, EN and NL', () => {
    const s = card(freshAll(), [e('2026-10-10', '300.00'), e('2026-11-02', '112.30'), e('2026-11-10', '40.00')]);
    expect(text(zigi('how much is my next credit card payment', s))).toMatch(/^Visa: next payment on .*25.*: €412\.30 \(statement of .*5.*\); so far this statement €40\.00\. Worked out from your own entries/);
    expect(text(zigi('hoeveel is mijn volgende creditcardbetaling', s))).toMatch(/^Visa: volgende betaling op .*25 nov.*: € 412,30 \(afschrift van .*5 nov.*\); tot nu toe dit afschrift € 40,00\./);
  });
  test('unknown is said, never 0', () => {
    expect(text(zigi('how much is my next credit card payment', card(freshAll(), [])))).toMatch(/^Visa: not known yet — no entry in your money log is on this card/);
    expect(text(zigi('how much is my next credit card payment', freshAll()))).toMatch(/^No credit card is kept/);
    expect(text(zigi('how much is my next credit card payment'))).toMatch(/^Credit card: not known yet/);
  });
});

import {describe, expect, test} from 'vitest';
import type {ToolEnv, ToolSources} from '../tools/env';
import {DAY, freshAll, novaEnv, showcaseAll, zigiEnv} from '../evals/as/harness';
import {AW_FR_MONEY} from '../evals/as/cases-aw-fr-money';
import {CORPUS} from '../evals/as/cases';
import {awFrMoneyAnswer} from './aw-fr-money';
import {localAnswer, type LocalReply} from './engine';
import {ADVICE_REPLIES, DEBT_ADVICE_REPLY, isLoanAdvice, safetyFirst} from '../safety-guard';
import {noModelReply} from './no-model';
import {runTool} from '../tools/registry';
import type {Account, Accounts} from '../../accounts/schema';

/**
 * Session AW (fr-money; persona Tom): FR-AW-3 (a debt answer reads the figure Wealth's row shows, payments included),
 * FR-AW-4 (paid off in a period is the debts' recorded payments, never the spending) and FR-AW-11 (a loan or "is it smart"
 * money question gets the no-advice line, never the task list), in ZIGi and NOVA alike, in English and Dutch.
 */
const text = (r: LocalReply | null) => r && 'text' in r ? r.text.replace(/[  ]/g, ' ') : '';
const shut = (env: ToolEnv): ToolEnv => ({...env, areas: {...env.areas, wealth: false}});
const AT = '2026-11-01T09:00:00.000Z', CARD = '00000000-0000-4000-8000-00000000f001';
// Tom's card: 2,400.00 owed on Mon 30 Nov... here on Mon 16 Nov (the corpus's week, Mon 16 to Sun 22 Nov), then 150.00 paid on Tue 17 Nov.
const tomCard = (payments: Account['payments'] = [{id: '00000000-0000-4000-8000-00000000f003', date: DAY, value: '15000', decimals: 2}]): Account => ({id: CARD, kind: 'credit-card', name: 'Credit card', currency: 'EUR', ratePercent: '18.9',
  snapshots: [{id: '00000000-0000-4000-8000-00000000f002', date: '2026-11-16', value: '240000', decimals: 2}], payments, createdAt: AT, updatedAt: AT});
const tom = (card = tomCard()): ToolSources => ({...freshAll(), accounts: {version: 1, items: [card]} as Accounts});
const zigi = (q: string, s: ToolSources = tom()) => localAnswer(q, zigiEnv(s));
const nova = (q: string, s: ToolSources = tom()) => localAnswer(q, novaEnv(s));

describe('FR-AW-3: what is owed is what Wealth\'s row shows, payments since the balance included', () => {
  test('ZIGi and NOVA: "How much do I owe?" and "How much is left on my credit card?" after a payment', () => {
    for (const ask of [zigi, nova]) for (const q of ['How much do I owe?', 'How much is left on my credit card?']) {
      const t = text(ask(q));
      expect(t, q).toMatch(/^You owe 2,250\.00 EUR across 1 debt, as entered on this device:/);
      expect(t, q).toContain('Credit card: 2,250.00 EUR owed after 1 payment since your balance of 2,400.00 EUR on ');
      expect(t, q).not.toMatch(/^You owe 2,400/);
    }
  });
  test('in Dutch too (it had no answer): the same figure, with the payment said', () => {
    for (const ask of [zigi, nova]) for (const q of ['Hoeveel schuld heb ik?', 'Hoeveel moet ik nog aflossen?']) {
      const t = text(ask(q));
      expect(t, q).toMatch(/^Je hebt € 2\.250,00 schuld, over 1 schuld, zoals ingevoerd op dit apparaat:\n- Credit card: € 2\.250,00, na 1 betaling sinds je saldo van € 2\.400,00 op ma 16 nov$/);
    }
    expect(text(zigi('Hoeveel schuld heb ik?', tom(tomCard([]))))).toMatch(/^Je hebt € 2\.400,00 schuld, over 1 schuld, zoals ingevoerd op dit apparaat:\n- Credit card: € 2\.400,00 op ma 16 nov$/);
    expect(text(zigi('Hoeveel schuld heb ik?', freshAll()))).toBe('Er staat geen schuld in Wealth → What you owe op dit apparaat.');
    expect(awFrMoneyAnswer('Hoeveel schuld heb ik?', shut(zigiEnv(tom())))?.kind).toBe('refusal');
  });
  test('the tool carries the figure a model reads, and nothing new without a payment since', () => {
    const after = runTool('accounts', {}, zigiEnv(tom()));
    expect(after.ok && (after.data as {accounts: unknown[]}).accounts[0]).toMatchObject({latest: '2400.00 EUR', asOf: '2026-11-16', owedAfterPayments: '2250.00 EUR', paymentsSince: 1});
    const before = runTool('accounts', {}, zigiEnv(tom(tomCard([]))));
    expect(before.ok && (before.data as {accounts: Record<string, unknown>[]}).accounts[0]).not.toHaveProperty('owedAfterPayments');
    expect(text(zigi('How much do I owe?', tom(tomCard([]))))).toMatch(/^You owe 2,400\.00 EUR across 1 debt/);
  });
  test('review fix: the tool reads the calendar day Wealth\'s row uses, so a payment dated today counts before a late day end', () => {
    const env = zigiEnv(tom()), lateNight = {...env, habitDay: '2026-11-16'}; // after midnight on 17 Nov, the habit day still the 16th
    const r = runTool('accounts', {}, lateNight);
    expect(r.ok && (r.data as {accounts: unknown[]}).accounts[0]).toMatchObject({owedAfterPayments: '2250.00 EUR', paymentsSince: 1});
  });
  test('the Showcase (no payment after its balances) answers exactly as before', () => {
    expect(text(localAnswer('What do I owe?', zigiEnv(showcaseAll())))).toMatch(/^You owe /);
    expect(text(localAnswer('What do I owe?', zigiEnv(showcaseAll())))).not.toContain('after 1 payment');
  });
});

describe('FR-AW-4: paid off in a period is the payments recorded on the debts, never the spending', () => {
  test('Tom: this week, EN and NL, ZIGi and NOVA', () => {
    for (const ask of [zigi, nova]) {
      expect(text(ask('How much have I paid off this week?'))).toMatch(/^€150\.00 paid on Credit card this week \([^)]+\), in 1 payment recorded in Wealth → What you owe\.$/);
      expect(text(ask('Hoeveel heb ik deze week afgelost?'))).toMatch(/^€ 150,00 afgelost op Credit card deze week \([^)]+\), in 1 betaling vastgelegd in Wealth → What you owe\.$/);
    }
    expect(text(zigi('How much have I paid off this week?'))).not.toMatch(/spent|Groceries/);
  });
  test('none in the period says none, and that spending is not counted', () => {
    expect(text(zigi('How much did I pay off last week?'))).toMatch(/^No debt payment is recorded last week \([^)]+\)\. A payment counts here once you record it with Record a payment on the debt in Wealth → What you owe; spending is not counted as paying off\.$/);
    expect(text(zigi('Hoeveel heb ik vorige week afbetaald?'))).toMatch(/^Er is vorige week \([^)]+\) geen aflossing vastgelegd\./);
    expect(text(zigi('How much have I paid off this week?', freshAll()))).toMatch(/^No debt is kept in Wealth → What you owe/);
  });
  test('the Showcase: the Car loan\'s 300.00 on Sun 15 Nov is this month, not this week', () => {
    expect(text(localAnswer('how much have I paid off this month', zigiEnv(showcaseAll())))).toMatch(/^\$300\.00 paid on Car loan this month \(/);
    expect(text(localAnswer('how much have I paid off this week', zigiEnv(showcaseAll())))).toMatch(/^No debt payment is recorded this week/);
  });
  test('no period: every payment, with the first one\'s day; a named debt alone', () => {
    const two: ToolSources = {...tom(), accounts: {version: 1, items: [tomCard(), {...tomCard(), id: '00000000-0000-4000-8000-00000000f009', kind: 'loan', name: 'Car loan', payments: [{id: '00000000-0000-4000-8000-00000000f010', date: '2026-11-02', value: '30000', decimals: 2}]}]} as Accounts};
    expect(text(zigi('How much have I paid off?', two))).toMatch(/^€150\.00 paid on Credit card and €300\.00 on Car loan in all, in 2 payments recorded in Wealth → What you owe \(the first on [^)]+\)\. In all: €450\.00\.$/);
    expect(text(zigi('How much have I paid off on my car loan this month?', two))).toMatch(/^€300\.00 paid on Car loan this month/);
  });
  test('refused while Wealth is closed; the other debt questions keep their own answers', () => {
    expect(awFrMoneyAnswer('How much have I paid off this week?', shut(zigiEnv(tom())))?.kind).toBe('refusal');
    for (const q of ['how much debt did I pay down this year', 'how much have I paid down', 'hoeveel schuld heb ik dit jaar afgelost', 'hoeveel heb ik afbetaald', 'which debts have I paid off', 'when will I be debt-free', 'when are my debts paid off', 'how much do I still have to pay off', 'how much extra to be debt-free by 2028'])
      expect(awFrMoneyAnswer(q, zigiEnv(tom())), q).toBeNull();
  });
});

describe('FR-AW-11: a loan or "is it smart" money question gets the no-advice line', () => {
  test('ZIGi and NOVA, EN and NL, never the task list', () => {
    const asks = {en: ['Is it smart to take a loan to pay my card?', 'Should I take out a loan to pay off my credit card?', 'Should I pay off my card first or my loan?', 'Which debt should I pay off first?'], nl: ['Is het slim om een lening te nemen voor mijn creditcard?', 'Moet ik een lening afsluiten om mijn creditcard af te lossen?', 'Kan ik beter aflossen of beleggen?']} as const;
    for (const lang of ['en', 'nl'] as const) for (const q of asks[lang]) {
      expect(safetyFirst(q), q).toMatchObject({kind: 'advice', topic: 'money', text: DEBT_ADVICE_REPLY[lang]});
      expect(text(noModelReply(q, zigiEnv(tom()))), q).toBe(DEBT_ADVICE_REPLY[lang]);
      expect(localAnswer(q, zigiEnv(tom())).kind, q).toBe('none'); // the device reads nothing; the chat gives the line (no-model.ts)
    }
  });
  test('the debt line names debts, not coins, and gives a debt example; other money asks keep their own line', () => {
    expect(DEBT_ADVICE_REPLY.en).toContain('“What do I owe?”');
    expect(DEBT_ADVICE_REPLY.nl).toContain('“Hoeveel schuld heb ik?”');
    for (const line of Object.values(DEBT_ADVICE_REPLY)) expect(line).not.toMatch(/BTC|staking|staken|beleggen|investing/);
    expect(safetyFirst('Should I buy BTC now?')?.text).toBe(ADVICE_REPLIES.money.en);
    expect(safetyFirst('Moet ik nu ETH kopen?')?.text).toBe(ADVICE_REPLIES.money.nl);
    expect(safetyFirst('Should I stop my diet?')?.text).toBe(ADVICE_REPLIES.health.en);
  });
  test('record questions stay lookups (the review\'s cases among them)', () => {
    for (const q of ['How much is left on my loan?', 'How much have I paid off this week?', 'Hoeveel moet ik nog aflossen?', 'Hoeveel heb ik afgelost?', 'Is it smart to walk after dinner?', 'When is my loan paid off?', 'What is my credit card balance?',
      'Moet ik deze maand nog aflossen?', 'Moet ik nog iets aflossen?', 'ZIGi, moet ik nog lenen?', 'Is het slim om mijn schulden bij te houden?', 'Is it bad if I missed a loan payment?', 'Is it better to log my debts weekly?', 'Is it smart to track my credit card?', 'Is het verstandig om mijn lening te noteren?'])
      expect(safetyFirst(q), q).toBeNull();
  });
});

describe('the corpus', () => {
  test('every question of its own intents is answered, EN and NL, and none answers with spending', () => {
    for (const intent of AW_FR_MONEY) for (const q of [...intent.en, ...intent.nl]) {
      for (const env of [zigiEnv(showcaseAll()), novaEnv(showcaseAll())]) {
        const r = localAnswer(q, env), t = text(r);
        if (intent.id === 'awfr-money-loan-advice') { expect(safetyFirst(q)?.kind, q).toBe('advice'); continue; }
        expect(t, q).not.toBe('');
        for (const w of intent.never ?? []) expect(t, q).not.toContain(w);
      }
    }
  });
  test('it claims no question of the corpus\'s other intents, and the new advice words none either', () => {
    const env = zigiEnv(showcaseAll()), own = new Set(AW_FR_MONEY.map(i => i.id));
    for (const intent of CORPUS) if (!own.has(intent.id)) for (const q of [...intent.en, ...intent.nl]) {
      expect(awFrMoneyAnswer(q, env), `${intent.id}: ${q}`).toBeNull();
      const folded = q.toLowerCase().normalize('NFKC').replace(/[’‘ʼ`´]/g, "'").replace(/\s+/g, ' ').trim();
      expect(isLoanAdvice(folded), `${intent.id}: ${q}`).toBe(false);
    }
  }, 120_000);
});

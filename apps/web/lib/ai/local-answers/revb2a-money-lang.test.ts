import {describe, expect, test} from 'vitest';
import {freshAll, showcaseAll, zigiEnv, DAY} from '../evals/as/harness';
import type {ToolSources} from '../tools/env';
import {av2MoneyAnswer} from './av2-money';
import {av2MoneyR2Answer} from './av2-money-r2';
import {moneyIn} from './av-words';
import {AV2_MONEY} from '../evals/as/cases-av2-money';
import {AV2_MONEY_R2} from '../evals/as/cases-av2-money-r2';
import type {LocalReply} from './engine';

/**
 * Session AV lane 2 (review b2a #6, as review b1 #16 for the pay-period answer): the Money answers write money in the
 * answer's language — a Dutch answer "€ 40,00", an English one the display format ("€40.00" here) — whatever the
 * display locale. Every corpus question of Money rounds 1 and 2, in both languages.
 */
const text = (r: LocalReply | null) => r && 'text' in r ? r.text : '';
const ENGLISH_MONEY = /€\d[\d,]*\.\d{2}/, DUTCH_MONEY = /€\s\d[\d.]*,\d{2}/;
const ask = (q: string, s: ToolSources = showcaseAll()) => text(av2MoneyAnswer(q, zigiEnv(s))) || text(av2MoneyR2Answer(q, zigiEnv(s)));

describe('money in the answer’s language', () => {
  test('moneyIn: Dutch "€ 40,00", English the display format', () => {
    expect(moneyIn('nl', 4000, 'EUR')).toMatch(/^€\s40,00$/);
    expect(moneyIn('en', 4000, 'EUR')).toBe('€40.00');
    expect(moneyIn('nl', 123456, 'EUR')).toMatch(/^€\s1\.234,56$/);
  });
  for (const intent of [...AV2_MONEY, ...AV2_MONEY_R2]) test(intent.id, () => {
    for (const q of intent.nl) expect(ask(q), q).not.toMatch(ENGLISH_MONEY);
    for (const q of intent.en) expect(ask(q), q).not.toMatch(DUTCH_MONEY);
  });
  test('the reviewer’s example: paid with, in Dutch, on any display locale', () => {
    const at = `${DAY}T10:00:00.000Z`, month = DAY.slice(0, 7);
    const s: ToolSources = {...freshAll(), moneyLog: {...freshAll().moneyLog!, entries: [
      {id: 'a', kind: 'expense', amount: '3.00', currency: 'EUR', category: 'Food & drink', date: `${month}-05`, createdAt: at, paidWith: 'cash'},
      {id: 'b', kind: 'expense', amount: '40.00', currency: 'EUR', category: 'Food & drink', date: `${month}-05`, createdAt: at, paidWith: 'credit'},
    ]}};
    expect(ask('hoeveel heb ik deze maand contant betaald', s)).toMatch(/^Deze maand uitgegeven per betaalwijze: Creditcard €\s40,00 en Contant €\s3,00\./);
    expect(ask('how did I pay this month', s)).toMatch(/^Spent this month by how you paid: Credit card €40\.00 and Cash €3\.00\./);
  });
});

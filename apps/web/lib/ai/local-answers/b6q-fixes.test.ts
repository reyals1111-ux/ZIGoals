import {afterEach, describe, expect, test, vi} from 'vitest';
import {ask, freshAll, novaEnv, showcaseAll, zigiEnv} from '../evals/as/harness';
import {av2R6MoneyAnswer} from './av2-r6-money';
import type {LocalReply} from './engine';
import {emptyDayEnds, setCurrentDayEnds} from '../../day-boundary-core';

/**
 * Session AV lane 2 (fixb6q): review B6Q's findings on round 6's on-device answers (NOVA and ZIGi), each pinned here in
 * English and Dutch. B6Q-2 asks the whole engine (`localAnswer`, through the harness's `ask`) once with round 6's money
 * answer and once with it switched off (the mock below passes every call through unless `off.money` is set): the payday
 * questions must get the same answer either way, so they stay with the older payday answers.
 */
const off = vi.hoisted(() => ({money: false}));
vi.mock('./av2-r6-money', async importOriginal => {
  const real = await importOriginal<typeof import('./av2-r6-money')>();
  return {...real, av2R6MoneyAnswer: (...args: Parameters<typeof real.av2R6MoneyAnswer>) => off.money ? null : real.av2R6MoneyAnswer(...args)};
});
afterEach(() => { off.money = false; setCurrentDayEnds(emptyDayEnds()); });
const text = (r: LocalReply | null) => r && 'text' in r ? r.text.replace(/[  ]/g, ' ') : '';

describe('B6Q-2: the paycheck plan answers only about the plan; the next paycheck stays with the payday answers', () => {
  const PAYDAY = {
    en: ['when is my next paycheck', 'how much is left until my next paycheck', 'how much is due before my next paycheck', 'which bills are due before my next paycheck'],
    nl: ['wanneer is mijn volgende salaris', 'hoeveel houd ik over tot mijn volgende salaris', 'hoeveel moet ik betalen voor mijn volgende salaris', 'welke rekeningen moet ik betalen voor mijn volgende salaris'],
  };
  const PLAN = {
    en: ['what is left of each paycheck', 'show my paycheck plan', 'how do I plan my paychecks', 'how much does each paycheck cover'],
    nl: ['wat staat er per salaris gepland', 'toon mijn salarisplan', 'hoe plan ik mijn salarissen', 'hoeveel blijft er over van elk salaris'],
  };
  const envs = () => [['ZIGi', zigiEnv(showcaseAll())], ['NOVA', novaEnv(showcaseAll())], ['ZIGi fresh', zigiEnv(freshAll())]] as const;
  for (const lang of ['en', 'nl'] as const) test(`the payday questions (${lang}): the same answer as without round 6’s money answer`, () => {
    for (const q of PAYDAY[lang]) for (const [who, env] of envs()) {
      expect(av2R6MoneyAnswer(q, env), `${who}: ${q}`).toBeNull();
      const withR6 = ask(q, env).text;
      off.money = true;
      const without = ask(q, env).text;
      off.money = false;
      expect(withR6, `${who}: ${q}`).toBe(without);
      expect(withR6, `${who}: ${q}`).not.toMatch(/paychecks are set up|Your paychecks in|nog geen salarissen ingesteld|Je salarissen in/);
    }
  });
  for (const lang of ['en', 'nl'] as const) test(`the plan’s own questions (${lang}) are still its own`, () => {
    for (const q of PLAN[lang]) expect(text(av2R6MoneyAnswer(q, zigiEnv(showcaseAll()))), q).toMatch(lang === 'en' ? /^(?:Your paychecks in|No paychecks are set up yet)/ : /^(?:Je salarissen in|Er zijn nog geen salarissen ingesteld)/);
  });
});


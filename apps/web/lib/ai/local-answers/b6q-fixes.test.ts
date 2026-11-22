import {afterEach, describe, expect, test, vi} from 'vitest';
import type {ToolSources} from '../tools/env';
import {ask, DAY, freshAll, novaEnv, showcaseAll, zigiEnv} from '../evals/as/harness';
import {av2R6MoneyAnswer} from './av2-r6-money';
import {av2R6BodyAnswer} from './av2-r6-body';
import type {LocalReply} from './engine';
import {emptyDayEnds, setCurrentDayEnds} from '../../day-boundary-core';
import {emptyWorkouts, workoutsSchema} from '../../workouts/schema';
import {setLight} from '../../workouts/r6-gym';

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
const ENGLISH_NAMES = /\b(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday|January|February|March|April|May|June|July|August|September|October|November|December|Mon|Tue|Wed|Thu|Fri|Sat|Sun|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\b/;

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

describe('B6Q-3: a light week is marked during the workout to keep a routine’s weights out', () => {
  const lift = (id: string, date: string) => ({id, name: `Fictional legs ${id}`, date, type: 'strength', startedAt: `${date}T17:00:00.000Z`, endedAt: `${date}T18:00:00.000Z`, exercises: [{id: `${id}-e`, exerciseId: 'squat', name: 'Squat', measure: 'weight-reps', sets: [{id: `${id}-s`, kind: 'normal', reps: 5, weightKg: 100, done: true}]}]});
  const light = (): ToolSources => { const s = showcaseAll(); return {...s, ak: {...s.ak, workouts: setLight(workoutsSchema.parse({...emptyWorkouts(), workouts: [lift('a', '2026-11-09')]}), 'a', true)} as typeof s.ak}; };
  const none = (): ToolSources => { const s = showcaseAll(); return {...s, ak: {...s.ak, workouts: emptyWorkouts()} as typeof s.ak}; };
  const EN = 'Mark a light week during the workout ("Light week (not in my bests)", above Finish workout) and a routine that keeps your last weights leaves its weights out too; marked afterwards under Health → Workouts → Your workouts, it is left out of your bests and "new best" marks only.';
  const NL = 'Markeer een lichte week tijdens de workout ("Light week (not in my bests)", boven Finish workout), dan laat een routine die je laatste gewichten bewaart de gewichten ervan ook weg; markeer je hem achteraf onder Health → Workouts → Your workouts, dan blijft hij alleen buiten je records en de "new best"-markeringen.';
  test('none marked yet, English and Dutch', () => {
    expect(text(av2R6BodyAnswer('which workouts are light weeks', zigiEnv(none())))).toBe(`No workout is marked as a light week. ${EN} Either way its sets stay in your history and volume.`);
    expect(text(av2R6BodyAnswer('welke workouts tellen niet mee voor mijn records', zigiEnv(none())))).toBe(`Geen workout is als lichte week gemarkeerd. ${NL} Hoe dan ook blijven de sets in je geschiedenis en volume.`);
  });
  test('some marked: listed, then when to mark one', () => {
    expect(text(av2R6BodyAnswer('which workouts are light weeks', zigiEnv(light())))).toMatch(new RegExp(`^Light weeks, left out of your bests: Fictional legs a \\([^)]+\\)\\. Their sets stay in your history and volume\\. ${EN.replace(/[()→.]/g, '\\$&')}$`));
    const nl = text(av2R6BodyAnswer('welke workouts zijn lichte weken', zigiEnv(light())));
    expect(nl.endsWith(` Hun sets blijven in je geschiedenis en volume. ${NL}`), nl).toBe(true);
    expect(nl).not.toMatch(ENGLISH_NAMES);
  });
});

describe('B6Q-13, B6Q-14 and B6Q-19 (money)', () => {
  const zigi = (q: string, s: ToolSources = showcaseAll()) => av2R6MoneyAnswer(q, zigiEnv(s));
  test('B6Q-13: "order" alone is not reordering the budgets', () => {
    for (const q of ['is my takeaway budget enough to order pizza', 'which budgets are over, in order', 'what budgets do I have in order of spending', 'welke budgetten zijn over, op volgorde']) expect(zigi(q), q).toBeNull();
    for (const q of ['how do I reorder my budgets', 'can I put my budgets in my own order', 'how do I change the order of my budgets', 'how do I sort my budgets', 'hoe zet ik mijn budgetten in een andere volgorde', 'kan ik mijn budgetten herschikken', 'hoe verander ik de volgorde van mijn budgetten']) expect(text(zigi(q)), q).toMatch(/Reorder budgets/);
  });
  test('B6Q-14: a refund policy or a subscription’s refund is not a logged refund', () => {
    for (const q of ['what is your refund policy', 'how do I get a refund for my subscription', 'can I get a refund for ZIGoals', 'hoe krijg ik een terugbetaling voor mijn abonnement', 'wat is het beleid voor een terugbetaling']) expect(zigi(q), q).toBeNull();
    for (const q of ['how much did I get refunded this month', 'does a refund count as income', 'hoeveel geld heb ik deze maand terug gekregen', 'is een terugbetaling inkomsten']) expect(text(zigi(q)), q).not.toBe('');
  });
  test('B6Q-19(f): the streak in Dutch words; (g): every repair can be undone', () => {
    expect(text(zigi('wat is mijn geldreeks', freshAll()))).toMatch(/^Je reeks voor je geld staat uit\. /);
    const s = freshAll(); s.moneyLog = {...s.moneyLog!, entries: [{id: 'a', kind: 'expense', amount: '10.00', currency: 'EUR', category: 'Groceries', date: `${DAY.slice(0, 7)}-05`, createdAt: `${DAY}T10:00:00.000Z`, note: 'Shop'}, {id: 'b', kind: 'expense', amount: '10.00', currency: 'EUR', category: 'Groceries', date: `${DAY.slice(0, 7)}-05`, createdAt: `${DAY}T10:00:00.000Z`, note: 'Shop'}]};
    const nl = text(zigi('zijn er dubbele boekingen in mijn geldlog', s));
    expect(nl).toMatch(/; elke reparatie kun je terugdraaien met Ongedaan maken\.$/);
    expect(nl).not.toMatch(/elke heeft/);
  });
});

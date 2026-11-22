import {afterEach, describe, expect, test, vi} from 'vitest';
import type {ToolSources} from '../tools/env';
import {ask, freshAll, novaEnv, showcaseAll, zigiEnv} from '../evals/as/harness';
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


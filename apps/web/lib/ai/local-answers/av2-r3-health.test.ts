import {describe, expect, test} from 'vitest';
import {HEALTH_CLOSED} from '../tools/format';
import {DAY, freshAll, showcaseAll, zigiEnv} from '../evals/as/harness';
import {AV2_R3_HEALTH} from '../evals/as/cases-av2-r3-health';
import {av2R3HealthAnswer} from './av2-r3-health';
import type {LocalReply} from './engine';
import {emptyHealthExtras, setDrink} from '../../health-extras';
import {emptyNotifyPrefs} from '../../notify/prefs';
import {withWaterSpread, DEFAULT_SPREAD} from '../../water-spread';
import {withWeighIn} from '../../weigh-in';
import {addMoreGoal, emptyMoreGoals} from '../../health-goals/more';
import {emptyCircuits, saveCircuit} from '../../workouts/circuits';
import {addWater} from '../../health-daily';
import type {ToolSources} from '../tools/env';

/**
 * Session AV lane 2 (health r3): the on-device answers of lib/ai/local-answers/av2-r3-health.ts, on the Showcase (17 Nov
 * 2026) and on a fresh profile, in English and Dutch, Health's behind its gate. Every corpus phrasing is answered; with
 * the records in the AK sources (the lead's registry step) the answers read them.
 */
const text = (r: LocalReply | null) => r && 'text' in r ? r.text : '';
const ask = (q: string, s: ToolSources = showcaseAll(), health = true) => av2R3HealthAnswer(q, zigiEnv(s, health));
/** The Showcase with this round's records in the AK sources, as the lead wires them. */
function wired(): ToolSources {
  const s = showcaseAll(), at = `${DAY}T09:00:00.000Z`;
  const health = addWater(addWater(s.health, {id: 'health_r3water01', date: DAY, amountMilli: 250_000, unit: 'ml'}, at), {id: 'health_r3water02', date: DAY, amountMilli: 330_000, unit: 'ml'}, at);
  let extras = setDrink(emptyHealthExtras(), 'health_r3water01', 'juice', undefined, {kcal: 110, sugarG: 21.5});
  extras = setDrink(extras, 'health_r3water02', 'soft drink', undefined, {kcal: 140});
  const prefs = withWeighIn(withWaterSpread(emptyNotifyPrefs(), DEFAULT_SPREAD), {time: '07:15', repeat: 'weekdays', weekdays: 9});
  const goal = addMoreGoal(emptyMoreGoals(), {name: '', source: 'nutrient', key: 'proteinMg', target: '80', direction: 'at-least', windowDays: 7}, 'g1', at);
  const circuit = saveCircuit(emptyCircuits(), {name: 'Fictional legs', moves: ['squat', 'lunge'], work: '40', rest: '20', rounds: '3', roundRest: '60'}, at);
  if (!goal.ok || !circuit.ok) throw new Error('fixture');
  return {...s, health, ak: {...s.ak, healthExtras: extras, notifyPrefs: prefs, healthGoalsMore: goal.value, workoutCircuits: circuit.value} as typeof s.ak};
}

describe('every corpus phrasing is answered, in its own language', () => {
  for (const c of AV2_R3_HEALTH) for (const [lang, qs] of [['en', c.en], ['nl', c.nl]] as const) for (const q of qs) test(`${c.id} (${lang}): ${q}`, () => {
    for (const s of [showcaseAll(), wired(), freshAll()]) {
      const r = ask(q, s);
      expect(r?.kind, q).toBe('answer');
      for (const n of c.never ?? []) expect(text(r)).not.toContain(n);
    }
    if (lang === 'nl') expect(text(ask(q, wired()))).not.toMatch(/\b(?:the|your|today)\b/);
  });
  test('Health closed: the Health refusal for the Health questions, never the data', () => {
    for (const c of AV2_R3_HEALTH.filter(x => x.pillar === 'health')) { const r = ask(c.en[0]!, wired(), false); expect(r?.kind, c.id).toBe('refusal'); expect(text(r)).toBe(HEALTH_CLOSED); }
  });
  test('a question with an action in it is left alone, and other questions are not claimed', () => {
    expect(ask('when are my water reminders and log one more glass')).toBeNull();
    expect(ask('how much water did I drink today')).toBeNull();
    expect(ask('what is my weight')).toBeNull();
  });
});

describe('the answers read the features’ own figures', () => {
  test('drinks: only what was typed, never guessed', () => {
    expect(text(ask('how many calories from drinks today', wired()))).toBe('From today’s drinks, as you typed them: 250 kcal · 21.5 g sugar, from 2 drinks (Juice and Soft drink). Nothing is guessed.');
    expect(text(ask('hoeveel calorieën uit drankjes vandaag', wired()))).toContain('Er wordt niets geschat.');
    expect(text(ask('how many calories from drinks today'))).toContain('I can’t read what your drinks were here yet');
  });
  test('water reminders through the day, with today’s pace', () => {
    const en = text(ask('when are my water reminders', wired()));
    expect(en).toMatch(/^Every 2 hours from 9:00 AM to 9:00 PM: /);
    expect(en).toContain('skipped because you are on pace');
    expect(text(ask('wanneer zijn mijn waterherinneringen', wired()))).toMatch(/^Elke 2 uur van 09:00 tot 21:00: /);
  });
  test('the weigh-in reminder, never a weight', () => {
    expect(text(ask('when is my weigh-in reminder', wired()))).toBe('Mon and Thu at 7:15 AM, quiet on a day a weight is already logged.');
    expect(text(ask('wanneer is mijn weegherinnering', wired()))).toBe('ma en do om 07:15, stil op een dag dat er al een gewicht is gelogd.');
  });
  test('the protein goal and the circuits; no calories', () => {
    expect(text(ask('how am I doing on my protein goal', wired()))).toContain('Your goal: at least 80 g.');
    expect(text(ask('what circuits do I have', wired()))).toBe('Your circuits: Fictional legs (2 moves × 3 rounds · 40 s on, 20 s off · 60 s between rounds · about 7 min).');
    const fresh = freshAll();
    expect(text(ask('what circuits do I have', {...fresh, ak: {...fresh.ak, workoutCircuits: emptyCircuits()} as typeof fresh.ak}))).toContain('No calories are counted.');
  });
  test('routines by length, and the habits’ trend in calm words', () => {
    expect(text(ask('which routines fit in 30 minutes'))).toMatch(/^Ready-made routines of 30 minutes or less: /);
    expect(text(ask('which habits am I doing more often'))).not.toMatch(/attention|warning/i);
    expect(text(ask('which habits am I doing more often', freshAll()))).toContain('Not enough days yet');
  });
});

import {afterEach, describe, expect, test} from 'vitest';
import {HEALTH_CLOSED} from '../tools/format';
import {DAY, freshAll, showcaseAll, zigiEnv} from '../evals/as/harness';
import {CORPUS} from '../evals/as/cases';
import {AV2_R6_BODY} from '../evals/as/cases-av2-r6-body';
import {av2R6BodyAnswer} from './av2-r6-body';
import type {LocalReply} from './engine';
import type {ToolSources} from '../tools/env';
import {addLocalDays} from '../../local-date';
import {createEmptyHealth} from '../../health';
import {withHealthGroup} from '../../vault/w-homes';
import {emptyDayEnds, setCurrentDayEnds} from '../../day-boundary-core';
import {emptyEnergy} from '../../energy/schema';
import {addLift} from '../../mood-words/lifts';
import {emptyFoodPlus} from '../../food-plus/schema';
import {countPortion, setAim, setBuiltIn} from '../../food-plus/portions';
import {addBringUp, emptyBringUp, tickBringUp} from '../../clinician-report/bring-up';
import {emptyMeditation, type Meditation} from '../../meditation/schema';
import {saveManual} from '../../meditation/engine';
import type {Sleep} from '../../sleep/schema';
import {emptyWorkouts, workoutsSchema} from '../../workouts/schema';
import {setExerciseDefaults, setFavouriteExercise, setLight} from '../../workouts/r6-gym';

/**
 * Session AV lane 2, round 6 (r6-body): the on-device answers of lib/ai/local-answers/av2-r6-body.ts, on the Showcase and
 * on a fresh profile, in English and Dutch, behind Health's gate, reading the features' own figures. The "claims no other
 * corpus question" check leaves this round's own intents out (the lead adds them to the corpus).
 */
const text = (r: LocalReply | null) => r && 'text' in r ? r.text : '';
const ask = (q: string, s: ToolSources = showcaseAll(), health = true) => av2R6BodyAnswer(q, zigiEnv(s, health));
const withAk = (more: Record<string, unknown>, base: ToolSources = showcaseAll()): ToolSources => ({...base, ak: {...base.ak, ...more} as typeof base.ak});
const AT = new Date(`${DAY}T20:00:00.000Z`);
afterEach(() => setCurrentDayEnds(emptyDayEnds()));

describe('every corpus phrasing is answered, in its own language', () => {
  for (const c of AV2_R6_BODY) for (const [lang, qs] of [['en', c.en], ['nl', c.nl]] as const) for (const q of qs) test(`${c.id} (${lang}): ${q}`, () => {
    for (const s of [showcaseAll(), freshAll()]) {
      const r = ask(q, s);
      expect(r?.kind, q).toBe('answer');
      for (const n of c.never ?? []) expect(text(r).toLowerCase()).not.toContain(n.toLowerCase());
    }
    if (lang === 'nl') expect(text(ask(q))).not.toMatch(/\b(?:the|your|today|this week)\b/);
  });
  test('Health closed: the Health refusal, never the data', () => {
    for (const c of AV2_R6_BODY) { const r = ask(c.en[0]!, showcaseAll(), false); expect(r?.kind, c.id).toBe('refusal'); expect(text(r)).toBe(HEALTH_CLOSED); }
  });
  test('a question with an action in it is left alone, and nearby questions are not claimed', () => {
    expect(ask('what lifts me and add a task')).toBeNull();
    expect(ask('how much did I sleep last night')).toBeNull();
    expect(ask('what is my bench press best')).toBeNull();
    expect(ask('how many minutes did I meditate this week')).toBeNull();
  });
});

describe('claims none of the other corpus questions', () => {
  test('every other intent of the corpus', () => {
    const own = new Set(AV2_R6_BODY.map(i => i.id)), env = zigiEnv(showcaseAll());
    for (const intent of CORPUS.filter(i => !own.has(i.id))) for (const q of [...intent.en, ...intent.nl]) expect(av2R6BodyAnswer(q, env), `${intent.id}: ${q}`).toBeNull();
  }, 120_000);
});

describe('the answers read the features’ own figures', () => {
  test('the meditation day follows "My day ends at"', () => {
    expect(text(ask('which day does a late meditation count on'))).toMatch(/^Your day ends at midnight/);
    setCurrentDayEnds({version: 1, endsAt: 180});
    expect(text(ask('which day does a late meditation count on'))).toMatch(/^Your day ends at 3:00 .*before 3:00 counts on the evening before/);
    expect(text(ask('op welke dag telt een late meditatie?'))).toMatch(/^Je dag eindigt om 3:00/);
  });
  test('consistency from the sessions', () => {
    let m: Meditation = emptyMeditation();
    for (const d of [-3, -2, -1]) m = saveManual(m, {date: addLocalDays(DAY, d), time: '07:00', minutes: 10, timeZone: 'UTC'}, AT);
    const s = {...showcaseAll(), health: withHealthGroup(createEmptyHealth(), 'meditation', m, false)};
    expect(text(ask('how consistent is my meditation', s))).toMatch(/^3 of the 3 days since your first session had a session\./);
    expect(text(ask('hoe consequent mediteer ik', s))).toMatch(/^3 van de 3 dagen sinds je eerste sessie/);
  });
  test('what lifts me, as written; an empty list teaches', () => {
    const energy = addLift(addLift(emptyEnergy(), 'A walk round the block'), 'Call my sister');
    expect(text(ask('what lifts me', {...showcaseAll(), energy}))).toBe('Your own list of what lifts you: A walk round the block and Call my sister. It shows first when you choose an unpleasant feeling word, with "Make it a task for today".');
    expect(text(ask('what lifts me', {...showcaseAll(), energy: emptyEnergy()}))).toMatch(/^Your list of what lifts you is empty\./);
  });
  test('the low-day page: where it is, never its words; the help lines', () => {
    const r = text(ask('where is my plan for a low day'));
    expect(r).toContain('Health → Meditation'); expect(r).toContain('113'); expect(r).toContain('findahelpline.com');
  });
  test('to bring up: counted, not quoted; where the list is without the source', () => {
    let rec = addBringUp(addBringUp(emptyBringUp(), {text: 'Ask about the headaches', from: 'typed'}, 'bu-0001-abcd', AT), {text: 'Sleep', from: 'typed'}, 'bu-0002-abcd', AT);
    rec = tickBringUp(rec, 'bu-0002-abcd', true, AT);
    const r = text(ask('what do I want to bring up at my next appointment', withAk({bringUp: rec})));
    expect(r).toMatch(/^1 line is on your list to bring up/); expect(r).not.toContain('headaches');
    expect(text(ask('what do I want to bring up at my next appointment', withAk({bringUp: undefined})))).toMatch(/^Your list is in Settings/);
    expect(text(ask('what do I want to bring up at my next appointment', withAk({bringUp: emptyBringUp()})))).toMatch(/^Nothing is on your list/);
  });
  test('tonight’s bedtime and time asleep of time in bed, from the nights', () => {
    const nights = Array.from({length: 6}, (_, i) => { const wake = addLocalDays(DAY, -i); return {id: `health_sleep-r6-ans-${wake}`, kind: 'night', start: `${addLocalDays(wake, -1)}T23:00:00.000Z`, end: `${wake}T06:45:00.000Z`, latencyMin: 15, awakeMin: 30, timeZone: 'UTC', source: 'manual', createdAt: AT.toISOString(), updatedAt: AT.toISOString()}; });
    const sleep = {version: 1, nights, goal: {minutes: 450, updatedAt: AT.toISOString()}} as Sleep, s = {...showcaseAll(), health: withHealthGroup(createEmptyHealth(), 'sleep', sleep, false)};
    expect(text(ask('what is my bedtime tonight', s))).toMatch(/^Bed by 11:00\s?PM for your 7 h 30 min before your usual 6:45\s?AM wake, with your usual 15 min to fall asleep\./);
    expect(text(ask('wat is mijn bedtijd vanavond', s))).toMatch(/^Naar bed om 23:00 /);
    expect(text(ask('what is my sleep efficiency', s))).toBe('Over the last 7 days (6 nights): asleep 7 h 00 min of 7 h 45 min in bed a night on average (90 %).');
    expect(text(ask('what is my bedtime tonight', {...showcaseAll(), health: createEmptyHealth()}))).toMatch(/needs your own sleep goal/);
  });
  test('portions: counted today, the aim, never off track', () => {
    let f = setAim(setBuiltIn(setBuiltIn(emptyFoodPlus(), 'veg', true), 'fish', true), 'veg', {n: 5, per: 'day'});
    f = countPortion(countPortion(f, 'veg', DAY, 1), 'veg', DAY, 1);
    const s = {...showcaseAll(), foodPlus: f};
    expect(text(ask('how many portions of vegetables did I have today', s))).toBe('Portions counted: vegetables 2 today, your aim 5 a day.');
    expect(text(ask('how many portions have I counted today', s))).toBe('Portions counted: vegetables 2 today, your aim 5 a day and fish 0 today.');
    expect(text(ask('hoeveel porties groente heb ik vandaag gehad', s))).toBe('Getelde porties: groente 2 vandaag, je doel 5 per dag.');
    expect(text(ask('how many portions of fruit did I have today', s))).toMatch(/^Fruit is not counted\./);
    expect(text(ask('how many portions have I counted today', {...showcaseAll(), foodPlus: emptyFoodPlus()}))).toMatch(/^No portion counter is on\./);
  });
  test('favourite exercises, light weeks, the days of the bests, the defaults', () => {
    const lift = (id: string, date: string, kgs: number) => ({id, name: `Fictional legs ${id}`, date, type: 'strength', startedAt: `${date}T17:00:00.000Z`, endedAt: `${date}T18:00:00.000Z`, exercises: [{id: `${id}-e`, exerciseId: 'squat', name: 'Squat', measure: 'weight-reps', sets: [{id: `${id}-s`, kind: 'normal', reps: 5, weightKg: kgs, done: true}]}]});
    let w = workoutsSchema.parse({...emptyWorkouts(), workouts: [lift('a', '2026-11-02', 100), lift('b', '2026-11-09', 110)]});
    w = setExerciseDefaults(setLight(setFavouriteExercise(w, 'squat', true), 'b', true), 'plank', {sets: 3, seconds: 45});
    const s = withAk({workouts: w});
    expect(text(ask('which exercises are my favourites', s))).toBe('Your favourite exercises: Squat. They come first when you add an exercise.');
    expect(text(ask('which workouts are light weeks', s))).toMatch(/^Light weeks, left out of your bests: Fictional legs b \(/);
    expect(text(ask('when did I set my personal bests', s))).toMatch(/^Your heaviest sets and their days: Squat 100 kg \(/);
    expect(text(ask('what are my exercise defaults', s))).toBe('Your exercises\' own defaults: Plank 3 × 45 s. They fill an exercise added with no earlier sets; your last sets still win.');
    expect(text(ask('which exercises are my favourites', withAk({workouts: emptyWorkouts()})))).toMatch(/^No favourite exercises yet\./);
  });
});

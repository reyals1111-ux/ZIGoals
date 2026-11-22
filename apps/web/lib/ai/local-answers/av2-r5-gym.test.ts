import {describe, expect, test} from 'vitest';
import {HEALTH_CLOSED} from '../tools/format';
import {DAY, freshAll, showcaseAll, zigiEnv} from '../evals/as/harness';
import {AV2_R5_GYM} from '../evals/as/cases-av2-r5-gym';
import {av2R5GymAnswer} from './av2-r5-gym';
import type {LocalReply} from './engine';
import type {ToolSources} from '../tools/env';
import {addLocalDays} from '../../local-date';
import {createEmptyHealth, saveActivity} from '../../health';
import {emptyPlanned} from '../../workouts/planned';
import {clearStatus, setStatus} from '../../workouts/status';
import {setKeepWeights} from '../../workouts/keep-weights';
import {setStar} from '../../workouts/journal';
import {showcaseWorkouts} from '../../workouts/showcase';
import {emptyWorkouts, workoutsSchema} from '../../workouts/schema';

/**
 * Session AV lane 2, round 5 (gym): the on-device answers of lib/ai/local-answers/av2-r5-gym.ts, on the Showcase and on a
 * fresh profile, in English and Dutch, behind Health's gate, reading the features' own figures.
 */
const text = (r: LocalReply | null) => r && 'text' in r ? r.text : '';
const ask = (q: string, s: ToolSources = showcaseAll(), health = true) => av2R5GymAnswer(q, zigiEnv(s, health));
const withAk = (more: Record<string, unknown>, base: ToolSources = showcaseAll()): ToolSources => ({...base, ak: {...base.ak, ...more} as typeof base.ak});
const AT = `${DAY}T08:00:00.000Z`;

describe('every corpus phrasing is answered, in its own language', () => {
  for (const c of AV2_R5_GYM) for (const [lang, qs] of [['en', c.en], ['nl', c.nl]] as const) for (const q of qs) test(`${c.id} (${lang}): ${q}`, () => {
    for (const s of [showcaseAll(), freshAll()]) {
      const r = ask(q, s);
      expect(r?.kind, q).toBe('answer');
      for (const n of c.never ?? []) expect(text(r).toLowerCase()).not.toContain(n.toLowerCase());
    }
    if (lang === 'nl') expect(text(ask(q))).not.toMatch(/\b(?:the|your|today|this week)\b/);
  });
  test('Health closed: the Health refusal, never the data', () => {
    for (const c of AV2_R5_GYM) { const r = ask(c.en[0]!, showcaseAll(), false); expect(r?.kind, c.id).toBe('refusal'); expect(text(r)).toBe(HEALTH_CLOSED); }
  });
  test('a question with an action in it is left alone, and other questions are not claimed', () => {
    expect(ask('what is my workout status and log a workout')).toBeNull();
    expect(ask('what is my weight')).toBeNull();
    expect(ask('how many workouts this month')).toBeNull();
  });
});

describe('the answers read the features’ own figures', () => {
  test('the status: open, ended, none', () => {
    const open = setStatus(emptyPlanned(), {kind: 'injured', from: addLocalDays(DAY, -3), today: DAY, id: 'st-1', now: AT});
    expect(text(ask('what is my workout status', withAk({plannedWorkouts: open})))).toMatch(/^Injured since .+\. Until you clear it/);
    expect(text(ask('wat is mijn trainingsstatus', withAk({plannedWorkouts: open})))).toMatch(/^Geblesseerd sinds /);
    expect(text(ask('what is my workout status', withAk({plannedWorkouts: clearStatus(open, DAY)})))).toContain('back after a break');
    expect(text(ask('what is my workout status', withAk({plannedWorkouts: emptyPlanned()})))).toMatch(/^No status is set\./);
  });
  test('the movement band: this week’s minutes, workouts and other movement', () => {
    let health = createEmptyHealth();
    health = saveActivity(health, {id: 'health_garden-r5-0001', date: DAY, name: 'Gardening', steps: 0, minutes: 40}, AT);
    health = saveActivity(health, {id: 'health_garden-r5-0002', date: DAY, name: 'Huishouden', steps: 0, minutes: 20}, AT);
    const s = withAk({workouts: emptyWorkouts(), plannedWorkouts: null}, {...showcaseAll(), health});
    expect(text(ask('how much have I moved this week', s))).toMatch(/^This week so far: 60 min \(0 min of workouts, 60 min of other movement\)\./);
    expect(text(ask('hoeveel heb ik deze week bewogen', s))).toMatch(/^Deze week tot nu toe: 60 min/);
    expect(text(ask('how much everyday movement did I do this week', s))).toBe('Everyday movement this week: 60 min (gardening 40 min and housework 20 min). It counts with your active minutes; ZIGoals shows no energy figure for it.');
    expect(text(ask('hoeveel dagelijkse beweging heb ik deze week gedaan', s))).toContain('tuinieren 40 min');
  });
  test('favourites and the routines that keep their weights', () => {
    const w = showcaseWorkouts(DAY);
    expect(text(ask('which workouts are my favourites', withAk({workouts: w})))).toMatch(/^Your favourite workouts: Leg day \(/);
    expect(text(ask('which workouts are my favourites', withAk({workouts: setStar(w, w.workouts.find(x => x.star)!.id, false)})))).toMatch(/^No favourite workouts yet\./);
    expect(text(ask('which routines keep my last weights', withAk({workouts: w})))).toMatch(/^Leg day keeps its last weights/);
    expect(text(ask('which routines keep my last weights', withAk({workouts: setKeepWeights(w, 'showcase-routine-legs', false)})))).toMatch(/^None of your routines/);
  });
  test('plates on one side: the kept set-up is named', () => {
    const w = workoutsSchema.parse({...emptyWorkouts(), plates: {unit: 'kg', bar: 20, plates: [{size: 20, pairs: 2}], oneSide: true, start: 40}});
    expect(text(ask('how do I count plates on one side', withAk({workouts: w})))).toContain('loaded on one side now, with the machine’s own 40 kg');
  });
});

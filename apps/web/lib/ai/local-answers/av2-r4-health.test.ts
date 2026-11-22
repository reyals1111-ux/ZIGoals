import {describe, expect, test} from 'vitest';
import {HEALTH_CLOSED} from '../tools/format';
import {freshAll, showcaseAll, zigiEnv} from '../evals/as/harness';
import {AV2_R4_HEALTH} from '../evals/as/cases-av2-r4-health';
import {av2R4HealthAnswer} from './av2-r4-health';
import type {LocalReply} from './engine';
import type {ToolSources} from '../tools/env';
import {wiredR4} from './av2-r4-health-fixture';
import {DAY} from '../evals/as/harness';
import {addLocalDays} from '../../local-date';
import {emptyPlanned, planWorkout} from '../../workouts/planned';
import {emptyRaces, saveRace} from '../../workouts/races';
import {emptyWorkouts, type Workouts} from '../../workouts/schema';

/**
 * Session AV lane 2, round 4 (health): the on-device answers of lib/ai/local-answers/av2-r4-health.ts, on the Showcase
 * and on a fresh profile, in English and Dutch, Health's behind its gate. Every corpus phrasing is answered; with this
 * round's records in the AK sources (the lead's registry step) the answers read them.
 */
const text = (r: LocalReply | null) => r && 'text' in r ? r.text : '';
const ask = (q: string, s: ToolSources = showcaseAll(), health = true) => av2R4HealthAnswer(q, zigiEnv(s, health));

describe('every corpus phrasing is answered, in its own language', () => {
  for (const c of AV2_R4_HEALTH) for (const [lang, qs] of [['en', c.en], ['nl', c.nl]] as const) for (const q of qs) test(`${c.id} (${lang}): ${q}`, () => {
    for (const s of [showcaseAll(), wiredR4(), freshAll()]) {
      const r = ask(q, s);
      expect(r?.kind, q).toBe('answer');
      for (const n of c.never ?? []) expect(text(r).toLowerCase()).not.toContain(n.toLowerCase());
    }
    if (lang === 'nl') expect(text(ask(q, wiredR4()))).not.toMatch(/\b(?:the|your|today)\b/);
  });
  test('Health closed: the Health refusal, never the data', () => {
    for (const c of AV2_R4_HEALTH.filter(x => x.pillar === 'health')) { const r = ask(c.en[0]!, wiredR4(), false); expect(r?.kind, c.id).toBe('refusal'); expect(text(r)).toBe(HEALTH_CLOSED); }
  });
  test('a question with an action in it is left alone, and other questions are not claimed', () => {
    expect(ask('does caffeine go with my sleep and log a coffee')).toBeNull();
    expect(ask('how much water did I drink today')).toBeNull();
    expect(ask('what is my weight')).toBeNull();
  });
});

describe('the answers read the features’ own figures', () => {
  test('caffeine above the usual day beside the night, as Compare says it', () => {
    expect(text(ask('does caffeine go with my sleep', wiredR4()))).toContain('On days with over 60 mg of caffeine logged, you slept 6 h that night on average; on other days, 8 h.');
    expect(text(ask('do I sleep differently after late coffee', wiredR4()))).toContain('On days with caffeine logged after 14:00');
    expect(text(ask('hoe slaap ik na cafeïne', wiredR4()))).toContain('nooit een oorzaak');
  });
  test('planned workouts: still to do this week and next, and the ones missed this week', () => {
    const at = `${DAY}T08:00:00.000Z`;
    let rec = emptyPlanned();
    for (const [i, d] of [[0, {kind: 'routine' as const, refId: 'tpl', name: 'Fictional upper body', date: addLocalDays(DAY, 1), time: '07:30'}], [1, {kind: 'run' as const, name: '', distanceKm: '5', effort: 'easy' as const, date: addLocalDays(DAY, 3), time: ''}], [2, {kind: 'other' as const, name: 'Fictional swim', date: addLocalDays(DAY, -1), time: ''}]] as const) {
      const out = planWorkout(rec, d, `plan-${i}`, at); if (!out.ok) throw new Error(out.issue.message); rec = out.value;
    }
    const t = text(ask('which workouts are planned this week', wiredR4({plannedWorkouts: rec, workouts: null})));
    expect(t).toContain('Fictional upper body');
    expect(t).toContain('Easy 5 km run');
    expect(t).toContain('7:30 AM');
    const nl = text(ask('welke workouts staan er gepland', wiredR4({plannedWorkouts: rec, workouts: null})));
    expect(nl).toContain('Gepland:');
    expect(text(ask('which workouts are planned this week', wiredR4({plannedWorkouts: emptyPlanned()})))).toContain('Nothing is planned');
  });
  test('the weight band and the free day, from their own records', () => {
    const band = {version: 1 as const, goals: [], weightBand: {lowGrams: 70_000, highGrams: 73_000, createdAt: `${DAY}T08:00:00.000Z`}};
    expect(text(ask('how is my weight band', wiredR4({healthGoalsMore: band})))).toMatch(/^Your band is 70(\.0)? kg–73(\.0)? kg\./);
    expect(text(ask('how is my weight band', wiredR4({healthGoalsMore: {version: 1, goals: []}})))).toContain('No weight band is set.');
    const s = wiredR4({calorieWeek: {version: 1, freeDay: {date: addLocalDays(DAY, 4), extraKcal: 600, plannedOn: DAY}}});
    const withTarget = {...s, health: {...s.health, targets: {...s.health.targets, kcal: 2000}}};
    expect(text(ask('when is my free day', withTarget))).toContain('600 kcal more, taken evenly from');
    expect(text(ask('wanneer is mijn vrije dag', withTarget))).toContain('Het weektotaal blijft gelijk.');
  });
  test('heart-rate zones from the typed maximum, and races with the weeks to them and a result', () => {
    const run = (id: string, date: string, km: number, seconds: number) => ({id, name: 'Fictional run', date, type: 'cardio', startedAt: `${date}T09:00:00.000Z`, endedAt: new Date(Date.parse(`${date}T09:00:00.000Z`) + seconds * 1000).toISOString(), exercises: [{id: `e-${id}`, exerciseId: 'running', name: 'Running', measure: 'distance-time', sets: [{id: `s-${id}`, kind: 'normal', distanceKm: km, seconds, done: true}]}]});
    const workouts = {...emptyWorkouts(), workouts: [run('r1', addLocalDays(DAY, -3), 5, 1500)]} as unknown as Workouts;
    const hr = {version: 1 as const, maxHr: 190, runs: {r1: {from: 120, seconds: [600, ...Array(19).fill(0), 300]}}};
    const t = text(ask('what were my heart rate zones on my last run', wiredR4({workoutHr: hr, workouts})));
    expect(t).toContain('zone 2 10 min'); expect(t).toContain('zone 3 5 min'); expect(t).toContain('190 bpm you typed');
    expect(text(ask('what were my heart rate zones on my last run', wiredR4({workoutHr: {version: 1, runs: {}}, workouts})))).toContain('never works it out from your age');
    let races = emptyRaces();
    for (const [i, d] of [{name: 'Fictional parkrun', date: addLocalDays(DAY, -3), distanceKm: '5', goal: '26:00', priority: 'b' as const}, {name: 'Fictional half', date: addLocalDays(DAY, 21), distanceKm: '21.0975', goal: '1:55:00', priority: 'main' as const}].entries()) { const out = saveRace(races, d, `race-${i}`, `${DAY}T08:00:00.000Z`); if (!out.ok) throw new Error(out.issue.message); races = out.value; }
    const r = text(ask('what races do I have coming up', wiredR4({races, workouts})));
    expect(r).toContain('Fictional half (main, Half marathon');
    expect(r).toContain('in 3 weeks');
    expect(r).toContain('Last: Fictional parkrun, 25:00, 1:00 under your goal.');
    expect(text(ask('wanneer is mijn volgende wedstrijd', wiredR4({races, workouts})))).toContain('over 3 weken');
  });
});

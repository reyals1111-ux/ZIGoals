import {describe, expect, test} from 'vitest';
import {HEALTH_CLOSED} from '../tools/format';
import {DAY, freshAll, showcaseAll, zigiEnv} from '../evals/as/harness';
import {AV2_R5_BODY} from '../evals/as/cases-av2-r5-body';
import {av2R5BodyAnswer} from './av2-r5-body';
import type {LocalReply} from './engine';
import type {ToolSources} from '../tools/env';
import {addLocalDays} from '../../local-date';
import {setCycleDay, setCycleOn} from '../../cycle/engine';
import {emptyCycle, type Cycle} from '../../cycle/store';
import {setLeftOut} from '../../cycle/history';
import {addOwnWord, setCycleChoice} from '../../cycle/words';
import {createEmptyHealth, quickLogFood, type HealthData} from '../../health';
import {withHealthGroup} from '../../vault/w-homes';
import type {Sleep} from '../../sleep/schema';

/**
 * Session AV lane 2 (r5-body): the on-device answers of lib/ai/local-answers/av2-r5-body.ts, on the Showcase and on a
 * fresh profile, in English and Dutch, Health's behind its gate and the cycle log behind its own switch. A look back only
 * for the cycle; Compare's own result for the late meal; never a cause, a phase or a forecast.
 */
const text = (r: LocalReply | null) => r && 'text' in r ? r.text : '';
const ask = (q: string, s: ToolSources = showcaseAll(), health = true) => av2R5BodyAnswer(q, zigiEnv(s, health));
/** Periods starting 28, 32, 28, 28 days apart, ending on the Showcase's day, an own word on one day. */
function cycle(): Cycle {
  let rec = setCycleOn(emptyCycle(), true);
  const starts = [-116, -88, -56, -28, 0].map(n => addLocalDays(DAY, n));
  for (const s of starts) for (let i = 0; i < 5; i++) if (addLocalDays(s, i) <= DAY) rec = setCycleDay(rec, addLocalDays(s, i), {flow: i ? 'light' : 'heavy', ...(i === 0 ? {symptoms: ['cramps']} : {})}, DAY);
  const own = addOwnWord(rec, 'Migraine'); if (!own.ok) throw new Error(own.message);
  return setCycleDay(own.value, addLocalDays(DAY, -27), {symptoms: ['migraine', 'slept-badly']}, DAY);
}
const withCycle = (rec: Cycle | null, s: ToolSources = showcaseAll()): ToolSources => ({...s, nova: {...s.nova, cycle: rec} as ToolSources['nova']});
function lateWorld(): ToolSources {
  let h: HealthData = createEmptyHealth();
  const nights: Sleep['nights'] = [], AT = `${DAY}T08:00:00.000Z`;
  for (let i = 0; i < 40; i++) {
    const day = addLocalDays(DAY, -40 + i), even = i % 2 === 0, n = String(i).padStart(4, '0');
    h = quickLogFood(h, {foodId: `health_food-${n}`, logId: `health_logs-${n}`, name: 'Fictional dinner', servingGrams: 300, nutrients: {kcal: 600, proteinMg: null, carbsMg: null, fatMg: null}, date: day, meal: 'Dinner'}, `${day}T${even ? '21:30' : '18:00'}:00.000Z`);
    nights.push({id: `health_sleep-fictional-${day}`, kind: 'night', source: 'manual', start: `${day}T23:00:00.000Z`, end: `${addLocalDays(day, 1)}T${even ? '05' : '07'}:00:00.000Z`, timeZone: 'UTC', createdAt: AT, updatedAt: AT});
  }
  return {...showcaseAll(), health: withHealthGroup(h, 'sleep', {version: 1, nights} as Sleep, false), foodPlus: null} as ToolSources;
}
const unquoted = (t: string) => t.replace(/“[^”]*”/g, '').replace(/Health → [^.;:]*/g, '').replace(/Settings → [^.;:]*/g, '');

describe('every corpus phrasing is answered, in its own language', () => {
  for (const c of AV2_R5_BODY) for (const [lang, qs] of [['en', c.en], ['nl', c.nl]] as const) for (const q of qs) test(`${c.id} (${lang}): ${q}`, () => {
    for (const s of [showcaseAll(), withCycle(cycle()), freshAll(), lateWorld()]) {
      const r = ask(q, s);
      expect(r?.kind, q).toBe('answer');
      for (const n of c.never ?? []) expect(text(r).toLowerCase(), q).not.toContain(n.toLowerCase());
    }
    if (lang === 'nl') expect(unquoted(text(ask(q, withCycle(cycle()))))).not.toMatch(/\b(?:the|your|today)\b/);
  });
  test('Health closed: the Health refusal, never the data', () => {
    for (const c of AV2_R5_BODY.filter(x => x.pillar === 'health')) { const r = ask(c.en[0]!, withCycle(cycle()), false); expect(r?.kind, c.id).toBe('refusal'); expect(text(r)).toBe(HEALTH_CLOSED); }
  });
  test('a question with an action in it is left alone, and other questions are not claimed', () => {
    expect(ask('what is my average cycle length and log a period day')).toBeNull();
    expect(ask('when is my next period', withCycle(cycle()))).toBeNull();
    expect(ask('what day of my cycle is it today', withCycle(cycle()))).toBeNull();
    expect(ask('how did I sleep last night')).toBeNull();
    expect(ask('does caffeine go with my sleep')).toBeNull();
  });
});

describe('the answers read the features’ own figures', () => {
  test('your cycles: the averages, their spread and a cycle left out', () => {
    const t = text(ask('what is my average cycle length', withCycle(cycle())));
    expect(t).toContain('Your average cycle is 29 days (28 days to 32 days, so they vary by 4 days), from 4 cycles.');
    expect(t).toContain('Your average period is 5 days');
    expect(t).toContain('not a forecast');
    const out = text(ask('what is my average cycle length', withCycle(setLeftOut(cycle(), addLocalDays(DAY, -88), true))));
    expect(out).toContain('Your average cycle is 28 days (all 28 days), from 3 cycles.');
    expect(out).toContain('1 cycle is left out of the averages, as you chose.');
    expect(text(ask('hoe lang is mijn cyclus gemiddeld', withCycle(cycle())))).toContain('Je gemiddelde cyclus is 29 dagen');
    expect(text(ask('what is my average cycle length', withCycle(setCycleOn(cycle(), false))))).toContain('The cycle log is off');
  });
  test('your words, the choices, a cycle at a glance', () => {
    expect(text(ask('what words do I track in my cycle log', withCycle(cycle())))).toContain('Your own: Migraine.');
    expect(text(ask('welke woorden houd ik bij in mijn cycluslog', withCycle(cycle())))).toContain('Slecht geslapen');
    expect(text(ask('can I track my cycle without a period', withCycle(setCycleChoice(cycle(), 'noPeriod', true))))).toContain('“No period” is on');
    const g = text(ask('what did I log in my last cycle', withCycle(cycle())));
    expect(g).toContain('28 days, a period of 5 days');
    expect(g).toMatch(/Words logged: (?:Cramps \(1 day\), Migraine \(1 day\) and Slept badly \(1 day\)|.*Migraine \(1 day\).*)/);
  });
  test('the late meal: Compare’s own sentence, never a cause', () => {
    const t = text(ask('how do late meals go with my sleep', lateWorld()));
    expect(t).toContain('On days with 300 kcal or more logged in the 3 hours before bed, you slept 6 h that night on average; on other days, 8 h.');
    expect(t).toContain('never a cause');
    expect(text(ask('hoe slaap ik na een late maaltijd', lateWorld()))).toContain('Op dagen met 300 kcal of meer gelogd in de 3 uur voor het slapengaan sliep je die nacht gemiddeld 6 h 00 min');
  });
  test('the part-of-day reminders and the moods on the timeline say where they are', () => {
    expect(text(ask('can I get one reminder for each part of the day'))).toContain('Settings → Notifications');
    expect(text(ask('can I see my moods on the timeline'))).toContain('Day Timeline');
  });
});

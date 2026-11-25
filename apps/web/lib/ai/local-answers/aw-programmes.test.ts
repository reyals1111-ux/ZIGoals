import {describe, expect, test} from 'vitest';
import {HEALTH_CLOSED} from '../tools/format';
import {DAY, freshAll, novaEnv, showcaseAll, zigiEnv} from '../evals/as/harness';
import {localAnswer} from './engine';
import {CORPUS} from '../evals/as/cases';
import {AW_PROGRAMMES} from '../evals/as/cases-aw-programmes';
import {awProgrammesAnswer} from './aw-programmes';
import type {LocalReply} from './engine';
import type {ToolSources} from '../tools/env';
import {emptyGuidedJourneys} from '../../guided/schema';
import {startJourney, tickStep} from '../../guided/engine';
import {addLocalDays} from '../../local-date';

/**
 * Session AW (programmes): the on-device answers of lib/ai/local-answers/aw-programmes.ts, on the Showcase (a labelled
 * programme in progress) and on a fresh profile, in English and Dutch, behind Health's gate for a health programme.
 */
const text = (r: LocalReply | null) => r && 'text' in r ? r.text : '';
const withGuided = (guidedJourneys: unknown, base: ToolSources = showcaseAll()): ToolSources => ({...base, ak: {...base.ak, guidedJourneys} as typeof base.ak});
const ask = (q: string, s: ToolSources = showcaseAll(), health = true) => awProgrammesAnswer(q, zigiEnv(s, health));

describe('every corpus phrasing is answered, in its own language', () => {
  for (const c of AW_PROGRAMMES) for (const [lang, qs] of [['en', c.en], ['nl', c.nl]] as const) for (const q of qs) test(`${c.id} (${lang}): ${q}`, () => {
    for (const s of [showcaseAll(), freshAll()]) {
      const r = ask(q, s);
      expect(r?.kind, q).toBe('answer');
      for (const n of c.never ?? []) expect(text(r).toLowerCase()).not.toContain(n.toLowerCase());
    }
    if (lang === 'nl') expect(text(ask(q))).not.toMatch(/\b(?:You are|Today is|your)\b/);
  });
  test('Health closed: a health programme is not named, the Health refusal instead', () => {
    const r = ask('which programme am I on', showcaseAll(), false);
    expect(r?.kind).toBe('refusal');
    expect(text(r)).toBe(HEALTH_CLOSED);
  });
  test('a question with an action in it, and nearby questions, are left alone', () => {
    expect(ask('which programme am I on and add a task')).toBeNull();
    expect(ask('how many steps did I walk today')).toBeNull();
    expect(ask('how many steps today')).toBeNull();
    expect(ask("what's my plan for today")).toBeNull();
    expect(ask('what is on my journey page today')).toBeNull();
    expect(ask("what's today's step", freshAll())).toBeNull();
  });
});

describe('through the engine, for ZIGi and NOVA', () => {
  test('each phrasing reaches this answer (no earlier layer claims it)', () => {
    for (const c of AW_PROGRAMMES) for (const q of [...c.en, ...c.nl]) for (const env of [zigiEnv(showcaseAll()), novaEnv(showcaseAll())]) {
      const r = localAnswer(q, env);
      expect(r.kind, q).toBe('answer');
      expect(text(r), q).toMatch(/0 to 5 km in 8 weeks/);
    }
  });
});

describe('claims none of the other corpus questions', () => {
  test('every other intent of the corpus', () => {
    const own = new Set(AW_PROGRAMMES.map(i => i.id)), env = zigiEnv(showcaseAll());
    for (const intent of CORPUS.filter(i => !own.has(i.id))) for (const q of [...intent.en, ...intent.nl]) expect(awProgrammesAnswer(q, env), `${intent.id}: ${q}`).toBeNull();
  }, 120_000);
});

describe('the answers read the person’s own record', () => {
  test('the Showcase: run 4 today, week 2, labelled', () => {
    expect(text(ask('which programme am I on'))).toBe('You are on “0 to 5 km in 8 weeks” (Showcase) (week 2 of 8, 3 of 24 runs done). Today is run 4: Run 90 seconds, walk 2 minutes: 6 times. 1 of 4 steps ticked; next: Run 90 seconds, walk 2 minutes: 6 times. You tick each step yourself in Guided journeys.');
    expect(text(ask('wat staat er vandaag in mijn programma'))).toBe('Je volgt “0 to 5 km in 8 weeks” (Showcase) (week 2 van 8, 3 van 24 runs gedaan). Vandaag is run 4: Run 90 seconds, walk 2 minutes: 6 times. 1 van 4 stappen afgevinkt; hierna: Run 90 seconds, walk 2 minutes: 6 times. Je vinkt elke stap zelf af in Guided journeys.');
    expect(text(ask("what's today's step"))).toContain('Today is run 4');
  });
  test('a rest day says when the next session opens', () => {
    const r = startJourney(emptyGuidedJourneys(), 'strength-start', addLocalDays(DAY, -1));
    expect(text(ask('which programme am I on', withGuided(r)))).toBe('You are on “Beginner strength in 4 weeks” (week 1 of 4, 0 of 12 sessions done). Today is a rest day; session 2 opens tomorrow. You tick each step yourself in Guided journeys.');
    expect(text(ask('welk programma volg ik', withGuided(r)))).toContain('Vandaag is een rustdag; sessie 2 opent morgen.');
  });
  test('several at once, a short journey among them', () => {
    let r = startJourney(emptyGuidedJourneys(), 'habit-start', DAY);
    r = tickStep(r, 'habit-start', 'd1', 'choose', DAY);
    r = startJourney(r, 'trip', DAY);
    const t = text(ask('which programme am I on', withGuided(r)));
    expect(t).toMatch(/^You are on 2: “A 14-day habit starter” \(0 of 14 days done\)\. Today is day 1: Choose one small habit\. 1 of 2 steps ticked; next: Add it to Habits\. “Save for a trip” \(step 1 of 6, 0 done\)\. Today’s step: /);
  });
  test('none going: the five programmes named, nothing recommended', () => {
    const t = text(ask('which programme am I on', withGuided(emptyGuidedJourneys())));
    expect(t).toMatch(/^You are not on a programme or a journey\. Guided journeys has five written programmes, /);
    expect(t).toContain('“0 to 5 km in 8 weeks”');
    expect(text(ask('wat staat er vandaag in mijn programma', withGuided(emptyGuidedJourneys())))).toMatch(/^Je volgt geen programma of traject, dus er is vandaag geen stap\./);
    expect(text(ask('which programme am I on', withGuided({version: 2})))).toMatch(/^You are not on a programme/);
  });
});

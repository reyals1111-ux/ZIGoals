import {describe, expect, test} from 'vitest';
import {HEALTH_CLOSED} from '../tools/format';
import {freshAll, showcaseAll, zigiEnv} from '../evals/as/harness';
import {AV2_BODY} from '../evals/as/cases-av2-body';
import {av2BodyAnswer} from './av2-body';
import type {LocalReply} from './engine';

/**
 * Session AV lane 2 (body): the on-device answers of lib/ai/local-answers/av2-body.ts, on the Showcase (17 Nov 2026) and
 * on a fresh profile, in English and Dutch, and under the Health switch. Every corpus phrasing gets an answer here.
 */
const text = (r: LocalReply | null) => r && 'text' in r ? r.text : '';
const ask = (q: string, s = showcaseAll(), health = true) => av2BodyAnswer(q, zigiEnv(s, health));

describe('every corpus phrasing is answered, in its own language', () => {
  for (const c of AV2_BODY) for (const [lang, qs] of [['en', c.en], ['nl', c.nl]] as const) for (const q of qs) test(`${c.id} (${lang}): ${q}`, () => {
    const r = ask(q);
    expect(r?.kind, q).toBe('answer');
    for (const n of c.never ?? []) expect(text(r)).not.toContain(n);
  });
  test('Health closed: the Health refusal, never the data', () => {
    for (const c of AV2_BODY) { const r = ask(c.en[0]!, showcaseAll(), false); expect(r?.kind, c.id).toBe('refusal'); expect(text(r)).toBe(HEALTH_CLOSED); }
  });
});

describe('the exercise library (LEDGER #116, #119)', () => {
  test('how to do a squat: its muscles, three steps, the tip and the Showcase\'s pinned note, in English and Dutch', () => {
    const en = text(ask('how do I do a squat')), nl = text(ask('hoe doe ik een squat'));
    expect(en).toContain('Squat (works most: Quads (front thigh) · Glutes');
    expect(en).toContain('1. Bar on your upper back');
    expect(en).toContain('Your pinned note: “Example · safety bars at hole 6”');
    expect(nl).toContain('werkt vooral op: Voorkant bovenbeen · Bilspieren');
    expect(nl).toContain('Je vastgezette notitie');
    // "front squat" is its own exercise, never the squat.
    expect(text(ask('how do I do a front squat'))).toContain('Front squat (');
  });
  test('muscles and exercises for a muscle', () => {
    expect(text(ask('what muscles does the deadlift work'))).toContain('Deadlift works most: Glutes · Hamstrings (back thigh) · Lower back');
    expect(text(ask('welke spieren traint de deadlift'))).toContain('Deadlift werkt vooral op: Bilspieren');
    expect(text(ask('which exercises work my glutes'))).toContain('Hip thrust');
  });
  test('pinned notes: the Showcase\'s one; a fresh profile is told where to pin one', () => {
    expect(text(ask('what are my pinned notes'))).toContain('Squat: “Example · safety bars at hole 6”');
    expect(text(ask('wat zijn mijn vastgezette notities', freshAll()))).toContain('Er is nog geen notitie');
  });
  test('a question with an action in it, or not about exercises, is left alone', () => {
    expect(ask('how do I do a squat and log one more glass')).toBeNull();
    expect(ask('how do I do my taxes')).toBeNull();
  });
});

describe('progression (LEDGER #109)', () => {
  test('the Showcase\'s Push day: one more rep at 62.5 kg, in English and Dutch', () => {
    expect(text(ask('what is my next target for bench press'))).toContain('• Push day (6–10 reps, then +2.5 kg), Bench press: 62.5 kg × 9/9/8: one more rep than on Mon, Nov 16');
    expect(text(ask('wat is mijn volgende doel voor bankdrukken'))).toContain('62.5 kg × 9/9/8: één herhaling meer dan op ma 16 nov');
    expect(text(ask('what is my next target for the squat', freshAll()))).toContain('No routine has a progression rule yet');
  });
});

describe('routines (LEDGER #112, #115, #119)', () => {
  test('own routines by folder, with the Showcase\'s labelled note', () => {
    const en = text(ask('what routines do I have'));
    expect(en).toContain('2 routines:');
    expect(en).toContain('• Gym: Push day (note: Example · 90 s rest between sets), Leg day');
    expect(text(ask('welke routines heb ik', freshAll()))).toContain('Er is nog geen routine opgeslagen');
  });
  test('the ready-made library, filtered for at home', () => {
    expect(text(ask('which ready-made routines are there'))).toContain('Full body A (Gym, about 45 min)');
    const home = text(ask('stel een routine voor thuis voor'));
    expect(home).toContain('Lichaamsgewicht thuis');
    expect(home).not.toContain('Duwdag');
  });
});

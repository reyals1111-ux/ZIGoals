import {describe, expect, test} from 'vitest';
import {CALM_VISUALS, NO_CALM, readCalm, shiftPosition, withCalm} from './visuals';
import {minutesMoved, moveStep, pauseMove, resumeMove, startMove, stepLeft, STRETCH_PREFIX, stretchMinutes, STRETCHES, tickMove} from './stretches';
import {habitExtrasSchema} from '../habits-extras/schema';
import {HABIT_EXTRAS_KEY} from '../aa-device-keys';
import {forgetAaDeviceRecords} from '../aa-device-forget';
import {DEVICE_PARTS} from '../restore/plan';
import {exportRecordSections, restoreRecordSection, sectionOf} from '../vault/backup-records';
import {showcaseAll, zigiEnv} from '../ai/evals/as/harness';
import {av2HabitsAnswer} from '../ai/local-answers/av2-habits';
import type {ToolSources} from '../ai/tools/env';

/** Session AV lane 2 (habits; LEDGER #79, #80, #81): calm visuals behind a sitting, and Move gently. */
describe('calm visuals', () => {
  test('choose, read, clear; other fields and later fields of calm kept; odd values ignored', () => {
    const base = habitExtrasSchema.parse({version: 1, bells: {h: true}, calm: {later: 1}});
    const c = withCalm(withCalm(base, {visual: 'shift'}), {pace: 'slower'});
    expect(readCalm(c)).toEqual({visual: 'shift', pace: 'slower'});
    expect((c as {calm: Record<string, unknown>}).calm.later).toBe(1);
    expect((c as {bells: unknown}).bells).toEqual({h: true});
    expect(habitExtrasSchema.parse(JSON.parse(JSON.stringify(c)))).toEqual(c);
    expect(readCalm(withCalm(c, {visual: 'sea'}))).toEqual({visual: 'sea', pace: 'slower'});
    expect(readCalm(withCalm(c, {visual: null})).visual).toBeNull();
    expect(withCalm({version: 1}, {visual: null})).toEqual({version: 1});
    expect(readCalm({calm: {visual: 'disco', pace: 'fast'}})).toEqual(NO_CALM);
    expect(readCalm(null)).toEqual(NO_CALM);
    expect(() => withCalm(base, {visual: 'disco' as never})).toThrow();
    expect(CALM_VISUALS).toEqual(['shift', 'dusk', 'sea', 'forest', 'night']);
  });
  test('the light glides smoothly from left to right and back, never jumping', () => {
    expect(shiftPosition(0, 'slow')).toBeCloseTo(-1);
    expect(shiftPosition(3000, 'slow')).toBeCloseTo(1);
    expect(shiftPosition(6000, 'slow')).toBeCloseTo(-1);
    expect(shiftPosition(1500, 'steady')).toBeCloseTo(1);
    expect(shiftPosition(5000, 'slower')).toBeCloseTo(1);
    for (let ms = 0; ms < 12_000; ms += 50) expect(Math.abs(shiftPosition(ms + 50, 'steady') - shiftPosition(ms, 'steady'))).toBeLessThan(0.11);
  });
  test('export → erase → restore keeps the choice', () => {
    const m = new Map<string, string>();
    const storage = {get length() { return m.size; }, key: (i: number) => [...m.keys()][i] ?? null, getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => { m.set(k, v); }, removeItem: (k: string) => { m.delete(k); }, clear: () => m.clear()} as Storage;
    const extras = withCalm({version: 1}, {visual: 'shift', pace: 'steady'});
    storage.setItem(HABIT_EXTRAS_KEY, JSON.stringify(extras));
    const {sections} = exportRecordSections(storage, {health: false});
    forgetAaDeviceRecords(storage);
    expect(m.has(HABIT_EXTRAS_KEY)).toBe(false);
    const section = sectionOf(DEVICE_PARTS.find(p => p.key === HABIT_EXTRAS_KEY)!)!;
    restoreRecordSection(storage, section, sections[section]!);
    expect(readCalm(JSON.parse(m.get(HABIT_EXTRAS_KEY)!))).toEqual({visual: 'shift', pace: 'steady'});
  });
});

describe('Move gently', () => {
  test('five sequences, each with Dutch twins, short steps and no calorie or treatment words', () => {
    expect(STRETCHES).toHaveLength(5);
    for (const q of STRETCHES) {
      expect(q.nl).not.toBe(q.en);
      expect(stretchMinutes(q)).toBeGreaterThanOrEqual(3);
      expect(stretchMinutes(q)).toBeLessThanOrEqual(6);
      for (const st of q.steps) {
        expect(st.nl.name).not.toBe(st.en.name);
        expect(st.seconds).toBeGreaterThanOrEqual(30);
        for (const t of [st.en.cue, st.nl.cue, st.en.name]) expect(t).not.toMatch(/calor|kcal|burn|cure|treat|therap|genees|behandel/i);
      }
    }
  });
  test('steps move on by time, Next and Back keep the time spent, a pause stops the clock', () => {
    const t0 = Date.parse('2026-11-22T08:00:00Z'), q = STRETCHES[1]!; // desk break: 6 × 30 s
    let r = startMove(q.id, t0);
    expect(stepLeft(r, t0 + 10_000)).toBe(20);
    r = tickMove(r, t0 + 31_000);
    expect(r.step).toBe(1);
    expect(stepLeft(r, t0 + 31_000)).toBe(29);
    r = pauseMove(r, t0 + 40_000);
    r = tickMove(r, t0 + 400_000); // paused: nothing moves
    expect(r.step).toBe(1);
    expect(stepLeft(r, t0 + 400_000)).toBe(20);
    r = resumeMove(r, t0 + 400_000);
    expect(stepLeft(r, t0 + 405_000)).toBe(15);
    r = moveStep(r, t0 + 405_000, 1); // Next: 15 s of step 2 counted
    expect(r.step).toBe(2);
    expect(r.doneMs).toBe(45_000);
    r = moveStep(r, t0 + 410_000, -1);
    expect(r.step).toBe(1);
    expect(r.doneMs).toBe(50_000);
    // A long time in the background moves through the rest and finishes.
    r = tickMove(r, t0 + 2_000_000);
    expect(r.finished).toBe(true);
    expect(minutesMoved(r, t0 + 3_000_000)).toBe(Math.round((50_000 + 5 * 30_000) / 60_000));
    // Under 30 s moved rounds to no minute.
    expect(minutesMoved(startMove(q.id, t0), t0 + 20_000)).toBe(0);
  });
  test('NOVA and ZIGi count the stretch minutes and say the calm visual, in English and Dutch', () => {
    const s = showcaseAll(), today = zigiEnv(s).habitDay;
    const withStretch = (): ToolSources => ({...s, health: {...s.health!, activity: [...s.health!.activity, {id: 'health_stretch-0001', date: today, name: `${STRETCH_PREFIX}Desk break`, steps: 0, minutes: 3, createdAt: '2026-11-01T08:00:00.000Z', updatedAt: '2026-11-01T08:00:00.000Z'}]}});
    const text = (q: string, src: ToolSources) => { const r = av2HabitsAnswer(q, zigiEnv(src)); return r && 'text' in r ? r.text : ''; };
    expect(text('how many minutes did i stretch this week', s)).toContain('No stretch saved in the last 7 days');
    expect(text('how many minutes did i stretch this week', withStretch())).toBe('3 minutes of stretching in the last 7 days, 1 time: Desk break. Saved as activity minutes in Health (no calories).');
    expect(text('hoeveel minuten heb ik deze week gerekt', withStretch())).toMatch(/^3 minuten rekken in de laatste 7 dagen, 1 keer: Desk break\./);
    expect(text('what is my stretch goal', s)).toBe('');
    const calm = (x: unknown): ToolSources => ({...s, ak: {...s.ak, habitExtras: x}});
    expect(text('what visual is behind my meditation', calm({version: 1}))).toContain('No calm visual is set');
    expect(text('what visual is behind my meditation', calm(withCalm({version: 1}, {visual: 'shift', pace: 'slower'})))).toContain('Behind your sitting: Slow left and right, slower (5 s a side).');
    expect(text('welke achtergrond heb ik bij het mediteren', calm(withCalm({version: 1}, {visual: 'sea'})))).toContain('Achter je zitmeditatie: Zee.');
  });
});

import {describe, expect, test} from 'vitest';
import {MAX_TIMERS, TIMERS, activeTimers, addMinute, clockOf, emptyTimers, keptTimers, markRang, parseLength, pauseTimer, removeTimer, resumeTimer, secondsLeft, setBell, bellOn, spokenLength, startTimer, stopTimer, timerState, timersSchema, toRing} from './store';
import {startNamedTimer} from './start';
import {readDeviceRecord} from '../device-record';
import {mayShowStrip} from './open';

/**
 * Session AW (X1, LEDGER #440; Due's named timers; TIER 3 (stored format)): several named countdowns at once, each kept to
 * start again (up to 20), with Pause, +1 min and Stop; the bell rings once per end.
 */
const NOW = Date.UTC(2026, 10, 25, 17, 0);
const memory = () => { const m = new Map<string, string>(); return {getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => { m.set(k, v); }}; };

describe('named timers', () => {
  test('start, several at once, soonest first; the same name and length starts the kept one again', () => {
    let r = startTimer(emptyTimers(), {name: 'Laundry', seconds: 45 * 60}, NOW, 'tm-a').timers;
    r = startTimer(r, {name: 'Pasta', seconds: 9 * 60}, NOW, 'tm-b').timers;
    expect(activeTimers(r, NOW + 1000).map(t => [t.name, secondsLeft(t, NOW + 1000)])).toEqual([['Pasta', 539], ['Laundry', 2699]]);
    r = stopTimer(r, 'tm-b');
    const again = startTimer(r, {name: 'pasta', seconds: 540}, NOW + 60_000, 'tm-c');
    expect(again.timer.id).toBe('tm-b');
    expect(again.timers.timers).toHaveLength(2);
  });
  test('pause, resume, +1 min and stop; an ended timer runs one more minute', () => {
    let r = startTimer(emptyTimers(), {name: 'Tea', seconds: 180}, NOW, 'tm-t').timers;
    r = pauseTimer(r, 'tm-t', NOW + 60_000);
    expect(timerState(r.timers[0]!, NOW + 10 * 60_000)).toBe('paused');
    expect(secondsLeft(r.timers[0]!, NOW + 10 * 60_000)).toBe(120);
    r = addMinute(r, 'tm-t', NOW + 10 * 60_000);
    r = resumeTimer(r, 'tm-t', NOW + 10 * 60_000);
    expect(secondsLeft(r.timers[0]!, NOW + 10 * 60_000)).toBe(180);
    r = addMinute(r, 'tm-t', NOW + 10 * 60_000);
    expect(secondsLeft(r.timers[0]!, NOW + 10 * 60_000)).toBe(240);
    const ended = NOW + 30 * 60_000;
    expect(timerState(r.timers[0]!, ended)).toBe('ended');
    expect(secondsLeft(addMinute(r, 'tm-t', ended).timers[0]!, ended)).toBe(60);
    expect(timerState(stopTimer(r, 'tm-t').timers[0]!, ended)).toBe('kept');
    expect(removeTimer(r, 'tm-t').timers).toEqual([]);
    expect(() => pauseTimer(r, 'tm-gone', NOW)).toThrow(/no longer/);
  });
  test('the bell rings once per end, wherever it is marked', () => {
    let r = startTimer(emptyTimers(), {name: 'Egg', seconds: 60}, NOW, 'tm-e').timers;
    expect(toRing(r, NOW + 30_000)).toEqual([]);
    expect(toRing(r, NOW + 61_000).map(t => t.id)).toEqual(['tm-e']);
    r = markRang(r, ['tm-e'], NOW + 61_000);
    expect(toRing(r, NOW + 62_000)).toEqual([]);
    expect(toRing(addMinute(r, 'tm-e', NOW + 62_000), NOW + 123_000).map(t => t.id)).toEqual(['tm-e']);
    expect(bellOn(r)).toBe(true); expect(bellOn(setBell(r, false))).toBe(false); expect(setBell(setBell(r, false), true).bell).toBeUndefined();
  });
  test('up to twenty kept: the least recently used one that is not running leaves', () => {
    let r = emptyTimers();
    for (let i = 0; i < MAX_TIMERS; i++) r = stopTimer(startTimer(r, {name: `T${i}`, seconds: 60}, NOW + i, `tm-${i}`).timers, `tm-${i}`);
    r = startTimer(r, {name: 'New', seconds: 60}, NOW + 100, 'tm-new').timers;
    expect(r.timers).toHaveLength(MAX_TIMERS);
    expect(r.timers.some(t => t.id === 'tm-0')).toBe(false);
    expect(keptTimers(r)[0]!.id).toBe('tm-new');
    let busy = emptyTimers();
    for (let i = 0; i < MAX_TIMERS; i++) busy = startTimer(busy, {name: `R${i}`, seconds: 600}, NOW, `tm-r${i}`).timers;
    expect(() => startTimer(busy, {name: 'One more', seconds: 60}, NOW, 'tm-x')).toThrow(/Twenty timers/);
    expect(() => startTimer(emptyTimers(), {name: ' ', seconds: 60}, NOW, 'tm-y')).toThrow(/needs a name/);
  });
  test('typed lengths, in English and Dutch', () => {
    expect(['9', '9 min', '1:30', '1:02:00', '45m', '1h 30m', '90 s', '1,5', '1 uur en 30 minuten', '10 minuten'].map(parseLength)).toEqual([540, 540, 90, 3720, 2700, 5400, 90, 90, 5400, 600]);
    expect(['', 'soon', '0', '25 h', '1:75', '9 min pasta'].map(parseLength)).toEqual([null, null, null, null, null, null]);
    expect([clockOf(539), clockOf(3723), spokenLength(539), spokenLength(60)]).toEqual(['8:59', '1:02:03', '8 minutes 59 seconds', '1 minute']);
  });
  test('the record: loose and versioned; a timer this build cannot read is skipped, never the list', () => {
    const r = timersSchema.parse({version: 1, timers: [{id: 'tm-a', name: 'Pasta', seconds: 540, used: NOW, colour: 'red'}, {id: 'bad', name: '', seconds: -1, used: 0}], later: true});
    expect(r.timers.map(t => t.id)).toEqual(['tm-a']);
    expect((r.timers[0] as Record<string, unknown>).colour).toBe('red');
    expect((r as Record<string, unknown>).later).toBe(true);
  });
  test('startNamedTimer: the API #449 uses writes the record; the shell’s gate sees it', () => {
    const storage = memory();
    const t = startNamedTimer('Simmer', 900, {now: NOW, storage});
    expect(t.name).toBe('Simmer');
    expect(readDeviceRecord(storage, TIMERS).data.timers.map(x => x.endsAt)).toEqual([NOW + 900_000]);
    expect(mayShowStrip(storage.getItem(TIMERS.key))).toBe(true);
    expect(mayShowStrip(JSON.stringify(stopTimer(readDeviceRecord(storage, TIMERS).data, t.id)))).toBe(false);
    expect(mayShowStrip(null)).toBe(false);
  });
});

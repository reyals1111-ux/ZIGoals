import {describe, expect, it} from 'vitest';
import {readDeviceRecord, updateDeviceRecord} from '../device-record';
import {AK_TOUR, AK_TOUR_KEY, AK_TOUR_LENGTH, AK_TOUR_STOPS, akTourSchema, clampStep, finished, leftFrom, movedTo, openedAt, startStep, tourSeen} from './ak-tour';

const memory = (initial: Record<string, string> = {}) => { const m = new Map(Object.entries(initial)); return {m, storage: {getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => { m.set(k, v); }}}; };
const AT = '2026-11-01T09:00:00.000Z', LATER = '2026-11-02T09:00:00.000Z';

describe('the New in ZIGoals tour (Session AK, A19)', () => {
  it('has five to seven stops, each with a title, one sentence and an in-app link', () => {
    expect(AK_TOUR_LENGTH).toBeGreaterThanOrEqual(5);
    expect(AK_TOUR_LENGTH).toBeLessThanOrEqual(7);
    for (const stop of AK_TOUR_STOPS) {
      expect(stop.title.length).toBeGreaterThan(0);
      expect(stop.title.length).toBeLessThanOrEqual(40);
      expect(stop.text.split(/[.!?](\s|$)/).filter(s => s.trim()).length, stop.title).toBe(1);
      expect(stop.text).not.toMatch(/!/);
      expect(stop.href, stop.title).toMatch(/^\/app(\/|$|#)/);
      expect(stop.where.length).toBeGreaterThan(0);
    }
    expect(new Set(AK_TOUR_STOPS.map(s => s.href)).size).toBe(AK_TOUR_LENGTH);
  });

  it('is its own versioned device key, empty until the person opens the tour', () => {
    expect(AK_TOUR_KEY).toBe('zigoals:ak-tour:v1');
    const {storage} = memory();
    expect(readDeviceRecord(storage, AK_TOUR)).toEqual({data: {version: 1}, unreadable: false});
    expect(tourSeen(readDeviceRecord(storage, AK_TOUR).data)).toBe(false);
    expect(startStep(readDeviceRecord(storage, AK_TOUR).data)).toBe(0);
  });

  it('remembers the first opening and the stop, and continues there', () => {
    const {storage, m} = memory();
    updateDeviceRecord(storage, AK_TOUR, t => openedAt(t, AT, 0));
    updateDeviceRecord(storage, AK_TOUR, t => movedTo(t, 2));
    updateDeviceRecord(storage, AK_TOUR, t => openedAt(t, LATER, 2));
    const read = readDeviceRecord(storage, AK_TOUR).data;
    expect(read).toEqual({version: 1, seenAt: AT, step: 2});
    expect(tourSeen(read)).toBe(true);
    expect(startStep(read)).toBe(2);
    expect(JSON.parse(m.get(AK_TOUR_KEY)!)).toEqual({version: 1, seenAt: AT, step: 2});
  });

  it('"Show me" continues at the next stop; after the last, and after Finish, it starts again and stays seen', () => {
    const opened = openedAt({version: 1}, AT, 0);
    expect(leftFrom(opened, 1).step).toBe(2);
    const last = leftFrom(opened, AK_TOUR_LENGTH - 1);
    expect(last).toEqual({version: 1, seenAt: AT});
    expect(finished(movedTo(opened, 4))).toEqual({version: 1, seenAt: AT});
    expect(startStep(finished(movedTo(opened, 4)))).toBe(0);
  });

  it('keeps every step inside the tour, and refuses or tolerates odd bytes without rewriting them', () => {
    expect(clampStep(-3)).toBe(0);
    expect(clampStep(Number.NaN)).toBe(0);
    expect(clampStep(undefined)).toBe(0);
    expect(clampStep(99)).toBe(AK_TOUR_LENGTH - 1);
    expect(clampStep(2.7)).toBe(2);
    expect(akTourSchema.safeParse({version: 1, step: AK_TOUR_LENGTH}).success).toBe(false);
    expect(akTourSchema.safeParse({version: 2}).success).toBe(false);
    // A later build's extra field is kept (loose).
    expect(akTourSchema.parse({version: 1, later: true})).toEqual({version: 1, later: true});
    const {storage, m} = memory({[AK_TOUR_KEY]: '{not json'});
    expect(readDeviceRecord(storage, AK_TOUR)).toEqual({data: {version: 1}, unreadable: true});
    expect(m.get(AK_TOUR_KEY)).toBe('{not json');
  });
});

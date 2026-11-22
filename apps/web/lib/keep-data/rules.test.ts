import {describe, expect, it} from 'vitest';
import {backupReminderSchema, copyOfferDue, emptyBackupReminder, NEW_RECORDS_FOR_COPY} from '../backup-reminder';
import {appleContext, isAppleMobile, keepCard, persistNeverPrompts, recordCount} from './rules';

// Session AV Part 3 (ADR-045 D-KEEP): keeping a friend's records on their device.
const IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Mobile/15E148 Safari/604.1';
const IPAD_AS_MAC = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Safari/605.1.15';
const CHROME = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36';
const FIREFOX = 'Mozilla/5.0 (X11; Linux x86_64; rv:139.0) Gecko/20100101 Firefox/139.0';
const store = (entries: Record<string, string>) => ({length: Object.keys(entries).length, key: (i: number) => Object.keys(entries)[i] ?? null, getItem: (k: string) => entries[k] ?? null});

describe('where ZIGoals runs on an iPhone or iPad', () => {
  it('knows an iPhone, and an iPad that presents itself as a Mac with a touch screen; a Mac is not one', () => {
    expect(isAppleMobile({userAgent: IPHONE})).toBe(true);
    expect(isAppleMobile({userAgent: IPAD_AS_MAC, maxTouchPoints: 5})).toBe(true);
    expect(isAppleMobile({userAgent: IPAD_AS_MAC, maxTouchPoints: 0})).toBe(false);
    expect(isAppleMobile({userAgent: CHROME})).toBe(false);
  });
  it('tells the Home Screen app from a Safari tab', () => {
    expect(appleContext({userAgent: IPHONE, standalone: true}, false)).toBe('home-screen');
    expect(appleContext({userAgent: IPHONE}, true)).toBe('home-screen');
    expect(appleContext({userAgent: IPHONE, standalone: false}, false)).toBe('tab');
    expect(appleContext({userAgent: CHROME}, true)).toBeNull();
  });
  it('asks to keep data by itself only where the browser never asks the person (Firefox asks)', () => {
    expect(persistNeverPrompts(CHROME)).toBe(true); expect(persistNeverPrompts(IPHONE)).toBe(true);
    expect(persistNeverPrompts(FIREFOX)).toBe(false); expect(persistNeverPrompts('Mozilla/5.0 (iPhone) FxiOS/139.0 Mobile/15E148 Safari/605.1.15')).toBe(false);
  });
});

describe('how many records the device holds (to notice new data, never shown)', () => {
  it('counts the ids in the app\'s own keys, not the Showcase\'s or another site\'s', () => {
    expect(recordCount(store({'zigoals:habits:v1': '{"habits":[{"id":"h1","entries":[{"id":"e1"},{"id":"e2"}]}]}', 'zigoals:showcase:v1:g:zigoals:habits:v1': '[{"id":"x"}]', 'theme': '{"id":"t"}', 'zigoals:ui-prefs:v1': '{"version":1}'}))).toBe(3);
    expect(recordCount(store({}))).toBe(0);
  });
});

describe('the copy offer: after real new data, at most every two weeks', () => {
  const r = emptyBackupReminder();
  it('waits for 25 records since the last copy made here', () => {
    expect(copyOfferDue(r, '2026-11-20', NEW_RECORDS_FOR_COPY - 1)).toBe(false);
    expect(copyOfferDue(r, '2026-11-20', NEW_RECORDS_FOR_COPY)).toBe(true);
    expect(copyOfferDue({...r, countAt: 40}, '2026-11-20', 60)).toBe(false);
    expect(copyOfferDue({...r, countAt: 40}, '2026-11-20', 65)).toBe(true);
  });
  it('is quiet for 14 days after a copy or "Not now", and never when off', () => {
    expect(copyOfferDue({...r, savedOn: '2026-11-10'}, '2026-11-20', 100)).toBe(false);
    expect(copyOfferDue({...r, savedOn: '2026-11-06'}, '2026-11-20', 100)).toBe(true);
    expect(copyOfferDue({...r, remindedOn: '2026-11-19'}, '2026-11-20', 100)).toBe(false);
    expect(copyOfferDue({...r, remindedOn: '2026-11-05'}, '2026-11-20', 100)).toBe(true);
    expect(copyOfferDue({...r, off: true}, '2026-11-20', 100)).toBe(false);
  });
});

describe('which card Today shows (at most one)', () => {
  const r = emptyBackupReminder(), at = {today: '2026-11-20', copyDue: false};
  it('a Safari tab on an iPhone: the move (with the export first once there are records), until Got it; Later brings it back in 7 days', () => {
    expect(keepCard(r, {...at, count: 0, apple: 'tab'})).toBe('ios-start');
    expect(keepCard(r, {...at, count: 3, apple: 'tab'})).toBe('ios-move');
    expect(keepCard({...r, iosNoteDoneOn: '2026-11-01'}, {...at, count: 3, apple: 'tab'})).toBeNull();
    expect(keepCard({...r, iosNoteLaterOn: '2026-11-15'}, {...at, count: 3, apple: 'tab'})).toBeNull();
    expect(keepCard({...r, iosNoteLaterOn: '2026-11-13'}, {...at, count: 3, apple: 'tab'})).toBe('ios-move');
  });
  it('the Home Screen app with nothing in it: the restore from Safari, until answered; with records, no such card', () => {
    expect(keepCard(r, {...at, count: 0, apple: 'home-screen'})).toBe('ios-restore');
    expect(keepCard({...r, restoreOfferDoneOn: '2026-11-20'}, {...at, count: 0, apple: 'home-screen'})).toBeNull();
    expect(keepCard(r, {...at, count: 5, apple: 'home-screen'})).toBeNull();
  });
  it('elsewhere, the copy when it is due', () => {
    expect(keepCard(r, {...at, count: 30, apple: null})).toBeNull();
    expect(keepCard(r, {...at, copyDue: true, count: 30, apple: null})).toBe('copy');
  });
});

describe('the stored record stays additive (TIER 3 stored formats)', () => {
  it('older records read as before; the new fields are optional; unknown fields are kept (loose)', () => {
    expect(backupReminderSchema.parse({version: 1, savedOn: '2026-11-01'})).toEqual({version: 1, savedOn: '2026-11-01'});
    expect(backupReminderSchema.parse({version: 1, countAt: 30, remindedOn: '2026-11-02', persistAskedOn: '2026-11-03', persistResult: 'kept', iosNoteDoneOn: '2026-11-04', iosNoteLaterOn: '2026-11-05', restoreOfferDoneOn: '2026-11-06', later: 'kept'})).toMatchObject({countAt: 30, later: 'kept'});
    expect(() => backupReminderSchema.parse({version: 1, countAt: -1})).toThrow();
    expect(() => backupReminderSchema.parse({version: 1, persistResult: 'maybe'})).toThrow();
  });
});

import {describe, expect, it} from 'vitest';
import {defaultNightTimes, defaultWakeFor, nightLabels, nightTimeIssues, optionalWhole, quickLastNight} from './health-sleep-form';
import {emptySleep} from './sleep/schema';
import {saveNight} from './sleep/engine';
import {instantAt} from './zone-time';

// Session AL (NB-139, NB-196, PR-064, MO-021, MO-023, MO-113, BUG-023, BUG-079): the sleep form's first times never end
// in the future, and each wrong time is said under its own field. Brussels, as the bots were.
const BXL = 'Europe/Brussels';
const at = (day: string, clock: string) => instantAt(day, clock, BXL);
const clock = (ms: number) => new Intl.DateTimeFormat('en-GB', {timeZone: BXL, hour: '2-digit', minute: '2-digit'}).format(ms);

describe('NB-139/P-PR-10: the default night', () => {
  it('before 07:00 (03:10 and 06:59) the wake time is now, so the untouched form saves', () => {
    for (const now of ['03:10', '06:59']) {
      const t = defaultNightTimes('2026-11-04', at('2026-11-04', now), BXL);
      expect(t).toEqual({bedDate: '2026-11-03', bedTime: '23:00', wakeDate: '2026-11-04', wakeTime: now});
      expect(nightTimeIssues(t, 'night', at('2026-11-04', now), BXL, clock)).toEqual({});
    }
  });
  it('from 07:00 on it is 23:00 → 07:00, as before; a past journal day keeps 07:00', () => {
    expect(defaultNightTimes('2026-11-04', at('2026-11-04', '07:00'), BXL).wakeTime).toBe('07:00');
    expect(defaultNightTimes('2026-11-04', at('2026-11-04', '10:30'), BXL).wakeTime).toBe('07:00');
    expect(defaultNightTimes('2026-11-02', at('2026-11-04', '03:10'), BXL)).toEqual({bedDate: '2026-11-01', bedTime: '23:00', wakeDate: '2026-11-02', wakeTime: '07:00'});
  });
  it('just after midnight the night is 23:00 → now (never an end before the start)', () => {
    const t = defaultNightTimes('2026-11-04', at('2026-11-04', '00:05'), BXL);
    expect(t.wakeTime).toBe('00:05');
    expect(nightTimeIssues(t, 'night', at('2026-11-04', '00:05'), BXL, clock)).toEqual({});
  });
});

describe('MO-113/NB-196: each wrong time names its field', () => {
  const now = at('2026-11-04', '03:10');
  it('an end in the future is said on the wake time, with the time now', () => {
    expect(nightTimeIssues({bedDate: '2026-11-03', bedTime: '23:00', wakeDate: '2026-11-04', wakeTime: '07:00'}, 'night', now, BXL, clock)).toEqual({wakeTime: 'The night cannot end later than now (03:10).'});
  });
  it('wake before bed, more than a day, a missing time and a day before 1990', () => {
    expect(nightTimeIssues({bedDate: '2026-11-03', bedTime: '23:00', wakeDate: '2026-11-03', wakeTime: '22:00'}, 'night', now, BXL, clock)).toEqual({wakeTime: 'Woke up must be after went to bed.'});
    expect(nightTimeIssues({bedDate: '2026-11-01', bedTime: '23:00', wakeDate: '2026-11-03', wakeTime: '07:00'}, 'night', now, BXL, clock)).toEqual({wakeDate: 'The night can last at most 24 hours: check the dates.'});
    expect(nightTimeIssues({bedDate: '2026-11-03', bedTime: '', wakeDate: '2026-11-04', wakeTime: '02:00'}, 'nap', now, BXL, clock)).toEqual({bedTime: 'Enter the time the nap started.'});
    expect(nightTimeIssues({bedDate: '1900-01-01', bedTime: '23:00', wakeDate: '1900-01-02', wakeTime: '07:00'}, 'night', now, BXL, clock)).toEqual({bedDate: 'Choose a day from 1990 on.', wakeDate: 'Choose a day from 1990 on.'});
  });
  it('a nap reads "Nap started / Nap ended" (BUG-023)', () => {
    expect(nightLabels('nap')).toEqual({bedDate: 'Nap started (date)', bedTime: 'Nap started (time)', wakeDate: 'Nap ended (date)', wakeTime: 'Nap ended (time)'});
    expect(nightLabels('night').wakeTime).toBe('Woke up (time)');
  });
  it('"Times you woke up" is a count, not minutes', () => {
    expect(optionalWhole('999', 100, 'count')).toEqual({issue: 'Enter a whole number from 0 to 100, or leave it empty.'});
    expect(optionalWhole('999', 720, 'minutes')).toEqual({issue: 'Enter whole minutes from 0 to 720, or leave it empty.'});
    expect(optionalWhole(' 3 ', 100, 'count')).toEqual({value: 3});
    expect(optionalWhole('', 100, 'count')).toEqual({});
  });
});

// Session AL (for L3: NB-139 sleep-tonight "When did you wake up?", NB-138 Today's quick "last night").
describe('NB-139: an open night asks for its wake time with a default that can be saved', () => {
  it('an evening start defaults to 07:00 the morning after, not 07:00 on the start date', () => {
    expect(defaultWakeFor(at('2026-11-01', '23:30'), at('2026-11-04', '10:00'), BXL)).toEqual({date: '2026-11-02', time: '07:00'});
  });
  it('a start after midnight keeps its own date; before 07:00 today the default is now', () => {
    expect(defaultWakeFor(at('2026-11-02', '01:00'), at('2026-11-04', '10:00'), BXL)).toEqual({date: '2026-11-02', time: '07:00'});
    expect(defaultWakeFor(at('2026-11-03', '22:00'), at('2026-11-04', '03:10'), BXL)).toEqual({date: '2026-11-04', time: '03:10'});
  });
});
describe('NB-138: quickLastNight, the write Today can call', () => {
  it('"7 h" at 10:30 is 00:00 → 07:00 and saves; before 07:00 it ends now', () => {
    const n = quickLastNight(7, '2026-11-04', at('2026-11-04', '10:30'), BXL);
    expect([clock(n.start), clock(n.end), n.kind, n.timeZone]).toEqual(['00:00', '07:00', 'night', BXL]);
    const early = quickLastNight(8, '2026-11-04', at('2026-11-04', '05:00'), BXL);
    expect(clock(early.end)).toBe('05:00');
    const s = saveNight(emptySleep(), n, new Date(at('2026-11-04', '10:30')));
    expect(s.nights).toHaveLength(1);
  });
  it('refuses hours that are not a night', () => {
    for (const h of [0, -1, 17, Number.NaN]) expect(() => quickLastNight(h, '2026-11-04', at('2026-11-04', '10:30'), BXL)).toThrow();
  });
});

import {describe, expect, it} from 'vitest';
import {MAX_ICS_BYTES, moveWall, parseIcsTime, readIcs} from './import';
import {addDays, instantAt, wallClock} from '../zone-time';
import {countEnd, occurrences, ruleStarts, settleCount, MAX_STEPS} from './expand';
import {MAX_EXDATES, type IcsRule, type ImportedEvent} from './calendar';
import {eventAgendaItems} from '../agenda/time-items';

/**
 * Session AK security review Z1B-3 and Z1B-4: hostile .ics files and stored COUNT rules cost little. The bounds below
 * are generous (CI machines are slower than a laptop); the code before the fixes took 46 s and 5.5 s on these shapes.
 */
const TODAY = '2026-11-04', AT = new Date('2026-11-04T09:00:00.000Z');
const opts = {today: TODAY, id: 'cal_test-cost1', at: AT};
const pad = (n: number) => String(n).padStart(2, '0');
const timed = <T,>(run: () => T): [T, number] => { const t0 = performance.now(); const out = run(); return [out, performance.now() - t0]; };
const calendar = (lines: string[]) => ['BEGIN:VCALENDAR', ...lines, 'END:VCALENDAR'].join('\r\n');

describe('Z1B-3: changed occurrences (RECURRENCE-ID) are indexed per UID, capped, and duplicates cost nothing', () => {
  it('the review\'s file (2,500 masters and 2,500 overrides of one UID) reads in well under a second', () => {
    const lines: string[] = [];
    for (let i = 0; i < 2500; i++) lines.push('BEGIN:VEVENT', 'UID:x', 'DTSTART;TZID=America/New_York:20261101T090000', 'RRULE:FREQ=DAILY', 'SUMMARY:m', 'END:VEVENT');
    for (let i = 0; i < 2500; i++) lines.push('BEGIN:VEVENT', 'UID:x', `RECURRENCE-ID:2026${pad(1 + (i % 12))}${pad(1 + (i % 28))}T${pad(i % 24)}0000Z`, 'DTSTART;TZID=America/New_York:20261101T090000', 'SUMMARY:o', 'END:VEVENT');
    const [r, ms] = timed(() => readIcs(calendar(lines), opts));
    expect(ms).toBeLessThan(2000);
    // One master (the repeats are the same event) and its skipped dates capped; each distinct override kept once.
    const masters = r.calendar.events.filter(e => e.rule);
    expect(masters).toHaveLength(1);
    expect(masters[0]!.exdates).toHaveLength(MAX_EXDATES);
    expect(r.calendar.events.length).toBe(r.kept);
  });

  it('a file at the 2 MB cap built for the most zone conversions reads in about a second', () => {
    // 1,000 masters (the most kept) of distinct UIDs, each zoned in New York with 100 distinct EXDATEs in Berlin time,
    // then overrides of those UIDs in Tokyo time as far as the cap allows, padded up to just under it.
    const lines: string[] = [];
    let i = 0;
    const exdates = (n: number) => Array.from({length: 100}, (_, k) => `2027${pad(1 + ((n + k) % 12))}${pad(1 + ((n * 7 + k) % 28))}T${pad((n + k) % 24)}${pad(k % 60)}00`).join(',');
    for (; i < 1000; i++) lines.push('BEGIN:VEVENT', `UID:u${i}`, 'DTSTART;TZID=America/New_York:20261101T090000', 'RRULE:FREQ=DAILY', `EXDATE;TZID=Europe/Berlin:${exdates(i)}`, 'SUMMARY:m', 'END:VEVENT');
    for (; i < 1800; i++) lines.push('BEGIN:VEVENT', `UID:u${i % 1000}`, `RECURRENCE-ID;TZID=Asia/Tokyo:2027${pad(1 + (i % 12))}${pad(1 + (i % 28))}T${pad(i % 24)}3000`, 'DTSTART;TZID=America/New_York:20261101T090000', 'SUMMARY:o', 'END:VEVENT');
    let text = calendar(lines);
    text = text.replace('END:VCALENDAR', `X-PAD:${'x'.repeat(Math.max(0, MAX_ICS_BYTES - text.length - 40))}\r\nEND:VCALENDAR`);
    expect(new TextEncoder().encode(text).length).toBeLessThanOrEqual(MAX_ICS_BYTES);
    // About 1 s on a laptop (100,000 zone conversions, the most a file can ask for); 3.6 s before the quick path.
    const [r, ms] = timed(() => readIcs(text, opts));
    expect(ms).toBeLessThan(3000);
    expect(r.read).toBe(1800);
    expect(r.kept).toBe(1000);
    expect(r.calendar.events.every(e => (e.exdates?.length ?? 0) <= MAX_EXDATES)).toBe(true);
  });

  it('keeps what it kept before: EXDATEs first, then each changed occurrence, moved into the master\'s zone', () => {
    const r = readIcs(calendar([
      'BEGIN:VEVENT', 'UID:s', 'SUMMARY:Lesson', 'DTSTART;TZID=Europe/Brussels:20261102T170000', 'RRULE:FREQ=WEEKLY;COUNT=4', 'EXDATE:20261116T160000Z', 'END:VEVENT',
      'BEGIN:VEVENT', 'UID:s', 'RECURRENCE-ID:20261109T160000Z', 'SUMMARY:Lesson (moved)', 'DTSTART;TZID=Europe/Brussels:20261110T180000', 'END:VEVENT',
      // The same override twice, and the same master twice: each counts once.
      'BEGIN:VEVENT', 'UID:s', 'RECURRENCE-ID:20261109T160000Z', 'SUMMARY:Lesson (moved)', 'DTSTART;TZID=Europe/Brussels:20261110T180000', 'END:VEVENT',
      'BEGIN:VEVENT', 'UID:s', 'SUMMARY:Lesson', 'DTSTART;TZID=Europe/Brussels:20261102T170000', 'RRULE:FREQ=WEEKLY;COUNT=4', 'END:VEVENT',
    ]), opts);
    expect(r.calendar.events).toHaveLength(2);
    const [master, moved] = r.calendar.events;
    expect(master!.exdates).toEqual(['2026-11-16T17:00', '2026-11-09T17:00']);
    expect(master!.rule).toEqual({freq: 'WEEKLY', interval: 1, until: '2026-11-23T17:00'});
    expect(occurrences(master!, '2026-11-01', '2026-11-30', 'Europe/Brussels').map(o => `${o.date} ${o.time}`)).toEqual(['2026-11-02 17:00', '2026-11-23 17:00']);
    expect(occurrences(moved!, '2026-11-01', '2026-11-30', 'Europe/Brussels').map(o => `${o.date} ${o.time}`)).toEqual(['2026-11-10 18:00']);
  });
});

describe('Z1B-3: moving a time between zones gives exactly what lib/zone-time gives', () => {
  // The conversion before the fix, as the reference.
  const reference = (day: string, clock: string, from: string, to: string) => {
    const ms = from === 'UTC' ? Date.parse(`${day}T${clock}:00Z`) : instantAt(day, clock, from), w = wallClock(ms, to);
    return `${w.date}T${w.clock}`;
  };
  const zones = ['UTC', 'Europe/Brussels', 'America/New_York', 'Asia/Kolkata', 'America/St_Johns', 'Australia/Lord_Howe', 'Pacific/Chatham', 'Africa/Casablanca', 'Europe/Dublin', 'Africa/Monrovia', 'Asia/Tokyo', 'America/Sao_Paulo', 'Pacific/Apia'];

  it('across zones, a 300-year range, and every half hour of the days clocks change', () => {
    let seed = 11, checked = 0;
    const rand = (n: number) => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed % n; };
    const cases: [string, string][] = [];
    for (let i = 0; i < 3000; i++) cases.push([`${1900 + rand(300)}-${pad(1 + rand(12))}-${pad(1 + rand(28))}`, `${pad(rand(24))}:${pad(rand(60))}`]);
    // Days with a clock change in Brussels, New York, Lord Howe and Casablanca, at every half hour.
    for (const day of ['2026-03-29', '2026-10-25', '2026-03-08', '2026-11-01', '2026-04-05', '2026-10-04', '2026-02-15', '2026-03-22', '1916-05-01', '1940-05-16'])
      for (let h = 0; h < 48; h++) cases.push([day, `${pad(Math.floor(h / 2))}:${h % 2 ? '30' : '00'}`]);
    for (const [day, clock] of cases) {
      const from = zones[rand(zones.length)]!, to = zones[rand(zones.length)]!;
      if (from === to) continue;
      const t = parseIcsTime(`${day.replaceAll('-', '')}T${clock.replace(':', '')}00`)!;
      expect(moveWall({t, tz: from}, to), `${day} ${clock} ${from} → ${to}`).toBe(reference(day, clock, from, to));
      checked++;
    }
    expect(checked).toBeGreaterThan(3000);
  });
  it('the Agenda shows the same days and times through it, and a view of 1,000 zoned daily events stays quick', () => {
    // Daily at 02:30 in New York and at 09:00 in Lord Howe, viewed from Brussels and from New York, across clock changes.
    for (const [start, tz] of [['2026-03-01T02:30', 'America/New_York'], ['2026-03-20T09:00', 'Australia/Lord_Howe'], ['2026-10-01T23:45', 'UTC']] as const)
      for (const zone of ['Europe/Brussels', 'America/New_York']) {
        const e: ImportedEvent = {id: '0123456789abcdef', title: 'E', allDay: false, start, tz, minutes: 30, rule: {freq: 'DAILY', interval: 1}};
        const got = occurrences(e, start.slice(0, 10), addDays(start.slice(0, 10), 61), zone).map(o => `${o.date}T${o.time}`);
        const want = ruleStarts(e, addDays(start.slice(0, 10), -1), addDays(start.slice(0, 10), 62)).map(d => {
          if (tz === zone) return null;
          return reference(d, start.slice(11), tz, zone);
        }).filter((w): w is string => !!w && w.slice(0, 10) >= start.slice(0, 10) && w.slice(0, 10) <= addDays(start.slice(0, 10), 61));
        if (tz !== zone) expect(got, `${tz} → ${zone}`).toEqual(want);
      }
    const r = readIcs(calendar(Array.from({length: 1000}, (_, i) => ['BEGIN:VEVENT', `UID:z${i}`, 'DTSTART;TZID=Asia/Tokyo:20261101T090000', 'RRULE:FREQ=DAILY', `SUMMARY:e${i}`, 'END:VEVENT']).flat()), opts);
    // Every start of every event over 62 days (the review's probe): 62,000 conversions, 1.9 s before.
    const [count, ms] = timed(() => r.calendar.events.reduce((n, e) => n + occurrences(e, '2026-11-01', '2027-01-01', 'Europe/Brussels').length, 0));
    expect(count).toBe(62_000);
    expect(ms).toBeLessThan(1500);
  });
  it('a day, a floating time or the same zone keeps its wall time', () => {
    expect(moveWall({t: parseIcsTime('20261105')!, tz: null}, 'Europe/Brussels')).toBe('2026-11-05');
    expect(moveWall({t: parseIcsTime('20261105T0900')!, tz: null}, 'Europe/Brussels')).toBe('2026-11-05T09:00');
    expect(moveWall({t: parseIcsTime('20261105T090000')!, tz: 'Asia/Tokyo'}, 'Asia/Tokyo')).toBe('2026-11-05T09:00');
    expect(moveWall({t: parseIcsTime('20261105T090000Z')!, tz: 'UTC'}, null)).toBe('2026-11-05T09:00');
  });
});

describe('Z1B-4: a COUNT rule is settled into its last start, so a view never walks it from an old start', () => {
  const event = (rule: IcsRule, start: string, more: Partial<ImportedEvent> = {}): ImportedEvent => ({id: '0123456789abcdef', title: 'E', allDay: start.length === 10, start, rule, ...more});

  it('the review\'s calendar (1,000 events from 1900, every Monday, 1,000 times) imports as past and views in no time', () => {
    const lines: string[] = [];
    for (let i = 0; i < 1000; i++) lines.push('BEGIN:VEVENT', `UID:z${i}`, 'DTSTART;TZID=Asia/Tokyo:19000101T090000', 'RRULE:FREQ=DAILY;BYDAY=MO;COUNT=1000', `SUMMARY:e${i}`, 'END:VEVENT');
    const [r, ms] = timed(() => readIcs(calendar(lines), opts));
    expect(ms).toBeLessThan(1500);
    expect(r.kept).toBe(0);
    expect(r.skipped.past).toBe(1000);
    // The same events stored with their COUNT (a record kept before the fix): the first view settles each rule once.
    const stored = Array.from({length: 1000}, (_, i) => event({freq: 'DAILY', interval: 1, count: 1000, byDay: [1]}, '1900-01-01T09:00', {id: i.toString(16).padStart(16, '0'), tz: 'Asia/Tokyo'}));
    const record = {version: 1 as const, calendars: [{id: 'cal_test-cost2', name: 'Old', importedAt: AT.toISOString(), events: stored}]};
    const [items, viewMs] = timed(() => eventAgendaItems(record, '2026-11-01', '2027-01-01', 'Europe/Brussels'));
    expect(items).toEqual([]);
    expect(viewMs).toBeLessThan(1500);
  });

  it('a long COUNT series still running is kept with its end, and shows the right days far from its start', () => {
    // Every Monday 1,000 times from 4 January 2010: the 1,000th Monday is 2029-02-26 (the old walk stopped at step 3,000).
    const r = readIcs(calendar(['BEGIN:VEVENT', 'UID:mon', 'SUMMARY:Club', 'DTSTART;VALUE=DATE:20100104', 'RRULE:FREQ=DAILY;BYDAY=MO;COUNT=1000', 'END:VEVENT']), opts);
    const club = r.calendar.events[0]!;
    expect(club.rule).toEqual({freq: 'DAILY', interval: 1, byDay: [1], until: '2029-02-26'});
    expect(ruleStarts(club, '2026-11-01', '2026-11-30')).toEqual(['2026-11-02', '2026-11-09', '2026-11-16', '2026-11-23', '2026-11-30']);
    expect(ruleStarts(club, '2029-02-20', '2029-03-31')).toEqual(['2029-02-26']);
  });

  it('settling agrees with walking the rule start by start, over many shapes', () => {
    // The reference: the rule without a COUNT walked from its start (that walk never uses COUNT), its count-th start.
    let seed = 7;
    const rand = (n: number) => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed % n; };
    let checked = 0;
    for (let trial = 0; trial < 600; trial++) {
      const freq = (['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY'] as const)[trial % 4]!;
      const start = `${1990 + rand(40)}-${pad(1 + rand(12))}-${pad(1 + rand(28))}`;
      const rule: IcsRule = {freq, interval: 1 + rand(freq === 'DAILY' ? 10 : 3)};
      if (freq === 'DAILY' && rand(2)) rule.byDay = [...new Set([rand(7), rand(7)])].sort();
      if (freq === 'WEEKLY' && rand(2)) rule.byDay = [...new Set([rand(7), rand(7), rand(7)])].sort();
      if (freq === 'MONTHLY') { if (rand(2)) { rule.byDay = [rand(7)]; rule.nth = [1, 2, -1, 5][rand(4)]!; } else if (rand(2)) rule.byMonthDay = [[31], [-1, 15], [30, 1]][rand(3)]!; }
      const count = 1 + rand(120), timedStart = rand(2) ? `${start}T${pad(rand(24))}:${pad(rand(60))}` : start;
      const open = event(rule, timedStart);
      const reference = ruleStarts(open, start, '2600-12-31');
      const settled = settleCount(event({...rule, count}, timedStart));
      if (reference.length < count) continue;
      checked++;
      expect(countEnd(event({...rule, count}, timedStart))).toBe(reference[count - 1]);
      expect(settled!.until!.slice(0, 10)).toBe(reference[count - 1]);
      expect(ruleStarts({...open, rule: settled!}, start, '2600-12-31')).toEqual(reference.slice(0, count));
    }
    expect(checked).toBeGreaterThan(400);
  });

  it('an UNTIL before the COUNT\'s end wins; a rule that never gives a start is left out; a filter that never matches costs nothing', () => {
    expect(settleCount(event({freq: 'DAILY', interval: 1, count: 10, until: '2026-11-03T08:00'}, '2026-11-01T09:00'))).toEqual({freq: 'DAILY', interval: 1, until: '2026-11-03T08:00'});
    expect(settleCount(event({freq: 'DAILY', interval: 1, count: 3, until: '2026-12-01'}, '2026-11-01T09:00'))).toEqual({freq: 'DAILY', interval: 1, until: '2026-11-03T09:00'});
    // Every 7 days from a Sunday, Mondays only: never.
    const never = event({freq: 'DAILY', interval: 7, count: 5, byDay: [1]}, '2026-11-01');
    expect(countEnd(never)).toBeNull();
    expect(ruleStarts(never, '2026-11-01', '2027-01-01')).toEqual([]);
    const r = readIcs(calendar(['BEGIN:VEVENT', 'UID:n', 'SUMMARY:Never', 'DTSTART;VALUE=DATE:20261101', 'RRULE:FREQ=DAILY;INTERVAL=7;BYDAY=MO;COUNT=5', 'END:VEVENT']), opts);
    expect(r.kept).toBe(0);
    expect(r.skipped.unreadable).toBe(1);
    // Monthly on the 31st every 12 months from February: never, found within the step cap.
    expect(countEnd(event({freq: 'MONTHLY', interval: 12, count: 3, byMonthDay: [31]}, '2026-02-02'))).toBeNull();
    expect(MAX_STEPS).toBe(3000);
  });
});

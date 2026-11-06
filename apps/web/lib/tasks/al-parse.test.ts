import {describe, expect, it} from 'vitest';
import {parseTaskLine} from './parse';
import {taskIntent} from './intent';
import {describeRecur, firstDue, nextOccurrence, nthWeekday, upcoming} from './recurrence';

/** Session AL (Part 8): the natural-language line (LS-001, P-LS-03), the repeat engine (P-LS-02) and task intent (LS-004). */
const TODAY = '2026-11-04'; // a Wednesday
const p = (line: string, today = TODAY) => parseTaskLine(line, today);

describe('LS-001: the Tasks line reads days, times, repeats, priorities, projects and labels', () => {
  it('"Pay rent every month on the 1st p1 #Home @bills"', () => {
    const r = p('Pay rent every month on the 1st p1 #Home @bills');
    expect(r).toMatchObject({title: 'Pay rent', level: 1, project: 'Home', labels: ['bills'], due: '2026-12-01'});
    expect(r.recur).toMatchObject({every: 'month', interval: 1, monthDay: 1});
    expect(describeRecur(r.recur!)).toBe('Every month on the 1st');
    expect(r.spans.map(s => s.kind)).toEqual(['recur', 'priority', 'project', 'label']);
  });
  it('"call mum tomorrow 6pm" and "Buy milk tomorrow at 5pm"', () => {
    expect(p('call mum tomorrow 6pm')).toMatchObject({title: 'call mum', due: '2026-11-05', time: '18:00'});
    expect(p('Buy milk tomorrow at 5pm')).toMatchObject({title: 'Buy milk', due: '2026-11-05', time: '17:00'});
    expect(p('Buy milk tomorrow at 5pm').spans.map(s => s.text)).toEqual(['tomorrow', 'at 5pm']);
  });
  it('weekdays, next week, in N days, named dates, ISO, the 1st', () => {
    expect(p('#work @phone friday')).toMatchObject({title: '', project: 'work', labels: ['phone'], due: '2026-11-06'});
    expect(p('dentist on Monday').due).toBe('2026-11-09');
    expect(p('dentist wednesday').due).toBe(TODAY);
    expect(p('plan next week').due).toBe('2026-11-09');
    expect(p('plan in 3 days').due).toBe('2026-11-07');
    expect(p('plan in two weeks').due).toBe('2026-11-18');
    expect(p('gift Dec 5').due).toBe('2026-12-05');
    expect(p('gift 5th of December').due).toBe('2026-12-05');
    expect(p('gift Jan 3').due).toBe('2027-01-03');
    expect(p('tax 2027-04-30').due).toBe('2027-04-30');
    expect(p('rent the 1st').due).toBe('2026-12-01');
    expect(p('rent the 30th').due).toBe('2026-11-30');
    expect(p('tidy this weekend').due).toBe('2026-11-07');
  });
  it('DV-164: past days are kept (they show as overdue), never refused', () => {
    expect(p('file receipts yesterday').due).toBe('2026-11-03');
    expect(p('file receipts Nov 1').due).toBe('2026-11-01');
    expect(p('call back last friday').due).toBe('2026-10-30');
  });
  it('times: 5:30 pm, 17:00, at 9, at 3 (afternoon), noon, tonight; a time alone is today', () => {
    expect(p('call 5:30 pm').time).toBe('17:30');
    expect(p('call 17:00')).toMatchObject({time: '17:00', due: TODAY});
    expect(p('call at 9').time).toBe('09:00');
    expect(p('call at 3').time).toBe('15:00');
    expect(p('lunch with Ana noon').time).toBe('12:00');
    expect(p('pack tonight')).toMatchObject({due: TODAY, time: '20:00'});
    expect(p('Buy 2 apples').title).toBe('Buy 2 apples');
    expect(p('Read chapter 12').time).toBeUndefined();
  });
  it('priorities: p1–p4, !1–!4, !!!, !!, !; plain "!" in a sentence stays', () => {
    expect(p('Fix the leak p2').level).toBe(2);
    expect(p('Fix the leak !!').level).toBe(1);
    expect(p('Fix the leak !').level).toBe(2);
    expect(p('Fix the leak !4').level).toBe(4);
    expect(p('Wow!').level).toBeUndefined();
  });
  it('repeats: every day / weekday / Mon and Thu / other week / 3 weeks / first Monday / last Friday / year / every! / until / times', () => {
    expect(p('stretch every day').recur).toMatchObject({every: 'day', interval: 1});
    expect(p('stand-up every weekday at 9am')).toMatchObject({due: TODAY, time: '09:00', recur: {every: 'week', weekdays: [1, 2, 3, 4, 5]}});
    expect(p('gym every Mon and Thu').recur).toMatchObject({every: 'week', weekdays: [1, 4]});
    expect(p('gym every Mon and Thu').due).toBe('2026-11-05');
    expect(p('bins every other week').recur).toMatchObject({every: 'week', interval: 2});
    expect(p('review every 3 weeks').recur).toMatchObject({every: 'week', interval: 3});
    const first = p('team lunch every first Monday');
    expect(first.recur).toMatchObject({every: 'month', nth: {n: 1, weekday: 1}});
    expect(first.due).toBe('2026-12-07');
    expect(p('report every last friday').recur).toMatchObject({nth: {n: -1, weekday: 5}});
    expect(p('birthday every year on Mar 3')).toMatchObject({title: 'birthday', due: '2027-03-03', recur: {every: 'year'}});
    expect(p('water plants every! 3 days').recur).toMatchObject({every: 'day', interval: 3, afterDone: true});
    expect(p('pill daily until Dec 1').recur).toMatchObject({every: 'day', until: '2026-12-01'});
    expect(p('physio every week for 6 times').recur).toMatchObject({every: 'week', left: 6});
    expect(p('pay every month on the last day').recur).toMatchObject({monthDay: -1});
  });
  it('"keep as text": a span can be left in the title', () => {
    const read = p('Watch Friday Night Lights');
    expect(read.due).toBe('2026-11-06');
    const span = read.spans.find(s => s.kind === 'date')!;
    expect(p('Watch Friday Night Lights', TODAY)).toBeTruthy();
    expect(parseTaskLine('Watch Friday Night Lights', TODAY, {keep: [span.start]})).toMatchObject({title: 'Watch Friday Night Lights'});
    expect(parseTaskLine('Watch Friday Night Lights', TODAY, {keep: [span.start]}).due).toBeUndefined();
  });
  it('emails are not labels; one of each kind', () => {
    expect(p('email bob@example.com tomorrow')).toMatchObject({title: 'email bob@example.com', labels: []});
    expect(p('meet tomorrow friday').due).toBe('2026-11-05');
    expect(p('meet tomorrow friday').title).toBe('meet friday');
  });
});

describe('P-LS-02: the repeat engine', () => {
  it('rolls forward from the plan, skipping occurrences missed while overdue', () => {
    expect(nextOccurrence({every: 'week', interval: 1, weekdays: [1]}, '2026-11-02', TODAY, TODAY)!.due).toBe('2026-11-09');
    expect(nextOccurrence({every: 'day', interval: 1}, '2026-10-30', TODAY, TODAY)!.due).toBe(TODAY);
    expect(nextOccurrence({every: 'month', interval: 1, monthDay: 31}, '2026-01-31', '2026-01-31', '2026-01-31')!.due).toBe('2026-02-28');
    expect(nextOccurrence({every: 'month', interval: 1, nth: {n: 1, weekday: 1}}, '2026-11-02', '2026-11-02', '2026-11-02')!.due).toBe('2026-12-07');
    expect(nextOccurrence({every: 'year', interval: 1}, '2028-02-29', '2028-02-29', '2028-02-29')!.due).toBe('2029-02-28');
    expect(nextOccurrence({every: 'week', interval: 2, weekdays: [1, 4]}, '2026-11-02', '2026-11-02', '2026-11-02')!.due).toBe('2026-11-05');
    expect(nextOccurrence({every: 'week', interval: 2, weekdays: [1, 4]}, '2026-11-05', '2026-11-05', '2026-11-05')!.due).toBe('2026-11-16');
  });
  it('every! counts from the finish day; until and left end the series', () => {
    expect(nextOccurrence({every: 'day', interval: 3, afterDone: true}, '2026-11-01', TODAY, TODAY)!.due).toBe('2026-11-07');
    expect(nextOccurrence({every: 'day', interval: 1, until: TODAY}, TODAY, TODAY, TODAY)).toBeNull();
    expect(nextOccurrence({every: 'day', interval: 1, left: 1}, TODAY, TODAY, TODAY)).toBeNull();
    expect(nextOccurrence({every: 'day', interval: 1, left: 3}, TODAY, TODAY, TODAY)!.rule.left).toBe(2);
  });
  it('first due days, nth weekdays and a preview', () => {
    expect(firstDue({every: 'week', interval: 1, weekdays: [1]}, TODAY)).toBe('2026-11-09');
    expect(firstDue({every: 'month', interval: 1, monthDay: 4}, TODAY)).toBe(TODAY);
    expect(nthWeekday(2026, 11, 5, 2)).toBeNull();
    expect(nthWeekday(2026, 11, 5, 1)).toBe('2026-11-30');
    expect(nthWeekday(2026, 11, -1, 1)).toBe('2026-11-30');
    expect(upcoming({every: 'week', interval: 1, weekdays: [1, 3]}, TODAY)).toEqual([TODAY, '2026-11-09', '2026-11-11']);
    expect(describeRecur({every: 'week', interval: 2, weekdays: [4, 1]})).toBe('Every 2 weeks on Mon, Thu');
    expect(describeRecur({every: 'day', interval: 3, afterDone: true})).toBe('Every 3 days after it’s done');
  });
});

describe('LS-004: the global Quick add knows a to-do from a log', () => {
  it('to-dos', () => {
    expect(taskIntent('call mom tomorrow at 5pm', TODAY)).toMatchObject({confidence: 'sure', parsed: {title: 'call mom', due: '2026-11-05', time: '17:00'}});
    expect(taskIntent('task buy milk', TODAY)).toMatchObject({confidence: 'sure', parsed: {title: 'buy milk'}});
    expect(taskIntent('todo: renew passport', TODAY)?.parsed.title).toBe('renew passport');
    expect(taskIntent('Remind me to floss at 21:00', TODAY)).toMatchObject({confidence: 'sure', parsed: {title: 'floss', time: '21:00'}});
    expect(taskIntent('Add task: buy milk tomorrow at 9', TODAY)).toMatchObject({parsed: {title: 'buy milk', time: '09:00'}});
    expect(taskIntent('Add a task: buy milk tomorrow', TODAY)?.parsed).toMatchObject({title: 'buy milk', due: '2026-11-05'});
    expect(taskIntent('water the plants', TODAY)?.confidence).toBe('sure');
    expect(taskIntent('dentist friday 10am', TODAY)?.confidence).toBe('maybe');
  });
  it('logs stay logs', () => {
    for (const line of ['drank 2 glasses of water', 'ran 5k in 28 min', 'a banana', 'weight 78.4', 'slept 7h', 'water 2 glasses', 'had pasta for lunch', 'meditated 15 minutes', 'ate an apple tomorrow']) expect(taskIntent(line, TODAY), line).toBeNull();
  });
});

describe('the line reader under random input (seeded fuzz)', () => {
  // A small seeded generator (mulberry32) so a failure is reproducible.
  const rng = (seed: number) => () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  const WORDS = ['every', 'every!', 'each', 'day', 'week', 'month', 'year', 'other', '2', '31', '1st', 'the', 'on', 'at', 'in', 'next', 'last', 'friday', 'mon', 'and', 'Dec', '5', 'tomorrow', 'today', 'tonight', '5pm', '17:00', '25:99', 'p1', 'p9', '!!', '!', '#Home', '#', '@bills', '@', 'bob@x.io', 'until', 'for', '10', 'times', 'weekday', 'first', 'noon', 'call', 'mum', 'Pay', 'rent', '2026-02-30', '2027-01-01', 'in', 'days', 'weeks', '٣', '你好', '🙂', '<b>', '"', ',', '-', 'ö'];
  it('never throws; spans sit inside the text without overlap; days and times are real', () => {
    const next = rng(20261104);
    for (let n = 0; n < 4000; n++) {
      const len = 1 + Math.floor(next() * 9), line = Array.from({length: len}, () => next() < 0.85 ? WORDS[Math.floor(next() * WORDS.length)]! : String.fromCharCode(32 + Math.floor(next() * 400))).join(next() < 0.9 ? ' ' : '');
      const today = `202${Math.floor(next() * 9)}-${String(1 + Math.floor(next() * 12)).padStart(2, '0')}-${String(1 + Math.floor(next() * 28)).padStart(2, '0')}`;
      const r = parseTaskLine(line, today);
      let end = -1;
      for (const s of r.spans) { expect(s.start).toBeGreaterThan(end - 1); expect(s.end).toBeLessThanOrEqual(line.length); expect(line.slice(s.start, s.end)).toBe(s.text); end = s.end; }
      if (r.due) expect(Number.isNaN(Date.parse(`${r.due}T00:00:00Z`)) || new Date(`${r.due}T00:00:00Z`).toISOString().slice(0, 10) !== r.due, `${line} → ${r.due}`).toBe(false);
      if (r.time) expect(r.time).toMatch(/^(?:[01]\d|2[0-3]):[0-5]\d$/);
      if (r.recur) { expect(r.due).toBeTruthy(); expect(r.recur.interval).toBeGreaterThanOrEqual(1); }
      expect(r.title.length).toBeLessThanOrEqual(line.length);
      expect(() => taskIntent(line, today)).not.toThrow();
    }
  });
});

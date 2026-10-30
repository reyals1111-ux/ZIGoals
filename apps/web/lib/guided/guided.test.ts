import {describe, expect, it} from 'vitest';
import {GUIDED_PROGRAMS, goalTemplateHref, programById} from './programs';
import {GUIDED_JOURNEYS, GUIDED_JOURNEYS_KEY, MAX_JOURNEYS, emptyGuidedJourneys, guidedJourneysSchema, type GuidedJourneys} from './schema';
import {GuidedError, MAX_ACTIVE, activeJourneyFor, activeJourneys, addCalendarDays, daysBetween, endJourney, journeyState, markDone, progressLine, startJourney, startRefusal, undoDone, unlockedCount, unlockedSteps} from './engine';
import {readDeviceRecord, updateDeviceRecord} from '../device-record';
import {GOAL_LIBRARY} from '../templates/goal-library';
import {templateHref} from '../../components/goals/template-library';

const memory = () => { const m = new Map<string, string>(); return {m, getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => { m.set(k, v); }}; };
const sleep = programById('sleep-reset')!, money = programById('emergency-fund')!;
const started = (programId: string, startedOn: string, record: GuidedJourneys = emptyGuidedJourneys()) => startJourney(record, programId, startedOn);

describe('Guided journeys: the programs (Session AJ, item 34, D13)', () => {
  it('offers 6 to 8 programs, each with 5 to 14 steps, unique ids and a pillar', () => {
    expect(GUIDED_PROGRAMS.length).toBeGreaterThanOrEqual(6);
    expect(GUIDED_PROGRAMS.length).toBeLessThanOrEqual(8);
    expect(new Set(GUIDED_PROGRAMS.map(p => p.id)).size).toBe(GUIDED_PROGRAMS.length);
    for (const p of GUIDED_PROGRAMS) {
      expect(p.id).toMatch(/^[a-z0-9-]{1,60}$/);
      expect(['goals', 'habits', 'health', 'wealth']).toContain(p.pillar);
      expect(p.steps.length, p.id).toBeGreaterThanOrEqual(5);
      expect(p.steps.length, p.id).toBeLessThanOrEqual(14);
      expect(new Set(p.steps.map(s => s.id)).size, p.id).toBe(p.steps.length);
      expect(p.title.trim().length).toBeGreaterThan(3);
      expect(p.summary.trim().length).toBeGreaterThan(10);
    }
  });
  it('gives every step a title, a short daily note and a link action inside the app', () => {
    for (const p of GUIDED_PROGRAMS) for (const s of p.steps) {
      expect(s.id, `${p.id}/${s.id}`).toMatch(/^[a-z0-9-]{1,60}$/);
      expect(s.title.trim().length, `${p.id}/${s.id}`).toBeGreaterThan(5);
      expect(s.note.trim().length, `${p.id}/${s.id}`).toBeGreaterThan(10);
      expect(s.note.length, `${p.id}/${s.id}`).toBeLessThanOrEqual(200);
      expect(s.action.kind).toBe('link');
      expect(s.action.href.startsWith('/app/'), s.action.href).toBe(true);
      expect(() => new URL(s.action.href, 'https://example.test')).not.toThrow();
      expect(new URL(s.action.href, 'https://example.test').origin).toBe('https://example.test');
      expect(s.action.label.trim().length).toBeGreaterThan(3);
    }
  });
  it('says plainly that health programs are not medical advice and money programs not financial advice', () => {
    for (const p of GUIDED_PROGRAMS) {
      if (p.pillar === 'wealth') expect(p.care, p.id).toBe('Not financial advice; ZIGoals never moves money. Every amount is yours to choose.');
      if (p.pillar === 'health') expect(p.care, p.id).toBe('Not medical advice; if something hurts or sleep stays hard, talk to a doctor.');
    }
    expect(programById('calm-mind')?.care).toMatch(/^Not medical advice; .*talk to a doctor\.$/);
    for (const id of ['emergency-fund', 'first-home', 'trip', 'sleep-reset', 'walking-start', 'calm-mind']) expect(programById(id), id).toBeDefined();
  });
  it('never recommends, never names a sum and never promises a result', () => {
    const words = GUIDED_PROGRAMS.flatMap(p => [p.title, p.summary, ...p.steps.flatMap(s => [s.title, s.note])]).join('\n');
    expect(words).not.toMatch(/recommend|you should|you must|guarantee|[$€£]\s?\d/i);
  });
  it('opens goal templates through the template library’s own addresses, pre-filled', () => {
    for (const t of GOAL_LIBRARY) expect(goalTemplateHref(t)).toBe(templateHref(t));
    const hrefs = GUIDED_PROGRAMS.flatMap(p => p.steps.map(s => s.action.href));
    expect(hrefs).toContain('/app/goals/new?template=emergency-fund');
    expect(hrefs).toContain('/app/goals/average/new?template=sleep-7h');
    expect(hrefs).toContain('/app/habits?add=habit');
  });
});

describe('Guided journeys: the device record', () => {
  it('is the loose, versioned key zigoals:guided-journeys:v1, empty when missing and refused when malformed', () => {
    expect(GUIDED_JOURNEYS_KEY).toBe('zigoals:guided-journeys:v1');
    expect(GUIDED_JOURNEYS.key).toBe(GUIDED_JOURNEYS_KEY);
    const s = memory();
    expect(readDeviceRecord(s, GUIDED_JOURNEYS)).toEqual({data: {version: 1, journeys: []}, unreadable: false});
    s.m.set(GUIDED_JOURNEYS_KEY, JSON.stringify({version: 2, journeys: []}));
    expect(readDeviceRecord(s, GUIDED_JOURNEYS).unreadable).toBe(true);
    s.m.set(GUIDED_JOURNEYS_KEY, JSON.stringify({version: 1, journeys: [{programId: 'trip', startedOn: '2026-02-30', done: []}]}));
    expect(readDeviceRecord(s, GUIDED_JOURNEYS).unreadable).toBe(true);
    // Loose: fields a later version adds are kept.
    const later = {version: 1, extra: 'kept', journeys: [{programId: 'trip', startedOn: '2026-10-01', done: ['fund'], endedOn: '2026-10-03', mood: 'kept'}]};
    s.m.set(GUIDED_JOURNEYS_KEY, JSON.stringify(later));
    expect(readDeviceRecord(s, GUIDED_JOURNEYS)).toEqual({data: later, unreadable: false});
  });
  it('holds at most 20 journeys and 50 done steps each', () => {
    const j = {programId: 'trip', startedOn: '2026-10-01', done: [] as string[], endedOn: '2026-10-02'};
    expect(guidedJourneysSchema.safeParse({version: 1, journeys: Array(MAX_JOURNEYS).fill(j)}).success).toBe(true);
    expect(guidedJourneysSchema.safeParse({version: 1, journeys: Array(MAX_JOURNEYS + 1).fill(j)}).success).toBe(false);
    expect(guidedJourneysSchema.safeParse({version: 1, journeys: [{...j, done: Array(51).fill('a')}]}).success).toBe(false);
  });
  it('writes only through the person’s change, validated', () => {
    const s = memory();
    updateDeviceRecord(s, GUIDED_JOURNEYS, r => startJourney(r, 'trip', '2026-10-29'));
    expect(JSON.parse(s.m.get(GUIDED_JOURNEYS_KEY)!)).toEqual({version: 1, journeys: [{programId: 'trip', startedOn: '2026-10-29', done: []}]});
  });
});

describe('Guided journeys: one step a day', () => {
  it('opens step i on the start date plus i days', () => {
    const r = started('sleep-reset', '2026-10-29'), j = r.journeys[0]!;
    expect(unlockedCount(j, sleep, '2026-10-29')).toBe(1);
    expect(unlockedSteps(j, sleep, '2026-10-29').map(s => s.id)).toEqual([sleep.steps[0]!.id]);
    expect(unlockedCount(j, sleep, '2026-10-30')).toBe(2);
    expect(unlockedCount(j, sleep, '2026-11-04')).toBe(7);
    expect(unlockedCount(j, sleep, '2027-05-01')).toBe(sleep.steps.length);
    // A clock moved back before the start day opens nothing.
    expect(unlockedCount(j, sleep, '2026-10-28')).toBe(0);
  });
  it('counts calendar days, so a daylight-saving change, a month end or a leap day never moves a step', () => {
    expect(daysBetween('2026-03-28', '2026-03-30')).toBe(2); // Europe springs forward on 29 March 2026
    expect(daysBetween('2026-10-24', '2026-10-26')).toBe(2); // and falls back on 25 October
    expect(daysBetween('2026-03-07', '2026-03-09')).toBe(2); // the US springs forward on 8 March
    expect(daysBetween('2026-12-31', '2027-01-01')).toBe(1);
    expect(daysBetween('2028-02-28', '2028-03-01')).toBe(2);
    expect(addCalendarDays('2026-10-24', 3)).toBe('2026-10-27');
    const j = started('emergency-fund', '2026-03-28').journeys[0]!;
    expect(unlockedCount(j, money, '2026-03-29')).toBe(2);
    expect(unlockedCount(j, money, '2026-03-30')).toBe(3);
    expect(() => daysBetween('2026-10-32', '2026-11-01')).toThrow(GuidedError);
  });
  it('names today’s step and the next closed one, which opens tomorrow', () => {
    const j = started('sleep-reset', '2026-10-29').journeys[0]!;
    const s = journeyState(j, sleep, '2026-10-30');
    expect(s.day).toBe(2);
    expect(s.today?.id).toBe(sleep.steps[1]!.id);
    expect(s.next).toEqual({number: 3, opensOn: '2026-10-31'});
    expect(journeyState(j, sleep, '2026-11-20').next).toBeNull();
    expect(journeyState(j, sleep, '2026-11-20').today).toBeNull();
    expect(journeyState(j, sleep, '2026-10-28').next).toEqual({number: 1, opensOn: '2026-10-29'});
  });
  it('writes a plain progress line', () => {
    let r = started('sleep-reset', '2026-10-29');
    expect(progressLine(r.journeys[0]!, sleep, '2026-10-31')).toBe('Day 3 of 7 · 0 of 7 steps done');
    expect(progressLine(r.journeys[0]!, sleep, '2026-10-28')).toBe('Step 1 has not opened yet · 0 of 7 steps done');
    r = markDone(r, 'sleep-reset', sleep.steps[0]!.id, '2026-10-31');
    expect(progressLine(r.journeys[0]!, sleep, '2026-12-01')).toBe('Every step is open · 1 of 7 steps done');
    for (const s of sleep.steps) r = markDone(r, 'sleep-reset', s.id, '2026-12-01');
    expect(progressLine(r.journeys[0]!, sleep, '2026-12-01')).toBe('All 7 steps done');
    expect(journeyState(r.journeys[0]!, sleep, '2026-12-01').complete).toBe(true);
  });
});

describe('Guided journeys: the person’s choices and the limits', () => {
  it('starts one active journey per program, at most three at once', () => {
    let r = started('sleep-reset', '2026-10-29');
    expect(() => startJourney(r, 'sleep-reset', '2026-10-30')).toThrow('You are already on this journey.');
    expect(startRefusal(r, 'sleep-reset')).toBe('You are already on this journey.');
    r = startJourney(r, 'trip', '2026-10-29');
    r = startJourney(r, 'calm-mind', '2026-10-29');
    expect(activeJourneys(r)).toHaveLength(MAX_ACTIVE);
    expect(() => startJourney(r, 'first-home', '2026-10-29')).toThrow('You have three journeys going. End one to start another.');
    expect(() => startJourney(emptyGuidedJourneys(), 'not-a-program', '2026-10-29')).toThrow(GuidedError);
    r = endJourney(r, 'trip', '2026-10-30');
    expect(activeJourneys(r).map(a => a.program.id)).toEqual(['sleep-reset', 'calm-mind']);
    r = startJourney(r, 'trip', '2026-10-30');
    expect(r.journeys.filter(j => j.programId === 'trip')).toHaveLength(2);
    expect(guidedJourneysSchema.parse(r)).toEqual(r);
  });
  it('makes room by dropping the oldest ended journey when the list is full, never an active one', () => {
    const ended = (i: number) => ({programId: 'trip', startedOn: addCalendarDays('2026-01-01', i), done: [], endedOn: addCalendarDays('2026-01-02', i)});
    const full: GuidedJourneys = {version: 1, journeys: Array.from({length: MAX_JOURNEYS}, (_, i) => ended(i))};
    const r = startJourney(full, 'calm-mind', '2026-10-29');
    expect(r.journeys).toHaveLength(MAX_JOURNEYS);
    expect(r.journeys[0]!.startedOn).toBe('2026-01-02');
    expect(r.journeys.at(-1)).toEqual({programId: 'calm-mind', startedOn: '2026-10-29', done: []});
    const unknownActive: GuidedJourneys = {version: 1, journeys: Array.from({length: MAX_JOURNEYS}, (_, i) => ({programId: `gone-${i}`, startedOn: '2026-01-01', done: []}))};
    expect(() => startJourney(unknownActive, 'calm-mind', '2026-10-29')).toThrow('Your list of journeys is full. End one to start another.');
  });
  it('ticks done and undoes only steps that are open', () => {
    let r = started('emergency-fund', '2026-10-29');
    const [first, second, third] = money.steps;
    expect(() => markDone(r, 'emergency-fund', second!.id, '2026-10-29')).toThrow('This step is not open yet.');
    r = markDone(r, 'emergency-fund', first!.id, '2026-10-29');
    expect(markDone(r, 'emergency-fund', first!.id, '2026-10-29')).toEqual(r);
    r = markDone(r, 'emergency-fund', third!.id, '2026-10-31');
    r = markDone(r, 'emergency-fund', second!.id, '2026-10-31');
    expect(activeJourneyFor(r, 'emergency-fund')!.done).toEqual([first!.id, second!.id, third!.id]);
    r = undoDone(r, 'emergency-fund', second!.id, '2026-10-31');
    expect(activeJourneyFor(r, 'emergency-fund')!.done).toEqual([first!.id, third!.id]);
    expect(() => undoDone(r, 'emergency-fund', money.steps[5]!.id, '2026-10-31')).toThrow('This step is not open yet.');
    expect(() => markDone(r, 'trip', 'fund', '2026-10-31')).toThrow('This journey is not active.');
  });
  it('ends a journey on today’s date, keeps its ticks and stops it opening steps', () => {
    let r = markDone(started('emergency-fund', '2026-10-29'), 'emergency-fund', money.steps[0]!.id, '2026-10-29');
    r = endJourney(r, 'emergency-fund', '2026-10-31');
    const j = r.journeys[0]!;
    expect(j).toEqual({programId: 'emergency-fund', startedOn: '2026-10-29', done: [money.steps[0]!.id], endedOn: '2026-10-31'});
    expect(unlockedCount(j, money, '2026-11-20')).toBe(3);
    expect(activeJourneyFor(r, 'emergency-fund')).toBeUndefined();
    expect(() => markDone(r, 'emergency-fund', money.steps[1]!.id, '2026-10-31')).toThrow('This journey is not active.');
    expect(() => endJourney(r, 'emergency-fund', '2026-10-31')).toThrow('This journey is not active.');
    // A clock moved back never ends a journey before the day it started.
    expect(endJourney(started('trip', '2026-10-29'), 'trip', '2026-10-27').journeys[0]!.endedOn).toBe('2026-10-29');
  });
});

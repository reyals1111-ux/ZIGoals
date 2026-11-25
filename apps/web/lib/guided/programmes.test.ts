import {describe, expect, it} from 'vitest';
import {GUIDED_PROGRAMS, PROGRAMME_CARE, programById, type GuidedProgram} from './programs';
import {GUIDES} from '../meditation/guides';
import {MAX_DONE, emptyGuidedJourneys, guidedJourneysSchema, type GuidedJourneys} from './schema';
import {activeJourneyFor, dayProgress, isStepDone, journeyState, markDone, programmeToday, progressLine, startJourney, stepKeyOf, tickStep, undoDone, unlockedCount, untickStep} from './engine';

/**
 * Session AW (programmes; owner decision 1d, ADR-046): the five written programmes' structure, and progress by day and by
 * step in the existing Guided journeys record.
 */
const PROGRAMMES = GUIDED_PROGRAMS.filter((p): p is GuidedProgram & {days: NonNullable<GuidedProgram['days']>} => !!p.days);
const strength = programById('strength-start')!, run = programById('run-5k')!, habit = programById('habit-start')!, sleep = programById('sleep-reset')!, med = programById('meditation-start')!;
const journey = (r: GuidedJourneys, id: string) => activeJourneyFor(r, id)!;

describe('Written programmes: structure', () => {
  it('are the five of owner decision 1d, with their lengths', () => {
    expect(PROGRAMMES.map(p => [p.id, p.days.length])).toEqual([['sleep-reset', 7], ['strength-start', 12], ['run-5k', 24], ['habit-start', 14], ['meditation-start', 10]]);
    expect(strength.weeks).toBe(4);
    expect(run.weeks).toBe(8);
  });
  it('gives every day steps, each with a title, a written instruction and a link inside the app', () => {
    for (const p of PROGRAMMES) {
      expect(p.days.length, p.id).toBeLessThanOrEqual(MAX_DONE);
      expect(new Set(p.days.map(d => d.id)).size, p.id).toBe(p.days.length);
      p.days.forEach((d, i) => {
        const where = `${p.id}/${d.id}`;
        expect(d.id, where).toMatch(/^[a-z0-9-]{1,60}$/);
        expect(d.steps.length, where).toBeGreaterThanOrEqual(1);
        expect(d.steps.length, where).toBeLessThanOrEqual(8);
        expect(new Set(d.steps.map(s => s.id)).size, where).toBe(d.steps.length);
        expect(d.title.trim().length, where).toBeGreaterThan(5);
        expect(d.note.trim().length, where).toBeGreaterThan(10);
        expect(d.note.length, where).toBeLessThanOrEqual(200);
        if (i > 0) expect(d.offset, where).toBeGreaterThan(p.days[i - 1]!.offset);
        expect(p.steps[i], where).toEqual({id: d.id, title: d.title, note: d.note, action: d.steps[0]!.action});
        for (const s of d.steps) {
          expect(s.id, `${where}/${s.id}`).toMatch(/^[a-z0-9-]{1,60}$/);
          expect(stepKeyOf(d.id, s.id)).toMatch(/^[a-z0-9-]{1,60}\/[a-z0-9-]{1,60}$/);
          expect(s.title.trim().length, `${where}/${s.id}`).toBeGreaterThan(5);
          expect(s.detail.trim().length, `${where}/${s.id}`).toBeGreaterThan(10);
          expect(s.detail.length, `${where}/${s.id}`).toBeLessThanOrEqual(400);
          expect(s.action.href.startsWith('/app/'), s.action.href).toBe(true);
          expect(new URL(s.action.href, 'https://example.test').origin).toBe('https://example.test');
          expect(s.action.label.trim().length).toBeGreaterThan(3);
        }
      });
    }
  });
  it('shows the care line on every health programme, and the habit starter is not a health programme', () => {
    expect(PROGRAMME_CARE).toBe('General guidance, not medical advice; stop if something hurts.');
    for (const p of PROGRAMMES.filter(x => x.pillar === 'health')) expect(p.care?.startsWith(PROGRAMME_CARE), p.id).toBe(true);
    expect(habit.pillar).toBe('habits');
  });
  it('promises nothing and tells no one what they must do', () => {
    const words = PROGRAMMES.flatMap(p => [p.title, p.summary, ...p.days.flatMap(d => [d.title, d.note, ...d.steps.flatMap(s => [s.title, s.detail])])]).join('\n');
    expect(words).not.toMatch(/recommend|you should|you must|guarantee|you will (?:be|get|lose|feel)|results? in|burn|kcal|calorie|lose weight|cure|treat/i);
  });
  it('links each step to the place it is done: Workouts, Run (Activity), Habits, Sleep, Meditation', () => {
    const hrefs = (p: GuidedProgram) => new Set(p.days!.flatMap(d => d.steps.map(s => s.action.href.replace(/[?#].*$/, '') + (s.action.href.match(/view=\w+|tab=\w+|add=\w+|#\w+/)?.[0] ?? ''))));
    expect([...hrefs(strength)].sort()).toEqual(['/app/healthview=meditation', '/app/healthview=workouts']);
    expect([...hrefs(run)].sort()).toEqual(['/app/healthtab=activity', '/app/healthview=meditation', '/app/healthview=workouts']);
    expect(hrefs(sleep)).toContain('/app/healthview=sleep');
    expect(hrefs(med)).toContain('/app/healthview=meditation');
    expect(hrefs(habit)).toContain('/app/habits');
    expect(hrefs(habit)).toContain('/app/habitsadd=habit');
  });
  it('plans three sessions a week with a rest day after each: days 1, 3 and 5 of each week', () => {
    for (const p of [strength, run]) {
      const byWeek = new Map<number, number[]>();
      for (const d of p.days!) byWeek.set(d.week!, [...(byWeek.get(d.week!) ?? []), d.offset - (d.week! - 1) * 7]);
      expect(byWeek.size, p.id).toBe(p.weeks);
      for (const offsets of byWeek.values()) expect(offsets).toEqual([0, 2, 4]);
    }
    // The sets grow week by week; the walk-and-run plan starts with one-minute runs and ends at 5 km or 30 minutes.
    expect(strength.days![0]!.steps.map(s => s.title)).toContain('Squat to a chair: 2 × 8');
    expect(strength.days![11]!.steps.map(s => s.title)).toContain('Plank on your knees: 3 × 25 seconds');
    expect(run.days![0]!.title).toBe('Run 60 seconds, walk 90 seconds: 8 times');
    expect(run.days![23]!.title).toBe('Run 5 km or 30 minutes, whichever comes first');
  });
  it('builds the meditation starter from the written guides, word for word', () => {
    for (const d of med.days!) {
      const read = d.steps.find(s => s.id === 'read')!;
      const g = GUIDES.find(x => read.title.includes(`“${x.en.title}”`));
      expect(g, d.id).toBeDefined();
      expect(read.detail).toBe(g!.en.steps.join(' '));
      expect(d.title).toBe(`${g!.en.title}, ${g!.minutes} minutes`);
    }
    expect(new Set(med.days!.map(d => d.title)).size).toBe(10);
  });
  it('keeps the sleep reset’s seven Session AJ steps as its days, so an older build’s journey carries on', () => {
    expect(sleep.steps.map(s => s.id)).toEqual(['log', 'wake', 'caffeine', 'wind-down', 'evening', 'phone', 'goal']);
    expect(sleep.steps[0]).toEqual({id: 'log', title: 'Log last night’s sleep', note: 'Just as it was. No judging: this is your starting point.', action: {kind: 'link', href: '/app/health?view=sleep', label: 'Open Sleep'}});
    expect(sleep.days!.map(d => d.offset)).toEqual([0, 1, 2, 3, 4, 5, 6]);
  });
});

describe('Written programmes: progress', () => {
  it('opens weekly sessions on their own days; between them is a rest day', () => {
    const r = startJourney(emptyGuidedJourneys(), 'strength-start', '2026-11-02'), j = journey(r, 'strength-start');
    expect(unlockedCount(j, strength, '2026-11-02')).toBe(1);
    expect(unlockedCount(j, strength, '2026-11-03')).toBe(1);
    expect(unlockedCount(j, strength, '2026-11-04')).toBe(2);
    expect(unlockedCount(j, strength, '2026-11-09')).toBe(4);
    expect(programmeToday(j, strength, '2026-11-02')).toMatchObject({kind: 'day', number: 1, day: {id: 's1'}});
    expect(programmeToday(j, strength, '2026-11-03')).toEqual({kind: 'rest', next: {day: strength.days![1], number: 2, opensOn: '2026-11-04'}});
    expect(programmeToday(j, strength, '2026-11-01')).toEqual({kind: 'before', opensOn: '2026-11-02'});
    expect(journeyState(j, strength, '2026-11-03').today).toBeNull();
    expect(journeyState(j, strength, '2026-11-03').next).toEqual({number: 2, opensOn: '2026-11-04'});
    expect(progressLine(j, strength, '2026-11-10')).toBe('Week 2 of 4 · 0 of 12 sessions done');
    expect(programmeToday(j, strength, '2027-01-01')).toEqual({kind: 'after'});
    expect(programmeToday(j, programById('trip')!, '2026-11-02')).toBeNull();
  });
  it('ticks steps one by one; the last tick makes the day done and its step ticks leave the record', () => {
    let r = startJourney(emptyGuidedJourneys(), 'run-5k', '2026-11-02');
    const day = run.days![0]!;
    expect(() => tickStep(r, 'run-5k', 'w1-r2', 'warm-up', '2026-11-02')).toThrow('This step is not open yet.');
    expect(() => tickStep(r, 'run-5k', 'w1-r1', 'nope', '2026-11-02')).toThrow('This step is not part of the day.');
    expect(() => tickStep(r, 'run-5k', 'nope', 'warm-up', '2026-11-02')).toThrow('This day is not part of the programme.');
    r = tickStep(r, 'run-5k', 'w1-r1', 'warm-up', '2026-11-02');
    expect(tickStep(r, 'run-5k', 'w1-r1', 'warm-up', '2026-11-02')).toEqual(r);
    expect(journey(r, 'run-5k')).toMatchObject({done: [], stepsDone: ['w1-r1/warm-up']});
    expect(dayProgress(journey(r, 'run-5k'), day)).toEqual({done: 1, total: 4});
    for (const s of day.steps.slice(1)) r = tickStep(r, 'run-5k', 'w1-r1', s.id, '2026-11-02');
    expect(journey(r, 'run-5k')).toMatchObject({done: ['w1-r1'], stepsDone: []});
    expect(day.steps.every(s => isStepDone(journey(r, 'run-5k'), day, s))).toBe(true);
    expect(guidedJourneysSchema.parse(r)).toEqual(r);
    // Unticking one step of a done day: the day is open again and the others stay ticked.
    r = untickStep(r, 'run-5k', 'w1-r1', 'main', '2026-11-03');
    expect(journey(r, 'run-5k').done).toEqual([]);
    expect(journey(r, 'run-5k').stepsDone).toEqual(['w1-r1/warm-up', 'w1-r1/cool-down', 'w1-r1/log']);
    r = untickStep(r, 'run-5k', 'w1-r1', 'log', '2026-11-03');
    expect(journey(r, 'run-5k').stepsDone).toEqual(['w1-r1/warm-up', 'w1-r1/cool-down']);
  });
  it('marks a whole day done, or takes it back, with its steps', () => {
    let r = startJourney(emptyGuidedJourneys(), 'habit-start', '2026-11-02');
    r = tickStep(r, 'habit-start', 'd1', 'choose', '2026-11-02');
    r = markDone(r, 'habit-start', 'd1', '2026-11-02');
    expect(journey(r, 'habit-start')).toMatchObject({done: ['d1'], stepsDone: []});
    expect(progressLine(journey(r, 'habit-start'), habit, '2026-11-02')).toBe('Day 1 of 14 · 1 of 14 days done');
    r = undoDone(r, 'habit-start', 'd1', '2026-11-02');
    expect(journey(r, 'habit-start')).toMatchObject({done: [], stepsDone: []});
    expect(dayProgress(journey(r, 'habit-start'), habit.days![0]!)).toEqual({done: 0, total: 2});
  });
  it('a journey that never had step ticks gets no new field from a whole-day tick (older builds see the same shape)', () => {
    let r = startJourney(emptyGuidedJourneys(), 'sleep-reset', '2026-11-02');
    r = markDone(r, 'sleep-reset', 'log', '2026-11-02');
    expect(r.journeys[0]).toEqual({programId: 'sleep-reset', startedOn: '2026-11-02', done: ['log']});
    // A day an older build ticked (in `done`) shows its steps ticked here.
    expect(dayProgress(r.journeys[0]!, sleep.days![0]!)).toEqual({done: 2, total: 2});
  });
  it('counts a whole programme done', () => {
    let r = startJourney(emptyGuidedJourneys(), 'meditation-start', '2026-11-02');
    for (const d of med.days!) r = markDone(r, 'meditation-start', d.id, '2026-11-20');
    expect(progressLine(journey(r, 'meditation-start'), med, '2026-11-20')).toBe('All 10 days done');
    expect(programmeToday(journey(r, 'meditation-start'), med, '2026-11-20')).toEqual({kind: 'complete'});
    expect(progressLine(journey(startJourney(emptyGuidedJourneys(), 'run-5k', '2026-11-02'), 'run-5k'), run, '2027-02-01')).toBe('Every run is open · 0 of 24 runs done');
  });
});

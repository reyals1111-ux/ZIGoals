import {afterEach, describe, expect, it} from 'vitest';
import {setCurrentDayEnds} from '../day-boundary-core';
import {deviceDay, tasksClock, tasksToday} from './device';

// Session AU (ADR-044 F-5, the rehearsal's Max): the tasks' day follows "My day ends at" like Habits and the Checklist.
describe('tasks follow the person\'s day end', () => {
  afterEach(() => setCurrentDayEnds({version: 1, endsAt: 0}));
  const at = (h: number, m = 0) => new Date(2026, 10, 24, h, m); // Tue 24 Nov, this device's zone

  it('at midnight (the default) the calendar day and the clock, exactly as before', () => {
    expect(tasksToday(at(1, 30))).toBe('2026-11-24');
    expect(tasksClock(at(1, 30))).toBe('01:30');
    expect(deviceDay(at(1, 30).toISOString())).toBe('2026-11-24');
  });
  it('with the day ending at 03:00, 01:30 on Tuesday is still Monday, and every time of Monday has passed', () => {
    setCurrentDayEnds({version: 1, endsAt: 180});
    expect(tasksToday(at(1, 30))).toBe('2026-11-23');
    expect(tasksClock(at(1, 30))).toBe('23:59');
    expect(deviceDay(at(2, 30).toISOString())).toBe('2026-11-23');
  });
  it('after the day end the calendar day and the real clock again', () => {
    setCurrentDayEnds({version: 1, endsAt: 180});
    expect(tasksToday(at(3, 30))).toBe('2026-11-24');
    expect(tasksClock(at(9, 5))).toBe('09:05');
  });
});

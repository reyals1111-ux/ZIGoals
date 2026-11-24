import {expect, test} from 'vitest';
import {coachCheckIn} from '../../health-aa/coach';
import {toolEnv, type ToolSources} from './env';
import {DAY, gatesFor, showcaseSources} from './fixtures';
import {HEALTH_CLOSED} from './format';
import {runTool, toolByName} from './registry';

// Session AJ (item 9; real-model sp-aa-coach-keep-*): the weekly coach check-in is readable by ZIGi, under the Health gate.
const open = (sources: ToolSources) => toolEnv(sources, gatesFor(true), 'provider');
test('coach_checkin reads the week as Health → Your coach shows it, and its answer on this device', () => {
  const sources = showcaseSources(), expected = coachCheckIn(sources.health, {version: 1}, DAY);
  const result = runTool('coach_checkin', {}, open(sources));
  if (!result.ok) throw new Error(result.refusal);
  expect(result.data).toMatchObject({weekStart: expected.weekStart, answeredThisWeek: 'not yet', week: expected.sentence, canAsk: expected.rateGrams !== null});
  expect(result.data.note).toBe('An estimate from the person\'s own logs, not medical advice.');
  const answered = runTool('coach_checkin', {}, open({...sources, coach: {version: 1, answers: {[expected.weekStart]: {weekStart: expected.weekStart, answer: 'keep', at: `${DAY}T08:00:00.000Z`}}} as ToolSources['coach']}));
  expect(answered.ok && answered.data.answeredThisWeek).toBe('keep');
  expect(runTool('coach_checkin', {}, toolEnv(sources, gatesFor(false), 'provider'))).toMatchObject({ok: false, reason: 'gate', refusal: HEALTH_CLOSED});
  expect(toolByName('coach_checkin')?.area).toBe('health');
});
test('coach_checkin reads the person’s check-in day, partly logged days and chosen pace (Session AV lane 2, LEDGER #106, #107)', () => {
  const sources = showcaseSources(), foodPlus = {version: 1 as const, checkIn: {weekday: 5, partial: [DAY]}, pace: -0.25};
  const expected = coachCheckIn(sources.health, {version: 1}, DAY, 'kg', {checkInWeekday: 5, partialDays: new Set([DAY]), paceKg: -0.25});
  const monday = coachCheckIn(sources.health, {version: 1}, DAY);
  expect(expected.weekStart).not.toBe(monday.weekStart);
  const result = runTool('coach_checkin', {}, open({...sources, foodPlus}));
  if (!result.ok) throw new Error(result.refusal);
  expect(result.data).toMatchObject({weekStart: expected.weekStart, week: expected.sentence, suggestedTargetKcal: expected.suggestion?.kcal ?? 'not ready yet (the energy estimate needs about two weeks of logs)'});
  // With Health closed the record is not even in the environment.
  expect(toolEnv({...sources, foodPlus}, gatesFor(false), 'provider').foodPlus).toBeNull();
  expect(open({...sources, foodPlus}).foodPlus).toEqual(foodPlus);
});

import {expect, test} from 'vitest';
import {createEmptyHealth, healthSchema} from '../../../health';
import {buildShowcase} from '../../../showcase-data';
import {workoutsSchema} from '../../../workouts/schema';
import {asOfDay, bodyScan, bodyWords, healthVitals, scanRows, scanWords} from './health-scan';

/** Session AS (ADR-042 Part 2, scanners): the scan and the body scan read the Showcase's Health records of 17 November 2026 as the answer "how is my health" does. */
const DAY = '2026-11-17', records = buildShowcase(DAY, 'UTC').records;
const health = healthSchema.parse(JSON.parse(records['zigoals:health:v1']!)), workouts = workoutsSchema.parse(JSON.parse(records['zigoals:workouts:v1']!));

test('the health scan: last night, today’s steps and water, the latest weight, each with its day and target; no heart card without a record', () => {
  const view = healthVitals(health, workouts, DAY);
  expect(view.vitals.map(v => v.key)).toEqual(['sleep', 'steps', 'water', 'weight']); // no resting heart rate is recorded: no card, and nothing called missing
  // The night of 16 to 17 November: 8 h in bed, 22 min to fall asleep, 21 min awake.
  expect(view.vitals[0]).toMatchObject({value: '7 h 17 min', asOf: 'last night', target: 'of your 8 h goal', date: DAY});
  expect(view.vitals[0]!.share).toBeCloseTo(437 / 480, 5);
  expect(view.vitals[1]).toMatchObject({value: '8,800 steps', asOf: 'today', target: 'of your 8,000 steps target', share: 1});
  expect(view.vitals[2]).toMatchObject({value: '1,000 mL', asOf: 'today', target: 'of your 2,000 mL target', share: .5});
  expect(view.vitals[3]).toMatchObject({value: '73.48 kg', asOf: 'yesterday', target: 'your goal: 72 kg', share: null, date: '2026-11-16'});
  expect(view).toMatchObject({recorded: 4, missing: [], workoutsThisWeek: 1}); // Push day on Monday 16 November
  expect(scanWords(view)).toMatchObject({figure: '4', unit: 'of 5', label: 'measures on record', note: 'The latest of each, with its own day · 1 day with a workout this week'});
  expect(scanRows(view)).toContainEqual(['Steps today', '8,800 steps, today, of your 8,000 steps target']);
  expect(scanRows(view).at(-1)).toEqual(['The heart', 'Decoration, not a live measurement']);
  // The workout log not read: the fact is left out, never said as zero.
  expect(healthVitals(health, null, DAY).workoutsThisWeek).toBeNull();
  expect(scanRows(healthVitals(health, null, DAY)).some(r => /workout/i.test(r[0]))).toBe(false);
});
test('the health scan on another day: a measure with nothing recorded is unknown, never zero', () => {
  const view = healthVitals(health, workouts, '2026-11-10'); // no water logged on 10 November
  expect(view.vitals.find(v => v.key === 'water')).toMatchObject({value: null, share: null, words: 'Nothing recorded today', target: 'of your 2,000 mL target'});
  expect(view.missing).toEqual(['Water']); expect(view.recorded).toBe(3);
  expect(asOfDay('2026-11-08', '2026-11-10')).toBe('Sun, Nov 8'); expect(asOfDay('2025-12-31', '2026-01-02')).toMatch(/2025/);
});
test('the body scan: the waist and the weight are on record, the other places were never measured', () => {
  const view = bodyScan(health, DAY);
  expect(view.parts.map(p => [p.kind, p.value])).toEqual([['chest', null], ['arm', null], ['waist', '84 cm'], ['hips', null], ['thigh', null], ['weight', '73.48 kg']]);
  expect(view.parts[2]).toMatchObject({asOf: 'today', change: 'down 2 cm since Oct 13', words: '84 cm, today, down 2 cm since Oct 13'}); // 86 cm on 13 October
  expect(view.parts[5]).toMatchObject({asOf: 'yesterday', change: null});
  expect(view.parts[0]!.words).toBe('Not measured yet');
  expect(view.recorded).toBe(2); expect(view.newest?.kind).toBe('waist');
  expect(bodyWords(view)).toMatchObject({figure: '84', unit: 'cm', label: 'waist · measured today', note: 'Down 2 cm since Oct 13 · 2 of 6 places on record'});
  // A day before the second tape measurement: one reading, so no change to state.
  expect(bodyScan(health, '2026-10-14').parts[2]).toMatchObject({value: '86 cm', asOf: 'yesterday', change: null});
});
test('nothing recorded: every vital is unknown and no place is measured', () => {
  const view = healthVitals(createEmptyHealth(), null, DAY);
  expect(view.recorded).toBe(0); expect(view.vitals.every(v => v.value === null && v.share === null)).toBe(true);
  expect(view.vitals.map(v => v.key)).toEqual(['sleep', 'steps', 'water', 'weight']);
  const body = bodyScan(createEmptyHealth(), DAY);
  expect(body).toMatchObject({recorded: 0, newest: null}); expect(body.parts.every(p => p.value === null)).toBe(true);
  expect(bodyWords(body).figure).toBe('—');
});

import {describe, expect, test} from 'vitest';
import {beforeAfter, clampPosition, daysApart, poseNote, positionText} from './compare';

const a = {id: 'photo_a', date: '2026-09-01', at: '2026-09-01T07:00:00.000Z', pose: 'front'}, b = {id: 'photo_b', date: '2026-10-13', at: '2026-10-13T07:00:00.000Z', pose: 'side'};
describe('progress photo compare slider', () => {
  test('the older photo is before, whichever was picked first', () => {
    expect(beforeAfter(b, a)).toEqual({before: a, after: b});
    expect(beforeAfter(a, b)).toEqual({before: a, after: b});
    const same = {...a, id: 'photo_c', at: '2026-09-01T09:00:00.000Z'};
    expect(beforeAfter(same, a).before.id).toBe('photo_a');
  });
  test('days apart and the pose note', () => {
    expect(daysApart(a, b)).toBe(42); expect(daysApart(b, a)).toBe(42);
    expect(poseNote(a, a)).toBeNull();
    expect(poseNote(a, b)).toBe('Different poses (front and side): the comparison may mislead.');
  });
  test('positions stay whole within 0–100 and read in words', () => {
    expect(clampPosition(-3)).toBe(0); expect(clampPosition(140)).toBe(100); expect(clampPosition(Number.NaN)).toBe(50); expect(clampPosition(33.6)).toBe(34);
    expect(positionText(0)).toBe('After only'); expect(positionText(100)).toBe('Before only'); expect(positionText(30)).toBe('30% before, 70% after');
  });
});

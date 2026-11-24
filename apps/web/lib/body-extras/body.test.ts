import {describe, expect, test} from 'vitest';
import {bmiOf, markCelebrated, marksOf, milestoneView, reachMilestones, setHeight, toCelebrate, turnOffMilestones, turnOnMilestones} from './body';
import {emptyBodyExtras} from './schema';

/** Session AV lane 2 (body; LEDGER #205, #210; Yazio): a BMI figure only; weight milestones celebrated once. */
describe('BMI', () => {
  test('weight ÷ height², one decimal; a height is checked', () => {
    expect(bmiOf(180, 81_000)).toBe(25);
    expect(bmiOf(165, 58_300)).toBe(21.4);
    expect(bmiOf(40, 58_300)).toBeNull();
    expect(setHeight(emptyBodyExtras(), 182.34).heightCm).toBe(182.3);
    expect(setHeight(setHeight(emptyBodyExtras(), 180), null).heightCm).toBeUndefined();
    expect(() => setHeight(emptyBodyExtras(), 300)).toThrow('50 to 272');
  });
});
describe('weight milestones', () => {
  const on = turnOnMilestones(emptyBodyExtras(), {step: '2kg', startGrams: 84_000, goalGrams: 78_500, today: '2026-10-01'});
  test('every 2 kg towards the goal, the goal last; every tenth of the way; upwards too', () => {
    expect(marksOf(on.milestones!).map(m => m.grams)).toEqual([82_000, 80_000, 78_500]);
    expect(marksOf({step: '10pct', startGrams: 80_000, goalGrams: 70_000}).map(m => m.grams)).toEqual([79_000, 78_000, 77_000, 76_000, 75_000, 74_000, 73_000, 72_000, 71_000, 70_000]);
    expect(marksOf({step: '2kg', startGrams: 60_000, goalGrams: 63_000}).map(m => m.grams)).toEqual([62_000, 63_000]);
    expect(() => turnOnMilestones(emptyBodyExtras(), {step: '2kg', startGrams: 70_000, goalGrams: 70_200, today: '2026-10-01'})).toThrow('already at your weight goal');
  });
  test('a reading reaches steps once, with its day; Thanks celebrates once; a step back is not a second celebration', () => {
    let r = reachMilestones(on, 81_800, '2026-10-20');
    expect(r.milestones!.reached).toEqual([{index: 1, on: '2026-10-20'}]);
    expect(toCelebrate(r).map(x => x.index)).toEqual([1]);
    r = markCelebrated(r, new Date('2026-10-20T08:00:00Z'));
    expect(toCelebrate(r)).toEqual([]);
    expect(reachMilestones(r, 82_500, '2026-10-25')).toBe(r); // a step back: nothing new
    expect(reachMilestones(r, 81_000, '2026-10-26')).toBe(r); // past the first again: not a second one
    r = reachMilestones(r, 78_400, '2026-11-20');
    expect(milestoneView(r)).toMatchObject({done: 3, total: 3, next: null, down: true});
    expect(toCelebrate(r).map(x => x.index)).toEqual([2, 3]);
    expect(turnOffMilestones(r).milestones).toBeUndefined();
  });
});

import {describe, expect, test} from 'vitest';
import {MAX_CLAIMS, MAX_REWARDS, REWARDS_SHELF_KEY, addReward, canClaim, claimReward, emptyRewardsShelf, pointsAvailable, pointsSpent, pointsToGo, removeReward, rewardsShelfSchema, setShelfOn, timesClaimed, undoClaim, type RewardsShelf} from './store';

const AT = '2026-10-31T12:00:00.000Z';
const shelf = (): RewardsShelf => addReward(addReward(setShelfOn(emptyRewardsShelf(), true), {id: 'r1', name: '  A film night ', price: 200, at: AT}), {id: 'r2', name: 'New book', price: 500, at: AT});

describe('the rewards shelf (COMPETITORS item 19): treats priced in the XP the game layer already derives', () => {
  test('its own versioned, loose key; off and empty by default', () => {
    expect(REWARDS_SHELF_KEY).toBe('zigoals:rewards-shelf:v1');
    expect(emptyRewardsShelf()).toEqual({version: 1});
    expect(rewardsShelfSchema.parse({version: 1, later: true})).toEqual({version: 1, later: true});
    expect(rewardsShelfSchema.safeParse({version: 2}).success).toBe(false);
  });
  test('treats: trimmed names, whole prices 1–100,000, at most 50', () => {
    const s = shelf();
    expect(s.rewards!.map(r => [r.name, r.price])).toEqual([['A film night', 200], ['New book', 500]]);
    for (const price of [0, -5, 1.5, 100_001, Number.NaN]) expect(() => addReward(s, {id: 'x', name: 'Treat', price, at: AT}), String(price)).toThrow();
    expect(() => addReward(s, {id: 'x', name: '   ', price: 10, at: AT})).toThrow('Give the treat a name.');
    let full = emptyRewardsShelf();
    for (let i = 0; i < MAX_REWARDS; i++) full = addReward(full, {id: `r${i}`, name: `T${i}`, price: 1, at: AT});
    expect(() => addReward(full, {id: 'more', name: 'More', price: 1, at: AT})).toThrow();
  });
  test('points: XP minus what was claimed, never below zero; no debt', () => {
    const s = shelf();
    expect(pointsAvailable(s, 650)).toBe(650);
    expect(canClaim(s, {price: 500}, 499)).toBe(false);
    expect(pointsToGo(s, {price: 500}, 499)).toBe(1);
    expect(() => claimReward(s, 'r2', 499, {id: 'c1', at: AT})).toThrow('1 more points to go');
    const claimed = claimReward(s, 'r2', 650, {id: 'c1', at: AT});
    expect(pointsSpent(claimed)).toBe(500);
    expect(pointsAvailable(claimed, 650)).toBe(150);
    expect(timesClaimed(claimed, 'r2')).toBe(1);
    // Undo on Habits lowers the XP under what was spent: the shelf shows 0, never a negative number, and nothing is taken.
    expect(pointsAvailable(claimed, 300)).toBe(0);
    expect(pointsAvailable(claimed, Number.NaN)).toBe(0);
    expect(claimed.claims).toHaveLength(1);
  });
  test('a claim keeps its price at the time; Undo gives the points back; a removed treat keeps its past claims', () => {
    const claimed = claimReward(shelf(), 'r1', 1000, {id: 'c1', at: AT});
    expect(claimed.claims![0]).toMatchObject({rewardId: 'r1', price: 200});
    expect(pointsAvailable(undoClaim(claimed, 'c1'), 1000)).toBe(1000);
    const removed = removeReward(claimed, 'r1');
    expect(removed.rewards!.map(r => r.id)).toEqual(['r2']);
    expect(pointsSpent(removed)).toBe(200);
    expect(() => claimReward(removed, 'r1', 1000, {id: 'c2', at: AT})).toThrow('no longer on the shelf');
  });
  test('claims are bounded and refused past the cap, never dropped', () => {
    let s = addReward(emptyRewardsShelf(), {id: 'r', name: 'Tea', price: 1, at: AT});
    s = {...s, claims: Array.from({length: MAX_CLAIMS}, (_, i) => ({id: `c${i}`, rewardId: 'r', price: 1, at: AT}))};
    expect(() => claimReward(s, 'r', 10_000, {id: 'last', at: AT})).toThrow();
    expect(rewardsShelfSchema.safeParse({...s, claims: [...s.claims!, s.claims![0]]}).success).toBe(false);
  });
});

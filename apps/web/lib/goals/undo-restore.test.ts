import {describe, expect, it} from 'vitest';
import {restoreGoal} from './extras-restore';
import {emptyGoalExtras, goalExtrasSchema, setGoalArea, setGoalCardArt} from '../goal-extras/store';
import {emptySavingsChallenges, removeChallenge, setChallenge, savingsChallengesSchema} from '../savings-challenges/challenges';

// Session AL (A7, PRIMITIVES.md): the Goals Undos moved onto showUndo; each restore puts the stored record back exactly.
const at = '2026-11-04T10:00:00.000Z';
describe('Goals Undo restores the store record', () => {
  it('goal extras (artwork, area): Undo puts back only that goal, as it was', () => {
    const before = setGoalArea(setGoalCardArt(emptyGoalExtras(), 'private:1', 'track', at), 'private:2', 'health', at);
    const changed = setGoalCardArt(before, 'private:1', 'kitchen', at);
    // Another goal changed meanwhile; Undo keeps that change.
    const latest = setGoalArea(changed, 'private:2', 'mind', at);
    const back = restoreGoal(latest, 'private:1', before.goals['private:1']);
    expect(back.goals['private:1']).toEqual(before.goals['private:1']);
    expect(back.goals['private:2']).toEqual(latest.goals['private:2']);
    expect(() => goalExtrasSchema.parse(back)).not.toThrow();
    // A goal that had no extras: Undo removes what was added.
    expect(restoreGoal(setGoalCardArt(before, 'private:3', 'garden', at), 'private:3', undefined).goals['private:3']).toBeUndefined();
  });
  it('a stopped savings challenge comes back exactly', () => {
    const c = {kind: '52-week' as const, startedOn: '2026-11-02', step: '1', order: 'up' as const};
    const started = setChallenge(emptySavingsChallenges(), '7', c);
    const stopped = removeChallenge(started, '7');
    expect(stopped.goals['7']).toBeUndefined();
    const back = setChallenge(stopped, '7', started.goals['7']!);
    expect(back).toEqual(started);
    expect(() => savingsChallengesSchema.parse(back)).not.toThrow();
  });
});

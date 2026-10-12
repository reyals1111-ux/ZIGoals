import {describe, expect, it} from 'vitest';
import {readDeviceRecord} from '../device-record';
import {GOAL_EXTRAS, GOAL_EXTRAS_KEY, addCustomArea, ancestorsOf, areasOf, childrenOf, emptyGoalExtras, goalExtrasSchema, liveParent, moveGoalExtras, reconcileGoalExtras, removeCustomArea, setGoalArea, setGoalParent, setGoalReasons, setGoalStory, setGoalVision} from './store';

const at = '2026-10-11T12:00:00.000Z';
const mem = (raw: string | null) => ({getItem: (k: string) => (k === GOAL_EXTRAS_KEY ? raw : null)});

describe('goal extras (Session AA-Cloud Part 2, device-only)', () => {
  it('reads a missing record as empty and refuses nothing it does not know (loose, versioned)', () => {
    expect(readDeviceRecord(mem(null), GOAL_EXTRAS)).toEqual({data: emptyGoalExtras(), unreadable: false});
    const later = {version: 1, goals: {'private:1': {area: 'health', futureField: {x: 1}}}, areas: [], somethingNew: true};
    const read = readDeviceRecord(mem(JSON.stringify(later)), GOAL_EXTRAS);
    expect(read.unreadable).toBe(false);
    expect(read.data.goals['private:1']).toMatchObject({area: 'health', futureField: {x: 1}});
    expect(readDeviceRecord(mem('{"version":2,"goals":{},"areas":[]}'), GOAL_EXTRAS).unreadable).toBe(true);
    expect(readDeviceRecord(mem('not json'), GOAL_EXTRAS)).toEqual({data: emptyGoalExtras(), unreadable: true});
  });
  it('areas: seven built in plus custom ones; an unknown area is refused; removing an area clears it from its goals', () => {
    let x = emptyGoalExtras();
    expect(areasOf(x).map(a => a.label)).toEqual(['Health', 'Habits & Mind', 'Wealth', 'Relationships', 'Career', 'Learning', 'Fun']);
    expect(() => setGoalArea(x, 'private:1', 'nowhere', at)).toThrow('Choose one of your life areas.');
    const added = addCustomArea(x, 'Side project', '#aa88ff');
    x = added.extras;
    expect(added.id).toBe('custom-side-project');
    expect(() => addCustomArea(x, 'side PROJECT', '#aa88ff')).toThrow('already');
    x = setGoalArea(x, 'private:1', added.id, at);
    expect(x.goals['private:1']).toEqual({area: 'custom-side-project', updatedAt: at});
    x = removeCustomArea(x, added.id);
    expect(x.goals['private:1']).toEqual({updatedAt: at});
    expect(x.areas).toEqual([]);
  });
  it('why, obstacle and the if-then plan; empty text clears; a goal with nothing left drops out', () => {
    let x = setGoalReasons(emptyGoalExtras(), 'private:2', {why: 'Calm', obstacle: 'Impulse buys', ifThen: 'If I want to buy, then I wait a day'}, at);
    expect(x.goals['private:2']).toMatchObject({why: 'Calm', obstacle: 'Impulse buys', ifThen: 'If I want to buy, then I wait a day'});
    x = setGoalReasons(x, 'private:2', {why: '', obstacle: ' ', ifThen: ''}, at);
    expect(x.goals['private:2']).toBeUndefined();
    expect(() => setGoalReasons(emptyGoalExtras(), 'private:2', {why: 'x'.repeat(1001)}, at)).toThrow();
    expect(() => setGoalReasons(emptyGoalExtras(), 'evil:2', {why: 'x'}, at)).toThrow();
  });
  it('visions: a gradient, an emoji or a photo id; null clears', () => {
    let x = setGoalVision(emptyGoalExtras(), 'private:3', {kind: 'gradient', gradient: 'aurora', emoji: '🏔️'}, at);
    expect(x.goals['private:3']!.vision).toEqual({kind: 'gradient', gradient: 'aurora', emoji: '🏔️'});
    x = setGoalVision(x, 'private:3', {kind: 'photo', imageId: 'img-0123456789'}, at);
    expect(x.goals['private:3']!.vision).toEqual({kind: 'photo', imageId: 'img-0123456789'});
    expect(() => setGoalVision(x, 'private:3', {kind: 'photo', imageId: '../x'} as never, at)).toThrow();
    x = setGoalVision(x, 'private:3', null, at);
    expect(x.goals['private:3']).toBeUndefined();
  });
  it('sub-goals: three levels at most, never under itself or its own sub-goals', () => {
    let x = setGoalParent(emptyGoalExtras(), 'private:q1', 'private:year', at);
    x = setGoalParent(x, 'private:oct', 'private:q1', at);
    expect(ancestorsOf(x, 'private:oct')).toEqual(['private:q1', 'private:year']);
    expect(childrenOf(x, 'private:q1')).toEqual(['private:oct']);
    expect(() => setGoalParent(x, 'private:week', 'private:oct', at)).toThrow('three levels');
    expect(() => setGoalParent(x, 'private:year', 'private:oct', at)).toThrow('already under this one');
    expect(() => setGoalParent(x, 'private:q1', 'private:q1', at)).toThrow('its own sub-goal');
    // A goal with a sub-goal of its own can sit under a top goal only (2 + 1 levels).
    expect(() => setGoalParent(x, 'private:q1', 'private:other', at)).not.toThrow();
    x = setGoalParent(x, 'private:oct', null, at);
    expect(ancestorsOf(x, 'private:oct')).toEqual([]);
  });
  it('consistency: a vanished goal’s extras go dormant, come back with the goal, and are dropped after 90 days', () => {
    let x = setGoalParent(emptyGoalExtras(), 'private:child', 'private:gone', at);
    x = setGoalVision(x, 'private:gone', {kind: 'photo', imageId: 'img-gone-0001'}, at);
    x = setGoalStory(x, 'private:kept', 'Ran it in the rain.', at);
    const live = new Set(['private:child', 'private:kept']);
    const r1 = reconcileGoalExtras(x, live, '2026-10-11');
    expect(r1.changed).toBe(true);
    expect(Object.keys(r1.extras.goals).sort()).toEqual(['private:child', 'private:kept']);
    expect(r1.extras.dormant!['private:gone']).toMatchObject({dormantSince: '2026-10-11', vision: {kind: 'photo', imageId: 'img-gone-0001'}});
    expect(liveParent(r1.extras, 'private:child', live)).toBeUndefined();
    expect(r1.orphanImages).toEqual([]);
    // Nothing changed since: the same record comes back.
    expect(reconcileGoalExtras(r1.extras, live, '2026-10-20')).toEqual({extras: r1.extras, changed: false, orphanImages: []});
    // The goal comes back (a restored backup): its photo and its sub-goal return.
    const back = reconcileGoalExtras(r1.extras, new Set([...live, 'private:gone']), '2026-11-01');
    expect(back.extras.goals['private:gone']!.vision).toEqual({kind: 'photo', imageId: 'img-gone-0001'});
    expect(back.extras.dormant).toBeUndefined();
    expect(liveParent(back.extras, 'private:child', new Set([...live, 'private:gone']))).toBe('private:gone');
    // Gone for more than 90 days: dropped, and the photo is named for the image store.
    const late = reconcileGoalExtras(r1.extras, live, '2027-01-11');
    expect(late.extras.dormant).toBeUndefined();
    expect(late.orphanImages).toEqual(['img-gone-0001']);
  });
  it('a goal that comes back under another key keeps its extras and its sub-goals', () => {
    let x = setGoalStory(emptyGoalExtras(), 'private:5', 'First home', at);
    x = setGoalParent(x, 'private:6', 'private:5', at);
    x = moveGoalExtras(x, 'private:5', 'private:9');
    expect(x.goals['private:9']!.story).toBe('First home');
    expect(x.goals['private:5']).toBeUndefined();
    expect(x.goals['private:6']!.parentKey).toBe('private:9');
  });
  it('the stored bytes parse under the schema (round trip)', () => {
    const x = setGoalArea(emptyGoalExtras(), 'average:sleep', 'health', at);
    expect(goalExtrasSchema.parse(JSON.parse(JSON.stringify(x)))).toEqual(x);
  });
});

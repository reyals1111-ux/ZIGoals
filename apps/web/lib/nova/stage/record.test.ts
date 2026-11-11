import {describe, expect, it} from 'vitest';
import {askId, askRequests, asksOf, clearMade, closeMade, dropMade, emptyStage, forgetAsk, forgetAsks, hiddenOf, keepAsMade, keepsMade, MADE_TTL_MS, madeAt, makeWidgets, MAX_ASKS, novaStageSchema, paramsOf, proactiveOn, pruneStage, recordAsk, resizeMade, restoreStage, setHidden, setKeep, setProactive, stageWidgets} from './record';

/** Session AM (ADR-038 D3, D16, A5): NOVA's stage record. */
const t0 = new Date('2026-11-11T09:00:00.000Z'), later = (h: number) => new Date(t0.getTime() + h * 3600_000);
const sizeOf = () => 'M' as const;

describe('made widgets', () => {
  it('a made widget goes to the front; made again, it renews in place; parameters travel with it', () => {
    let r = makeWidgets(emptyStage(), [{id: 'weight', params: {range: 'month'}}, {id: 'sleep'}], t0);
    expect(r.made?.map(w => w.id)).toEqual(['weight', 'sleep']);
    expect(paramsOf(r, 'weight')).toEqual({range: 'month'});
    r = makeWidgets(r, [{id: 'sleep'}, {id: 'weight', params: {range: 'year'}}], later(1));
    expect(r.made?.map(w => w.id)).toEqual(['sleep', 'weight']);
    expect(r.made?.[0]?.at).toBe(later(1).toISOString());
    expect(paramsOf(r, 'weight')).toEqual({range: 'year'});
  });
  it('a pinned widget is not made again, but takes new parameters and leaves the dock', () => {
    let r = setHidden(emptyStage(), 'weight', true);
    r = makeWidgets(r, [{id: 'weight', params: {range: 'week'}}], t0, new Set(['weight']));
    expect(r.made).toEqual([]);
    expect(hiddenOf(r)).toEqual([]);
    expect(paramsOf(r, 'weight')).toEqual({range: 'week'});
  });
  it('made widgets leave after 12 hours, unless "keep until I close" is on', () => {
    const r = makeWidgets(emptyStage(), [{id: 'weight'}], t0);
    expect(madeAt(r, later(11).getTime()).map(w => w.id)).toEqual(['weight']);
    expect(madeAt(r, t0.getTime() + MADE_TTL_MS)).toEqual([]);
    const kept = setKeep(r, true);
    expect(keepsMade(kept)).toBe(true);
    expect(madeAt(kept, later(100).getTime()).map(w => w.id)).toEqual(['weight']);
    expect(pruneStage(r, later(13).getTime()).made).toEqual([]);
    expect(pruneStage(kept, later(13).getTime())).toBe(kept);
    expect(pruneStage(r, later(1).getTime())).toBe(r);
  });
  it('the stage is the made widgets, then the pinned ones, without the dock', () => {
    let r = makeWidgets(emptyStage(), [{id: 'weather'}, {id: 'weight'}], t0);
    r = setHidden(r, 'weather', true);
    const pinned = [{id: 'tasks', size: 'M' as const, slot: 0}, {id: 'weight', size: 'L' as const, slot: 1}];
    const {shown, docked} = stageWidgets(r, pinned, later(1).getTime(), sizeOf);
    expect(shown.map(w => [w.id, w.pinned, w.slot])).toEqual([['tasks', true, 0], ['weight', true, 1]]);
    expect(docked.map(w => w.id)).toEqual(['weather']);
    expect(stageWidgets(setHidden(r, 'weather', false), pinned, later(1).getTime(), sizeOf).shown.map(w => w.id)).toEqual(['weather', 'tasks', 'weight']); // what was asked for stands in front
    expect(stageWidgets(setHidden(r, 'weather', false), pinned, later(1).getTime(), sizeOf, () => true, 'pinned-first').shown.map(w => w.id)).toEqual(['tasks', 'weight', 'weather']); // while arranging
    expect(stageWidgets(r, [], later(1).getTime(), sizeOf, id => id !== 'weight').shown).toEqual([]);
  });
  it('close, pin (drop), unpin (keep as made), resize, clear and Undo', () => {
    const made = makeWidgets(emptyStage(), [{id: 'weather'}, {id: 'weight', params: {range: 'month'}}], t0);
    expect(closeMade(made, 'weather').made?.map(w => w.id)).toEqual(['weight']);
    expect(closeMade(made, 'nothing')).toBe(made);
    expect(dropMade(made, 'weight').made?.map(w => w.id)).toEqual(['weather']);
    expect(keepAsMade(emptyStage(), 'tasks', 'L', t0).made).toEqual([{id: 'tasks', at: t0.toISOString(), size: 'L'}]);
    expect(resizeMade(made, 'weather', 'L').made?.[0]).toMatchObject({id: 'weather', size: 'L'});
    const cleared = clearMade(setHidden(setHidden(made, 'weather', true), 'tasks', true), new Set(['tasks']));
    expect(cleared.made).toEqual([]);
    expect(hiddenOf(cleared)).toEqual(['tasks']);
    expect(restoreStage(cleared, made)).toMatchObject({made: made.made, params: made.params});
    expect(restoreStage(made, emptyStage()).made).toBeUndefined();
  });
  it('refuses what the schema refuses: an unknown range reads as none, a control character in a ref is dropped', () => {
    const r = makeWidgets(emptyStage(), [{id: 'goal-focus', params: {ref: 'bad\u0000id'}}, {id: 'weight', params: {range: 'decade' as never}}], t0);
    expect(r.params).toBeUndefined();
    expect(novaStageSchema.safeParse({version: 1, made: [{id: 'weight', at: 'not a time'}]}).success).toBe(false);
    expect(novaStageSchema.safeParse({version: 1, made: [{id: 'a', at: t0.toISOString()}, {id: 'a', at: t0.toISOString()}]}).success).toBe(false);
    expect(novaStageSchema.parse({version: 1, later: {anything: true}, params: {weight: {range: 'aeon'}}}).params).toEqual({weight: {}});
  });
});

describe('requests', () => {
  it('keeps the newest first, bounded, one line, with what each made', () => {
    let r = recordAsk(emptyStage(), {id: 'a1', at: t0, text: '  What’s my weight\nprogress this month?  ', widgets: [{id: 'weight', params: {range: 'month'}}], device: 'phone', by: 'device'});
    expect(asksOf(r)[0]).toEqual({id: 'a1', at: t0.toISOString(), text: 'What’s my weight progress this month?', device: 'phone', by: 'device', widgets: ['weight'], params: {weight: {range: 'month'}}});
    expect(askRequests(asksOf(r)[0]!)).toEqual([{id: 'weight', params: {range: 'month'}}]);
    r = recordAsk(r, {id: 'a2', at: later(1), text: 'hello', device: 'computer', by: 'model'});
    expect(asksOf(r).map(a => a.id)).toEqual(['a2', 'a1']);
    expect(recordAsk(r, {id: 'a3', at: t0, text: '   ', device: 'computer', by: 'device'})).toBe(r);
    for (let i = 0; i < MAX_ASKS + 5; i++) r = recordAsk(r, {id: `b${i}`, at: later(2), text: `q ${i}`, device: 'computer', by: 'device'});
    expect(asksOf(r).length).toBe(MAX_ASKS);
    expect(asksOf(forgetAsk(r, asksOf(r)[0]!.id)).length).toBe(MAX_ASKS - 1);
    expect(forgetAsks(r).asks).toBeUndefined();
    expect(recordAsk(emptyStage(), {id: 'a9', at: t0, text: 'x'.repeat(900), device: 'computer', by: 'device'}).asks?.[0]?.text.length).toBe(300);
  });
  it('ids are plain and unique enough; the two choices default to off', () => {
    expect(askId(t0, 5)).toMatch(/^a[a-z0-9]+-5$/);
    expect(proactiveOn(emptyStage())).toBe(false);
    expect(proactiveOn(setProactive(emptyStage(), true))).toBe(true);
    expect(setProactive(setProactive(emptyStage(), true), false).proactive).toBeUndefined();
    expect(setKeep(setKeep(emptyStage(), true), false).keep).toBeUndefined();
  });
});

describe('the Showcase stage', () => {
  it('is a valid record: a history of four example requests, one from a phone, nothing made before the visitor asks, no personal field', async () => {
    const {showcaseStage} = await import('./record');
    const s = showcaseStage('2026-11-11');
    expect(madeAt(s, Date.parse('2026-11-11T09:00:00Z'))).toEqual([]);
    expect(asksOf(s).map(a => a.widgets?.[0])).toEqual(['habit-week', 'goal-focus', 'net-worth', 'weather']);
    expect(asksOf(s).filter(a => a.device === 'phone').length).toBe(1);
    expect(JSON.stringify(s)).not.toMatch(/@|\d{5,}/);
  });
});

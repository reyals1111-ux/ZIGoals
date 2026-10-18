import {afterEach, beforeEach, describe, expect, test, vi} from 'vitest';
import {CHECKLIST_DAYS_KEY, CHECKLIST_KEY} from '../af-checklist-keys';
import {CHECKLIST_DEVICE_WRITE_KEYS, checklistCommands, checklistDaysDeviceWrite, checklistDeviceWrite, checklistSummary, findItemByName, registerChecklistCommands, type ChecklistCommandSurface} from './commands';
import {deriveDots} from './derive';
import {emptyChecklist} from './schema';
import {NOW, TODAY, fullPath, sources} from './test-fixtures';

beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(NOW); });
afterEach(() => { vi.useRealTimers(); });

describe('the command surface ZIGi reads (P7.21)', () => {
  test('the summary: counts, the next dot and every item with its kind', () => {
    const s = checklistSummary(TODAY, deriveDots(fullPath(), {date: TODAY, ticks: [], custom: [], nudged: []}, TODAY, sources()));
    expect(s).toMatchObject({date: TODAY, total: 11, done: 0, next: 'Morning walk'});
    expect(s.items.slice(0, 4).map(i => [i.label, i.kind])).toEqual([['Morning walk', 'habit'], ['Water', 'water'], ['Push-ups', 'habit'], ['Vitamin D', 'diary']]);
  });
  test('an item by name: one clear match or nothing (never a guess between two)', () => {
    const items = [{id: 'a', label: 'Play piano 15 minutes'}, {id: 'b', label: 'Water'}, {id: 'c', label: 'Morning walk'}, {id: 'd', label: 'Evening walk'}];
    expect(findItemByName(items, 'piano')?.id).toBe('a');
    expect(findItemByName(items, 'Water')?.id).toBe('b');
    expect(findItemByName(items, 'walk')).toBeNull();
    expect(findItemByName(items, 'morning walk')?.id).toBe('c');
    expect(findItemByName(items, '?')).toBeNull();
  });
  test('device writes for the ZIGi registry: add a custom item, take one off the path, tick a custom item', () => {
    expect(CHECKLIST_DEVICE_WRITE_KEYS).toEqual([CHECKLIST_KEY, CHECKLIST_DAYS_KEY]);
    expect(checklistDeviceWrite.spec.key).toBe(CHECKLIST_KEY);
    const added = checklistDeviceWrite.apply(emptyChecklist(), {add: {text: 'Stretch ten minutes'}});
    expect(added.items.map(i => [i.kind, i.label])).toEqual([['custom', 'Stretch ten minutes']]);
    expect(checklistDeviceWrite.apply(added, {favorite: {item: 'stretch', on: false}}).items).toEqual([]);
    expect(() => checklistDeviceWrite.apply(added, {bogus: 1})).toThrow('not one a card can make');
    expect(() => checklistDeviceWrite.apply(added, {add: {text: ''}})).toThrow();
    const days = checklistDaysDeviceWrite(() => added);
    expect(days.spec.key).toBe(CHECKLIST_DAYS_KEY);
    const ticked = days.apply({version: 1, days: {}}, {check: {item: 'stretch', done: true, day: TODAY}});
    expect(ticked.today?.custom).toEqual([added.items[0]!.id]);
    expect(() => days.apply({version: 1, days: {}}, {check: {item: 'nothing', day: TODAY}})).toThrow('No single custom item');
  });
  test('the live surface is there only while the Checklist is open', () => {
    const surface = {tick: async () => 'ok'} as unknown as ChecklistCommandSurface;
    expect(checklistCommands()).toBeNull();
    const stop = registerChecklistCommands(surface);
    expect(checklistCommands()).toBe(surface);
    stop();
    expect(checklistCommands()).toBeNull();
  });
});

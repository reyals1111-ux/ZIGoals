import {describe, expect, it} from 'vitest';
import {DOCK, dockEntries, dockForKey, moveDock, resetDock, setDockHidden, type DockContext} from './dock';
import {novaRecordSchema, type NovaRecord} from './store';

const everything: DockContext = {pageShown: () => true, earn: true};
const plain: DockContext = {pageShown: page => page !== 'chess', earn: false};
const ids = (r: NovaRecord, ctx = everything) => dockEntries(r, ctx).map(e => e.id);

describe('the dock', () => {
  it('lists every feature the brief names, each with a label, a hint and its own key', () => {
    expect(DOCK.map(d => d.id)).toEqual(['health', 'zigi', 'checklist', 'music', 'focus', 'notes', 'quick-add', 'agenda', 'review', 'tasks', 'goals', 'habits', 'wealth', 'earn', 'chess', 'settings']);
    expect(new Set(DOCK.map(d => d.key)).size).toBe(DOCK.length);
    for (const d of DOCK) { expect(d.label.length).toBeGreaterThan(1); expect(d.hint.length).toBeGreaterThan(3); expect(!!d.href || !!d.action).toBe(true); }
  });
  it('leaves out Earn until it is chosen and a page this device hides; never a dead entry', () => {
    expect(ids({version: 1}, plain)).not.toContain('earn');
    expect(ids({version: 1}, plain)).not.toContain('chess');
    expect(ids({version: 1}, everything)).toContain('earn');
  });
  it('keeps the person’s order; entries the stored order does not name follow in catalog order', () => {
    const r: NovaRecord = {version: 1, dock: {order: ['settings', 'goals', 'not-in-this-build']}};
    expect(ids(r).slice(0, 3)).toEqual(['settings', 'goals', 'health']);
    expect(ids(r)).toHaveLength(DOCK.length);
  });
  it('moves one place among the shown entries (buttons and keyboard), and stops at the ends', () => {
    const visible = ids({version: 1}, plain);
    const moved = moveDock({version: 1}, 'checklist', -1, visible);
    expect(ids(moved, plain).slice(0, 3)).toEqual(['health', 'checklist', 'zigi']);
    expect(moveDock({version: 1}, 'health', -1, visible)).toEqual({version: 1});
    expect(novaRecordSchema.safeParse(moved).success).toBe(true);
    // Earn is not shown here: wealth moves past it to settings' neighbour, and Earn keeps its place in the full order.
    const last = moveDock({version: 1}, 'wealth', 1, visible);
    const full = last.dock!.order!;
    expect(full.indexOf('earn')).toBe(DOCK.findIndex(d => d.id === 'earn'));
  });
  it('hides and shows per device; reset brings the defaults back', () => {
    const hidden = setDockHidden({version: 1}, 'chess', true);
    expect(dockEntries(hidden, everything).find(e => e.id === 'chess')!.hidden).toBe(true);
    expect(dockEntries(setDockHidden(hidden, 'chess', false), everything).find(e => e.id === 'chess')!.hidden).toBe(false);
    expect(setDockHidden({version: 1}, 'nope', true)).toEqual({version: 1});
    expect(resetDock(hidden)).toEqual({version: 1});
  });
  it('a key opens its entry only without a modifier, and never a hidden one', () => {
    const entries = dockEntries(setDockHidden({version: 1}, 'goals', true), everything);
    const ev = (key: string, extra: Partial<{ctrlKey: boolean; metaKey: boolean; altKey: boolean}> = {}) => ({key, ctrlKey: false, metaKey: false, altKey: false, ...extra});
    expect(dockForKey(entries, ev('Z'))?.id).toBe('zigi');
    expect(dockForKey(entries, ev(','))?.id).toBe('settings');
    expect(dockForKey(entries, ev('g'))).toBeNull();
    expect(dockForKey(entries, ev('z', {ctrlKey: true}))).toBeNull();
    expect(dockForKey(entries, ev('z', {metaKey: true}))).toBeNull();
    expect(dockForKey(entries, ev('Enter'))).toBeNull();
  });
});

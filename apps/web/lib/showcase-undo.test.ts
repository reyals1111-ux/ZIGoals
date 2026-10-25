import {describe, expect, it} from 'vitest';
import {SHOWCASE_MARKER, SHOWCASE_UNDO, activateShowcase, currentShowcase, exitShowcase, noteShowcaseUndo, readShowcaseUndo, undoShowcaseReset} from './showcase-storage';

// Session AH Part 3 (DS4): a Showcase reset keeps the replaced generation in the tab and can be undone once.
class Memory implements Storage {
  private map = new Map<string, string>();
  get length() { return this.map.size; }
  key(i: number) { return [...this.map.keys()][i] ?? null; }
  getItem(k: string) { return this.map.get(k) ?? null; }
  setItem(k: string, v: string) { this.map.set(k, v); }
  removeItem(k: string) { this.map.delete(k); }
  clear() { this.map.clear(); }
  keys() { return [...this.map.keys()]; }
}
const reset = (s: Memory, records: Record<string, string>, generation: string) => { const previous = currentShowcase(s); activateShowcase(s, '2026-10-25', records, generation, previous?.generation); if (previous) noteShowcaseUndo(s, previous); };

describe('Showcase reset with Undo', () => {
  it('Undo selects the replaced Showcase with what was added to it, and removes the fresh one', () => {
    const s = new Memory();
    activateShowcase(s, '2026-10-24', {'zigoals:habits:v1': 'mine-added'}, 'gen-a');
    reset(s, {'zigoals:habits:v1': 'fresh'}, 'gen-b');
    expect(currentShowcase(s)).toEqual({generation: 'gen-b', day: '2026-10-25'});
    expect(readShowcaseUndo(s)).toMatchObject({generation: 'gen-a', day: '2026-10-24', offered: false});
    expect(s.keys().filter(k => k.includes('gen-a'))).toHaveLength(1); // kept for the Undo
    expect(undoShowcaseReset(s)).toBe(true);
    expect(currentShowcase(s)).toEqual({generation: 'gen-a', day: '2026-10-24'});
    expect(s.getItem('zigoals:showcase:v1:gen-a:zigoals:habits:v1')).toBe('mine-added');
    expect(s.keys().some(k => k.includes('gen-b'))).toBe(false);
    expect(s.getItem(SHOWCASE_UNDO)).toBeNull();
    expect(undoShowcaseReset(s)).toBe(false); // once only
  });
  it('a plain load, a second reset or Exit clears what an Undo would need', () => {
    const s = new Memory();
    activateShowcase(s, '2026-10-24', {k: 'a'}, 'gen-a');
    reset(s, {k: 'b'}, 'gen-b');
    activateShowcase(s, '2026-10-25', {k: 'c'}, 'gen-c'); // a plain load
    expect(s.getItem(SHOWCASE_UNDO)).toBeNull();
    expect(s.keys().filter(k => k.startsWith('zigoals:showcase:v1:')).every(k => k.includes('gen-c'))).toBe(true);
    reset(s, {k: 'd'}, 'gen-d');
    exitShowcase(s);
    expect(s.getItem(SHOWCASE_MARKER)).toBeNull();
    expect(s.getItem(SHOWCASE_UNDO)).toBeNull();
    expect(undoShowcaseReset(s)).toBe(false);
  });
  it('a damaged Undo note undoes nothing', () => {
    const s = new Memory();
    activateShowcase(s, '2026-10-24', {k: 'a'}, 'gen-a');
    s.setItem(SHOWCASE_UNDO, '{"version":1,"generation":"../x","day":"2026-10-24"}');
    expect(undoShowcaseReset(s)).toBe(false);
    expect(currentShowcase(s)?.generation).toBe('gen-a');
  });
});

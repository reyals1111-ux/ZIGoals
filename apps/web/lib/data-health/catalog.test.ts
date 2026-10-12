import {describe, expect, it} from 'vitest';
import {EVERYTHING_KEYS} from '../export/everything';
import {DEVICE_ONLY, SYNCED, storedBytes} from './catalog';

describe('Data health catalog (Session AA-Cloud Part 6)', () => {
  it('labels every key Export everything reads, each once, synced or this device only', () => {
    const keys = [...SYNCED, ...DEVICE_ONLY].map(e => e.key);
    expect(new Set(keys).size).toBe(keys.length);
    expect([...keys].sort()).toEqual([...EVERYTHING_KEYS].sort());
    for (const e of [...SYNCED, ...DEVICE_ONLY]) expect(e.label.length).toBeGreaterThan(3);
  });
  it('counts what a stored value takes, and nothing for nothing stored', () => {
    expect(storedBytes(null)).toBeNull();
    expect(storedBytes('{}')).toBe(4);
  });
});

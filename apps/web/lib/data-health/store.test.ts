import {describe, expect, it} from 'vitest';
import {readDeviceRecord} from '../device-record';
import {DATA_HEALTH, DATA_HEALTH_KEY, emptyDataHealth, exportAge, recordExport} from './store';

describe('Data health record (zigoals:data-health:v1, device-only)', () => {
  it('remembers the last export and says how long ago', () => {
    const s = recordExport(emptyDataHealth(), '2026-10-01T10:00:00.000Z');
    expect(exportAge(emptyDataHealth(), new Date('2026-10-12T10:00:00Z'))).toBeNull();
    expect(exportAge(s, new Date('2026-10-01T18:00:00Z'))).toBe('Today');
    expect(exportAge(s, new Date('2026-10-02T11:00:00Z'))).toBe('Yesterday');
    expect(exportAge(s, new Date('2026-10-12T10:00:00Z'))).toBe('11 days ago');
    expect(() => recordExport(s, 'yesterday')).toThrow();
  });
  it('reads tolerantly and keeps unknown fields', () => {
    const read = (v: string | null) => readDeviceRecord({getItem: k => (k === DATA_HEALTH_KEY ? v : null)}, DATA_HEALTH);
    expect(read(null).data).toEqual(emptyDataHealth());
    expect(read('[]').unreadable).toBe(true);
    expect((read(JSON.stringify({version: 1, later: true})).data as Record<string, unknown>).later).toBe(true);
  });
});

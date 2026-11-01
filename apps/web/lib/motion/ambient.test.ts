import {describe, expect, it} from 'vitest';
import {ambientAllowed, batterySaving, deviceSignals, lowEndDevice, readBattery} from './ambient';

describe('the ambient drift gate (low end, battery, Save-Data, motion level)', () => {
  it('treats ≤ 4 cores, ≤ 4 GB memory or Save-Data as low end; unknown signals do not count against the device', () => {
    expect(lowEndDevice({hardwareConcurrency: 4})).toBe(true);
    expect(lowEndDevice({hardwareConcurrency: 8, deviceMemory: 4})).toBe(true);
    expect(lowEndDevice({hardwareConcurrency: 8, deviceMemory: 8, saveData: true})).toBe(true);
    expect(lowEndDevice({hardwareConcurrency: 8, deviceMemory: 8})).toBe(false);
    expect(lowEndDevice({})).toBe(false);
    expect(lowEndDevice({hardwareConcurrency: 0, deviceMemory: Number.NaN})).toBe(false);
  });
  it('a battery under 20 % that is not charging saves; charging, unknown or full does not', () => {
    expect(batterySaving({charging: false, level: .19})).toBe(true);
    expect(batterySaving({charging: true, level: .05})).toBe(false);
    expect(batterySaving({charging: false, level: .2})).toBe(false);
    expect(batterySaving(null)).toBe(false);
    expect(batterySaving({charging: false, level: Number.NaN})).toBe(false);
  });
  it('drifts only in Full motion, on a capable device, with battery to spare, while visible', () => {
    const good = {hardwareConcurrency: 8, deviceMemory: 8};
    expect(ambientAllowed({level: 'full', ...good})).toBe(true);
    expect(ambientAllowed({level: 'calm', ...good})).toBe(false);
    expect(ambientAllowed({level: 'off', ...good})).toBe(false);
    expect(ambientAllowed({level: 'full', ...good, hidden: true})).toBe(false);
    expect(ambientAllowed({level: 'full', hardwareConcurrency: 2})).toBe(false);
    expect(ambientAllowed({level: 'full', ...good, battery: {charging: false, level: .1}})).toBe(false);
  });
  it('reads the navigator without throwing, and the battery only where it exists', async () => {
    expect(deviceSignals({hardwareConcurrency: 6, deviceMemory: 8, connection: {saveData: true}})).toEqual({hardwareConcurrency: 6, deviceMemory: 8, saveData: true});
    expect(deviceSignals(null)).toEqual({});
    expect(await readBattery(null)).toBeNull();
    expect(await readBattery({})).toBeNull();
    expect(await readBattery({getBattery: () => Promise.reject(new Error('no'))})).toBeNull();
    expect(await readBattery({getBattery: async () => ({charging: false, level: .5})})).toEqual({charging: false, level: .5});
  });
});

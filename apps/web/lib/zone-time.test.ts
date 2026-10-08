import {describe, expect, test} from 'vitest';
import {zoneLabel} from './zone-time';

// Session X P2.1: a fixed-offset IANA name reads backwards ("Etc/GMT+4" is four hours behind UTC); people see the offset.
describe('zoneLabel', () => {
  test('fixed offsets read as UTC offsets, the right way round', () => {
    expect(zoneLabel('Etc/GMT+4')).toBe('UTC−04:00');
    expect(zoneLabel('Etc/GMT-10')).toBe('UTC+10:00');
    expect(zoneLabel('Etc/GMT+0')).toBe('UTC−00:00');
  });
  test('named zones stay as they are', () => {
    expect(zoneLabel('Europe/Brussels')).toBe('Europe/Brussels');
    expect(zoneLabel('UTC')).toBe('UTC');
  });
});

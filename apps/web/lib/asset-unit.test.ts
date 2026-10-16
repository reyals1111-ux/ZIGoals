import {describe, expect, it} from 'vitest';
import {amountWithUnit, assetUnit} from './asset-unit';

const platform = {positions: [{id: 'cam', providerId: 'Collectible camera'}, {id: 'btc', providerId: 'Bitcoin'}]} as never;

describe('assetUnit', () => {
  it('names a custom asset by its position', () => expect(assetUnit(platform, 'CUSTOM', 'cam')).toBe('Collectible camera'));
  it('keeps every other code', () => expect(assetUnit(platform, 'BTC', 'btc')).toBe('BTC'));
  it('keeps CUSTOM when the position is unknown or not given', () => { expect(assetUnit(platform, 'CUSTOM', 'gone')).toBe('CUSTOM'); expect(assetUnit(platform, 'CUSTOM')).toBe('CUSTOM'); });
});

describe('amountWithUnit (Session AC)', () => {
  it('names a custom asset by its position when the contribution names one', () => expect(amountWithUnit(platform, '2', 'CUSTOM', 'cam')).toBe('2 Collectible camera'));
  it('says "custom asset" in words when no position is named, never the bare code', () => {
    expect(amountWithUnit(platform, '1', 'CUSTOM')).toBe('1 unit of a custom asset');
    expect(amountWithUnit(platform, '2.5', 'CUSTOM', 'gone')).toBe('2.5 units of a custom asset');
  });
  it('keeps every other code', () => expect(amountWithUnit(platform, '0.1', 'BTC', 'btc')).toBe('0.1 BTC'));
});

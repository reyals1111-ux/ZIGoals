import {describe, expect, it} from 'vitest';
import {assetUnit} from './asset-unit';

const platform = {positions: [{id: 'cam', providerId: 'Collectible camera'}, {id: 'btc', providerId: 'Bitcoin'}]} as never;

describe('assetUnit', () => {
  it('names a custom asset by its position', () => expect(assetUnit(platform, 'CUSTOM', 'cam')).toBe('Collectible camera'));
  it('keeps every other code', () => expect(assetUnit(platform, 'BTC', 'btc')).toBe('BTC'));
  it('keeps CUSTOM when the position is unknown or not given', () => { expect(assetUnit(platform, 'CUSTOM', 'gone')).toBe('CUSTOM'); expect(assetUnit(platform, 'CUSTOM')).toBe('CUSTOM'); });
});

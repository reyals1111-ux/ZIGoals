import {describe, expect, it} from 'vitest';
import {parseStarDebug} from './star-debug';

/** Session AM-2 (ADR-038 "AM-2", E5): the star's capture switches are read from the address only in a LOCAL_DEMO build. */
describe('the star’s capture switches', () => {
  it('?star= is read only in LOCAL_DEMO', () => {
    expect(parseStarDebug('?star=live', {}, 'LOCAL_DEMO')).toEqual({live: true, why: false, hold: null});
    expect(parseStarDebug('?star=live,why', {}, 'LOCAL_DEMO')).toEqual({live: true, why: true, hold: null});
    expect(parseStarDebug('?star=thinking', {}, 'LOCAL_DEMO')).toEqual({live: true, why: false, hold: 'thinking'});
    for (const environment of ['PUBLIC_ALPHA_UNDEPLOYED', 'TESTNET_DEPLOYED', 'INVALID_CONFIGURATION']) expect(parseStarDebug('?star=live,why,thinking', {}, environment), environment).toEqual({live: false, why: false, hold: null});
  });
  it('unknown words, "idle" and other parameters change nothing', () => {
    expect(parseStarDebug('?star=idle,fast,1', {}, 'LOCAL_DEMO')).toEqual({live: false, why: false, hold: null});
    expect(parseStarDebug('?chat=1&nova=live', {}, 'LOCAL_DEMO')).toEqual({live: false, why: false, hold: null});
    expect(parseStarDebug('', {}, 'LOCAL_DEMO')).toEqual({live: false, why: false, hold: null});
  });
  it('a browser spec sets window flags before the page loads, on any build', () => {
    expect(parseStarDebug('', {__zgStarLive: true}, 'PUBLIC_ALPHA_UNDEPLOYED')).toEqual({live: true, why: false, hold: null});
    expect(parseStarDebug('', {__zgStarHold: 'speaking'}, 'PUBLIC_ALPHA_UNDEPLOYED')).toEqual({live: true, why: false, hold: 'speaking'});
    expect(parseStarDebug('', {__zgStarLive: 'yes', __zgStarHold: 'dancing'}, 'PUBLIC_ALPHA_UNDEPLOYED')).toEqual({live: false, why: false, hold: null});
  });
});

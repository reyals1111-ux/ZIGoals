import {describe, expect, test} from 'vitest';
import {CARD_ARTS, isCardArt} from './catalog';
import {GOAL_EXTRAS_KEY, readCardArt} from './mirror';
import {GOAL_EXTRAS_KEY as STORE_KEY} from '../goal-extras/store';
import {SHOWCASE_CARD_ART} from '../showcase/card-art';
import {SHOWCASE_VISION_ART} from '../showcase/vision-art';
import {existsSync} from 'node:fs';
import {join} from 'node:path';

describe('goal card art (Session AB-Design, owner request 17)', () => {
  test('fifteen unique ids; the mirror reads AB-Cloud\'s key and only catalogue ids, tolerating anything else', () => {
    expect(new Set(CARD_ARTS.map(a => a.id)).size).toBe(15);
    expect(GOAL_EXTRAS_KEY).toBe(STORE_KEY);
    const storage = (raw: string | null) => ({getItem: () => raw});
    expect(readCardArt(storage(null), 'private:1')).toBeNull();
    expect(readCardArt(storage('{'), 'private:1')).toBeNull();
    expect(readCardArt(storage(JSON.stringify({version: 1, goals: {'private:1': {cardArt: 'skyline'}}})), 'private:1')).toBe('skyline');
    expect(readCardArt(storage(JSON.stringify({version: 1, goals: {'private:1': {cardArt: 'not-an-art'}}})), 'private:1')).toBeNull();
    expect(readCardArt(storage(JSON.stringify({version: 1, goals: {'private:1': {cardArt: 7}}})), 'private:1')).toBeNull();
    expect(isCardArt('garden')).toBe(true); expect(isCardArt('')).toBe(false);
  });
  test('the Showcase uses more than three different card artworks, all from the catalogue, and its vision files exist', () => {
    const arts = Object.values(SHOWCASE_CARD_ART);
    expect(new Set(arts).size).toBeGreaterThan(3);
    for (const art of arts) expect(isCardArt(art)).toBe(true);
    for (const {src} of Object.values(SHOWCASE_VISION_ART)) { expect(src).toMatch(/^\/showcase\/vision\/vision-0[1-8]\.(svg|webp|avif|jpg|png)$/); expect(existsSync(join(__dirname, '..', '..', 'public', src))).toBe(true); }
    expect(new Set(Object.values(SHOWCASE_VISION_ART).map(v => v.src)).size).toBe(8);
  });
});

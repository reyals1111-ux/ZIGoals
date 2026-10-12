import {describe, expect, it} from 'vitest';
import {SHARE_SIZE, wrapWords} from './share-image';

describe('share images on the device (Session AA-Cloud)', () => {
  it('wraps by words to a width; a long word stands alone', () => {
    const fits = (l: string) => l.length <= 10;
    expect(wrapWords('Run a ten kilometre race', fits)).toEqual(['Run a ten', 'kilometre', 'race']);
    expect(wrapWords('Supercalifragilistic yes', fits)).toEqual(['Supercalifragilistic', 'yes']);
    expect(wrapWords('   ', fits)).toEqual([]);
  });
  it('is a portrait card for phone share sheets', () => {
    expect(SHARE_SIZE).toEqual({width: 1080, height: 1350});
  });
});

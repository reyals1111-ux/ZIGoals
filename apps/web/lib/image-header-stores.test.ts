// @vitest-environment jsdom
import {afterEach, describe, expect, test, vi} from 'vitest';
import {IMAGE_TOO_LARGE} from './image-header';
import {compressPhoto} from './vision/store';
import {compressImage} from './health-aa/photos';

/**
 * Session AB-Cloud Part 8 (ADR-023 C27), Gate C test audit: the header check runs inside both photo stores, before the
 * browser is asked to decode anything. A PNG header that says 65,535 × 65,535 is refused with the plain message and
 * `createImageBitmap` is never called; a small one goes on to the decode.
 */
function png(w: number, h: number) { const b = new Uint8Array(33); b.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13, 0x49, 0x48, 0x44, 0x52]); new DataView(b.buffer).setUint32(16, w); new DataView(b.buffer).setUint32(20, h); return new Blob([b], {type: 'image/png'}); }
afterEach(() => { vi.unstubAllGlobals(); });

describe.each([['vision photos', compressPhoto], ['progress photos', compressImage]] as const)('%s', (_name, compress) => {
  test('a picture too large to decode is refused from its header; nothing is decoded', async () => {
    const decode = vi.fn(async () => { throw Error('decoded'); });
    vi.stubGlobal('createImageBitmap', decode);
    await expect(compress(png(65_535, 65_535))).rejects.toThrow(IMAGE_TOO_LARGE);
    expect(decode).not.toHaveBeenCalled();
  });
  test('a picture within the caps goes on to the decode (a decode the browser cannot do is said plainly)', async () => {
    const decode = vi.fn(async () => { throw Error('decoded'); });
    vi.stubGlobal('createImageBitmap', decode);
    await expect(compress(png(4000, 3000))).rejects.toThrow('This browser could not read that photo.');
    expect(decode).toHaveBeenCalledTimes(1);
  });
});

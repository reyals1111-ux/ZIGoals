import {drawShareCard, shareOrSave} from '../share-image';
import type {ShareCardSpec} from './kinds';

/**
 * Session AK Part 8.5: the one canvas renderer every share card goes through (lib/share-image.ts's 1080 × 1350 nebula
 * card), then the device's own share sheet or a download. Nothing is uploaded. Loaded only when the person taps.
 */
export async function makeAndShare(spec: ShareCardSpec): Promise<'shared' | 'saved'> {
  const blob = await drawShareCard(spec);
  return shareOrSave(blob, spec.fileName, spec.title);
}

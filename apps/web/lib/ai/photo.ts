import type {Capability} from './capabilities';
import type {ChatImage} from './types';

/**
 * Photo meal logging (Session V Part 7). A photo is offered only when the person's model reads images (its provider's
 * metadata says so, or the person said so in Settings) AND Health is shared with ZIGi (the three-part gate), because a
 * meal is Health data. The photo is downscaled here, in the browser, to a JPEG of at most 1024 px on its longest side,
 * sent with that one message to the person's own provider, and never stored by ZIGoals: the chat keeps only that a
 * photo was attached. Barcode scanning in Health stays the primary way to log a packaged food.
 */
export const PHOTO_MAX_EDGE = 1024, PHOTO_QUALITY = 0.8, PHOTO_MAX_INPUT_BYTES = 20 * 1024 * 1024;
export const PHOTO_NOTE = 'The person attached a photo of a meal. Propose one log-food per item you can see, with your estimate per serving; leave out every value you are unsure of (it stays unknown), include serving_g only when you can judge the portion, and say in one sentence what you could not see. The photo is not stored by ZIGoals.';
export type PhotoAllowance = {allowed: true} | {allowed: false; reason: string};
/** Whether this message may carry a photo: a model that reads images, and Health shared. */
export function photoAllowance({capability, declared, healthOpen}: {capability: Capability | null; declared: boolean | undefined; healthOpen: boolean}): PhotoAllowance {
  const reads = declared ?? capability?.vision ?? null;
  if (reads !== true) return {allowed: false, reason: reads === false ? 'Your model does not read photos.' : 'Turn on "This model reads photos" in Settings → ZIGi · your AI if your model does.'};
  if (!healthOpen) return {allowed: false, reason: 'Meal photos need Health shared with ZIGi (Settings → ZIGi · your AI → Include Health).'};
  return {allowed: true};
}
/** The size a photo is drawn at: the longest side at most `max`, never enlarged. */
export function fitWithin(width: number, height: number, max = PHOTO_MAX_EDGE): {width: number; height: number} {
  const scale = Math.min(1, max / Math.max(width, height, 1));
  return {width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale))};
}
function base64(bytes: Uint8Array): string {
  let text = '';
  for (let i = 0; i < bytes.length; i += 0x8000) text += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(text);
}
export type Photo = ChatImage & {width: number; height: number; bytes: number; preview: Blob};
/** Reads an image file the person chose, dropped or pasted, and returns the downscaled JPEG (or throws a plain message). */
export async function preparePhoto(file: Blob): Promise<Photo> {
  if (!/^image\//.test(file.type)) throw Error('That file is not a photo.');
  if (file.size > PHOTO_MAX_INPUT_BYTES) throw Error('That photo is larger than 20 MB; choose a smaller one.');
  let bitmap: ImageBitmap;
  try { bitmap = await createImageBitmap(file); } catch { throw Error('This photo could not be read here; try a JPEG or PNG.'); }
  const size = fitWithin(bitmap.width, bitmap.height), canvas = document.createElement('canvas');
  canvas.width = size.width; canvas.height = size.height;
  const context = canvas.getContext('2d');
  if (!context) { bitmap.close(); throw Error('This browser could not prepare the photo.'); }
  context.drawImage(bitmap, 0, 0, size.width, size.height); bitmap.close();
  const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/jpeg', PHOTO_QUALITY));
  if (!blob) throw Error('This browser could not prepare the photo.');
  const bytes = new Uint8Array(await blob.arrayBuffer());
  return {mime: 'image/jpeg', data: base64(bytes), width: size.width, height: size.height, bytes: bytes.length, preview: blob};
}

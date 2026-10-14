/**
 * Session AB-Cloud (ADR-023 C22, C27): an image's width and height read from its file header, without decoding it, so a
 * picture too large to decode safely (a "decompression bomb": a small file that expands to gigabytes of pixels) is
 * refused before `createImageBitmap` or an <img> ever sees it. PNG (IHDR), GIF (logical screen), WebP (VP8, VP8L, VP8X)
 * and JPEG (the first SOF marker) are read; anything else answers null and the caller's own decode limits apply.
 */
export const IMAGE_CAPS = {maxPixels: 40_000_000, maxSide: 12_000} as const;
export const IMAGE_TOO_LARGE = 'This image is too large to open safely (over 40 megapixels or 12,000 pixels on a side). Choose a smaller one.';
/** How much of a file the header read takes: a JPEG's size marker can follow up to 64 kB of EXIF and an ICC profile. */
export const HEADER_BYTES = 512 * 1024;
export type ImageSize = {width: number; height: number; type: 'image/png' | 'image/gif' | 'image/webp' | 'image/jpeg'};
const ascii = (b: Uint8Array, at: number, text: string) => [...text].every((c, i) => b[at + i] === c.charCodeAt(0));
const u16be = (b: Uint8Array, at: number) => (b[at]! << 8) | b[at + 1]!;
const u16le = (b: Uint8Array, at: number) => b[at]! | (b[at + 1]! << 8);
const u24le = (b: Uint8Array, at: number) => b[at]! | (b[at + 1]! << 8) | (b[at + 2]! << 16);
const u32be = (b: Uint8Array, at: number) => ((b[at]! << 24) >>> 0) + ((b[at + 1]! << 16) | (b[at + 2]! << 8) | b[at + 3]!);

export function imageSize(b: Uint8Array): ImageSize | null {
  if (b.length >= 24 && b[0] === 0x89 && ascii(b, 1, 'PNG\r\n\x1a\n') && ascii(b, 12, 'IHDR')) return {width: u32be(b, 16), height: u32be(b, 20), type: 'image/png'};
  if (b.length >= 10 && (ascii(b, 0, 'GIF87a') || ascii(b, 0, 'GIF89a'))) return {width: u16le(b, 6), height: u16le(b, 8), type: 'image/gif'};
  if (b.length >= 30 && ascii(b, 0, 'RIFF') && ascii(b, 8, 'WEBP')) {
    if (ascii(b, 12, 'VP8 ') && b[23] === 0x9d && b[24] === 0x01 && b[25] === 0x2a) return {width: u16le(b, 26) & 0x3fff, height: u16le(b, 28) & 0x3fff, type: 'image/webp'};
    if (ascii(b, 12, 'VP8L') && b[20] === 0x2f) { const [b0, b1, b2, b3] = [b[21]!, b[22]!, b[23]!, b[24]!]; return {width: 1 + (((b1 & 0x3f) << 8) | b0), height: 1 + (((b3 & 0x0f) << 10) | (b2 << 2) | ((b1 & 0xc0) >> 6)), type: 'image/webp'}; }
    if (ascii(b, 12, 'VP8X')) return {width: 1 + u24le(b, 24), height: 1 + u24le(b, 27), type: 'image/webp'};
    return null;
  }
  if (b.length >= 4 && b[0] === 0xff && b[1] === 0xd8) {
    let at = 2;
    while (at + 4 <= b.length) {
      if (b[at] !== 0xff) return null;
      let marker = b[at + 1]!;
      while (marker === 0xff && at + 2 < b.length) { at++; marker = b[at + 1]!; }
      // Markers without a length: RSTn, SOI, EOI, TEM.
      if ((marker >= 0xd0 && marker <= 0xd9) || marker === 0x01) { at += 2; continue; }
      if (at + 4 > b.length) return null;
      const length = u16be(b, at + 2);
      if (length < 2) return null;
      // SOF0–SOF15 carry the frame size, except DHT (C4), JPG (C8) and DAC (CC).
      if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) return at + 9 <= b.length ? {height: u16be(b, at + 5), width: u16be(b, at + 7), type: 'image/jpeg'} : null;
      if (marker === 0xda) return null;
      at += 2 + length;
    }
  }
  return null;
}
/** True when a known size is above the caps (or reads as zero, which no real picture has). */
export const tooLarge = (size: Pick<ImageSize, 'width' | 'height'>) => size.width < 1 || size.height < 1 || size.width > IMAGE_CAPS.maxSide || size.height > IMAGE_CAPS.maxSide || size.width * size.height > IMAGE_CAPS.maxPixels;
/** Reads the start of a file and throws IMAGE_TOO_LARGE when its header says it is above the caps; null when the header is not one this reads. */
export async function checkImageHeader(file: Blob): Promise<ImageSize | null> {
  const size = imageSize(new Uint8Array(await file.slice(0, HEADER_BYTES).arrayBuffer()));
  if (size && tooLarge(size)) throw Error(IMAGE_TOO_LARGE);
  return size;
}

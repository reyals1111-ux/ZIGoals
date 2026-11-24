import type {DocImage} from './note-files';

/**
 * Session AV lane 2 (r4-notes; LEDGER #319, #320): a photo (WebP or JPEG, as the notes and the journal keep them) as a
 * JPEG with its size, for a Word file — Word does not read every WebP. Drawn on a canvas on this device (at most 1600
 * px on its long side); a photo the browser cannot draw is left out (null). Browser only.
 */
export async function docImage(blob: Blob, alt: string): Promise<DocImage | null> {
  try {
    const bitmap = await createImageBitmap(blob), scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height, 1));
    const width = Math.max(1, Math.round(bitmap.width * scale)), height = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height;
    const ctx = canvas.getContext('2d'); if (!ctx) return null;
    ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, width, height); ctx.drawImage(bitmap, 0, 0, width, height); bitmap.close();
    const out = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.86));
    return out ? {data: new Uint8Array(await out.arrayBuffer()), type: 'image/jpeg', width, height, alt} : null;
  } catch { return null; }
}
/** Hands a file to the person (the browser's download), made on this device. */
export function saveFile(bytes: Uint8Array | string, name: string, type: string): void {
  const url = URL.createObjectURL(new Blob([bytes as BlobPart], {type})), a = document.createElement('a');
  a.href = url; a.download = name; document.body.append(a); a.click(); a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 30_000);
}

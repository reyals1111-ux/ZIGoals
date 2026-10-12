/**
 * Share images made on the device (Session AA-Cloud: G7's achievement card, Part 5's Life review): a 1080 × 1350 canvas
 * in the app's nebula look, turned into a PNG that the person saves or hands to their own share sheet. Nothing is
 * uploaded; the text drawn is exactly what the card shows.
 */
export type ShareCard = {eyebrow: string; title: string; lines: readonly string[]; footer?: string; accent?: readonly [string, string, string]};
export const SHARE_SIZE = {width: 1080, height: 1350} as const;

/** Splits text into lines that fit a width, by words (a word longer than the width is drawn on its own line). */
export function wrapWords(text: string, fits: (line: string) => boolean): string[] {
  const out: string[] = [];
  let line = '';
  for (const word of text.split(/\s+/).filter(Boolean)) {
    const next = line ? `${line} ${word}` : word;
    if (fits(next) || !line) line = next; else { out.push(line); line = word; }
  }
  if (line) out.push(line);
  return out;
}

export async function drawShareCard(card: ShareCard): Promise<Blob> {
  const canvas = document.createElement('canvas');
  canvas.width = SHARE_SIZE.width; canvas.height = SHARE_SIZE.height;
  const g = canvas.getContext('2d');
  if (!g) throw Error('This browser could not draw the image.');
  const [a, b, c] = card.accent ?? ['#6fe6f6', '#8fa6ff', '#f08bd6'];
  const bg = g.createLinearGradient(0, 0, SHARE_SIZE.width, SHARE_SIZE.height);
  bg.addColorStop(0, '#060b19'); bg.addColorStop(0.55, '#14143a'); bg.addColorStop(1, '#2a1748');
  g.fillStyle = bg; g.fillRect(0, 0, SHARE_SIZE.width, SHARE_SIZE.height);
  const glow = g.createRadialGradient(820, 260, 20, 820, 260, 520);
  glow.addColorStop(0, `${c}55`); glow.addColorStop(1, '#00000000');
  g.fillStyle = glow; g.fillRect(0, 0, SHARE_SIZE.width, SHARE_SIZE.height);
  const font = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Liberation Sans", sans-serif';
  g.fillStyle = '#c2d0e5'; g.font = `700 34px ${font}`;
  g.fillText(card.eyebrow.toUpperCase(), 96, 190);
  const title = g.createLinearGradient(96, 0, 984, 0);
  title.addColorStop(0, '#f4f8ff'); title.addColorStop(0.45, '#f4f8ff'); title.addColorStop(0.7, a); title.addColorStop(0.85, b); title.addColorStop(1, c);
  g.fillStyle = title; g.font = `800 84px ${font}`;
  let y = 300;
  for (const line of wrapWords(card.title, l => g.measureText(l).width <= 888).slice(0, 4)) { g.fillText(line, 96, y); y += 98; }
  g.fillStyle = '#dde7f7'; g.font = `500 44px ${font}`;
  y += 40;
  for (const text of card.lines) for (const line of wrapWords(text, l => g.measureText(l).width <= 888)) { if (y > 1150) break; g.fillText(line, 96, y); y += 62; }
  g.fillStyle = '#9fb3d4'; g.font = `600 32px ${font}`;
  g.fillText(card.footer ?? 'ZIGoals · made on my device', 96, 1270);
  return new Promise((resolve, reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(Error('This browser could not make the image.')), 'image/png'));
}

/** Hands the image to the device's share sheet when it can take files, otherwise saves it as a download. */
export async function shareOrSave(blob: Blob, name: string, title: string): Promise<'shared' | 'saved'> {
  const file = new File([blob], name, {type: 'image/png'});
  if (typeof navigator !== 'undefined' && navigator.canShare?.({files: [file]}) && navigator.share) {
    try { await navigator.share({files: [file], title}); return 'shared'; } catch (e) { if (e instanceof DOMException && e.name === 'AbortError') return 'shared'; }
  }
  const url = URL.createObjectURL(blob), link = document.createElement('a');
  link.href = url; link.download = name; document.body.append(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
  return 'saved';
}

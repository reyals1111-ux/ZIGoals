import {levelWord, type PixelMetric, type PixelYear} from '../../lib/year-pixels/grid';

/**
 * Session AK (lane S, item 13): Year in Pixels as a PNG, drawn on a canvas on this device and downloaded (toBlob and a
 * download link); nothing is uploaded. The image is a file of its own, so it carries its own night palette (the Nebula
 * panel and violet ramp) whatever the app's theme, a key with the counts, and "from my own log".
 */
const CELL = 14, GAP = 3, PAD = 28, HEAD = 64, KEY = 52;
const BG = '#0b1327', TEXT = '#f3f6ff', MUTED = '#a4b2cd', EMPTY = '#1a2540';
const BG_RGB = [11, 19, 39] as const, TOP = [206, 196, 255] as const, SHARE = [0.22, 0.4, 0.58, 0.78, 1];
/** A violet ramp from the night background: each level is lighter than the last, so the levels differ in lightness, not hue alone. */
export const levelColour = (v: number) => { const t = SHARE[v - 1] ?? 0; return `rgb(${BG_RGB.map((c, i) => Math.round(c + (TOP[i]! - c) * t)).join(',')})`; };

export function drawPixels(canvas: HTMLCanvasElement, grid: PixelYear, metric: PixelMetric, year: number): void {
  const cols = grid.weeks.length, width = PAD * 2 + cols * (CELL + GAP) - GAP, height = HEAD + 7 * (CELL + GAP) - GAP + KEY + PAD;
  canvas.width = width; canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw Error('No canvas on this device.');
  ctx.fillStyle = BG; ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = TEXT; ctx.font = '600 22px system-ui, sans-serif'; ctx.textBaseline = 'alphabetic';
  ctx.fillText(`${year} · ${metric === 'mood' ? 'Mood' : 'Energy'} · from my own log`, PAD, PAD + 10);
  ctx.fillStyle = MUTED; ctx.font = '13px system-ui, sans-serif';
  for (const m of grid.months) ctx.fillText(m.label, PAD + m.week * (CELL + GAP), HEAD - 8);
  grid.weeks.forEach((week, w) => week.forEach((p, d) => {
    if (!p.inYear) return;
    const x = PAD + w * (CELL + GAP), y = HEAD + d * (CELL + GAP);
    ctx.fillStyle = p.value !== null ? levelColour(p.value) : EMPTY;
    ctx.globalAlpha = p.future ? 0.35 : 1;
    ctx.beginPath(); ctx.roundRect(x, y, CELL, CELL, 3); ctx.fill();
    ctx.globalAlpha = 1;
  }));
  let x = PAD; const y = HEAD + 7 * (CELL + GAP) + 24;
  ctx.font = '13px system-ui, sans-serif';
  for (let v = 1; v <= 5; v++) {
    ctx.fillStyle = levelColour(v); ctx.beginPath(); ctx.roundRect(x, y - 11, CELL, CELL, 3); ctx.fill();
    const label = `${levelWord(metric, v)} ${grid.counts[v - 1]}`;
    ctx.fillStyle = TEXT; ctx.fillText(label, x + CELL + 6, y);
    x += CELL + 6 + ctx.measureText(label).width + 16;
  }
  ctx.fillStyle = MUTED; ctx.fillText('Made with ZIGoals, on this device.', PAD, y + 24);
}
export async function downloadPixelsPng(grid: PixelYear, metric: PixelMetric, year: number): Promise<void> {
  const canvas = document.createElement('canvas');
  drawPixels(canvas, grid, metric, year);
  const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png'));
  if (!blob) throw Error('The image could not be made.');
  const url = URL.createObjectURL(blob), link = document.createElement('a');
  link.href = url; link.download = `zigoals-${metric}-${year}.png`; document.body.append(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

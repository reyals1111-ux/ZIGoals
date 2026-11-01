import type {MotionLevel} from './level';

/**
 * Session AK M1: the number ticker's arithmetic. A value counts up once, in Full motion only; in Calm, Off and under
 * reduced motion it shows its final value at once. Unknown is not zero: a value that is not a finite number never ticks
 * (the caller shows its own "unknown" text instead).
 */
export const TICK_MS = 900;
/** Ease-out cubic: fast start, gentle landing, no overshoot (a number must never pass its value). */
export const easeOut = (t: number): number => { const x = Math.min(1, Math.max(0, t)); return 1 - (1 - x) ** 3; };

export function shouldTick(level: MotionLevel, value: unknown, from = 0): boolean {
  return level === 'full' && typeof value === 'number' && Number.isFinite(value) && value !== from;
}

/** The value shown `elapsed` ms into a tick from `from` to `to`, rounded to `decimals`; exactly `to` at the end. */
export function tickValue(from: number, to: number, elapsed: number, duration = TICK_MS, decimals = 0): number {
  if (!(duration > 0) || elapsed >= duration) return to;
  const raw = from + (to - from) * easeOut(elapsed / duration);
  const f = 10 ** Math.max(0, Math.min(6, Math.floor(decimals)));
  const rounded = Math.round(raw * f) / f;
  // Never beyond the target in either direction (rounding near the end).
  return to >= from ? Math.min(rounded, to) : Math.max(rounded, to);
}

/** Decimals a number is written with (so 12.5 ticks in tenths and 1,200 in whole numbers). */
export function decimalsOf(value: number): number {
  if (!Number.isFinite(value) || Number.isInteger(value)) return 0;
  const text = String(value);
  const dot = text.indexOf('.');
  return dot < 0 || text.includes('e') ? 2 : Math.min(6, text.length - dot - 1);
}

/**
 * A formatted figure as the app already writes it ("$501,800.00", "−€1.250,5", "12 kg", "1 234,56 zł"): what stands
 * before and after the number, the number itself, its decimals and the separators it uses, so every frame is written in
 * exactly the same style as the final text. Null when the text holds no single figure (unknown, words, two numbers):
 * such text never ticks.
 */
export type FigureTemplate = {prefix: string; suffix: string; value: number; decimals: number; group: string; decimal: string};
const FIGURE = /^([^\d]*?)(\d{1,3}(?:([,.  ' ])\d{3})*|\d+)(?:([.,])(\d+))?([^\d]*)$/;

export function parseFigure(text: string): FigureTemplate | null {
  if (typeof text !== 'string' || text.length > 64) return null;
  const m = FIGURE.exec(text);
  if (!m) return null;
  const [, prefix = '', whole = '', group = '', decimal = '', fraction = '', suffix = ''] = m;
  // "1,234" with a comma group and no fraction is a grouped whole number; a lone "1.5" is a decimal.
  if (group && decimal && group === decimal) return null;
  const digits = whole.split(group || '\u0000').join('');
  const value = Number(`${digits}${fraction ? `.${fraction}` : ''}`);
  if (!Number.isFinite(value)) return null;
  return {prefix, suffix, value, decimals: fraction.length, group, decimal: decimal || (group === '.' ? ',' : '.')};
}

/** Writes `n` in the template's style (grouping only when the final text grouped). */
export function formatLike(t: FigureTemplate, n: number): string {
  const fixed = Math.abs(n).toFixed(t.decimals);
  const [whole = '0', fraction] = fixed.split('.');
  const grouped = t.group ? whole.replace(/\B(?=(\d{3})+(?!\d))/g, t.group) : whole;
  return `${t.prefix}${grouped}${fraction !== undefined ? `${t.decimal}${fraction}` : ''}${t.suffix}`;
}

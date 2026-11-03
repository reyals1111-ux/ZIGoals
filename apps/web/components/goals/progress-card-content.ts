import type {ShareCard} from '../../lib/share-image';
import {formatDate, formatMoney, formatNumber, isMoneyCurrency} from '../../lib/visual-format';

/**
 * Session AK (6.3 / 8.5): what a goal's progress share card says, pure, so the preview on the page and the image drawn
 * by lib/share-image.ts are the same words. By default only the goal's title and how far along it is (a percentage);
 * amounts and the target date only when the person ticks them. Unknown progress says so, never "0%".
 */
export type ProgressCardInput = {title: string; current: number | null; target: number | null; currency?: string; unit?: string; date?: string};
export type ProgressCardOptions = {showAmounts?: boolean; showDate?: boolean};
export function progressPercent(current: number | null, target: number | null): number | null {
  if (current === null || target === null || !Number.isFinite(current) || !Number.isFinite(target) || target <= 0 || current < 0) return null;
  return Math.min(100, Math.floor(current / target * 100));
}
const amount = (n: number, currency?: string, unit?: string) => currency && isMoneyCurrency(currency) ? formatMoney(String(Math.round(n * 100) / 100), currency) : `${formatNumber(n, {maximumFractionDigits: 2})}${unit ? ` ${unit}` : currency ? ` ${currency}` : ''}`;
export function progressShareCard(input: ProgressCardInput, {showAmounts = false, showDate = false}: ProgressCardOptions = {}): ShareCard {
  const pct = progressPercent(input.current, input.target);
  const lines: string[] = [pct === null ? 'Progress not recorded yet' : pct >= 100 ? 'Reached · 100%' : `${pct}% of the way`];
  if (showAmounts && input.current !== null && input.target !== null && pct !== null) lines.push(`${amount(input.current, input.currency, input.unit)} of ${amount(input.target, input.currency, input.unit)}`);
  if (showDate && input.date) lines.push(`Target date: ${formatDate(input.date)}`);
  return {eyebrow: 'Goal progress', title: input.title.trim().slice(0, 100) || 'My goal', lines};
}
export const progressCardFileName = (title: string) => `${title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'goal'}-progress.png`;

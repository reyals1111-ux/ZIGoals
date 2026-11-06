import {formatDate, formatNumber} from '../../lib/visual-format';
import {localDate} from '../../lib/local-date';

// CI14 (weights): the habit card's words, shared by the card (habit-card-full.tsx) and its History (habit-history.tsx).
/** The calendar's mark for a day, as the legend lists them. */
export const DAY_MARK = (r: { status: string; count: number }) => r.status === "complete" ? "✓" : r.status === "partial" || (r.status === "failed" && r.count > 0) ? "◐" : r.status === "failed" ? "×" : r.status === "skipped" ? "○" : r.status === "planned-skip" ? "◌" : "";
export const statusLabel = { complete: "Complete", partial: "Partial", due: "Due", skipped: "Skipped", failed: "Failed", "not-scheduled": "Not scheduled", paused: "Paused", archived: "Archived", future: "Future", "planned-skip": "Planned skip", "not-started": "Before you started" };
/** A count or amount as typed data shows it ("1.5"), with the display locale's decimal sign. */
// Grouped as every other figure (Session X P2.1: "8000" sat beside "8,800 steps"), every decimal kept.
export const plain = (value: number) => formatNumber(value, { maximumFractionDigits: 9 });
export function longDate(date: string) { return formatDate(date); }
export function moveMonth(month: string, amount: number) { const date = new Date(`${month}-01T12:00:00`); date.setMonth(date.getMonth() + amount); return localDate(date).slice(0, 7); }

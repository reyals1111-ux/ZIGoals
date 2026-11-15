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

/**
 * Session AO (CO4): the day a link asked a habit's History to open on (/app/habits?habit=<id>&date=<day>), from Today's
 * week grid or Perfect days. One at a time, memory only: set when the link changes, kept on the day the person then picks
 * (so History stays on it after a save remounts the card), cleared on the whole list.
 */
let historyDay: {id: string; date: string} | null = null, linked: string | null = null, scroll = false;
export function linkHistoryDay(id: string | null, date?: string | null) {
  const key = id && date ? `${id}|${date}` : null; if (key === linked) return; linked = key;
  historyDay = id && date && /^\d{4}-\d{2}-\d{2}$/.test(date) ? {id, date} : null; scroll = !!historyDay;
}
/** True once per link: History brings the day editor into view the first time only. */
export function takeHistoryScroll(): boolean { const once = scroll; scroll = false; return once; }
/** History moved to another day: a linked History keeps it. */
export function keepHistoryDay(id: string, date: string) { if (historyDay?.id === id) historyDay = {id, date}; }
/** The asked-for day for this habit, if it is one History can show (from its start up to today). */
export function askedHistoryDay(id: string, start: string, today: string): string | null { return historyDay?.id === id && historyDay.date >= start && historyDay.date <= today ? historyDay.date : null; }

/**
 * Session AI (G12, picklist 1 #30): the 30-second trade-journal check-in. With a buy or a sell, the person may say why,
 * how sure they are and when they would sell; the answers are written into the transaction's own note (no new record),
 * after anything they typed there, within the note's 500 characters. Their own words only: ZIGoals adds no advice.
 */
export const CHECKIN_REASONS = ['Long-term plan', 'The price dipped', 'News or a tip', 'Rebalancing', 'Taking profit', 'Other'] as const;
export type TradeCheckin = {reason?: (typeof CHECKIN_REASONS)[number]; sure?: number; exit?: string};
export const NOTE_MAX = 500;
export function checkinNote(note: string, checkin: TradeCheckin): string {
  const parts = [checkin.reason ? `why: ${checkin.reason.toLowerCase()}` : null, checkin.sure && checkin.sure >= 1 && checkin.sure <= 5 ? `sure ${Math.round(checkin.sure)}/5` : null,
    checkin.exit?.trim() ? `sell when: ${checkin.exit.trim().replace(/\s+/g, ' ')}` : null].filter(Boolean);
  const own = note.trim();
  if (!parts.length) return own.slice(0, NOTE_MAX);
  const line = `Check-in: ${parts.join('; ')}`;
  return (own ? `${own} · ${line}` : line).slice(0, NOTE_MAX);
}

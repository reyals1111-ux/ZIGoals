import type {ZigiPersonality} from '../ai/store/records';

/**
 * Session AJ (item 10, D14; docs/research/session-aj/COMPANIONS.md P1, P4): "ZIGi · Your day" check-in v2. Energy (the
 * daily record), the day's mood (Health's moods, one a day) and one short note, each saved on its own tap; then one kind
 * line made on this device by rules (no AI), worded by the personality the person chose.
 * - Bands: low 1–2, mid 3, high 4–5; energy and mood two bands apart read as "mixed".
 * - A low day is only acknowledged: no task, no habit, no advice; ZIGi turns empathetic, never celebrates.
 * - The line never quotes the note, compares with anyone, mentions an earlier low day or uses the words in FORBIDDEN.
 */
export type Band = 'low' | 'mid' | 'high';
export const band = (n: number): Band => (n <= 2 ? 'low' : n === 3 ? 'mid' : 'high');
export const NOTE_MAX = 140;
export const FORBIDDEN = {
  en: ['try', 'should', 'make sure', "don't forget", 'streak', 'missed', 'behind', 'depressed', 'anxious', 'symptom', 'disorder', 'therapy'],
  nl: ['probeer', 'je moet', 'vergeet niet', 'reeks', 'gemist', 'achter', 'depressief', 'angstig', 'symptoom'],
} as const;
type Lang = 'en' | 'nl';
type Lines = Record<ZigiPersonality, Record<Lang, string>>;
const HIGH: Lines = {calm: {en: 'Noted. A good amount of energy today.', nl: 'Genoteerd. Een flinke dosis energie vandaag.'}, cheerful: {en: 'Full tank this morning, nice to hear.', nl: 'Volle tank vanochtend, fijn om te horen.'}, direct: {en: 'Energy {e} of 5. Noted.', nl: 'Energie {e} van 5. Genoteerd.'}};
const MID: Lines = {calm: {en: 'An okay start. Noted for today.', nl: 'Een oké begin. Genoteerd voor vandaag.'}, cheerful: {en: 'Okay is a fine place to start from.', nl: 'Oké is prima om mee te beginnen.'}, direct: {en: 'Energy {e} of 5. Noted.', nl: 'Energie {e} van 5. Genoteerd.'}};
const LOW: Lines = {calm: {en: 'Thanks for telling me. Some days are like this.', nl: 'Dank je dat je het zegt. Sommige dagen zijn zo.'}, cheerful: {en: 'Thanks for checking in, even on a low day.', nl: 'Fijn dat je incheckt, ook op een lage dag.'}, direct: {en: 'Noted: a low day. Nothing else needed from you here.', nl: 'Genoteerd: een lage dag. Verder hoeft hier niets.'}};
const TIRED_GOOD: Lines = {calm: {en: 'Tired but in good spirits. Noted.', nl: 'Moe maar goedgemutst. Genoteerd.'}, cheerful: {en: 'Low battery, bright mood. Noted.', nl: 'Lage batterij, zonnige bui. Genoteerd.'}, direct: {en: 'Energy {e}, mood {m}. Noted.', nl: 'Energie {e}, stemming {m}. Genoteerd.'}};
const ENERGY_HEAVY: Lines = {calm: {en: 'Energy enough, a heavier mood. Both noted.', nl: 'Energie genoeg, een zwaardere stemming. Allebei genoteerd.'}, cheerful: {en: 'Energy enough, a heavier mood. Both noted.', nl: 'Energie genoeg, een zwaardere stemming. Allebei genoteerd.'}, direct: {en: 'Energy {e}, mood {m}. Noted.', nl: 'Energie {e}, stemming {m}. Genoteerd.'}};
export const NOTE_SAVED: Record<Lang, string> = {en: 'Your note is saved on this device.', nl: 'Je notitie staat op dit apparaat.'};
export type FollowUp = {line: string; low: boolean};
/** The one kind line after a check-in field is saved (energy and/or mood, 1–5), or null before anything is rated. */
export function followUpLine({energy, mood, personality = 'calm', lang = 'en'}: {energy?: number | null; mood?: number | null; personality?: ZigiPersonality; lang?: Lang}): FollowUp | null {
  const e = energy ?? null, m = mood ?? null;
  if (e === null && m === null) return null;
  const fill = (text: string | undefined) => (text ?? '').replace('{e}', String(e ?? m)).replace('{m}', String(m ?? e));
  if (e !== null && m !== null && Math.abs(['low', 'mid', 'high'].indexOf(band(e)) - ['low', 'mid', 'high'].indexOf(band(m))) >= 2) {
    const lines = e < m ? TIRED_GOOD : ENERGY_HEAVY;
    return {line: fill(lines[personality][lang]), low: false};
  }
  const lowest = Math.min(...[e, m].filter((n): n is number => n !== null));
  const which = band(lowest) === 'low' ? LOW : band(lowest) === 'mid' ? MID : HIGH;
  // "Direct" names energy when it was rated, else the mood, as a number of 5.
  const direct = personality === 'direct' && e === null && which !== LOW ? (lang === 'en' ? `Mood ${m} of 5. Noted.` : `Stemming ${m} van 5. Genoteerd.`) : null;
  return {line: direct ?? fill(which[personality][lang]), low: band(lowest) === 'low'};
}

/** The check-in days kept (energy or mood rated), for the totals that ZIGi marks once each. */
export const CHECKIN_TOTALS = [7, 30, 100, 365] as const;
export type CheckinMoment = {signal: 'achievement_unlocked' | 'health_log_recorded' | 'hint_empathetic'; ledgerId?: string; validated: boolean} | null;
/**
 * P4: what ZIGi does when a check-in is saved. `days` are the days with a check-in after this save, `seen` the
 * celebrate-once ledger, `firstSaveToday` whether this is the day's first save. Low days are empathetic and never
 * celebrate; the first check-in ever and the totals 7, 30, 100, 365 (not consecutive) celebrate once each; any other day's
 * first save is a small "noted" success; later edits that day do nothing.
 */
export function checkinMoment({days, seen, firstSaveToday, low}: {days: number; seen: Readonly<Record<string, string>>; firstSaveToday: boolean; low: boolean}): CheckinMoment {
  if (low) return {signal: 'hint_empathetic', validated: false};
  if (days >= 1 && !seen['checkin:first']) return {signal: 'achievement_unlocked', ledgerId: 'checkin:first', validated: true};
  const total = CHECKIN_TOTALS.find(n => n === days);
  if (total && !seen[`checkin-total:${total}`]) return {signal: 'achievement_unlocked', ledgerId: `checkin-total:${total}`, validated: true};
  return firstSaveToday ? {signal: 'health_log_recorded', validated: true} : null;
}

/** Session AJ (P4 moment 7): back after 7 days or more without a single entry (never on a first visit, never a count). */
export const WELCOME_BACK_DAYS = 7;
type Dated = {date: string};
/**
 * The latest day on or before `day` with any entry the person made: a habit day, food, an activity, a weight or water.
 * Read from the records, so nothing is written to know it ("nothing is written on view", Session V Part 9).
 */
export function lastEntryDay(habits: {habits: readonly {entries: readonly Dated[]}[]}, health: {diary: readonly Dated[]; activity: readonly Dated[]; weights: readonly Dated[]; daily?: {water: readonly Dated[]} | null}, day: string): string | undefined {
  let latest: string | undefined;
  const see = (list: readonly Dated[] | undefined) => { for (const e of list ?? []) if (e.date <= day && (!latest || e.date > latest)) latest = e.date; };
  for (const h of habits.habits) see(h.entries);
  see(health.diary); see(health.activity); see(health.weights); see(health.daily?.water);
  return latest;
}
export function welcomeBack(lastSeen: string | undefined, day: string): boolean {
  if (!lastSeen || lastSeen >= day) return false;
  return (Date.parse(`${day}T12:00:00Z`) - Date.parse(`${lastSeen}T12:00:00Z`)) / 86_400_000 >= WELCOME_BACK_DAYS;
}

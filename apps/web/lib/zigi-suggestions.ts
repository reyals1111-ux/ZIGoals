import * as z from 'zod';
import type {DeviceRecordSpec} from './device-record';
import {ZIGI_SUGGESTIONS_KEY} from './z-device-keys';

/**
 * The person's own suggestions for ZIGi (Session Z-Cloud Part 2, `[TIER 3] (storage)`, ADR-019): a question asked three
 * times within thirty days becomes a "Yours" card in the Suggestions sheet. Device-only (`zigoals:zigi-suggestions:v1`
 * through `getAppStorage()`, never synced), in "Export everything" and in "What ZIGi knows", cleared by "Turn off ZIGi",
 * Disconnect and the account's erase. A question is sent to a provider only when the person sends it, exactly as typed.
 * Removing a card deletes the question and its words; asked three more times within thirty days, it returns.
 * Health (owner plan edit 9): a question that mentions Health is not recorded at all while Health is not shared with ZIGi,
 * and one recorded while it was shared shows only while it still is.
 * The record is loose (unknown fields survive in later builds) and capped: 200 questions tracked, 12 shown.
 */
export const WINDOW_MS = 30 * 24 * 60 * 60 * 1000;
export const PROMOTE_AT = 3;
export const MAX_SHOWN = 12;
export const MAX_TRACKED = 200;
const MAX_ASKS = 12;
const stamp = z.number().int().min(0).max(8_640_000_000_000_000);
const entrySchema = z.looseObject({
  /** The words as the person last asked them (shown on the card and sent when tapped). */
  text: z.string().min(1).max(300),
  /** When the question was asked, newest last, at most 12, within the window (older asks are dropped on the next write). */
  asks: z.array(stamp).max(MAX_ASKS),
  /** The words mention Health (lib vocabulary below): shown only while Health is shared with ZIGi. */
  health: z.boolean().optional(),
  /** When it first reached three asks within thirty days; a promoted question stays until the person removes it. */
  promotedAt: stamp.optional(),
  pinned: z.boolean().optional(),
});
export type SuggestionEntry = z.infer<typeof entrySchema>;
export const suggestionsSchema = z.looseObject({
  version: z.literal(1),
  questions: z.record(z.string().min(1).max(300), entrySchema).refine(r => Object.keys(r).length <= MAX_TRACKED).optional(),
});
export type SuggestionsRecord = z.infer<typeof suggestionsSchema>;
export const ZIGI_SUGGESTIONS: DeviceRecordSpec<SuggestionsRecord> = {key: ZIGI_SUGGESTIONS_KEY, schema: suggestionsSchema, empty: () => ({version: 1})};

/**
 * One key per question: case, spacing and punctuation fold together, numbers are kept as written ("2 glasses" and
 * "3 glasses" stay apart; "2,5" and "2.5" are one). Slash commands, very short and very long texts are not questions.
 */
export function normaliseQuestion(text: string): string | null {
  const trimmed = text.trim();
  if (trimmed.length < 3 || trimmed.length > 300 || trimmed.startsWith('/')) return null;
  const key = trimmed.normalize('NFKC').toLocaleLowerCase('en-US')
    .replace(/(\d)[.,](?=\d)/g, '$1\u0001')
    .replace(/[^\p{L}\p{N}\u0001]+/gu, ' ')
    .replace(/\u0001/g, '.')
    .replace(/\s+/g, ' ').trim();
  return key.length >= 3 ? key : null;
}

/** Words that make a question a Health question, in English and Dutch (conservative: a false match only hides a card). */
const HEALTH = new RegExp(String.raw`\b(?:health|weigh\w*|weight|kg|kilos?|lbs?|pounds?|sleep\w*|slept|naps?|water|drink\w*|drank|glass(?:es)?|ml|litres?|liters?|fl ?oz|meals?|ate|eat\w*|food|breakfast|lunch|dinner|snacks?|calories?|kcal|protein|carbs?|fat|fasts?|fasting|steps?|walk\w*|run|ran|running|workouts?|exercis\w*|training|gym|heart\w*|pulse|bpm|blood|pressure|mood|period|cycle|symptoms?|medica\w*|meds|pills?|doctor|meditat\w*|breath\w*|gezondheid|gewicht|weeg\w*|gewogen|slaap\w*|slapen|sliep|geslapen|dutje|gegeten|gedronken|gewandeld|gelopen|gesport|drinken|dronk|glazen?|maaltijd\w*|eten|ontbijt|avondeten|calorie\w*|eiwit\w*|vasten|stappen|wandel\w*|hardlopen|sport\w*|hart\w*|hartslag|bloed\w*|stemming|menstruatie|medicijn\w*|dokter|arts|ademhaling)\b`, 'iu');
export const mentionsHealth = (text: string): boolean => HEALTH.test(text.normalize('NFKC'));

/** The asks still inside the window at `now`. */
const recent = (asks: readonly number[], now: number) => asks.filter(at => at <= now && now - at < WINDOW_MS);

/**
 * The record after the person asked `text` at `now`. Nothing changes for a non-question or for a Health question while
 * Health is not shared. Keeps at most 200 questions: the least recently asked go first,
 * never a pinned one.
 */
export function recordAsk(record: SuggestionsRecord, text: string, now: number, {healthShared}: {healthShared: boolean}): SuggestionsRecord {
  const key = normaliseQuestion(text);
  if (!key) return record;
  const health = mentionsHealth(text);
  if (health && !healthShared) return record;
  const questions = {...record.questions ?? {}};
  const current = questions[key];
  const asks = [...recent(current?.asks ?? [], now), now].slice(-MAX_ASKS);
  const promoted = current?.promotedAt ?? (asks.length >= PROMOTE_AT ? now : undefined);
  questions[key] = {...current, text: text.trim().slice(0, 300), asks, ...(health || current?.health ? {health: true} : {}), ...(promoted !== undefined ? {promotedAt: promoted} : {})};
  const keys = Object.keys(questions);
  if (keys.length > MAX_TRACKED) {
    const last = (k: string) => Math.max(0, ...(questions[k]!.asks));
    for (const drop of keys.filter(k => !questions[k]!.pinned && k !== key).sort((a, b) => last(a) - last(b)).slice(0, keys.length - MAX_TRACKED)) delete questions[drop];
  }
  return {...record, version: 1, questions};
}

export type ShownSuggestion = {key: string; text: string; pinned: boolean};
/** The "Yours" cards: promoted, Health ones only while Health is shared; pinned first, then most recent; at most 12. */
export function shownSuggestions(record: SuggestionsRecord, {healthShared}: {healthShared: boolean}): ShownSuggestion[] {
  const last = (e: SuggestionEntry) => Math.max(e.promotedAt ?? 0, ...e.asks);
  return Object.entries(record.questions ?? {})
    .filter(([, e]) => e.promotedAt !== undefined && (healthShared || !e.health))
    .sort(([, a], [, b]) => Number(!!b.pinned) - Number(!!a.pinned) || last(b) - last(a))
    .slice(0, MAX_SHOWN)
    .map(([key, e]) => ({key, text: e.text, pinned: !!e.pinned}));
}
/** Every question this device keeps, for "What ZIGi knows" (with whether it is a card yet). */
export function trackedQuestions(record: SuggestionsRecord): {key: string; text: string; asks: number; promoted: boolean; pinned: boolean; health: boolean}[] {
  return Object.entries(record.questions ?? {}).map(([key, e]) => ({key, text: e.text, asks: e.asks.length, promoted: e.promotedAt !== undefined, pinned: !!e.pinned, health: !!e.health}));
}
export function setPinned(record: SuggestionsRecord, key: string, pinned: boolean): SuggestionsRecord {
  const current = record.questions?.[key];
  if (!current) return record;
  const next = {...current}; if (pinned) next.pinned = true; else delete next.pinned;
  return {...record, questions: {...record.questions, [key]: next}};
}
/** Removed: the question, its words and its asks go; asked three more times within thirty days, it comes back. */
export function removeSuggestion(record: SuggestionsRecord, key: string): SuggestionsRecord {
  if (!record.questions?.[key]) return record;
  const questions = {...record.questions}; delete questions[key];
  return {...record, questions};
}

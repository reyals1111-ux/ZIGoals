import * as z from 'zod';

/**
 * Session AK (lane S, item 6; TIER 3 (stored format), additive): a feeling word for the day, picked after the 1–5 energy
 * or mood. It lives in the existing daily energy record (zigoals:energy:v1, a z.looseObject) as one OPTIONAL top-level
 * field, `words`, keyed by date: {energy, pleasantness, word, at}. Builds that do not know the field keep it (the record
 * is loose and `rateEnergy` spreads the record), and Export everything, the backup and restore already carry the key.
 * The word is a string, not an enum, so a word added later still reads in this build.
 */
export const MAX_MOOD_WORD_DAYS = 1100;
/**
 * Session AV lane 2 (bodymind-r2; LEDGER #232, Moodnotes' feelings with a strength; TIER 3 (stored format), additive and
 * optional): how strong the day's word is (a little, quite, very), and up to two more words, each with its own corner and
 * strength. Each is dropped on read when this build cannot read it; older builds keep reading the one `word` (the day is
 * loose, so they keep both fields untouched).
 */
export const STRENGTHS = ['little', 'quite', 'very'] as const;
export type Strength = typeof STRENGTHS[number];
export const MAX_MORE_WORDS = 2;
export const moreWordSchema = z.looseObject({
  energy: z.enum(['high', 'low']),
  pleasantness: z.enum(['pleasant', 'unpleasant']),
  word: z.string().trim().min(1).max(32),
  strength: z.enum(STRENGTHS).optional().catch(undefined),
});
export type MoreWord = z.infer<typeof moreWordSchema>;
const moreWords = z.preprocess(v => Array.isArray(v) ? v.filter(x => moreWordSchema.safeParse(x).success).slice(0, MAX_MORE_WORDS) : undefined, z.array(moreWordSchema).max(MAX_MORE_WORDS).optional());
export const moodWordDaySchema = z.looseObject({
  energy: z.enum(['high', 'low']),
  pleasantness: z.enum(['pleasant', 'unpleasant']),
  word: z.string().trim().min(1).max(32),
  at: z.iso.datetime({offset: true}),
  strength: z.enum(STRENGTHS).optional().catch(undefined),
  more: moreWords,
  /**
   * Session AV lane 2 (r4-mind; LEDGER #326, How We Feel's "where you feel it"; TIER 3 (stored format), additive and
   * optional): up to three body areas, each with a sensation word, `[{area, feel}]` (lib/mood-words/body.ts). Checked where
   * read (an item this build cannot read is left out there); older builds keep the field untouched (the day is loose).
   */
  body: z.array(z.unknown()).max(8).optional().catch(undefined),
});
export type MoodWordDay = z.infer<typeof moodWordDaySchema>;
export const moodWordsSchema = z.record(z.iso.date(), moodWordDaySchema).refine(days => Object.keys(days).length <= MAX_MOOD_WORD_DAYS, `Up to ${MAX_MOOD_WORD_DAYS} days of feeling words.`);
/** The days whose word this build can read (a day written by a later build in another shape is left out, and kept). */
export function wordsOf(energy: {words?: Readonly<Record<string, unknown>>} | null | undefined): Record<string, MoodWordDay> {
  const out: Record<string, MoodWordDay> = {};
  for (const [day, raw] of Object.entries(energy?.words ?? {})) { if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) continue; const parsed = moodWordDaySchema.safeParse(raw); if (parsed.success) out[day] = parsed.data; }
  return out;
}

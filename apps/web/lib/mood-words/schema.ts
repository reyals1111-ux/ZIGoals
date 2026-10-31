import * as z from 'zod';

/**
 * Session AK (lane S, item 6; TIER 3 (stored format), additive): a feeling word for the day, picked after the 1–5 energy
 * or mood. It lives in the existing daily energy record (zigoals:energy:v1, a z.looseObject) as one OPTIONAL top-level
 * field, `words`, keyed by date: {energy, pleasantness, word, at}. Builds that do not know the field keep it (the record
 * is loose and `rateEnergy` spreads the record), and Export everything, the backup and restore already carry the key.
 * The word is a string, not an enum, so a word added later still reads in this build.
 */
export const MAX_MOOD_WORD_DAYS = 1100;
export const moodWordDaySchema = z.looseObject({
  energy: z.enum(['high', 'low']),
  pleasantness: z.enum(['pleasant', 'unpleasant']),
  word: z.string().trim().min(1).max(32),
  at: z.iso.datetime({offset: true}),
});
export type MoodWordDay = z.infer<typeof moodWordDaySchema>;
export const moodWordsSchema = z.record(z.iso.date(), moodWordDaySchema).refine(days => Object.keys(days).length <= MAX_MOOD_WORD_DAYS, `Up to ${MAX_MOOD_WORD_DAYS} days of feeling words.`);
/** The days whose word this build can read (a day written by a later build in another shape is left out, and kept). */
export function wordsOf(energy: {words?: Readonly<Record<string, unknown>>} | null | undefined): Record<string, MoodWordDay> {
  const out: Record<string, MoodWordDay> = {};
  for (const [day, raw] of Object.entries(energy?.words ?? {})) { if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) continue; const parsed = moodWordDaySchema.safeParse(raw); if (parsed.success) out[day] = parsed.data; }
  return out;
}

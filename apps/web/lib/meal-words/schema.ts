import * as z from 'zod';
import type {DeviceRecordSpec} from '../device-record';
import {MEAL_WORDS_KEY_LITERAL} from '../au-device-keys';

/**
 * Session AU (ADR-044 F-MEAL; TIER 3 (stored format), additive): a meal logged in words alone ("porridge with a banana").
 * Health's foods and diary are strict in every released build (a food without a measure, or a new field, would make
 * #37–#57 refuse the whole Health record), so the words are NOT a diary entry: they live in this NEW device-only key,
 * loose and versioned, the `zigoals:meal-estimates:v1` precedent. Their calories stay unknown, never zero: no total
 * counts them. Health-type data (the `zigoals:mood-tags:v1` class): exported, restored only with the Health choice,
 * erased with the account; never synced, and no ZIGi or NOVA context builder reads it.
 */
export const MEAL_WORDS_KEY = MEAL_WORDS_KEY_LITERAL;
export const MAX_MEAL_WORDS = 2_000;
export const MAX_WORDS_CHARS = 120;
/** The diary's four meals (lib/health.ts HEALTH_MEALS), as literals so this module stays free of Health's schema. */
export const MEAL_WORDS_MEALS = ['Breakfast', 'Lunch', 'Dinner', 'Snacks'] as const;
export type MealWordsMeal = (typeof MEAL_WORDS_MEALS)[number];
/** What was eaten: one line, 1 to 120 visible characters, trimmed. */
export const wordsSchema = z.string().trim().min(1).max(MAX_WORDS_CHARS).refine(t => !/[\u0000-\u001f\u007f]/.test(t), 'The words are one line of text.');
export const mealWordsEntrySchema = z.looseObject({
  id: z.string().regex(/^[A-Za-z0-9_-]{1,100}$/),
  date: z.iso.date().refine(d => d >= '1900-01-01' && d <= '2199-12-31'),
  meal: z.enum(MEAL_WORDS_MEALS),
  words: wordsSchema,
  at: z.iso.datetime({offset: true}),
});
export const mealWordsSchema = z.looseObject({version: z.literal(1), entries: z.array(mealWordsEntrySchema).max(MAX_MEAL_WORDS)})
  .refine(r => new Set(r.entries.map(e => e.id)).size === r.entries.length, 'Each entry once.');
export type MealWordsEntry = z.infer<typeof mealWordsEntrySchema>;
export type MealWords = z.infer<typeof mealWordsSchema>;
export const emptyMealWords = (): MealWords => ({version: 1, entries: []});
export const MEAL_WORDS: DeviceRecordSpec<MealWords> = {key: MEAL_WORDS_KEY, schema: mealWordsSchema, empty: emptyMealWords};

/** A new entry's id: `words_` and a random part. */
const randomPart = () => typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
export function newMealWordsId(random: () => string = randomPart): string { return `words_${random().replace(/[^A-Za-z0-9-]/g, '').slice(0, 80)}`; }
/** Adds one entry (an entry with the same id is replaced); past MAX_MEAL_WORDS the oldest go. Throws, changing nothing, on an invalid entry. */
export function addMealWords(record: MealWords, entry: MealWordsEntry): MealWords {
  const next = mealWordsEntrySchema.parse(entry);
  const entries = [...record.entries.filter(e => e.id !== next.id), next].sort((a, b) => a.at.localeCompare(b.at));
  return mealWordsSchema.parse({...record, entries: entries.slice(Math.max(0, entries.length - MAX_MEAL_WORDS))});
}
/** Removes one entry by id; an unknown id leaves the record as it was. */
export function removeMealWords(record: MealWords, id: string): MealWords {
  return record.entries.some(e => e.id === id) ? {...record, entries: record.entries.filter(e => e.id !== id)} : record;
}
/** One day's words for one meal, oldest first. */
export const mealWordsFor = (record: MealWords, date: string, meal: MealWordsMeal): MealWordsEntry[] => record.entries.filter(e => e.date === date && e.meal === meal);

import * as z from 'zod';
import type {DeviceRecordSpec} from '../device-record';

/**
 * Session AK (BUILD list 2 #16, lane G1a): the cycle log — opt-in and hidden by default. A new device-only key, loose and
 * versioned: whether the person turned it on (`on`, off when missing) and, per calendar day, the flow, symptom chips and
 * a short note. Health-describing: the lead keeps it with the Health choice for sync and restore; it never appears in a
 * notification. Turning it off hides it and keeps every entry; deleting is its own, confirmed step. Information for the
 * person, not a contraceptive or a diagnosis.
 */
export const CYCLE_KEY = 'zigoals:cycle:v1';
export const MAX_CYCLE_DAYS = 1500, MAX_SYMPTOMS = 12, CYCLE_NOTE_MAX = 280;
export const FLOWS = ['light', 'medium', 'heavy'] as const;
export type Flow = typeof FLOWS[number];
/** The chips offered (an id this build does not know is kept and shown as written). */
export const SYMPTOMS = ['cramps', 'headache', 'back-pain', 'bloating', 'tender-breasts', 'tired', 'mood-changes', 'acne', 'spotting', 'cravings'] as const;
export const SYMPTOM_WORDS: Readonly<Record<string, string>> = {cramps: 'Cramps', headache: 'Headache', 'back-pain': 'Back pain', bloating: 'Bloating', 'tender-breasts': 'Tender breasts', tired: 'Tired', 'mood-changes': 'Mood changes', acne: 'Skin changes', spotting: 'Spotting', cravings: 'Cravings'};
const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
/** Session AV lane 2 (r5-body, LEDGER #380): a word's id, in the form a day's `symptoms` keeps (older builds read it). */
const wordId = z.string().regex(/^[a-z-]{1,30}$/);
export const OWN_WORDS_MAX = 30, OWN_WORDS_KEPT = 60, OWN_WORD_MAX = 24;
const ownWordSchema = z.looseObject({id: wordId, word: z.string().trim().min(1).max(OWN_WORD_MAX), gone: z.literal(true).optional().catch(undefined)});
export type OwnWord = z.infer<typeof ownWordSchema>;
export const cycleDaySchema = z.looseObject({
  flow: z.enum(FLOWS).optional().catch(undefined),
  symptoms: z.array(z.string().regex(/^[a-z-]{1,30}$/)).max(MAX_SYMPTOMS).optional(),
  note: z.string().trim().max(CYCLE_NOTE_MAX).optional(),
});
export const cycleSchema = z.looseObject({
  version: z.literal(1),
  /** true: the cycle log shows in Health. Missing or false: hidden (the default); entries are kept either way. */
  on: z.boolean().optional(),
  /**
   * Session AV lane 2 (r3-plan, LEDGER #262; Structured's Cycle Seasons, without the phase advice; TIER 3 (stored format),
   * additive and optional): true shows the cycle day and the period days on the Day Timeline and the Agenda (with the log
   * on and Health shown). Missing: not shown. A value this build cannot read is dropped on read; older builds keep it.
   */
  plan: z.literal(true).optional().catch(undefined),
  days: z.record(day, cycleDaySchema).default({}).refine(d => Object.keys(d).length <= MAX_CYCLE_DAYS, `Up to ${MAX_CYCLE_DAYS} days.`),
  /**
   * Session AV lane 2 (r5-body, LEDGER #380, Clue's custom tags; TIER 3 (stored format), additive and optional): the
   * person's own words to log (`own`: an id in the day's own form and the word as typed; `gone` keeps a removed word's name
   * for its past days), the built-in words hidden (`hidden`) and the order the words show in (`order`). A list this build
   * cannot read is dropped on its own; older builds keep it and show an own word's id as written.
   */
  own: z.preprocess(v => Array.isArray(v) ? v.filter(x => ownWordSchema.safeParse(x).success).slice(0, OWN_WORDS_KEPT) : v, z.array(ownWordSchema).max(OWN_WORDS_KEPT)).optional().catch(undefined),
  hidden: z.array(wordId).max(60).optional().catch(undefined),
  order: z.array(wordId).max(120).optional().catch(undefined),
  /**
   * Session AV lane 2 (r5-body, LEDGER #382, Clue's "exclude a cycle"; TIER 3 (stored format), additive and optional): the
   * first days of the cycles the person left out of the averages and the estimate. Dropped on its own when unreadable.
   */
  leftOut: z.array(day).max(200).optional().catch(undefined),
  /**
   * Session AV lane 2 (r5-body, LEDGER #383, Clue's No Period and Perimenopause modes, as plain choices; TIER 3 (stored
   * format), additive and optional): `noPeriod` hides the flow buttons and the next-period line (every word and note is
   * kept); `peri` adds words for perimenopause to log, with no reading of what they mean. Each true or missing.
   */
  noPeriod: z.literal(true).optional().catch(undefined),
  peri: z.literal(true).optional().catch(undefined),
});
export type CycleDay = z.infer<typeof cycleDaySchema>;
export type Cycle = z.infer<typeof cycleSchema>;
export const emptyCycle = (): Cycle => ({version: 1, days: {}});
export const CYCLE: DeviceRecordSpec<Cycle> = {key: CYCLE_KEY, schema: cycleSchema, empty: emptyCycle};
export const cycleOn = (c: Pick<Cycle, 'on'>) => c.on === true;
/** Session AV lane 2 (r3-plan, LEDGER #262): the cycle shown on the day plan (the log on and the plan choice made). */
export const cycleOnPlan = (c: Pick<Cycle, 'on' | 'plan'>) => c.on === true && c.plan === true;
/** The days with a period logged (a flow), oldest first. */
export const periodDays = (c: Pick<Cycle, 'days'>): string[] => Object.entries(c.days).filter(([, d]) => !!d.flow).map(([d]) => d).sort();

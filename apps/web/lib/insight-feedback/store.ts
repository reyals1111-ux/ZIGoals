import * as z from 'zod';
import type {DeviceRecordSpec} from '../device-record';

/**
 * Owner follow-up 2 (BUILD list 2 #21; How We Feel's "was this useful?"): one optional tap under ZIGi's note on the week
 * or the month (8.3), "Useful" or "Not for me", about the kind of line that leads it (a pairing seen together, a Health
 * trend or a streak). Kept on this device only (`zigoals:insight-feedback:v1`, at most 200 marks, the oldest make way)
 * and used for one thing: a kind whose latest mark is "Not for me" is left out of later notes. Nothing is sent.
 */
export const INSIGHT_FEEDBACK_KEY = 'zigoals:insight-feedback:v1';
export const MAX_INSIGHT_MARKS = 200;
export const NOTE_KINDS = ['pairing', 'trend', 'streak'] as const;
export type NoteKind = typeof NOTE_KINDS[number];
export type Verdict = 'useful' | 'not-for-me';
const markSchema = z.looseObject({kind: z.enum(NOTE_KINDS), verdict: z.enum(['useful', 'not-for-me']), at: z.iso.datetime()});
export const insightFeedbackSchema = z.looseObject({
  version: z.literal(1),
  // An unreadable mark is dropped on read, never the whole record.
  marks: z.array(z.unknown()).max(MAX_INSIGHT_MARKS * 2).default([]).transform(marks => marks.flatMap(m => { const r = markSchema.safeParse(m); return r.success ? [r.data] : []; }).slice(-MAX_INSIGHT_MARKS)),
});
export type InsightFeedback = z.infer<typeof insightFeedbackSchema>;
export type InsightMark = InsightFeedback['marks'][number];
export const emptyInsightFeedback = (): InsightFeedback => ({version: 1, marks: []});
export const INSIGHT_FEEDBACK: DeviceRecordSpec<InsightFeedback> = {key: INSIGHT_FEEDBACK_KEY, schema: insightFeedbackSchema, empty: emptyInsightFeedback};

/** Adds one mark; the record keeps the newest 200. */
export function markInsight(record: InsightFeedback, kind: NoteKind, verdict: Verdict, at: string): InsightFeedback {
  return {...record, marks: [...record.marks, {kind, verdict, at}].slice(-MAX_INSIGHT_MARKS)};
}
/** Takes back the newest mark of that kind (Undo right after the tap). */
export function unmarkInsight(record: InsightFeedback, kind: NoteKind): InsightFeedback {
  let i = -1;
  record.marks.forEach((m, j) => { if (m.kind === kind) i = j; });
  return i < 0 ? record : {...record, marks: record.marks.filter((_, j) => j !== i)};
}
/** The kinds whose latest mark is "Not for me": later notes leave them out. A later "Useful" brings a kind back. */
export function notForMe(record: InsightFeedback): ReadonlySet<NoteKind> {
  const latest = new Map<NoteKind, Verdict>();
  for (const m of record.marks) latest.set(m.kind, m.verdict);
  return new Set([...latest].filter(([, v]) => v === 'not-for-me').map(([k]) => k));
}

import {habitExtrasSchema, type HabitExtras, type HabitIntention} from '../habits-extras/schema';

/**
 * Session AK (F5b): implementation intentions, the "when" and "where" of a habit ("After I pour my coffee", "in the
 * kitchen"), kept in the habit extras record's optional `intentions` map (TIER 3 (stored format); it syncs with that
 * section as `times` does). Pure: every change validates the whole record and prunes habits the journal no longer has.
 * The texts are the person's own words; nothing here is inferred or applied for them.
 */
export const INTENTION_MAX = 80, WHY_MAX = 160;
/** `why` left out keeps the habit's why as it is (callers that edit only when and where never clear it). */
export type IntentionDraft = {when?: string | null; where?: string | null; why?: string | null};
/** One line of plain text: control characters out, runs of spaces as one, at most INTENTION_MAX characters. */
export function cleanIntentionText(text: string | null | undefined, max = INTENTION_MAX): string | undefined {
  const clean = (text ?? '').replace(/[\u0000-\u001f\u007f]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max).trim();
  return clean || undefined;
}
const prune = (map: Record<string, HabitIntention>, keep: ReadonlySet<string> | null) => {
  const next = Object.fromEntries(Object.entries(map).filter(([id]) => !keep || keep.has(id)));
  return Object.keys(next).length ? next : undefined;
};
/** Sets (or, with both texts empty or `null`, clears) a habit's intention. `keep` is the journal's habit ids. */
export function setHabitIntention(r: HabitExtras, habitId: string, draft: IntentionDraft | null, keep: ReadonlySet<string> | null = null): HabitExtras {
  const intentions = {...(r.intentions ?? {})}, when = cleanIntentionText(draft?.when), where = cleanIntentionText(draft?.where);
  // Session AL Part 15 (AL-COMPETITOR-GAP-100): the why, kept unless the draft names it (null clears everything).
  const why = draft && 'why' in draft ? cleanIntentionText(draft.why, WHY_MAX) : draft ? intentions[habitId]?.why : undefined;
  if (when || where || why) intentions[habitId] = {...(when ? {when} : {}), ...(where ? {where} : {}), ...(why ? {why} : {})}; else delete intentions[habitId];
  return habitExtrasSchema.parse({...r, intentions: prune(intentions, keep ? new Set([...keep, habitId]) : null)});
}
export const habitIntention = (r: HabitExtras, habitId: string): HabitIntention | null => r.intentions?.[habitId] ?? null;
/** Session AL Part 15 (AL-COMPETITOR-GAP-100): the habit's own why, or null. */
export const habitWhy = (r: HabitExtras | null | undefined, habitId: string): string | null => r?.intentions?.[habitId]?.why ?? null;
const capital = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);
/**
 * The intention as one line, in the shape the owner asked for: "After I pour my coffee → 2 min stretch · in the kitchen".
 * Without a "when" it is "2 min stretch · in the kitchen"; with neither text it is null.
 */
export function intentionLine(title: string, intention: HabitIntention | null | undefined): string | null {
  if (!intention?.when && !intention?.where) return null;
  return `${intention.when ? `${capital(intention.when)} → ` : ''}${title}${intention.where ? ` · ${intention.where}` : ''}`;
}
/**
 * A stack shown in order, as its steps: the first habit's own "when" (a cue that is not a habit, "After I pour my coffee")
 * when it has one, then each habit's title. `cue` is null when the first habit has no "when".
 */
export function stackSteps(chain: readonly {id: string; title: string}[], r: HabitExtras | null): {cue: string | null; steps: {id: string; title: string}[]} {
  const first = chain[0], when = first && r ? r.intentions?.[first.id]?.when : undefined;
  return {cue: when ? capital(when) : null, steps: chain.map(h => ({id: h.id, title: h.title}))};
}
/** The steps as one sentence for a screen reader and a share: "After I pour my coffee, then 2 min stretch, then Read." */
export function stackSentence(chain: readonly {id: string; title: string}[], r: HabitExtras | null): string {
  const {cue, steps} = stackSteps(chain, r);
  if (!steps.length) return '';
  return `${cue ? `${cue}, then ` : ''}${steps.map(s => s.title).join(', then ')}.`;
}

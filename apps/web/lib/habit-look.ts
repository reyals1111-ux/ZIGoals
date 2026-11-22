/**
 * Session AV (owner follow-up 1, F-HABIT-LOOK; Streaks' icon and colour per habit): a symbol and a colour of the
 * person's choice beside a habit's name, so a list reads at a glance. Kept as the optional `looks` map ({habitId:
 * {glyph, colour}}) of the loose habit extras record (`zigoals:habit-extras:v1`; TIER 3 stored format, additive: older
 * builds keep it untouched and show nothing), exported, erased and synced with the extras as they are. Only the listed
 * symbols and named colours are read (each theme draws its own shade); anything else reads as no look. The symbol is
 * decoration: the habit's name always says what it is. Plain checks, no schema module. Pure.
 */
export const HABIT_GLYPHS = ['●', '▲', '■', '◆', '★', '♥', '✿', '☀', '☾', '♪', '✎', '⚑', '✚', '⌂', '❄', '☘'] as const;
export const HABIT_COLOURS = ['grey', 'red', 'orange', 'yellow', 'green', 'teal', 'blue', 'violet', 'pink'] as const;
export type HabitLook = {glyph: (typeof HABIT_GLYPHS)[number]; colour: (typeof HABIT_COLOURS)[number]};
export const MAX_LOOKS = 400;
export function lookOf(extras: unknown, habitId: string): HabitLook | null {
  const looks = (extras as {looks?: unknown} | null | undefined)?.looks;
  if (!looks || typeof looks !== 'object' || !Object.hasOwn(looks, habitId)) return null;
  const l = (looks as Record<string, Partial<HabitLook>>)[habitId];
  return l && (HABIT_GLYPHS as readonly string[]).includes(l.glyph ?? '') && (HABIT_COLOURS as readonly string[]).includes(l.colour ?? '') ? {glyph: l.glyph!, colour: l.colour!} : null;
}
/** The extras with this habit's look set (or removed with null); the other habits' looks kept, at most 400. */
export function withLook<T extends object>(extras: T, habitId: string, look: HabitLook | null): T {
  const raw = (extras as {looks?: unknown}).looks, looks: Record<string, HabitLook> = {};
  if (raw && typeof raw === 'object') for (const [k, v] of Object.entries(raw as Record<string, unknown>)) { const l = lookOf({looks: {[k]: v}}, k); if (l && k !== habitId && k !== '__proto__') looks[k] = l; }
  if (look) { if (Object.keys(looks).length >= MAX_LOOKS) throw new Error(`Up to ${MAX_LOOKS} habits can have a symbol.`); looks[habitId] = {glyph: look.glyph, colour: look.colour}; }
  const {looks: _drop, ...rest} = extras as T & {looks?: unknown}; void _drop;
  return (Object.keys(looks).length ? {...rest, looks} : rest) as T;
}

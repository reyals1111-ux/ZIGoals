import {HABIT_COLOURS, HABIT_GLYPHS} from '../habit-look';

/**
 * Session AV lane 2 (r3-plan, LEDGER #257; Structured's task icons and colours): a task's own symbol and colour, from the
 * habit-look set (lib/habit-look.ts), so a task reads like a habit beside it. Kept as the optional `look` on the loose task
 * (lib/tasks/schema.ts; TIER 3 stored format, additive). Each theme draws the named colour (components/habits/habit-look.css).
 * The symbol is decoration: the title always says what the task is. Constants and one reader only, so any list can show
 * the mark in its first chunk; the word list that suggests a symbol is lib/tasks/look-words.ts (loaded with the editor).
 */
export const TASK_LOOK_GLYPHS = HABIT_GLYPHS;
export const TASK_LOOK_COLOURS = HABIT_COLOURS;
export type TaskGlyph = (typeof TASK_LOOK_GLYPHS)[number];
export type TaskLookColour = (typeof TASK_LOOK_COLOURS)[number];
export type TaskLook = {glyph: TaskGlyph; colour: TaskLookColour};
/** The look a task carries, or null (anything this build does not know reads as none). */
export function taskLook(task: {look?: unknown} | null | undefined): TaskLook | null {
  const l = task?.look as Partial<TaskLook> | undefined;
  return l && (TASK_LOOK_GLYPHS as readonly string[]).includes(l.glyph ?? '') && (TASK_LOOK_COLOURS as readonly string[]).includes(l.colour ?? '') ? {glyph: l.glyph!, colour: l.colour!} : null;
}
/** The same colours as hex, for a place that takes a CSS colour (the Day Timeline's `--item-colour`); habit-look.css's values. */
export const LOOK_HEX: Record<TaskLookColour, string> = {grey: '#8a8fa3', red: '#e5484d', orange: '#f08c38', yellow: '#d4a72c', green: '#46a758', teal: '#12a594', blue: '#3e8bf0', violet: '#8e6cf0', pink: '#e05aa8'};
export const LOOK_COLOUR_WORDS: Record<TaskLookColour, string> = {grey: 'Grey', red: 'Red', orange: 'Orange', yellow: 'Yellow', green: 'Green', teal: 'Teal', blue: 'Blue', violet: 'Violet', pink: 'Pink'};

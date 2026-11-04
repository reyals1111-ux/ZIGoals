import { formatNumber } from "./visual-format";

/** English singular/plural for counts shown in the UI (Session G, Part 5; QA-28 "1 times per day"). */
export function plural(count: number, one: string, many = `${one}s`): string {
  return count === 1 ? one : many;
}

/** The units the app itself offers (habit templates and defaults), with their singular. */
const SINGULAR_UNITS: Record<string, string> = {
  times: "time", minutes: "minute", hours: "hour", steps: "step", pages: "page", glasses: "glass", sessions: "session",
  reps: "rep", servings: "serving", cups: "cup", "check-ins": "check-in", days: "day", weeks: "week", months: "month",
  // Session AL (DV-014): the words people give a count Goal ("Read 20 books"), lower case as typed.
  books: "book", chapters: "chapter", lessons: "lesson", workouts: "workout", runs: "run", walks: "walk", kilometres: "kilometre",
  kilometers: "kilometer", miles: "mile", items: "item", units: "unit", words: "word", songs: "song", courses: "course", classes: "class",
};

/**
 * A habit's measurement unit after a value: "1 time", "2 times", "1 minute". Only the plural units the app offers
 * become singular after exactly 1; any other unit stays exactly as typed.
 */
export function unitFor(value: number, unit: string): string {
  return value === 1 ? SINGULAR_UNITS[unit] ?? unit : unit;
}

/**
 * Session AL (3f): a count with its word, the number grouped in the display locale: "1 book", "0 books", "2,500 steps",
 * "1.5 hours". English: only exactly 1 (or −1) is singular. `many` defaults to `one` + "s"; pass it for "entries".
 */
export function countText(count: number, one: string, many = `${one}s`): string {
  if (!Number.isFinite(count)) return `— ${many}`;
  return `${formatNumber(count, { maximumFractionDigits: 2 })} ${Math.abs(count) === 1 ? one : many}`;
}

/**
 * Session AL (3f, DV-014: "Read 20 books" read "20 ZIG"): an amount of a unit the person named (a count Goal, a habit's
 * measure) is the number and that word, never a currency or a token symbol. A word the app knows turns singular after
 * exactly 1 ("1 book"); any other word stays exactly as typed ("1 push-ups" stays the person's own word). No word: the number.
 */
export function unitAmountText(value: number, unit: string): string {
  const word = unit.replace(/\s+/g, " ").trim();
  const number = Number.isFinite(value) ? formatNumber(value, { maximumFractionDigits: 2 }) : "—";
  return word ? `${number} ${unitFor(value, word)}` : number;
}

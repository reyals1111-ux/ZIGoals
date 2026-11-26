/**
 * Session AW (X5, LEDGER #449; Paprika's timers from the directions): the time a method step names, read from its own
 * words in English and Dutch — "simmer for 15 minutes", "bake 20–25 min", "1 hour 30 minutes", "1½ hours", "laat 10
 * minuten rusten", "een half uur", "anderhalf uur", "45 sec" — as seconds, the larger number of a range. The cooking view
 * offers "Start 15 min timer" for it. Derived from the step's words; nothing is stored here. Pure.
 */
export type StepTime = {seconds: number; words: string; name: string};
export const MAX_STEP_SECONDS = 24 * 3600, TIMER_NAME_MAX = 40;
const NUM = String.raw`(\d+(?:[.,]\d+)?|\d*\s*[½¼¾]|een|één|one|a|an|two|three|four|five|six|ten|twee|drie|vier|vijf|zes|tien|twintig|twenty|thirty|dertig)`;
const WORDS: Record<string, number> = {een: 1, 'één': 1, one: 1, a: 1, an: 1, two: 2, twee: 2, three: 3, drie: 3, four: 4, vier: 4, five: 5, vijf: 5, six: 6, zes: 6, ten: 10, tien: 10, twenty: 20, twintig: 20, thirty: 30, dertig: 30};
const FRACTIONS: Record<string, number> = {'½': 0.5, '¼': 0.25, '¾': 0.75};
const HOUR = String.raw`(?:hours?|hrs?|h|uur|uren|u)`, MIN = String.raw`(?:minutes?|minuten|minuutje|minuut|mins?|min|m)`, SEC = String.raw`(?:seconds?|seconden|secs?|sec|s)`;
const RANGE = String.raw`(?:\s*(?:-|–|—|to|or|tot|à|of)\s*${NUM})?`;
const UNIT = new RegExp(String.raw`(?<![\p{L}\d])${NUM}${RANGE}\s*(${HOUR}|${MIN}|${SEC})(?![\p{L}])`, 'giu');
const value = (raw: string): number | null => {
  const t = raw.trim().toLowerCase();
  if (t in WORDS) return WORDS[t]!;
  const frac = /^(\d*)\s*([½¼¾])$/.exec(t);
  if (frac) return (frac[1] ? Number(frac[1]) : 0) + FRACTIONS[frac[2]!]!;
  const n = Number(t.replace(',', '.'));
  return Number.isFinite(n) && n > 0 ? n : null;
};
const scale = (unit: string) => new RegExp(`^${HOUR}$`, 'iu').test(unit) ? 3600 : new RegExp(`^${MIN}$`, 'iu').test(unit) ? 60 : 1;
/** "anderhalf uur", "half an hour", "een half uur", "een kwartier", "a quarter of an hour": the phrases without a digit. */
const PHRASES: [RegExp, number][] = [
  [/\banderhalf uur\b|\b(?:an |one )?hour and a half\b|\ban? and a half hours?\b/iu, 5400],
  [/\b(?:een )?half uur(?:tje)?\b|\bhalf an hour\b|\ba half hour\b/iu, 1800],
  [/\b(?:een )?kwartier(?:tje)?\b|\ba quarter of an hour\b/iu, 900],
  [/\b(?:een )?driekwartier\b|\bthree quarters of an hour\b/iu, 2700],
];
/** Short words for a length: "15 min", "1 h 30 min", "45 s". */
export function lengthWords(seconds: number): string {
  const h = Math.floor(seconds / 3600), m = Math.floor((seconds % 3600) / 60), s = seconds % 60;
  return [h ? `${h} h` : '', m ? `${m} min` : '', s ? `${s} s` : ''].filter(Boolean).join(' ') || '0 s';
}
/** The words the step opens with ("Simmer", "Laat rusten"), for the timer's name; '' when the time comes first. */
function stepWords(step: string, at: number, end: number): string {
  const before = step.slice(0, at).replace(/^\s*\d{1,2}[.)]\s*/u, '').replace(/\b(?:for about|for|about|around|approximately|roughly|another|nog|ongeveer|zo'?n|gedurende|circa|ca\.?|in)\s*$/iu, '').replace(/[,;:(\s]+$/u, '').trim();
  let words = before.split(/\s+/u).filter(Boolean).slice(0, 3);
  // "Laat 10 minuten rusten", "Let 5 minutes rest": the verb after the time joins "laat" / "let".
  if (words.length === 1 && /^(?:laat|let)$/iu.test(words[0]!)) { const after = /^[\s,]*([\p{L}-]+)/u.exec(step.slice(end)); if (after) words = [...words, after[1]!]; }
  const out = words.join(' ').replace(/[,.;:]+$/u, '');
  return out ? out[0]!.toLocaleUpperCase() + out.slice(1) : '';
}
/** A timer's name: "Pea soup · Simmer", at most 40 characters (the recipe's name shortened first). */
export function timerName(recipe: string, label: string): string {
  const tail = ` · ${label}`.slice(0, 24), room = TIMER_NAME_MAX - tail.length;
  const head = recipe.trim().length > room ? `${recipe.trim().slice(0, Math.max(1, room - 1)).trimEnd()}…` : recipe.trim();
  return `${head}${tail}`.slice(0, TIMER_NAME_MAX);
}
/**
 * The first time a step names (a run of an hour and minutes counts as one: "1 hour 30 minutes" is 90 minutes), or null.
 * A range takes its larger number. Lengths past 24 hours, and a lone "m" or "s" after a number that is not a time
 * ("2 m" of fabric is rare in a method; "4 s" never reads as anything else), are left out.
 */
export function stepTime(step: string, recipe = '', fallback = 'Timer'): StepTime | null {
  const text = step.normalize('NFC');
  const found: {at: number; end: number; seconds: number}[] = [];
  for (const m of text.matchAll(UNIT)) {
    const a = value(m[1]!), b = m[2] ? value(m[2]) : null, unit = m[3]!;
    if (a === null) continue;
    // "a" and "an" are numbers only before an hour or a minute word ("an hour"), never before a bare "m" or "s".
    if (/^(?:a|an|een|één|one)$/iu.test(m[1]!.trim()) && !/^(?:hour|uur|minute|minuut)/iu.test(unit)) continue;
    const seconds = Math.round(Math.max(a, b ?? 0) * scale(unit));
    if (seconds >= 1) found.push({at: m.index!, end: m.index! + m[0].length, seconds});
  }
  for (const [re, seconds] of PHRASES) { const m = re.exec(text); if (m) found.push({at: m.index, end: m.index + m[0].length, seconds}); }
  if (!found.length) return null;
  found.sort((x, y) => x.at - y.at || y.end - x.end);
  // "1 hour 30 minutes", "1 uur en 15 minuten": a time right after the first one (with "and"/"en" between) adds to it.
  const at = found[0]!.at; let {end, seconds} = found[0]!;
  for (const next of found.slice(1)) { if (next.at < end) continue; if (/^\s*(?:and|en|,)?\s*$/iu.test(text.slice(end, next.at)) && next.seconds < seconds) { seconds += next.seconds; end = next.end; } else break; }
  if (seconds > MAX_STEP_SECONDS) return null;
  const words = lengthWords(seconds), label = stepWords(text, at, end) || fallback;
  return {seconds, words, name: timerName(recipe || 'Cooking', label)};
}

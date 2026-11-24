import type {LocalReply} from './engine';

/**
 * Session AV lane 2 (habits pillar; LEDGER #69, Bearable's "hide triggering data" in NOVA and ZIGi): while the device's
 * "Hide calories and weight" switch is on (`zigoals:hide-body-figures`, read into the answer's environment as
 * `hideBodyFigures`), an on-device answer never says a calorie or body-weight figure: each such number becomes "—" and
 * one plain line says why and where to switch it back. Steps, minutes, sleep and everything else stay. Applied to the
 * finished reply (the lead wires `withHiddenFigures` at the end of localAnswer in engine.ts); nothing stored changes.
 */
/*
 * Review b1 #10: a number is digits with "." "," or a no-break space between digit groups (a plain space only before a
 * group of three), so "In 2026, 72 kg" hides 72, not "2026, 72". The units are the body's: calories, and kilograms or
 * pounds as "lb"/"lbs"; a bare "pounds" is money as often as weight, and "st" (stone) counts only after a space, so
 * "Nov 21st" stays a date. Training volume ("you lifted 4,200 kg") is not a body figure: a line about lifting keeps its
 * kilograms (its calories are still hidden).
 */
const NUM = String.raw`[−-]?\d+(?:(?:[.,  ]|\s(?=\d{3}(?!\d)))\d+)*`;
const UNIT = String.raw`(?:kcal|kilocalories?|kilocalorieën|calories?|calorieën|cal|kg|kilo(?:gram)?s?|lbs?)`;
const CALORIE_UNIT = /^(?:kcal|kilocalor|calor|cal)/i;
const AFTER = new RegExp(String.raw`(${NUM})(\s?)(${UNIT})\b|(${NUM})(\s)(st)\b`, 'gi');
const LIFTING = /\b(?:lift(?:ed|s|ing)?|volume|tonnage|reps?|sets?|tilde|getild|opgetild|tillen|trainingsvolume)\b/i;
/**
 * "weight 72.4", "weight: 72,4", "gewicht 72,4", "you weigh 72" — a number right after a weight word. Review b2b #3: a
 * BMI too ("Your BMI is 24.3", "BMI van 22,1"), as the page hides it: with the height it gives the weight back.
 */
const WEIGHT = new RegExp(String.raw`\b(weight|weigh(?:ed|s)?|gewicht|woog|weeg(?:t)?|bmi)(:?\s+(?:is\s+|was\s+|of\s+|van\s+)?)(${NUM})`, 'gi');
export const HIDDEN_NOTE = {en: 'Calorie and weight figures are hidden on this device; Health → “Show calories and weight” brings them back.', nl: 'Calorie- en gewichtscijfers zijn verborgen op dit apparaat; Health → “Show calories and weight” zet ze terug.'} as const;
/** The text with every calorie and body-weight figure as "—"; `changed` says whether anything was hidden. */
export function hideBodyFigures(text: string): {text: string; changed: boolean} {
  let changed = false;
  const out = text.split('\n').map(line => {
    const lifting = LIFTING.test(line);
    return line.replace(AFTER, (m, _n: string | undefined, space: string | undefined, unit: string | undefined, _n2: string | undefined, space2: string | undefined, stone: string | undefined) => {
      const u = unit ?? stone!;
      if (lifting && !CALORIE_UNIT.test(u)) return m;
      changed = true; return `—${space ?? space2 ?? ''}${u}`;
    }).replace(WEIGHT, (m, word: string, gap: string) => { if (lifting && !/gewicht|weight|bmi/i.test(word)) return m; changed = true; return `${word}${gap}—`; });
  }).join('\n');
  return {text: out, changed};
}
/** The device's switch now (the same literal key and value as components/hide-figures.tsx); false on the server. */
export function bodyFiguresHidden(): boolean {
  if (typeof window === 'undefined') return false;
  try { return window.localStorage.getItem('zigoals:hide-body-figures') === 'on'; } catch { return false; }
}
/** The reply with its figures hidden while the switch is on (any kind with text; a reply without such figures is unchanged). */
export function withHiddenFigures<T extends LocalReply>(reply: T, on: boolean | undefined, lang: 'en' | 'nl' = 'en'): T {
  if (!on || !('text' in reply) || typeof reply.text !== 'string') return reply;
  const {text, changed} = hideBodyFigures(reply.text);
  return changed ? {...reply, text: `${text}\n\n${HIDDEN_NOTE[lang]}`} : reply;
}

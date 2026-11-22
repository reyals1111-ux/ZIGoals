import type {LocalReply} from './engine';

/**
 * Session AV lane 2 (habits pillar; LEDGER #69, Bearable's "hide triggering data" in NOVA and ZIGi): while the device's
 * "Hide calories and weight" switch is on (`zigoals:hide-body-figures`, read into the answer's environment as
 * `hideBodyFigures`), an on-device answer never says a calorie or body-weight figure: each such number becomes "—" and
 * one plain line says why and where to switch it back. Steps, minutes, sleep and everything else stay. Applied to the
 * finished reply (the lead wires `withHiddenFigures` at the end of localAnswer in engine.ts); nothing stored changes.
 */
const NUM = String.raw`[−-]?\d[\d.,   ]*\d|[−-]?\d`;
const UNIT = String.raw`(?:kcal|kilocalories?|kilocalorieën|calories?|calorieën|cal|kg|kilo(?:gram)?s?|lbs?|pounds?|ponden|st)`;
const AFTER = new RegExp(String.raw`(${NUM})(\s?)(${UNIT})\b`, 'gi');
/** "weight 72.4", "weight: 72,4", "gewicht 72,4", "you weigh 72" — a number right after a weight word. */
const WEIGHT = new RegExp(String.raw`\b(weight|weigh(?:ed|s)?|gewicht|woog|weeg(?:t)?)(:?\s+(?:is\s+|was\s+|of\s+|van\s+)?)(${NUM})`, 'gi');
export const HIDDEN_NOTE = {en: 'Calorie and weight figures are hidden on this device; Health → “Show calories and weight” brings them back.', nl: 'Calorie- en gewichtscijfers zijn verborgen op dit apparaat; Health → “Show calories and weight” zet ze terug.'} as const;
/** The text with every calorie and body-weight figure as "—"; `changed` says whether anything was hidden. */
export function hideBodyFigures(text: string): {text: string; changed: boolean} {
  let changed = false;
  const out = text.replace(AFTER, (_m, _n: string, space: string, unit: string) => { changed = true; return `—${space}${unit}`; })
    .replace(WEIGHT, (_m, word: string, gap: string) => { changed = true; return `${word}${gap}—`; });
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

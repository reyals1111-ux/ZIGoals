/**
 * The AI's emotion hint (Session X-Local Part 4, ADR-017 S18): a reply may end with one marker, `⟦zigi: curious⟧`
 * (or `[[zigi: curious]]`, easier for small models), naming one mood from a fixed list. The app validates it, the
 * controller applies the rules (never a celebration, never a nudge; careful mode wins; proposals present), and the
 * marker is stripped here, at one choke point, before the text is shown, stored, copied, exported, packed, sent back
 * to a model, labelled or logged. Anything else between the brackets is not a hint and is dropped with the marker.
 */
export const EMOTION_HINTS = ['insight', 'curious', 'encouraging', 'empathetic', 'surprised', 'confused'] as const;
export type EmotionHint = (typeof EMOTION_HINTS)[number];
const MARKER = /(?:⟦|\[\[)\s*zigi\s*:\s*([^⟧\]\n]{0,40}?)\s*(?:⟧|\]\])/gi;
export const isEmotionHint = (value: unknown): value is EmotionHint => typeof value === 'string' && (EMOTION_HINTS as readonly string[]).includes(value);
/** The text without any marker, and the first valid hint, or null. */
export function extractHint(text: string): {text: string; hint: EmotionHint | null} {
  let hint: EmotionHint | null = null;
  const stripped = text.replace(MARKER, (_, name: string) => { const value = name.trim().toLowerCase(); if (hint === null && isEmotionHint(value)) hint = value; return ''; });
  return {text: stripped.replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim(), hint};
}
/** The text without any marker (every outbound and stored path calls this). */
export const stripHint = (text: string): string => extractHint(text).text;
/** The one sentence the prompt carries. */
export const HINT_NOTE = `You may end a reply with one marker ⟦zigi: <mood>⟧ where <mood> is one of ${EMOTION_HINTS.join(', ')}, to suggest how ZIGi looks while it answers; the marker is removed from the shown text, and it can never make ZIGi celebrate or knock.`;

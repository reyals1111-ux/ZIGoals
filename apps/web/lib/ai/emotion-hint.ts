/**
 * The AI's emotion hint (Session X-Local Part 4, ADR-017 S18): a reply may end with one marker, `⟦zigi: curious⟧`
 * (or `[[zigi: curious]]`, easier for small models), naming one mood from a fixed list. The app validates it, the
 * controller applies the rules (never a celebration, never a nudge; careful mode wins; proposals present), and the
 * marker is stripped here, at one choke point, before the text is shown, stored, copied, exported, packed, sent back
 * to a model, labelled or logged. Anything else between the brackets is not a hint and is dropped with the marker.
 */
export const EMOTION_HINTS = ['insight', 'curious', 'encouraging', 'empathetic', 'surprised', 'confused'] as const;
export type EmotionHint = (typeof EMOTION_HINTS)[number];
// Session Z-Local Part 7 (SECURITY_REVIEW_Y F5): every gap in the marker is bounded, so a reply of "[[zigi:" followed by
// thousands of spaces and no closing bracket is a linear scan, never a backtracking one.
const MARKER = /(?:⟦|\[\[)[ \t]{0,8}zigi[ \t]{0,8}:[ \t]{0,8}([^⟧\]\n]{0,40}?)[ \t]{0,8}(?:⟧|\]\])/iy;
/**
 * The markers of a text, found by their opening bracket (`indexOf`, never a scan of every position) and read with the
 * sticky, bounded pattern at that spot only: linear in the text, however many brackets or spaces it holds.
 */
function stripMarkers(text: string, onName: (name: string) => void): string {
  let out = '', cursor = 0, from = 0;
  for (;;) {
    const a = text.indexOf('[[', from), b = text.indexOf('⟦', from), at = a < 0 ? b : b < 0 ? a : Math.min(a, b);
    if (at < 0) break;
    MARKER.lastIndex = at;
    const m = MARKER.exec(text);
    if (m) { onName(m[1]!); out += text.slice(cursor, at); cursor = at + m[0].length; from = cursor; }
    else from = at + 1;
  }
  return out + text.slice(cursor);
}
export const isEmotionHint = (value: unknown): value is EmotionHint => typeof value === 'string' && (EMOTION_HINTS as readonly string[]).includes(value);
/** The text without any marker, and the first valid hint, or null. */
export function extractHint(text: string): {text: string; hint: EmotionHint | null} {
  let hint: EmotionHint | null = null;
  // F6: nested markers ("[[zi[[zigi: x]]gi: curious]]") are stripped to a fixed point, so no marker survives; only the outermost
  // pass may name the hint (an inner one is never read as one).
  let stripped = stripMarkers(text, name => { const value = name.trim().toLowerCase(); if (hint === null && isEmotionHint(value)) hint = value; });
  for (let pass = 0; pass < 4; pass++) { const again = stripMarkers(stripped, () => undefined); if (again === stripped) break; stripped = again; }
  // Trailing blanks go line by line (F5: `/[ \t]+\n/` over a long run of spaces with no newline after it was the quadratic scan).
  return {text: stripped.split('\n').map(line => line.replace(/[ \t]+$/, '')).join('\n').replace(/\n{3,}/g, '\n\n').trim(), hint};
}
/** The text without any marker (every outbound and stored path calls this). */
export const stripHint = (text: string): string => extractHint(text).text;
/** The one sentence the prompt carries. */
export const HINT_NOTE = `You may end a reply with one marker ⟦zigi: <mood>⟧ where <mood> is one of ${EMOTION_HINTS.join(', ')}, to suggest how ZIGi looks while it answers; the marker is removed from the shown text, and it can never make ZIGi celebrate or knock.`;

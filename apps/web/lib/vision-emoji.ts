/**
 * Session AL final pass (T-079, AL-LIMITS-005): a goal's vision carries one emoji, or none. The box had kept any eight
 * characters ("abcdefgh"). One emoji is one grapheme (a flag, a family, "✍️" and a keycap are each one) that is a picture
 * or a symbol (emoji, a regional-indicator flag, a keycap, or a symbol such as "₿"), never a letter or a digit alone.
 */
export const VISION_EMOJI_MESSAGE = 'Enter one emoji, like 🌟, or leave it empty.';
const PICTURE = /\p{Extended_Pictographic}|\p{Regional_Indicator}|⃣|^\p{S}️?$/u;
export function visionEmojiIssue(raw: string): string | null {
  const text = raw.trim();
  if (!text) return null;
  const graphemes = typeof Intl !== 'undefined' && 'Segmenter' in Intl
    ? [...new Intl.Segmenter('en', {granularity: 'grapheme'}).segment(text)].length
    : [...text].length;
  return graphemes === 1 && PICTURE.test(text) ? null : VISION_EMOJI_MESSAGE;
}

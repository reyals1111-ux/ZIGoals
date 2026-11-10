import {expect, test} from 'vitest';
import {VISION_EMOJI_MESSAGE, visionEmojiIssue} from './vision-emoji';

test('T-079: the vision box takes one emoji or nothing', () => {
  for (const ok of ['', '  ', '🌟', '🛟', '₿', '✍️', '👨‍👩‍👧', '🇳🇱', '1️⃣', '👍🏽', '✨']) expect(visionEmojiIssue(ok)).toBeNull();
  for (const bad of ['abcdefgh', 'a', '7', '🌟🌟', 'a🌟', 'ok!']) expect(visionEmojiIssue(bad)).toBe(VISION_EMOJI_MESSAGE);
});

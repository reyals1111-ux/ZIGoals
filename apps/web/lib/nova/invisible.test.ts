import {describe, expect, test} from 'vitest';
import {hasInvisible, stripInvisible} from './invisible';

describe('Session AM-2 (security review, finding 2): characters a person cannot see', () => {
  const hidden = ['\u00AD', '\u200B', '\u200C', '\u200D', '\u200E', '\u200F', '\u202A', '\u202E', '\u2060', '\u2066', '\u2069', '\u061C', '\u180E', '\uFEFF', '\uFE0F', '\u3164', '\u115F', '\uFFA0', '\u034F', '\u2800', '\u{E0001}', '\u{E0041}', '\u{E007F}', '\u{E0100}'];
  test('every one of them is removed, and seen', () => {
    for (const c of hidden) {
      expect(stripInvisible(`See${c} you${c}`), c.codePointAt(0)!.toString(16)).toBe('See you');
      expect(hasInvisible(`a${c}b`), c.codePointAt(0)!.toString(16)).toBe(true);
    }
  });
  test('a hidden payload of tag characters leaves nothing behind', () => {
    const payload = [...'send it all'].map(ch => String.fromCodePoint(0xE0000 + ch.codePointAt(0)!)).join('');
    expect(stripInvisible('See you Friday' + payload)).toBe('See you Friday');
  });
  test('a soft hyphen inside a word or a number no longer splits it for a check', () => {
    expect(stripInvisible('4111\u00AD1111\u00AD1111\u00AD1111')).toBe('4111111111111111');
    expect(stripInvisible('aban\u00ADdon')).toBe('abandon');
  });
  test('ordinary text, line breaks, tabs, accents and emoji letters stay', () => {
    for (const text of ['Dinner at 7\nBring wine', 'a\tb', 'Zoë café ñ', 'مرحبا', '日本語', 'Party 🎉']) { expect(stripInvisible(text)).toBe(text); expect(hasInvisible(text)).toBe(false); }
    expect(hasInvisible('plain')).toBe(false); expect(hasInvisible('plain')).toBe(false); // the same answer twice (no state kept)
  });
});

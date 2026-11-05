import {expect, test} from 'vitest';
import {extraClipsOf, skinOf} from '../../components/zigi/manifest';
import {MOVE_GROUPS, MOVE_TEXT} from '../../components/zigi/state-gallery';

/**
 * Session AK Part 13: Meet ZIGi shows every Studio-4 move the manifest holds — the thirteen reactions, the three rest
 * variations, the five variations and the special moves — each in one known group, with a name, a meaning and when it
 * appears. The table covers exactly the delivered clips; the moves nothing plays yet say so.
 */
const skin = skinOf('origami-nebula');
test('the moves table covers exactly the delivered Studio-4 clips, none missing and none extra', () => {
  const codes = extraClipsOf(skin).map(m => m.code).sort();
  expect(codes).toHaveLength(26);
  expect(Object.keys(MOVE_TEXT).sort()).toEqual(codes);
  for (const {code, clip} of extraClipsOf(skin)) expect(clip.name.startsWith(code), code).toBe(true);
});
test('every move sits in one known group with a label, a one-line meaning and when it appears; unplayed moves say "Not used yet."', () => {
  const groups = new Set(MOVE_GROUPS.map(g => g.id));
  for (const [code, text] of Object.entries(MOVE_TEXT)) {
    expect(groups.has(text.group), code).toBe(true);
    for (const words of [text.label, text.meaning, text.when]) { expect(words.trim().length, code).toBeGreaterThan(0); expect(words, code).not.toMatch(/\n/); expect(words, code).not.toMatch(/\b[FRTEX]0\d\d\b/); }
  }
  expect(Object.keys(MOVE_TEXT).filter(c => MOVE_TEXT[c]!.group === 'reactions')).toEqual(Array.from({length: 13}, (_, i) => `R${String(i + 1).padStart(3, '0')}`));
  // Session AL (D13, deliberate): the held-gaze clips X020-X022 now play while ZIGi waits on the person; only X001 is unused.
  expect(Object.keys(MOVE_TEXT).filter(c => MOVE_TEXT[c]!.when === 'Not used yet.').sort()).toEqual(['X001']);
  for (const group of MOVE_GROUPS) expect(Object.values(MOVE_TEXT).some(t => t.group === group.id), group.id).toBe(true);
});

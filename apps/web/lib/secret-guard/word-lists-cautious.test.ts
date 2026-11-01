import {expect, test} from 'vitest';
import {secretKinds, wordListNeeds} from '../emergency-sheet/secrets';
import {loadWordLists, wordListsFor} from './word-lists';
import {KOREAN} from './wordlists/korean';
import {JAPANESE} from './wordlists/japanese';
import {SIMPLIFIED_CHINESE} from './wordlists/chinese';

/**
 * Session AK owner follow-up 2 (G7; security review F10 R1-F5): before a list is loaded (a fresh module, as on a page
 * that has not needed one yet) the detector stays on the cautious side, and it asks only for the script it saw.
 */
const ko = KOREAN.split(' ').slice(50, 62).join(' '), ja = JAPANESE.split(' ').slice(50, 62).join('　'), zh = SIMPLIFIED_CHINESE.split(' ').slice(50, 62).join(' ');
const prose = '오늘은 날씨가 좋아서 친구와 함께 공원에 갔다 점심은 근처 식당에서 먹었고 저녁에는 가족과 영화를 봤다';

test('nothing is loaded at first; ordinary text needs no list', () => {
  for (const s of ['latin', 'kana', 'hangul', 'han'] as const) expect(wordListsFor(s)).toBeNull();
  expect(wordListNeeds('How much did I spend on groceries last month compared with the month before?')).toEqual([]);
  expect(wordListNeeds('')).toEqual([]);
});
test('Chinese and Japanese runs count by their shape; a Korean run only for the guard (cautious), never on the sheet', () => {
  expect(secretKinds(zh)).toEqual(['recovery-words']);
  expect(secretKinds(ja)).toEqual(['recovery-words']);
  expect(secretKinds(ko)).toEqual([]);
  expect(secretKinds(ko, 'guard')).toEqual(['recovery-words']);
  expect(secretKinds(prose)).toEqual([]);
  expect(secretKinds(prose, 'guard')).toEqual(['recovery-words']); // until the Korean list is here
  expect(secretKinds('eggs milk bread butter apples rice beans pasta flour sugar salt honey', 'guard')).toEqual(['recovery-words']);
});
test('the guard asks only for the lists of the scripts it saw, and then decides by them', async () => {
  expect(wordListNeeds(prose)).toEqual(['hangul']);
  expect(wordListNeeds(`${zh}\n${ja}\neggs milk bread butter apples rice beans pasta flour sugar salt honey`).sort()).toEqual(['han', 'kana', 'latin']);
  await loadWordLists(['hangul']);
  expect(wordListsFor('hangul')).not.toBeNull();
  expect(wordListsFor('latin')).toBeNull();
  expect(wordListNeeds(prose)).toEqual([]);
  expect(secretKinds(prose, 'guard')).toEqual([]);
  expect(secretKinds(ko)).toEqual(['recovery-words']);
  expect(secretKinds(ko, 'guard')).toEqual(['recovery-words']);
});

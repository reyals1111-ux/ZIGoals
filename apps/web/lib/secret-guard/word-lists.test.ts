import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {join} from 'node:path';
import {beforeAll, describe, expect, test} from 'vitest';
import {recoveryWordSpans, secretKinds} from '../emergency-sheet/secrets';
import {guardText, guardTextReady, looksSecret} from './guard';
import {listKey, loadWordLists, wordListsFor} from './word-lists';
import * as latin from './wordlists/latin';
import {SIMPLIFIED_CHINESE, TRADITIONAL_CHINESE} from './wordlists/chinese';
import {JAPANESE} from './wordlists/japanese';
import {KOREAN} from './wordlists/korean';

/**
 * Session AK owner follow-up 2 (G7; security review F10 R1-F5 and R1-F6): the standard lists, recovery words in Japanese,
 * Korean and Chinese, and ordinary lists that are no longer taken for recovery words once the lists are loaded.
 * Every phrase is built at run time from the lists, so no line of this file looks like a seed to the repository's scan.
 */
const english = readFileSync(join(__dirname, '../../../../scripts/bip39-english.txt'), 'utf8').trim().split('\n');
const split = (text: string) => text.split(' ');
const ja = split(JAPANESE), ko = split(KOREAN), zh = split(SIMPLIFIED_CHINESE), zt = split(TRADITIONAL_CHINESE);
const pick = (list: readonly string[], from: number, n = 12) => list.slice(from, from + n);

describe('the vendored lists are the standard ones', () => {
  test('2048 distinct words each; English equals scripts/bip39-english.txt', () => {
    for (const list of [latin.ENGLISH, latin.SPANISH, latin.FRENCH, latin.ITALIAN, latin.CZECH, latin.PORTUGUESE, JAPANESE, KOREAN, SIMPLIFIED_CHINESE, TRADITIONAL_CHINESE].map(split)) {
      expect(list).toHaveLength(2048);
      expect(new Set(list).size).toBe(2048);
      expect(list.every(w => w === w.normalize('NFC') && w.trim() === w && w.length > 0)).toBe(true);
    }
    expect(split(latin.ENGLISH)).toEqual(english);
    expect(ja.every(w => /^[ぁ-ゟ]+$/.test(w))).toBe(true);
    expect(ko.every(w => /^[가-힣]{2,4}$/.test(w))).toBe(true);
    expect([...zh, ...zt].every(w => /^\p{Script=Han}$/u.test(w))).toBe(true);
  });
  test('each equals the copy @scure/bip39 ships (reached through the existing @cosmjs dependency; read here only)', () => {
    const cosmjs = createRequire(createRequire(join(__dirname, '../../package.json')).resolve('@cosmjs/proto-signing'));
    const scure = createRequire(cosmjs.resolve('@cosmjs/crypto'));
    const ours: Record<string, string> = {english: latin.ENGLISH, spanish: latin.SPANISH, french: latin.FRENCH, italian: latin.ITALIAN, czech: latin.CZECH, portuguese: latin.PORTUGUESE,
      japanese: JAPANESE, korean: KOREAN, 'simplified-chinese': SIMPLIFIED_CHINESE, 'traditional-chinese': TRADITIONAL_CHINESE};
    for (const [name, text] of Object.entries(ours)) {
      const {wordlist} = scure(`@scure/bip39/wordlists/${name}`) as {wordlist: string[]};
      expect(split(text), name).toEqual(wordlist.map(w => w.normalize('NFC')));
    }
  });
  test('words meet the lists without accents and in either Unicode form', () => {
    expect(listKey('Ábaco')).toBe('abaco');
    expect(listKey('ábaco')).toBe('abaco');
  });
});

describe('with the lists loaded', () => {
  beforeAll(async () => { await loadWordLists(); for (const s of ['latin', 'kana', 'hangul', 'han'] as const) expect(wordListsFor(s)).not.toBeNull(); });

  test('Japanese, Korean and Chinese recovery words, with ASCII or ideographic spaces, numbered or one per line', () => {
    for (const [name, words] of Object.entries({ja: pick(ja, 40), ko: pick(ko, 900), zh: pick(zh, 7), zt: pick(zt, 1500), ja24: pick(ja, 300, 24)})) {
      for (const text of [words.join(' '), words.join('　'), words.map((w, i) => `${i + 1}. ${w}`).join('\n'), words.join('、'), `メモ:${words.join('　')}`]) {
        expect(secretKinds(text), `${name}: ${text}`).toEqual(['recovery-words']);
        expect(secretKinds(text, 'guard'), `${name}: ${text}`).toEqual(['recovery-words']);
        expect(guardText(text)?.kind, name).toBe('words');
      }
    }
    // A phone's decomposed kana and Hangul (NFD) are the same words.
    expect(looksSecret(pick(ja, 600).join('　').normalize('NFD'))).toBe(true);
    expect(looksSecret(pick(ko, 1200).join(' ').normalize('NFD'))).toBe(true);
    // One mistyped word of twelve still counts; two do not.
    const one = pick(ko, 10); one[5] = '사랑해요';
    expect(looksSecret(one.join(' '))).toBe(true);
    one[7] = '고마워요';
    expect(looksSecret(one.join(' '))).toBe(false);
  });
  test('ordinary Chinese, Japanese and Korean writing is not taken for recovery words', () => {
    for (const text of [
      '今天天气很好，我们去公园散步，然后在附近的小店吃了午饭。明天还要早起去上班，晚上记得给妈妈打电话。',
      '今日はとても良い天気でした。午後は友達と公園を散歩して、夜は家族と一緒に夕ごはんを食べました。',
      'むかし むかし ある ところに おじいさんと おばあさんが すんで いました。 おじいさんは やまへ しばかりに いきました。',
      '오늘은 날씨가 좋아서 친구와 함께 공원에 갔다. 점심은 근처 식당에서 먹었고 저녁에는 가족과 영화를 봤다. 내일은 일찍 일어나야 한다.',
      '이번 달 장보기 목록: 우유 두 개, 계란 한 판, 사과 몇 개, 그리고 빵을 사야 한다. 주말에는 운동을 꼭 하자.',
      '学习汉字：山 水 火 木 金 土 日 月',
    ]) {
      expect(secretKinds(text), text).toEqual([]);
      expect(guardText(text), text).toBeNull();
    }
  });
  // Security review F10 (R1-F6): a list of twelve everyday words, most of which are not standard words, now passes.
  test('everyday lists pass; the guard\'s own true positives still warn', () => {
    for (const text of [
      'eggs milk bread butter apples rice beans pasta flour sugar salt honey',
      'coffee bread milk butter cheese eggs ham salad lemon rice pasta sauce',
      'run gym yoga swim bike walk hike stretch plank squat lunge push',
      'apple banana carrot lettuce tomato onion garlic pepper chicken salmon yogurt cereal',
      'Shopping:\n- eggs\n- milk\n- bread\n- butter\n- apples\n- rice\n- beans\n- pasta\n- flour\n- sugar\n- salt\n- honey',
      'please phone uncle peter about pension forms inside blue box under desk near window today',
      'leche huevos pan mantequilla manzanas arroz frijoles pasta harina azucar sal miel',
    ]) {
      expect(guardText(text), text).toBeNull();
    }
    for (const text of [english.slice(100, 112).join(' '), english.slice(0, 24).join(' '), english.slice(0, 12).map((w, i) => `${i + 1}. ${w}`).join('\n'), english.slice(500, 512).join(' ').toUpperCase()]) expect(guardText(text)?.kind, text).toBe('words');
    // Every other Latin-alphabet list, with or without its accents; and Italian's nine-letter words.
    for (const list of [latin.SPANISH, latin.FRENCH, latin.ITALIAN, latin.CZECH, latin.PORTUGUESE].map(split)) {
      expect(guardText(pick(list, 1000).join(' '))?.kind).toBe('words');
      expect(guardText(pick(list, 1000).join(' ').normalize('NFD').replace(/\p{M}/gu, ''))?.kind).toBe('words');
    }
    const nine = split(latin.ITALIAN).filter(w => w.length === 9).slice(0, 12);
    expect(nine).toHaveLength(12);
    expect(guardText(nine.join(' '))?.kind).toBe('words');
    // A list of twelve that are all standard words is a recovery phrase as far as anyone can tell: still warned about.
    expect(guardText('milk eggs bread cheese apple banana orange lemon onion garlic tomato potato')?.kind).toBe('words');
  });
  test('the emergency sheet keeps its shape rule for Latin-alphabet words (it errs on the side of not printing)', () => {
    expect(secretKinds('please phone uncle peter about pension forms inside blue box under desk near window today')).toEqual(['recovery-words']);
    expect(secretKinds('eggs milk bread butter apples rice beans pasta flour sugar salt honey')).toEqual(['recovery-words']);
    expect(secretKinds('eggs milk bread butter apples rice beans pasta flour sugar salt honey', 'guard')).toEqual([]);
  });
  test('the spans are the words themselves, trimmed to list words', () => {
    const words = english.slice(200, 212).join(' '), text = `pension backup: ${words}. Buy milk later.`; // "pension backup" joins the run by shape, but neither is a list word
    expect(recoveryWordSpans(text, 'guard')).toEqual([[text.indexOf(words), text.indexOf(words) + words.length]]);
    expect(recoveryWordSpans('ordinary words only, nothing more to see here today', 'guard')).toEqual([]);
  });
  test('guardTextReady gives the same answer', async () => {
    expect(await guardTextReady('eggs milk bread butter apples rice beans pasta flour sugar salt honey')).toBeNull();
    expect((await guardTextReady(pick(ko, 3).join(' ')))?.kind).toBe('words');
  });
});

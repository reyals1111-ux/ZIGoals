import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {beforeAll, describe, expect, test} from 'vitest';
import {HIDDEN_WORDS, hideRecoveryWords, hideRecoveryWordsInRequest} from './redact-span';
import {loadWordLists} from './word-lists';
import {KOREAN} from './wordlists/korean';

/**
 * Session AK owner follow-up 2 (G7; security review F10 R1-F7): only the run that looks like recovery words is hidden in
 * what leaves the device; the rest of the note, the record and the request stay as they are.
 * Phrases are built at run time, so no line of this file looks like a seed to the repository's own scan.
 */
const english = readFileSync(join(__dirname, '../../../../scripts/bip39-english.txt'), 'utf8').trim().split('\n');
const words = english.slice(700, 712), phrase = words.join(' ');
const grocery = 'eggs milk bread butter apples rice beans pasta flour sugar salt honey';

describe('hideRecoveryWords (pure, given the lists loaded so far)', () => {
  beforeAll(() => loadWordLists());
  test('replaces exactly the run, keeps the rest', () => {
    expect(hideRecoveryWords(`Backup: ${phrase}. Buy milk.`)).toEqual({text: `Backup: ${HIDDEN_WORDS}. Buy milk.`, hidden: 1});
    // A neighbouring standard word may go with the run ("seed" is one): hiding a word too many is the safe side.
    expect(hideRecoveryWords(`seed ${phrase}. Buy milk.`).text).toBe(`${HIDDEN_WORDS}. Buy milk.`);
    // A mistyped word inside 24 words: all 24 go.
    const typo = english.slice(30, 54); typo[3] = 'zzzz';
    expect(hideRecoveryWords(`Backup: ${typo.join(' ')}; pension`).text).toBe(`Backup: ${HIDDEN_WORDS}; pension`);
    expect(hideRecoveryWords(`Pension\n${words.map((w, i) => `${i + 1}. ${w}`).join('\n')}\nAfter`)).toEqual({text: `Pension\n1. ${HIDDEN_WORDS}\nAfter`, hidden: 1});
    expect(hideRecoveryWords(`${phrase}\nand later\n${english.slice(1, 13).join(' ')}`).hidden).toBe(2);
  });
  test('ordinary text, an everyday list and empty text come back as they are', () => {
    for (const text of ['', 'Lunch with Sam', grocery, `Shopping: ${grocery}.`, 'How much did I spend on groceries last month compared with the month before?']) {
      const out = hideRecoveryWords(text);
      expect(out.text).toBe(text);
      expect(out.hidden).toBe(0);
    }
  });
  test('JSON tool results stay valid JSON: escapes are read as spaces, a run across two records is hidden on each side', () => {
    const one = JSON.stringify({tool: 'notes', data: [{id: 'n1', text: `My words:\n${words.join('\n')}\nKeep safe.`}, {id: 'n2', text: grocery}]});
    const out = hideRecoveryWords(one);
    expect(out.hidden).toBe(1);
    const parsed = JSON.parse(out.text) as {data: {text: string}[]};
    expect(parsed.data[0]!.text).toBe(`My words:\n${HIDDEN_WORDS}\nKeep safe.`);
    expect(parsed.data[1]!.text).toBe(grocery);
    const split = JSON.stringify({data: [words.slice(0, 6).join(' '), words.slice(6).join(' ')]});
    const across = hideRecoveryWords(split);
    expect(across.hidden).toBe(1);
    expect(JSON.parse(across.text)).toEqual({data: [HIDDEN_WORDS, HIDDEN_WORDS]});
    for (const w of words) expect(across.text).not.toContain(w);
  });
  test('Korean words in a record', () => {
    const ko = KOREAN.split(' ').slice(10, 22).join(' ');
    expect(hideRecoveryWords(`메모: ${ko}`).text).toBe(`메모: ${HIDDEN_WORDS}`);
  });
});

describe('hideRecoveryWordsInRequest (the transport)', () => {
  test('the very same request when nothing is hidden', async () => {
    const r = {system: `PAGE: Notes\n${grocery}`, messages: [{role: 'user', content: 'What is on my list?'}, {role: 'tool', content: JSON.stringify({text: grocery})}]};
    expect(await hideRecoveryWordsInRequest(r)).toBe(r);
  });
  test('the page context, its blocks, tool results and earlier answers lose the run; the person\'s own turns are left to the refusal', async () => {
    const system = `PAGE: Notes\nMemo: ${phrase}\nMemo: ${grocery}`;
    const r = {model: 'm', system, systemBlocks: [{text: 'PAGE: Notes\n', cache: true}, {text: system.slice('PAGE: Notes\n'.length)}],
      messages: [{role: 'user', content: 'Summarise my notes'}, {role: 'tool', toolCallId: 't1', name: 'notes', content: JSON.stringify({text: `x ${phrase}`})}, {role: 'assistant', content: `Your words: ${phrase}.`}]};
    const out = await hideRecoveryWordsInRequest(r);
    expect(out).not.toBe(r);
    expect(out.model).toBe('m');
    expect(out.system).toBe(`PAGE: Notes\nMemo: ${HIDDEN_WORDS}\nMemo: ${grocery}`);
    expect(out.systemBlocks).toEqual([{text: 'PAGE: Notes\n', cache: true}, {text: `Memo: ${HIDDEN_WORDS}\nMemo: ${grocery}`}]);
    expect(out.messages[0]).toBe(r.messages[0]);
    expect(JSON.parse(out.messages[1]!.content)).toEqual({text: `x ${HIDDEN_WORDS}`});
    expect(out.messages[1]).toMatchObject({toolCallId: 't1', name: 'notes'});
    expect(out.messages[2]!.content).toBe(`Your words: ${HIDDEN_WORDS}.`);
    expect(r.system).toBe(system); // the input is not changed
  });
  test('a run split between two system blocks: one system text, no blocks', async () => {
    const system = `A ${words.slice(0, 6).join(' ')} ${words.slice(6).join(' ')} B`, cut = system.indexOf(words[6]!);
    const out = await hideRecoveryWordsInRequest({system, systemBlocks: [{text: system.slice(0, cut)}, {text: system.slice(cut)}], messages: []});
    expect(out.system).toBe(`A ${HIDDEN_WORDS} B`);
    expect(out.systemBlocks).toBeUndefined();
  });
});

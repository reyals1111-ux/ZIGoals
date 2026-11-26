import {describe, expect, test} from 'vitest';
import {GUARD_REPLIES, guardMessage, guardTopic, REFLECTIVE_MOOD_REPLIES, reflectiveMood, safetyFirst} from './safety-guard';
import {localAnswer} from './local-answers/engine';
import {noModelReply} from './local-answers/no-model';
import {novaEnv, showcaseAll, zigiEnv} from './evals/as/harness';

/**
 * Session AW (fr-answers, FR-AW-22; the fresh-eyes walk's Jules): "Do I seem depressed?" got the full crisis reply. A
 * reflective question about one's own mood now opens gentler (caring, no diagnosis, ZIGi can't judge it, the journal and a
 * GP), with the same real help lines; the topic and the guard's order stay (before any model or lookup). Every message with
 * self-harm or suicide words, or "I feel depressed and hopeless", keeps exactly today's distress reply.
 */
const REFLECTIVE: [string, 'en' | 'nl'][] = [
  ['Do I seem depressed?', 'en'], ['do i seem a bit depressed lately', 'en'], ['Does my journal sound depressed?', 'en'], ['Am I depressed?', 'en'],
  ['Do you think I am depressed?', 'en'], ['Do I come across as depressed in my journal?', 'en'],
  ['Lijk ik depressief?', 'nl'], ['Lijk ik een beetje depressief de laatste tijd?', 'nl'], ['Ben ik depressief?', 'nl'], ['Klinkt mijn dagboek somber?', 'nl'], ['Zou ik depressief zijn?', 'nl'],
];
const HEAVY = ['I feel depressed and hopeless', 'Ik voel me depressief en hopeloos', 'Do I seem depressed? I want to kill myself', 'Am I depressed or should I just end it all?',
  'Lijk ik depressief? Ik wil dood', 'I am depressed', 'Do I seem depressed and hopeless?', 'I can\'t go on anymore', 'ik zie het niet meer zitten'];

describe('a reflective question about one\'s own mood: gentler first lines, the same help lines', () => {
  for (const [q, lang] of REFLECTIVE) test(q, () => {
    expect(guardTopic(q)).toBe('distress');
    expect(reflectiveMood(q)).toBe(lang);
    const hit = guardMessage(q)!;
    expect(hit).toEqual({topic: 'distress', lang, text: REFLECTIVE_MOOD_REPLIES[lang]});
    expect(safetyFirst(q)).toEqual({kind: 'guard', topic: 'distress', lang, text: REFLECTIVE_MOOD_REPLIES[lang]});
  });
  test('the reply: no diagnosis, says ZIGi can\'t judge it, the journal and a GP, and every help line of the distress reply', () => {
    const en = REFLECTIVE_MOOD_REPLIES.en, nl = REFLECTIVE_MOOD_REPLIES.nl;
    expect(en).toMatch(/^It is good that you ask yourself this\. I can't tell whether you are depressed: that is not something an app can judge/);
    expect(en).toContain('journal'); expect(en).toContain('GP');
    expect(nl).toMatch(/^Goed dat je het jezelf afvraagt\. Of je depressief bent, kan ik niet beoordelen/);
    expect(nl).toContain('dagboek'); expect(nl).toContain('huisarts');
    for (const lang of ['en', 'nl'] as const) {
      for (const line of GUARD_REPLIES.distress[lang].split('\n').filter(l => l.startsWith('- '))) expect(REFLECTIVE_MOOD_REPLIES[lang]).toContain(line);
      expect(REFLECTIVE_MOOD_REPLIES[lang]).not.toMatch(/(?<!whether )\byou (?:are|seem|sound) (?:depressed|fine)\b|(?<!of )\bje (?:bent|lijkt) (?:depressief|niet depressief)\b|```/i);
    }
    for (const t of ['988', '116 123', '113', 'findahelpline.com', '112']) expect(en).toContain(t);
    for (const t of ['0800-0113', '113.nl', '1813', '112']) expect(nl).toContain(t);
  });
  test('before any lookup or model: the device paths answer it with the guard\'s reply, in ZIGi and NOVA', () => {
    for (const env of [zigiEnv(showcaseAll()), novaEnv(showcaseAll())]) {
      expect(localAnswer('Do I seem depressed?', env).kind).toBe('none');
      expect(noModelReply('Do I seem depressed?', env)).toEqual({kind: 'answer', text: REFLECTIVE_MOOD_REPLIES.en, calls: []});
      expect(noModelReply('Lijk ik depressief?', env)).toEqual({kind: 'answer', text: REFLECTIVE_MOOD_REPLIES.nl, calls: []});
    }
  });
});

describe('self-harm, suicide words and heavier distress keep exactly today\'s reply', () => {
  for (const q of HEAVY) test(q, () => {
    expect(guardTopic(q)).toBe('distress');
    expect(reflectiveMood(q)).toBeNull();
    const hit = guardMessage(q)!;
    expect(hit.text).toBe(GUARD_REPLIES.distress[hit.lang]);
  });
  test('the distress reply itself is unchanged', () => {
    expect(GUARD_REPLIES.distress.en).toMatch(/^I'm really sorry you're feeling this way\. You don't have to carry it alone/);
    expect(GUARD_REPLIES.distress.nl).toMatch(/^Wat naar dat je je zo voelt\./);
  });
  test('ordinary words stay ordinary', () => {
    for (const q of ['Do I seem tired lately?', 'Am I sleeping enough?', 'Lijk ik moe?']) expect(guardTopic(q), q).toBeNull();
  });
});

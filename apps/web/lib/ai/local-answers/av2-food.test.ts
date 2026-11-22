import {describe, expect, test} from 'vitest';
import {AV2_FOOD} from '../evals/as/cases-av2-food';
import {DAY, freshAll, novaEnv, showcaseAll, zigiEnv} from '../evals/as/harness';
import type {ToolSources} from '../tools/env';
import {setEatenAt} from '../../food-plus/times';
import {emptyFoodPlus, type FoodPlus} from '../../food-plus/schema';
import {av2FoodAnswer} from './av2-food';
import type {LocalReply} from './engine';

/**
 * Session AV lane 2 (food): the food lane's on-device answers, in English and Dutch, NOVA and ZIGi alike, each only
 * while Health is shared. The Showcase day is the corpus's (17 Nov 2026).
 */
const text = (r: LocalReply | null) => r && 'text' in r ? r.text : '';
const zigi = (q: string, s: ToolSources = showcaseAll(), food: FoodPlus | null = null) => av2FoodAnswer(q, zigiEnv(s), {food});
const nova = (q: string, s: ToolSources = showcaseAll(), food: FoodPlus | null = null) => av2FoodAnswer(q, novaEnv(s), {food});
const closedHealth = (q: string) => av2FoodAnswer(q, zigiEnv(showcaseAll(), false));

describe('every corpus question has an answer, in both languages, from NOVA and ZIGi', () => {
  for (const c of AV2_FOOD) for (const q of [...c.en, ...c.nl]) test(`${c.id}: ${q}`, () => {
    for (const ask of [zigi, nova]) {
      const r = ask(q);
      expect(r, q).not.toBeNull();
      expect(r!.kind).toBe('answer');
      for (const n of c.never ?? []) expect(text(r)).not.toContain(n);
    }
    expect(closedHealth(q)?.kind, q).toBe('refusal');
  });
});

describe('diary times and nutrient timing', () => {
  test('when did I eat today: the Showcase day in order, with times; Dutch in Dutch', () => {
    const en = text(zigi('when did I eat today')), nl = text(zigi('wanneer heb ik vandaag gegeten')), before = text(zigi('when did I eat yesterday'));
    expect(en).toMatch(/^What you ate today, in order \(4 without a time\)/); // the Showcase's today is stamped at midnight: no clock is said
    expect(before).toMatch(/^What you ate yesterday, in order:\n• 0\d:\d\d: /);
    expect(nl).toMatch(/^Wat je vandaag at, op volgorde/);
    expect(nl).toContain('Health → Diary');
  });
  test('a time set on the device is the one said', () => {
    const s = showcaseAll(), first = s.health!.diary.find(e => e.date === DAY)!;
    const food = setEatenAt(emptyFoodPlus(), first.id, '06:05');
    expect(text(zigi('when did I eat today', s, food))).toContain(`• 06:05: ${first.snapshot.name.slice(0, 20)}`);
  });
  test('eating window and timing on a fresh profile say there is nothing yet, never 0', () => {
    const fresh = freshAll();
    expect(text(zigi('what is my eating window today', fresh))).toContain('no eating window');
    expect(text(zigi('wat is mijn eetvenster vandaag', fresh))).toContain('geen eetvenster');
    expect(text(zigi('how much protein do I eat in the morning', fresh))).toContain('can’t say when you eat it');
  });
  test('timing names the part of the day and the share', () => {
    const en = text(zigi('how much protein do I eat in the morning'));
    expect(en).toMatch(/In the morning you ate [\d.,]+ g of protein a day on average/);
    expect(en).toContain('By part of the day:');
    expect(text(zigi('hoeveel eiwit eet ik in de ochtend'))).toMatch(/In de ochtend at je gemiddeld [\d.,]+ g eiwit per dag/);
  });
  test('questions that are not about times are left to the other layers', () => {
    for (const q of ['what did I eat today', 'how much water did I drink', 'when should I eat', 'log 2 eggs and then remind me']) expect(zigi(q), q).toBeNull();
  });
});

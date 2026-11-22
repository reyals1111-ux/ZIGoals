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
  test('targets by weekday: a weekday\'s own targets are said as its own; the others use the Targets', () => {
    const food = {...emptyFoodPlus(), weekdays: {'6': {kcal: 2600, proteinG: 150}}};
    expect(text(zigi('what is my calorie target on saturday', showcaseAll(), food))).toContain('Your targets for Saturday: 2,600 kcal, protein 150 g');
    expect(text(zigi('wat is mijn caloriedoel voor zaterdag', showcaseAll(), food))).toContain('die van zaterdag zelf');
    const all = text(zigi('what are my targets by weekday', showcaseAll(), food));
    expect(all).toContain('• Saturday: 2,600 kcal');
    expect(all).toContain('• Monday: 2,200 kcal, protein 120 g, carbs 260 g and fat 73 g (your Targets)');
    // Not a food question: the money targets and Goals keep their answers.
    for (const q of ['what are my budget targets', 'what are my goals for saturday', 'am I on track for my groceries target']) expect(zigi(q, showcaseAll(), food), q).toBeNull();
  });
  test('net carbs take off the sugar alcohols set per food', () => {
    const s = showcaseAll(), first = s.health!.diary.find(e => e.date === DAY && e.sourceKind === 'food')!;
    const food = {...emptyFoodPlus(), sugarAlcohols: {[first.sourceId]: 5000}};
    const plain = text(zigi('what are my net carbs today', s)), less = text(zigi('what are my net carbs today', s, food));
    const grams = (t: string) => Number(/Net carbs today: (\d+) g/.exec(t)![1]);
    expect(grams(plain) - grams(less)).toBe(Math.round(5 * first.quantityMilli / 1000));
    expect(less).toContain('g sugar alcohols');
  });
  test('the Oracle: own foods highest in protein, and where the library\'s list is; vitamins in both languages', () => {
    const en = text(zigi('which foods are high in protein'));
    expect(en).toMatch(/^Your own foods highest in protein: Salmon, rice and greens 48 g per serving/);
    expect(en).toContain('Health → Insights → “Foods high in a nutrient (the Oracle)”');
    expect(text(zigi('which foods are high in vitamin C'))).toContain('richest foods in vitamin C');
    expect(text(zigi('welke voedingsmiddelen zijn rijk aan vitamine B12'))).toContain('voor vitamine B12');
    expect(text(zigi('which foods are high in protein', freshAll()))).toMatch(/^None of your own foods carries protein yet\./);
    // Today's protein and the iron list keep their own answers.
    for (const q of ['how much protein did I eat today', 'which foods are high in iron']) expect(zigi(q), q).toBeNull();
  });
  test('questions that are not about times are left to the other layers', () => {
    for (const q of ['what did I eat today', 'how much water did I drink', 'when should I eat', 'log 2 eggs and then remind me']) expect(zigi(q), q).toBeNull();
  });
});

import {describe, expect, test} from 'vitest';
import {AW_X5} from '../evals/as/cases-aw-x5';
import {DAY, freshAll, novaEnv, showcaseAll, zigiEnv} from '../evals/as/harness';
import type {ToolSources} from '../tools/env';
import {buildShowcase} from '../../showcase-data';
import {healthSchema, HEALTH_STORAGE_KEY} from '../../health';
import {FOOD_PLUS_KEY, foodPlusSchema} from '../../food-plus/schema';
import {GROCERY_KEY, groceryRecordSchema} from '../../grocery/schema';
import {awX5Answer, type AwX5Extra} from './aw-x5-paprika';
import type {LocalReply} from './engine';

/**
 * Session AW (X5, LEDGER #452, #454, #455): the kitchen's on-device answers in English and Dutch, NOVA and ZIGi alike,
 * only while Health is shared, from the Showcase's labelled pantry, pea soup and menu (17 Nov 2026, the corpus's day).
 */
const records = buildShowcase(DAY, 'UTC').records;
const SHOWCASE: AwX5Extra = {food: foodPlusSchema.parse(JSON.parse(records[FOOD_PLUS_KEY]!)), grocery: groceryRecordSchema.parse(JSON.parse(records[GROCERY_KEY]!))};
const text = (r: LocalReply | null) => r && 'text' in r ? r.text : '';
const zigi = (q: string, s: ToolSources = showcaseAll(), extra: AwX5Extra = SHOWCASE) => awX5Answer(q, zigiEnv(s), extra);
const nova = (q: string, s: ToolSources = showcaseAll(), extra: AwX5Extra = SHOWCASE) => awX5Answer(q, novaEnv(s), extra);

describe('every corpus question has an answer, in both languages, from NOVA and ZIGi; refused with Health closed', () => {
  for (const c of AW_X5) for (const q of [...c.en, ...c.nl]) test(`${c.id}: ${q}`, () => {
    for (const ask of [zigi, nova]) {
      const r = ask(q);
      expect(r, q).not.toBeNull();
      expect(r!.kind).toBe('answer');
      for (const n of c.never ?? []) expect(text(r)).not.toContain(n);
    }
    expect(awX5Answer(q, zigiEnv(showcaseAll(), false), SHOWCASE)?.kind, q).toBe('refusal');
  });
});

describe('#452 use soon', () => {
  test('the Showcase: yoghurt tomorrow, then spinach past its day; Dutch in Dutch', () => {
    const en = text(zigi('what\'s in my pantry that I should use soon')), nl = text(zigi('wat in mijn voorraad moet ik snel opmaken'));
    expect(en).toContain('• Showcase yoghurt: use by tomorrow\n• Showcase spinach: past its use-by day, yesterday');
    expect(en).not.toContain('rice');
    expect(nl).toContain('• Showcase yoghurt: uiterlijk morgen\n• Showcase spinach: over de datum, sinds gisteren');
  });
  test('nothing at home, or no day near: said plainly with where to set one; unreadable is not nothing', () => {
    expect(text(zigi('what should I use up first at home', freshAll(), {}))).toContain('Nothing is marked as at home yet');
    expect(text(zigi('what should I use up first at home', showcaseAll(), {grocery: {version: 1, pantry: {rice: '2026-11-01T08:00:00.000Z'}, useBy: {rice: '2026-12-30'}}}))).toContain('the next is Rice on');
    expect(text(zigi('what should I use up first at home', showcaseAll(), {grocery: null}))).toContain('can’t be read');
  });
});

describe('#455 when you last made it', () => {
  test('the Showcase pea soup: the last day, how often, and the stars', () => {
    expect(text(zigi('when did I last make pea soup'))).toBe('You last made Showcase pea soup on Thu, Nov 12: 2 times in all, from your food diary and “Made it” in the cooking view. Your stars: 4 of 5.');
    expect(text(zigi('wanneer heb ik voor het laatst pea soup gemaakt'))).toMatch(/^Je maakte Showcase pea soup voor het laatst op do 12 nov: 2 keer in totaal/);
  });
  test('a recipe not saved, or never made, is said so, never “0 times”', () => {
    expect(text(zigi('when did I last make lasagne'))).toContain('No recipe called “lasagne”');
    // Session AW (integration, deliberate): the assistant's sources now carry the kitchen's records (env.ak.foodPlus); the case
    // "no food record to read" is those sources without them, and the same answer is required.
    const none = showcaseAll(); none.ak = {...(none.ak as object), foodPlus: undefined, grocery: undefined} as typeof none.ak;
    expect(text(awX5Answer('when did I last make pea soup', zigiEnv(none), {}))).toContain('not in your food diary yet');
  });
});

describe('#454 the menu for next week', () => {
  test('next week has no plans in the Showcase: said, with the kept menu to place', () => {
    const en = text(zigi('what\'s my menu for next week'));
    expect(en).toMatch(/^Nothing is planned for next week yet \(Mon, Nov 23 – Sun, Nov 29\)\. Menus you kept: Soup week \(Showcase\) \(5 meals on 5 days\)/);
    expect(text(zigi('wat is mijn menu voor volgende week'))).toContain('Menu’s die je bewaarde: Soup week (Showcase) (5 maaltijden op 5 dagen)');
  });
  test('this week: the soup dinners, day by day (the Showcase’s own plans, which the tools’ fixture leaves out)', () => {
    const health = healthSchema.parse(JSON.parse(records[HEALTH_STORAGE_KEY]!));
    const en = text(zigi('what is on my menu this week', {...showcaseAll(), health}));
    expect(en).toContain('Your menu for this week (Mon, Nov 16 – Sun, Nov 22), from your meal plans:');
    expect(en).toContain('• Tue, Nov 17, dinner: Showcase pea soup');
  });
});

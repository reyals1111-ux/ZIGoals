import {describe, expect, test} from 'vitest';
import {atwaterFits, extractJsonObject, readLabelReply, type LabelRead} from './read';
import {barcodeDraft, foodFormDraft} from './drafts';
import {LABEL_ASK, LABEL_SYSTEM, labelScanRequest, runLabelScan} from './request';
import type {ChatEvent, ChatRequest} from '../ai/types';
import {additionalNutrients, parseHealthNumber} from '../health';
import {parseVitamin} from '../health-vitamins/schema';

// Fixtures: what a model could answer. No model is called anywhere in these tests.
const OATS = {readable: true, basis: 'per-100g', serving_size: {amount: 40, unit: 'g'}, energy_kcal: 375, energy_kj: 1580, protein_g: 13, carbohydrate_g: 60, fat_g: 7, fibre_g: 10, sugars_g: 1.1, saturated_fat_g: 1.3, salt_g: 0.01, sodium_mg: null, vitamins_minerals: [{name: 'Iron', amount: 4.2, unit: 'mg'}, {name: 'Vitamin B1', amount: 0.5, unit: 'mg'}]};
const US_BAR = {basis: 'per-serving', serving_size: {amount: 40, unit: 'g'}, energy_kcal: 190, protein_g: 10, carbohydrate_g: 23, fat_g: 7, fibre_g: 5, sugars_g: 8, saturated_fat_g: 1.5, sodium_mg: 140, vitamins_minerals: [{name: 'Calcium', amount: 260, unit: 'mg'}, {name: 'Vitamin D', amount: 2, unit: 'mcg'}, {name: 'Vitamin C', amount: 10, unit: '%'}]};
const MILK = {basis: 'per-100ml', energy_kcal: 64, protein_g: 3.4, carbohydrate_g: 4.8, fat_g: 3.6, sugars_g: 4.8, saturated_fat_g: 2.3, salt_g: 0.1};
const reply = (o: unknown) => `Here you go:\n\`\`\`json\n${JSON.stringify(o)}\n\`\`\``;
const ok = (o: unknown): LabelRead => { const r = readLabelReply(reply(o)); if (!r.ok) throw Error(r.problems.join(' ')); return r.label; };
const problems = (o: unknown) => { const r = readLabelReply(typeof o === 'string' ? o : reply(o)); return r.ok ? [] : r.problems; };

describe('reading the reply', () => {
  test('finds the first whole JSON object in prose or a fence, with braces inside strings', () => {
    expect(extractJsonObject('x {"a": "}{", "b": {"c": 1}} y {"d": 2}')).toEqual({a: '}{', b: {c: 1}});
    expect(extractJsonObject('{broken {"ok": true}')).toEqual({ok: true});
    expect(extractJsonObject('no json')).toBeNull();
    expect(extractJsonObject('{"a": 1')).toBeNull();
  });
  test('an EU label per 100 g, with salt as sodium and the vitamins and minerals it lists', () => {
    const l = ok(OATS);
    expect(l).toMatchObject({basis: 'per-100g', serving: {amount: 40, unit: 'g'}, kcal: 375, proteinG: 13, carbsG: 60, fatG: 7, fibreG: 10, sodiumMg: 4, sodiumFromSalt: true, minerals: {ironMg: 4}});
    expect(l.notKept).toEqual(['Vitamin B1']); expect(l.notes).toContain('Sodium worked out from salt (÷ 2.5).');
  });
  test('a US label per serving: total carbohydrate includes fibre; mcg is µg; a % only is listed, not kept', () => {
    const l = ok(US_BAR);
    expect(l).toMatchObject({basis: 'per-serving', kcal: 190, sodiumMg: 140, sodiumFromSalt: false, minerals: {calciumMg: 260}, vitamins: {dUg: 2}});
    expect(l.notKept).toEqual(['Vitamin C (only as % of a daily value)']);
  });
  test('numbers as decimal strings with commas are read; kJ alone gives kcal', () => {
    const l = ok({basis: 'per-100g', energy_kj: '1046', protein_g: '3,5', carbohydrate_g: 50, fat_g: 1});
    expect(l.kcal).toBe(250); expect(l.proteinG).toBe(3.5); expect(l.notes[0]).toMatch(/kilojoules/);
  });
  test('unknown stays null, never zero', () => {
    const l = ok({basis: 'per-100g', energy_kcal: 52, protein_g: 0.3, carbohydrate_g: 14, fat_g: 0.2});
    expect([l.fibreG, l.sugarsG, l.saturatedFatG, l.sodiumMg]).toEqual([null, null, null, null]);
  });
  test('milligrams and grams of a vitamin convert to its unit', () => {
    const l = ok({basis: 'per-100g', energy_kcal: 400, protein_g: 10, carbohydrate_g: 80, fat_g: 4, vitamins_minerals: [{name: 'Vitamin A', amount: 0.3, unit: 'mg'}, {name: 'Folic acid', amount: 200, unit: 'µg'}, {name: 'Vitamin B12', amount: 0.0012, unit: 'mg'}, {name: 'Vitamin K', amount: 5, unit: 'IU'}]});
    expect(l.vitamins).toEqual({aUg: 300, folateUg: 200, b12Ug: 1.2}); expect(l.notKept).toEqual(['Vitamin K (IU)']);
  });
});

describe('impossible labels are refused', () => {
  test('the energy check: kcal against 4/4/9 within ±20 %', () => {
    expect(atwaterFits(375, 13, 60, 7, 10)).toBe(true);
    expect(atwaterFits(190, 10, 23, 7, 5)).toBe(true);
    expect(atwaterFits(100, 13, 60, 7, null)).toBe(false);
    expect(atwaterFits(900, 13, 60, 7, null)).toBe(false);
    // ±20 % at the edges (no fibre): 4·10 + 4·10 + 9·10 = 170 → 126 to 214 with the 10 kcal rounding slack.
    expect([atwaterFits(126, 10, 10, 10, null), atwaterFits(125, 10, 10, 10, null), atwaterFits(214, 10, 10, 10, null), atwaterFits(215, 10, 10, 10, null)]).toEqual([true, false, true, false]);
    // Fibre-aware: a high-fibre EU label (carbohydrate without fibre, fibre at 2 kcal/g) and a US one (carbohydrate with it).
    expect(atwaterFits(280, 10, 30, 5, 30)).toBe(true);
    expect(atwaterFits(150, 10, 40, 2, 30)).toBe(true);
    // Tiny values: a drink of 2 kcal with 0.5 g sugar.
    expect(atwaterFits(2, 0, 0.5, 0, null)).toBe(true);
  });
  test('a label failing it is refused with a sentence', () => {
    expect(problems({...OATS, energy_kcal: 150, energy_kj: null})).toEqual(['The calories do not match the protein, carbohydrate and fat (4, 4 and 9 kcal per gram, ±20 %).']);
  });
  test('more than 100 g of nutrients in 100 g, more calories than fat can hold', () => {
    expect(problems({basis: 'per-100g', energy_kcal: 800, protein_g: 60, carbohydrate_g: 50, fat_g: 20})).toContain('The nutrients add up to more than the 100 g they describe.');
    expect(problems({basis: 'per-100g', energy_kcal: 1000, protein_g: 0, carbohydrate_g: 0, fat_g: 100})).toContain('The calories are more than any food of that weight can hold (9 kcal per gram is pure fat).');
    expect(problems({basis: 'per-serving', serving_size: {amount: 30, unit: 'g'}, energy_kcal: 300, protein_g: 10, carbohydrate_g: 30, fat_g: 10})).toEqual(expect.arrayContaining(['The nutrients add up to more than the serving of 30 g they describe.']));
  });
  test('a part above its whole, kcal and kJ that disagree', () => {
    expect(problems({...OATS, sugars_g: 70})).toContain('The sugars are more than the carbohydrate they belong to.');
    expect(problems({...OATS, saturated_fat_g: 9})).toContain('The saturated fat is more than the fat it belongs to.');
    expect(problems({...OATS, energy_kj: 3000})).toContain('The kilojoules and the kilocalories do not match each other.');
  });
  test('honey per 100 mL may weigh more than 100 g; olive oil per 100 mL is fine', () => {
    expect(problems({basis: 'per-100ml', energy_kcal: 430, protein_g: 0.4, carbohydrate_g: 112, fat_g: 0})).toEqual([]);
    expect(problems({basis: 'per-100ml', energy_kcal: 828, protein_g: 0, carbohydrate_g: 0, fat_g: 92})).toEqual([]);
  });
  test('negative, huge or non-number values, no basis, no label, nothing read', () => {
    expect(problems({basis: 'per-100g', energy_kcal: -5, protein_g: 1, carbohydrate_g: 1, fat_g: 1})[0]).toMatch(/cannot be on a label/);
    expect(problems({basis: 'per-100g', energy_kcal: 'lots'})[0]).toMatch(/cannot be on a label/);
    expect(problems({basis: 'per-100g', energy_kcal: 9e9})[0]).toMatch(/cannot be on a label/);
    expect(problems({basis: 'per-jar', energy_kcal: 9})[0]).toMatch(/cannot be on a label/);
    expect(problems({energy_kcal: 100})[0]).toMatch(/per 100 g, per 100 mL or per serving/);
    expect(problems({readable: false, basis: null})[0]).toMatch(/could not find a nutrition label/);
    expect(problems({basis: 'per-100g', fibre_g: 3})[0]).toMatch(/No calories, protein/);
    expect(problems('I cannot see a label.')[0]).toMatch(/did not answer/);
    expect(problems({basis: 'per-100g', energy_kcal: 300, protein_g: 10, carbohydrate_g: 50, fat_g: 5, vitamins_minerals: [{name: 'Vitamin D', amount: 5, unit: 'mg'}]})[0]).toMatch(/Vitamin D is far above/);
  });
  test('a per-serving label without a serving size passes with a note to enter it', () => {
    const l = ok({basis: 'per-serving', energy_kcal: 190, protein_g: 10, carbohydrate_g: 23, fat_g: 7});
    expect(l.serving).toBeNull(); expect(l.notes).toContain('The serving size was not read: enter it before saving.');
  });
});

describe('the drafts the forms receive', () => {
  test('the food form keeps the label basis; every field parses with the form’s own rules', () => {
    const d = foodFormDraft(ok(OATS));
    expect(d).toMatchObject({basis: '100g', measureUnit: 'g', weight: '40', values: {kcal: '375', proteinMg: '13', carbsMg: '60', fatMg: '7'}});
    expect(d.extras).toEqual({fiberMg: '10', sugarMg: '1.1', saturatedFatMg: '1.3', sodiumMg: '4', potassiumMg: '', calciumMg: '', ironMg: '4'});
    expect(d.notes).toContain('Also on the label, not kept here: Vitamin B1.');
    expect(parseHealthNumber(d.values.kcal, 1, 0, 1_000_000)).toBe(375); expect(parseHealthNumber(d.values.proteinMg, 1000, 0, 1_000_000_000)).toBe(13000);
    for (const [key, , , scale] of additionalNutrients) if (d.extras[key]) expect(() => parseHealthNumber(d.extras[key], scale, 0, 1_000_000_000)).not.toThrow();
  });
  test('per serving and per 100 mL; no serving read means 100, said in a note', () => {
    const us = foodFormDraft(ok(US_BAR));
    expect(us).toMatchObject({basis: 'serving', measureUnit: 'g', weight: '40', vitamins: {dUg: '2'}});
    expect(parseVitamin(us.vitamins.dUg!)).toBe(2000);
    const milk = foodFormDraft(ok(MILK));
    expect(milk).toMatchObject({basis: '100ml', measureUnit: 'ml', weight: '100'}); expect(milk.notes.at(-1)).toMatch(/one serving is 100 mL/);
  });
  test('the barcode form gets per 100 g values, scaled from a serving in grams', () => {
    const oats = barcodeDraft(ok(OATS));
    expect(oats).toMatchObject({ok: true, kcal: '375', protein: '13', carbs: '60', fat: '7', extra: {fiberMg: 10000, sugarMg: 1100, saturatedFatMg: 1300, sodiumMg: 4, ironMg: 4}});
    const bar = barcodeDraft(ok(US_BAR));
    expect(bar).toMatchObject({ok: true, kcal: '475', protein: '25', carbs: '57.5', fat: '17.5', extra: {sodiumMg: 350, calciumMg: 650, fiberMg: 12500}, vitamins: {dUg: 5000}});
    expect(bar.ok && bar.notes).toContain('The label is per serving of 40 g; the values are scaled to 100 g.');
  });
  test('millilitres and an unknown serving are not converted: a sentence says where to go', () => {
    expect(barcodeDraft(ok(MILK))).toMatchObject({ok: false, reason: expect.stringMatching(/millilitres/)});
    expect(barcodeDraft(ok({basis: 'per-serving', energy_kcal: 190, protein_g: 10, carbohydrate_g: 23, fat_g: 7}))).toMatchObject({ok: false, reason: expect.stringMatching(/serving size was not read/)});
  });
});

describe('the request and its run (a fake stream; no model is called)', () => {
  const settings = {provider: 'anthropic' as const, model: 'a-vision-model', localServer: null, baseUrl: null, maxOutputTokens: 2048};
  const image = {mime: 'image/jpeg' as const, data: 'AAAA'};
  test('only the photo and the instructions go: no records, the person’s own provider, model, key and output cap', () => {
    const r = labelScanRequest({settings, key: 'sk-own', image});
    expect(r).toMatchObject({provider: 'anthropic', model: 'a-vision-model', key: 'sk-own', system: LABEL_SYSTEM, maxOutputTokens: 1500, think: false, messages: [{role: 'user', content: LABEL_ASK, images: [image]}]});
    expect(r.messages).toHaveLength(1); expect(r.tools).toBeUndefined(); expect(r.systemBlocks).toBeUndefined();
    expect(labelScanRequest({settings: {...settings, maxOutputTokens: 256}, key: null, image}).maxOutputTokens).toBe(256);
    expect(() => labelScanRequest({settings: {...settings, model: null}, key: null, image})).toThrow(/No AI/);
    expect(labelScanRequest({settings: {...settings, provider: 'local', localServer: 'ollama', baseUrl: 'http://localhost:11434'}, key: null, image})).toMatchObject({localServer: 'ollama', baseUrl: 'http://localhost:11434', format: expect.objectContaining({type: 'object'})});
  });
  const fake = (events: ChatEvent[]) => { const seen: ChatRequest[] = []; return {seen, stream: async function* (r: ChatRequest) { seen.push(r); for (const e of events) yield e; }}; };
  test('a streamed reply is read and checked; usage is reported for the meter', async () => {
    const text = JSON.stringify(OATS), f = fake([{type: 'text', delta: text.slice(0, 20)}, {type: 'text', delta: text.slice(20)}, {type: 'usage', input: 900, output: 120}, {type: 'done', reason: 'end_turn'}]);
    const out = await runLabelScan(labelScanRequest({settings, key: 'k', image}), f.stream);
    expect(out).toMatchObject({ok: true, usage: {input: 900, output: 120}, requests: 1}); expect(f.seen).toHaveLength(1);
  });
  test('a reply cut off at the output cap says so; an impossible one is refused', async () => {
    expect(await runLabelScan(labelScanRequest({settings, key: 'k', image}), fake([{type: 'text', delta: '{"basis": "per-100g", "energy'}, {type: 'done', reason: 'max_tokens'}]).stream)).toMatchObject({ok: false, problems: [expect.stringMatching(/output cap/)]});
    expect(await runLabelScan(labelScanRequest({settings, key: 'k', image}), fake([{type: 'text', delta: JSON.stringify({...OATS, energy_kcal: 40, energy_kj: null})}, {type: 'done', reason: 'stop'}]).stream)).toMatchObject({ok: false, problems: [expect.stringMatching(/do not match/)]});
  });
});

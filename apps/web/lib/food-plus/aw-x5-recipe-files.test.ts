import {gzipSync} from 'node:zlib';
import {describe, expect, test} from 'vitest';
import {buildStoredZip} from '../export/zip';
import {fromRecipeParts} from '../health-aa/recipe-text';
import {fromPaprikaJson, gunzip, markdownToText, readRecipeFile, recipeFileKind, RecipeFileError, servingsOf} from './recipe-files';

/**
 * Session AW (X5, LEDGER #453): recipe files from other apps, read on the device into the confirmable list — Paprika's
 * .paprikarecipes (a ZIP of gzip JSON, unpacked with the platform's DecompressionStream under caps), one .paprikarecipe,
 * and Markdown or text. Photos are left out; nothing runs; the rating becomes stars.
 */
const AT = new Date('2026-11-23T08:00:00Z');
const enc = (s: string) => new TextEncoder().encode(s);
const paprika = (r: Record<string, unknown>) => new Uint8Array(gzipSync(Buffer.from(JSON.stringify(r))));
const lasagne = {name: 'Lasagne', servings: '4 servings', rating: 5, ingredients: '500 g minced beef\nFor the sauce:\n2 tbsp olive oil\n1 onion, chopped', directions: '1. Brown the beef for 10 minutes.\n2. Layer and bake 40-45 min.', photo_data: 'aGVsbG8=', photos: [{name: 'a.jpg', data: 'aGk='}], categories: ['Dinner']};
const soup = {name: 'Tomato soup', servings: 'Serves 2', ingredients: '400 g tomatoes\n1 l stock', directions: 'Simmer for 20 minutes.\n\nBlend.'};
describe('#453 Paprika recipe files', () => {
  test('a .paprikarecipes export: every recipe, its servings, ingredient lines (headings left out), the method, stars; photos counted and left out', async () => {
    const zip = buildStoredZip([{name: 'Lasagne.paprikarecipe', data: paprika(lasagne), modified: AT}, {name: 'Tomato soup.paprikarecipe', data: paprika(soup), modified: AT}, {name: 'notes.txt', data: 'not a recipe', modified: AT}]);
    const read = await readRecipeFile('My Recipes.paprikarecipes', zip);
    expect(read.recipes.map(r => [r.title, r.servings, r.ingredients.length, r.stepLines, r.stars])).toEqual([
      ['Lasagne', 4, 3, ['Brown the beef for 10 minutes.', 'Layer and bake 40-45 min.'], 5],
      ['Tomato soup', 2, 2, ['Simmer for 20 minutes.', 'Blend.'], undefined],
    ]);
    expect(read.recipes[0]!.ingredients.map(i => [i.name, i.grams])).toEqual([['minced beef', 500], ['olive oil', 30], ['onion', null]]);
    expect(read.photosLeftOut).toBe(2);
    expect(read.skipped).toEqual([]);
    expect(JSON.stringify(read)).not.toContain('aGVsbG8=');
  });
  test('one .paprikarecipe, and an entry that is damaged or not a recipe is left aside with its reason', async () => {
    expect((await readRecipeFile('Soup.paprikarecipe', paprika(soup))).recipes[0]!.title).toBe('Tomato soup');
    const zip = buildStoredZip([{name: 'Good.paprikarecipe', data: paprika(soup), modified: AT}, {name: 'Bad.paprikarecipe', data: new Uint8Array([0x1f, 0x8b, 1, 2, 3]), modified: AT}, {name: 'Empty.paprikarecipe', data: paprika({categories: []}), modified: AT}, {name: 'Text.paprikarecipe', data: enc('{oops'), modified: AT}]);
    const read = await readRecipeFile('x.paprikarecipes', zip);
    expect(read.recipes.map(r => r.title)).toEqual(['Tomato soup']);
    expect(read.skipped).toEqual(['Bad: damaged', 'Empty: no recipe in it', 'Text: not a recipe ZIGoals can read']);
    await expect(readRecipeFile('x.paprikarecipe', new Uint8Array([0x1f, 0x8b, 9, 9]))).rejects.toThrow('This recipe file could not be read.');
    await expect(readRecipeFile('x.paprikarecipes', enc('not a zip'))).rejects.toBeInstanceOf(RecipeFileError);
    await expect(readRecipeFile('photo.jpg', enc(''))).rejects.toThrow('Choose a .paprikarecipes export');
  });
  // Session AW (review b2 M1): one budget for the whole export, as the notes reader's (Z1B-5): every byte an entry
  // inflates counts, also when it then fails, so many small bombs stop once the budget is spent; each entry tried
  // counts toward the 200.
  test('an export of many small gzip bombs stops once the one budget is spent, each left aside with its reason', async () => {
    const bomb = new Uint8Array(gzipSync(Buffer.alloc(1024 * 1024, 32))); // 1 MB of spaces: not a recipe, ~1 kB packed
    const zip = buildStoredZip(Array.from({length: 6}, (_, i) => ({name: `Bomb ${i}.paprikarecipe`, data: bomb, modified: AT})));
    const read = await readRecipeFile('x.paprikarecipes', zip, 2.5 * 1024 * 1024);
    expect(read.recipes).toEqual([]);
    expect(read.skipped.slice(0, 2)).toEqual(['Bomb 0: not a recipe ZIGoals can read', 'Bomb 1: not a recipe ZIGoals can read']);
    expect(read.skipped[2]).toBe('Bomb 2: larger than ZIGoals reads');
    expect(read.skipped.slice(3)).toEqual(['Bomb 3', 'Bomb 4', 'Bomb 5'].map(b => `${b}: the export is larger than ZIGoals reads in one go`));
  });
  test('gunzip stops past its cap (a bomb never fills memory)', async () => {
    const big = new Uint8Array(gzipSync(Buffer.alloc(200_000, 32)));
    await expect(gunzip(big, 1000)).rejects.toThrow('larger than ZIGoals reads');
    expect((await gunzip(big, 300_000)).length).toBe(200_000);
  });
  test('the JSON is data: odd shapes are refused, never run', () => {
    expect(fromPaprikaJson(null)).toBeNull();
    expect(fromPaprikaJson([1, 2])).toBeNull();
    expect(fromPaprikaJson({name: '', ingredients: ''})).toBeNull();
    expect(fromPaprikaJson({name: 'X', ingredients: 42, directions: {toString: 'nope'}, rating: 9})).toMatchObject({recipe: {title: 'X', ingredients: [], steps: 0}});
    expect(servingsOf('2-3 people')).toBe(2);
    expect(servingsOf('')).toBeNull();
    expect(servingsOf(500)).toBeNull();
  });
});

describe('#453 Markdown and text recipe files', () => {
  test('Markdown marks off, then read as pasted text; a file without a title line is named after the file', async () => {
    const md = '# Pancakes\n\nServes 4\n\n## Ingredients\n\n- 200 g flour\n- **2** eggs\n- 300 ml [milk](https://example.com)\n\n## Method\n\n1. Whisk for 1 minute.\n2. Rest for *30 minutes*.\n';
    expect(markdownToText(md)).toContain('Ingredients\n\n200 g flour\n2 eggs\n300 ml milk');
    const read = await readRecipeFile('pancakes.md', enc(md));
    expect(read.recipes).toHaveLength(1);
    expect(read.recipes[0]).toMatchObject({title: 'Pancakes', servings: 4, stepLines: ['Whisk for 1 minute.', 'Rest for 30 minutes.']});
    expect(read.recipes[0]!.ingredients.map(i => i.name)).toEqual(['flour', 'eggs', 'milk']);
    const plain = await readRecipeFile('Granny’s stew.txt', enc('Ingredients\n500 g beef\n2 carrots\nMethod\nStew for 2 hours.'));
    expect(plain.recipes[0]!.title).toBe('Granny’s stew');
    await expect(readRecipeFile('empty.txt', enc('   '))).rejects.toThrow('no text');
    expect(recipeFileKind('A.MARKDOWN')).toBe('text');
    expect(recipeFileKind('a.paprikarecipes')).toBe('paprika-archive');
  });
  test('a recipe in parts: a line ending in a colon is a heading, a method line loses its number', () => {
    const p = fromRecipeParts({title: ' Stew ', servings: 0, ingredientLines: ['For the stew:', '500 g beef', '', 'Ingredients'], methodLines: ['Step 1: Brown it.', '2) Stew.']});
    expect(p).toMatchObject({title: 'Stew', servings: null, steps: 2, stepLines: ['Brown it.', 'Stew.']});
    expect(p.ingredients.map(i => i.name)).toEqual(['beef']);
  });
});

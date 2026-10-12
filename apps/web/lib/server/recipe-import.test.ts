import {describe, expect, test} from 'vitest';
import {checkRecipeUrl, extractRecipe, fetchRecipePage, importRecipe, isRefusal, RECIPE_MAX_BYTES} from './recipe-import';
import {allow} from '../../app/api/recipe-import/route';

const page = (ld: unknown) => `<html><head><script type="application/ld+json">${JSON.stringify(ld)}</script></head><body>x</body></html>`;
const recipe = {'@context': 'https://schema.org', '@type': 'Recipe', name: 'Fictional lentil soup', recipeIngredient: ['200 g red lentils', '1 onion', '2 tbsp olive oil'], recipeYield: '4 servings', recipeInstructions: [{'@type': 'HowToStep', text: 'Fry.'}, {'@type': 'HowToStep', text: 'Simmer.'}]};
const respond = (body: string, init: {status?: number; type?: string; length?: string} = {}) => new Response(body, {status: init.status ?? 200, headers: {'content-type': init.type ?? 'text/html; charset=utf-8', ...(init.length ? {'content-length': init.length} : {})}});
const fetchOf = (handler: (url: string, init: RequestInit) => Response | Promise<Response>) => (url: string, init: RequestInit) => Promise.resolve(handler(url, init));

describe('N6 recipe URL import (SSRF-safe, TIER 3)', () => {
  test('refuses everything but a public https origin on 443 without user-info', () => {
    const codes = (raw: string) => { const r = checkRecipeUrl(raw); return isRefusal(r) ? r.code : 'ok'; };
    expect(codes('https://www.example-recipes.com/soup')).toBe('ok');
    expect(codes('http://www.example-recipes.com/soup')).toBe('NOT_HTTPS');
    expect(codes('https://localhost/x')).toBe('PRIVATE_HOST'); expect(codes('https://127.0.0.1/x')).toBe('PRIVATE_HOST'); expect(codes('https://10.0.0.5/x')).toBe('PRIVATE_HOST');
    expect(codes('https://[::1]/x')).toBe('PRIVATE_HOST'); expect(codes('https://printer.local/x')).toBe('PRIVATE_HOST'); expect(codes('https://vault.internal/x')).toBe('PRIVATE_HOST'); expect(codes('https://nas.home/x')).toBe('PRIVATE_HOST');
    expect(codes('https://site/x')).toBe('PRIVATE_HOST'); expect(codes('https://user:pw@www.example-recipes.com/x')).toBe('INVALID_URL'); expect(codes('https://www.example-recipes.com:8443/x')).toBe('PRIVATE_HOST');
    expect(codes('ftp://www.example-recipes.com/x')).toBe('NOT_HTTPS'); expect(codes('not a url')).toBe('INVALID_URL'); expect(codes('javascript:alert(1)')).toBe('NOT_HTTPS');
  });
  test('never follows a redirect, refuses a wrong type, a large body (declared or streamed), a slow server and an upstream error', async () => {
    const url = checkRecipeUrl('https://www.example-recipes.com/soup') as URL;
    let init: RequestInit | undefined;
    expect(await fetchRecipePage(url, fetchOf((_u, i) => { init = i; return respond('', {status: 302}); }))).toEqual({code: 'REDIRECT'});
    expect(init?.redirect).toBe('manual'); expect(init?.credentials).toBe('omit');
    expect(await fetchRecipePage(url, fetchOf(() => respond('{}', {type: 'application/json'})))).toEqual({code: 'WRONG_TYPE'});
    expect(await fetchRecipePage(url, fetchOf(() => respond('x', {length: String(RECIPE_MAX_BYTES + 1)})))).toEqual({code: 'TOO_LARGE'});
    expect(await fetchRecipePage(url, fetchOf(() => respond('a'.repeat(RECIPE_MAX_BYTES + 10))))).toEqual({code: 'TOO_LARGE'});
    expect(await fetchRecipePage(url, fetchOf(() => respond('nope', {status: 500})))).toEqual({code: 'UPSTREAM'});
    expect(await fetchRecipePage(url, fetchOf((_u, i) => new Promise((_resolve, reject) => { (i.signal as AbortSignal).addEventListener('abort', () => reject(Object.assign(new Error('aborted'), {name: 'AbortError'}))); })))).toEqual({code: 'TIMEOUT'});
  }, 20_000);
  test('reads only a schema.org Recipe (inside @graph too), trims it, and refuses pages without one', () => {
    const r = extractRecipe(page(recipe), 'https://www.example-recipes.com/soup');
    expect(r).toEqual({name: 'Fictional lentil soup', ingredients: ['200 g red lentils', '1 onion', '2 tbsp olive oil'], servings: 4, steps: 2, source: 'www.example-recipes.com'});
    expect(extractRecipe(page({'@graph': [{'@type': 'WebPage'}, recipe]}), 'https://www.example-recipes.com/x')).toMatchObject({name: 'Fictional lentil soup'});
    expect(extractRecipe(page({'@type': 'Article', name: 'Not food'}), 'https://www.example-recipes.com/x')).toEqual({code: 'NO_RECIPE'});
    expect(extractRecipe('<html><body>no json-ld</body></html>', 'https://www.example-recipes.com/x')).toEqual({code: 'NO_RECIPE'});
    expect(extractRecipe(page({...recipe, recipeIngredient: Array.from({length: 300}, (_, i) => `${i} g thing`.padEnd(400, 'x'))}), 'https://www.example-recipes.com/x')).toMatchObject({ingredients: expect.any(Array)});
    const big = extractRecipe(page({...recipe, recipeIngredient: Array.from({length: 300}, (_, i) => `${i} g thing`.padEnd(400, 'x'))}), 'https://www.example-recipes.com/x') as {ingredients: string[]};
    expect(big.ingredients).toHaveLength(100); expect(big.ingredients[0]!.length).toBe(200);
    expect(extractRecipe('<script type="application/ld+json">{broken</script>', 'https://www.example-recipes.com/x')).toEqual({code: 'NO_RECIPE'});
  });
  test('end to end with a fake fetch; the route limits a client to ten a minute and the instance to sixty', async () => {
    expect(await importRecipe('https://www.example-recipes.com/soup', fetchOf(() => respond(page(recipe))))).toMatchObject({name: 'Fictional lentil soup'});
    expect(await importRecipe('https://169.254.169.254/latest/meta-data', fetchOf(() => { throw new Error('must not be called'); }))).toEqual({code: 'PRIVATE_HOST'});
    const t0 = 1_000_000;
    for (let i = 0; i < 10; i++) expect(allow('client-a', t0 + i)).toBe(true);
    expect(allow('client-a', t0 + 11)).toBe(false); expect(allow('client-b', t0 + 11)).toBe(true); expect(allow('client-a', t0 + 60_001)).toBe(true);
    for (let i = 0; i < 70; i++) allow(`c${i}`, t0 + 100 + i);
    expect(allow('client-z', t0 + 200)).toBe(false);
  });
});

import {describe, expect, test, vi} from 'vitest';
import {checkRecipeUrl, extractRecipe, fetchRecipePage, importRecipe, isRefusal, RECIPE_MAX_BYTES} from './recipe-import';
import {allow, POST} from '../../app/api/recipe-import/route';

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

test('Gate B: a trailing dot does not slip a private name through, and a page of endless script heads is refused fast', () => {
  for (const u of ['https://localhost./x', 'https://printer.local./x', 'https://box.internal./x']) expect(checkRecipeUrl(u)).toEqual({code: 'PRIVATE_HOST'});
  const t0 = performance.now(); const out = extractRecipe('<script'.repeat(140_000), 'evil.example');
  expect(out).toEqual({code: 'NO_RECIPE'}); expect(performance.now() - t0).toBeLessThan(2_000);
});

// Session AC (item 4, the hosted verifier's stage 8): the route answers the verifier's three inputs with 400 and the
// exact code, before any outbound request (the owner's next hosted run reaches this stage once stage 6 passes).
describe('the hosted verifier\'s recipe-import refusals', () => {
  test.each([['http://example.com/recipe', 'NOT_HTTPS'], ['https://127.0.0.1/recipe', 'PRIVATE_HOST'], ['https://example.com/' + 'a'.repeat(2050), 'INVALID_URL']])('%s → 400 %s, nothing fetched', async (url, code) => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    try {
      const response = await POST(new Request('https://alpha.example/api/recipe-import', {method: 'POST', headers: {'content-type': 'application/json', 'cf-connecting-ip': '203.0.113.7'}, body: JSON.stringify({url})}));
      expect(response.status).toBe(400);
      expect(await response.json()).toEqual({error: code});
      expect(response.headers.get('cache-control')).toBe('no-store');
      expect(fetchSpy).not.toHaveBeenCalled();
    } finally { fetchSpy.mockRestore(); }
  });
});

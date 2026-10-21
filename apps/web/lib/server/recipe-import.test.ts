import {describe, expect, test, vi} from 'vitest';
import {checkRecipeUrl, extractRecipe, fetchRecipePage, importRecipe, isRefusal, RECIPE_MAX_BYTES} from './recipe-import';
import {dohResolver, isPublicAddress, RECIPE_RESOLVER} from './recipe-resolve';
import {readFileSync} from 'node:fs';
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
    // Session AF Part 11 A10: the end-to-end call also resolves the host first (a fake public answer here).
    const publicAnswer = async () => ({ok: true as const, addresses: ['93.184.216.34']});
    expect(await importRecipe('https://www.example-recipes.com/soup', fetchOf(() => respond(page(recipe))), publicAnswer)).toMatchObject({name: 'Fictional lentil soup'});
    expect(await importRecipe('https://169.254.169.254/latest/meta-data', fetchOf(() => { throw new Error('must not be called'); }), async () => { throw new Error('the literal is refused before any resolution'); })).toEqual({code: 'PRIVATE_HOST'});
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

// Session AF Part 11 A10 (ADR-028 H71): resolve-then-check. A public name that resolves to a private address is refused
// before the page is fetched; a resolver that cannot answer refuses (fail closed); the literal checks still run first.
describe('DNS rebinding: resolve-then-check', () => {
  const never = fetchOf(() => { throw new Error('the page must not be fetched'); });
  test('a name resolving to a private, loopback, link-local, metadata or mixed answer is refused before any fetch', async () => {
    for (const addresses of [['127.0.0.1'], ['10.1.2.3'], ['169.254.169.254'], ['192.168.0.10'], ['172.20.0.1'], ['100.64.0.1'], ['0.0.0.0'], ['224.0.0.1'], ['93.184.216.34', '10.0.0.1'], ['::1'], ['fd12::1'], ['fe80::1'], ['::ffff:127.0.0.1'], ['::ffff:7f00:1'], ['64:ff9b::a00:1'], ['2001:db8::1'], ['not an address']])
      expect(await importRecipe('https://rebind.example-recipes.com/soup', never, async () => ({ok: true, addresses}))).toEqual({code: 'PRIVATE_HOST'});
  });
  test('a resolver failure refuses, a name with no address is an upstream refusal, and the route answers 502', async () => {
    expect(await importRecipe('https://www.example-recipes.com/soup', never, async () => ({ok: false}))).toEqual({code: 'RESOLVER'});
    expect(await importRecipe('https://www.example-recipes.com/soup', never, async () => ({ok: true, addresses: []}))).toEqual({code: 'UPSTREAM'});
    const route = readFileSync(new URL('../../app/api/recipe-import/route.ts', import.meta.url), 'utf8');
    expect(route).toContain("result.code === 'RESOLVER' ? 502");
  });
  test('public addresses pass; the trailing dot is resolved without it', async () => {
    let asked = '';
    const resolve = async (host: string) => { asked = host; return {ok: true as const, addresses: ['93.184.216.34', '2606:2800:220:1:248:1893:25c8:1946']}; };
    expect(await importRecipe('https://www.example-recipes.com./soup', fetchOf(() => respond(page(recipe))), resolve)).toMatchObject({name: 'Fictional lentil soup'});
    expect(asked).toBe('www.example-recipes.com');
    for (const a of ['8.8.8.8', '1.1.1.1', '2606:4700:4700::1111']) expect(isPublicAddress(a)).toBe(true);
  });
  test('the DoH resolver asks Cloudflare for A and AAAA as JSON and fails closed on any odd answer', async () => {
    const seen: string[] = [];
    const answer = (body: unknown, status = 200) => async (url: string) => { seen.push(url); return new Response(JSON.stringify(body), {status, headers: {'content-type': 'application/dns-json'}}); };
    const ok = await dohResolver(answer({Status: 0, Answer: [{type: 5, data: 'cdn.example.'}, {type: 1, data: '93.184.216.34'}]}))('www.example-recipes.com');
    expect(ok).toEqual({ok: true, addresses: ['93.184.216.34', '93.184.216.34']});
    expect(seen.every(u => u.startsWith(`${RECIPE_RESOLVER}?name=www.example-recipes.com&type=`))).toBe(true);
    expect(await dohResolver(answer({Status: 2}))('x.example-recipes.com')).toEqual({ok: false});           // SERVFAIL
    expect(await dohResolver(answer({}, 500))('x.example-recipes.com')).toEqual({ok: false});
    expect(await dohResolver(async () => { throw new Error('offline'); })('x.example-recipes.com')).toEqual({ok: false});
    expect(await dohResolver(async () => new Response('not json'))('x.example-recipes.com')).toEqual({ok: false});
  });
});

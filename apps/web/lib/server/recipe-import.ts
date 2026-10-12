/**
 * N6, `[TIER 3] (egress/security)`: the recipe URL import. The server fetches ONLY the page the person gave, reads its
 * schema.org Recipe JSON-LD and refuses everything else. Limits: https only; no IP literals, localhost, `.local`,
 * `.internal`, `.localhost`, `.home`, `.lan` or user-info; port 443 only; no redirects (any 3xx is refused, so a page
 * cannot bounce the server to a private address); 8 seconds; 1 MB streamed cap; `text/html` or `application/ld+json`
 * only; a bounded JSON-LD parse (the first Recipe, inside `@graph` too); at most 100 ingredients of 200 characters.
 * Nothing but the recipe's name, ingredients, yield and the count of steps leaves this function. No cookies, no
 * credentials, a fixed user agent, and a per-client limit in the route.
 */
export const RECIPE_FETCH_TIMEOUT_MS = 8_000, RECIPE_MAX_BYTES = 1_000_000, RECIPE_MAX_INGREDIENTS = 100, RECIPE_MAX_TEXT = 200;
export type RecipeImport = {name: string; ingredients: string[]; servings: number | null; steps: number; source: string};
export type RecipeRefusal = {code: 'INVALID_URL' | 'NOT_HTTPS' | 'PRIVATE_HOST' | 'REDIRECT' | 'TOO_LARGE' | 'TIMEOUT' | 'WRONG_TYPE' | 'NO_RECIPE' | 'UPSTREAM'};
const PRIVATE_HOST = /^(localhost|.*\.(local|localhost|internal|home|lan|test|invalid|example))$|^[0-9.]+$|^\[?[0-9a-f:]*:[0-9a-f:]*\]?$/i;
export function checkRecipeUrl(raw: string): URL | RecipeRefusal {
  let url: URL; try { url = new URL(raw.trim()); } catch { return {code: 'INVALID_URL'}; }
  if (url.protocol !== 'https:') return {code: 'NOT_HTTPS'};
  if (url.username || url.password) return {code: 'INVALID_URL'};
  if (url.port && url.port !== '443') return {code: 'PRIVATE_HOST'};
  const host = url.hostname.toLowerCase();
  if (!host.includes('.') || PRIVATE_HOST.test(host) || host.startsWith('[')) return {code: 'PRIVATE_HOST'};
  url.hash = '';
  return url;
}
export const isRefusal = (v: unknown): v is RecipeRefusal => !!v && typeof v === 'object' && 'code' in (v as object) && !('href' in (v as object));
type Fetch = (input: string, init: RequestInit) => Promise<Response>;
export async function fetchRecipePage(url: URL, fetchImpl: Fetch = fetch): Promise<string | RecipeRefusal> {
  const controller = new AbortController(), timer = setTimeout(() => controller.abort(), RECIPE_FETCH_TIMEOUT_MS);
  try {
    const res = await fetchImpl(url.href, {method: 'GET', redirect: 'manual', signal: controller.signal, credentials: 'omit', headers: {accept: 'text/html,application/ld+json;q=0.9', 'user-agent': 'ZIGoals recipe import (reads schema.org Recipe JSON-LD only)'}});
    if (res.status >= 300 && res.status < 400) return {code: 'REDIRECT'};
    if (!res.ok) return {code: 'UPSTREAM'};
    const type = (res.headers.get('content-type') ?? '').toLowerCase();
    if (!type.startsWith('text/html') && !type.startsWith('application/ld+json') && !type.startsWith('application/xhtml+xml')) return {code: 'WRONG_TYPE'};
    const length = Number(res.headers.get('content-length') ?? '0'); if (length > RECIPE_MAX_BYTES) return {code: 'TOO_LARGE'};
    if (!res.body) return {code: 'UPSTREAM'};
    const reader = res.body.getReader(), chunks: Uint8Array[] = []; let total = 0;
    for (;;) { const {done, value} = await reader.read(); if (done) break; total += value.byteLength; if (total > RECIPE_MAX_BYTES) { await reader.cancel(); return {code: 'TOO_LARGE'}; } chunks.push(value); }
    const bytes = new Uint8Array(total); let offset = 0; for (const c of chunks) { bytes.set(c, offset); offset += c.byteLength; }
    return new TextDecoder('utf-8', {fatal: false}).decode(bytes);
  } catch (e) { return {code: (e as Error)?.name === 'AbortError' ? 'TIMEOUT' : 'UPSTREAM'}; }
  finally { clearTimeout(timer); }
}
const text = (v: unknown, max = RECIPE_MAX_TEXT) => typeof v === 'string' ? v.replace(/\s+/g, ' ').trim().slice(0, max) : '';
const isRecipe = (node: unknown): node is Record<string, unknown> => { if (!node || typeof node !== 'object') return false; const t = (node as Record<string, unknown>)['@type']; return t === 'Recipe' || (Array.isArray(t) && t.includes('Recipe')); };
function findRecipe(node: unknown, depth = 0): Record<string, unknown> | null {
  if (depth > 6 || !node || typeof node !== 'object') return null;
  if (isRecipe(node)) return node;
  if (Array.isArray(node)) { for (const n of node.slice(0, 50)) { const r = findRecipe(n, depth + 1); if (r) return r; } return null; }
  const graph = (node as Record<string, unknown>)['@graph']; if (graph) return findRecipe(graph, depth + 1);
  const main = (node as Record<string, unknown>).mainEntity; if (main) return findRecipe(main, depth + 1);
  return null;
}
/** The recipe from a page's JSON-LD blocks: the first `Recipe` found, trimmed to plain strings. */
export function extractRecipe(html: string, source: string): RecipeImport | RecipeRefusal {
  const blocks: string[] = [];
  const re = /<script[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi; let m: RegExpExecArray | null;
  while ((m = re.exec(html)) && blocks.length < 20) blocks.push(m[1]!);
  if (!blocks.length && html.trim().startsWith('{')) blocks.push(html);
  for (const block of blocks) {
    let json: unknown; try { json = JSON.parse(block.trim()); } catch { continue; }
    const r = findRecipe(json); if (!r) continue;
    const name = text(r.name, 100) || 'Imported recipe';
    const raw = Array.isArray(r.recipeIngredient) ? r.recipeIngredient : typeof r.recipeIngredient === 'string' ? [r.recipeIngredient] : [];
    const ingredients = raw.map(i => text(i)).filter(Boolean).slice(0, RECIPE_MAX_INGREDIENTS);
    if (!ingredients.length) continue;
    const y = Array.isArray(r.recipeYield) ? r.recipeYield[0] : r.recipeYield; const yn = typeof y === 'number' ? y : typeof y === 'string' ? Number(/\d+/.exec(y)?.[0]) : NaN;
    const steps = Array.isArray(r.recipeInstructions) ? r.recipeInstructions.length : typeof r.recipeInstructions === 'string' ? r.recipeInstructions.split(/\.\s+/).length : 0;
    return {name, ingredients, servings: Number.isFinite(yn) && yn > 0 && yn <= 100 ? Math.round(yn) : null, steps: Math.min(steps, 100), source: new URL(source).hostname};
  }
  return {code: 'NO_RECIPE'};
}
export async function importRecipe(raw: string, fetchImpl: Fetch = fetch): Promise<RecipeImport | RecipeRefusal> {
  const url = checkRecipeUrl(raw); if (isRefusal(url)) return url;
  const page = await fetchRecipePage(url, fetchImpl); if (isRefusal(page)) return page;
  return extractRecipe(page, url.href);
}

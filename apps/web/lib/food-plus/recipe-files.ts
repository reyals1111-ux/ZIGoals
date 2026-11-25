import {fromRecipeParts, parseRecipeText, type ParsedRecipe} from '../health-aa/recipe-text';
import {readZip, ZipError, type ZipCaps} from '../notes/zip-read';

/**
 * Session AW (X5, LEDGER #453; recipe files from other apps): a recipe file read on this device into the same confirmable
 * list as pasted text (lib/health-aa/recipe-text.ts), every ingredient checked by the person before anything is saved.
 * - Paprika's own export, `.paprikarecipes`: a ZIP archive of `.paprikarecipe` entries, each a gzip-compressed JSON
 *   recipe. The archive is read under the ZIP caps (lib/notes/zip-read.ts `readZip`: sizes, entry count, ratio, CRC,
 *   unsafe names skipped) and each entry is unpacked with the browser's own `DecompressionStream('gzip')`, stopped the
 *   moment it passes its cap. One `.paprikarecipe` alone is read the same way. Photos inside (`photo_data`, `photos`) are
 *   left out; the name, the servings, the ingredient lines, the directions and the person's rating are read.
 * - A Markdown or plain-text recipe (`.md`, `.markdown`, `.txt`): its Markdown marks are taken off (headings, list
 *   marks, bold and links) and the text is read as pasted text is.
 * Nothing in a file runs: only text is read out of it, and JSON is parsed as data. No package; nothing is sent.
 */
export type FileRecipe = ParsedRecipe & {stars?: number};
export type FileRead = {recipes: FileRecipe[]; skipped: string[]; photosLeftOut: number};
/** The archive's caps: a Paprika export can carry photos, so an entry may be larger than a note (8 MB, 60 MB in all). */
export const RECIPE_ZIP_CAPS: ZipCaps = {maxArchive: 40 * 1024 * 1024, maxEntries: 2000, maxFile: 8 * 1024 * 1024, maxTotal: 60 * 1024 * 1024, maxRatio: 100};
/** Each recipe's JSON once unpacked (with its photo, before it is left out). */
export const MAX_RECIPE_JSON = 12 * 1024 * 1024, MAX_TEXT_FILE = 1024 * 1024, MAX_FILE_RECIPES = 200;
export const RECIPE_FILE_ACCEPT = '.paprikarecipes,.paprikarecipe,.md,.markdown,.txt,text/plain,text/markdown';
export type RecipeFileKind = 'paprika-archive' | 'paprika-one' | 'text';
export function recipeFileKind(name: string): RecipeFileKind | null {
  const n = name.toLowerCase();
  if (n.endsWith('.paprikarecipes')) return 'paprika-archive';
  if (n.endsWith('.paprikarecipe')) return 'paprika-one';
  return /\.(?:md|markdown|txt|text)$/.test(n) ? 'text' : null;
}
export class RecipeFileError extends Error {}

/** Unpacks gzip bytes with the platform's DecompressionStream, refusing past `max` bytes of output. */
export async function gunzip(bytes: Uint8Array, max: number): Promise<Uint8Array> {
  if (typeof DecompressionStream === 'undefined') throw new RecipeFileError('This browser cannot open compressed recipe files.');
  const reader = new Blob([bytes as BlobPart]).stream().pipeThrough(new DecompressionStream('gzip')).getReader(), parts: Uint8Array[] = [];
  let total = 0;
  try {
    for (;;) {
      const {done, value} = await reader.read();
      if (done) break;
      total += value.length;
      if (total > max) { await reader.cancel().catch(() => undefined); throw new RecipeFileError('larger than ZIGoals reads'); }
      parts.push(value);
    }
  } catch (e) { if (e instanceof RecipeFileError) throw e; throw new RecipeFileError('damaged'); }
  const out = new Uint8Array(total); let at = 0; for (const p of parts) { out.set(p, at); at += p.length; }
  return out;
}
const isGzip = (b: Uint8Array) => b.length > 2 && b[0] === 0x1f && b[1] === 0x8b;
const text = (b: Uint8Array) => new TextDecoder('utf-8').decode(b).replace(/^﻿/, '');
const str = (v: unknown, max: number) => typeof v === 'string' ? v.slice(0, max) : '';
/** Paprika's servings ("4", "4 servings", "Serves 6", "2-3"): the first whole number from 1 to 100, else unknown. */
export function servingsOf(raw: unknown): number | null {
  const m = /(\d{1,3})/.exec(typeof raw === 'number' ? String(raw) : str(raw, 80));
  const n = m ? Number(m[1]) : NaN;
  return n >= 1 && n <= 100 ? n : null;
}
/** One Paprika recipe (its JSON, as data) into the confirmable list; null when it holds no recipe. */
export function fromPaprikaJson(json: unknown): {recipe: FileRecipe; photos: number} | null {
  if (!json || typeof json !== 'object' || Array.isArray(json)) return null;
  const o = json as Record<string, unknown>, name = str(o.name, 200).trim();
  const ingredientLines = str(o.ingredients, 50_000).split(/\r?\n/), methodLines = str(o.directions, 100_000).split(/\r?\n/);
  if (!name && !ingredientLines.some(l => l.trim())) return null;
  const parsed = fromRecipeParts({title: name || 'Imported recipe', servings: servingsOf(o.servings), ingredientLines, methodLines});
  const rating = typeof o.rating === 'number' && Number.isInteger(o.rating) && o.rating >= 1 && o.rating <= 5 ? o.rating : undefined;
  const photos = (typeof o.photo_data === 'string' && o.photo_data ? 1 : 0) + (Array.isArray(o.photos) ? o.photos.length : 0);
  return {recipe: {...parsed, ...(rating ? {stars: rating} : {})}, photos};
}
/** Markdown's marks off, so the text reads as pasted text: "## Ingredients" → "Ingredients", "- 200 g rice" → "200 g rice". */
export function markdownToText(md: string): string {
  return md.replace(/\r\n?/g, '\n').split('\n').map(line => line
    .replace(/^\s{0,3}#{1,6}\s+/, '')
    .replace(/^\s*>\s?/, '')
    .replace(/^\s*[-*+]\s+\[[ xX]\]\s+/, '')
    .replace(/^\s*[-*+]\s+/, '')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/(\*\*|__)(.+?)\1/g, '$2')
    .replace(/(^|[^\w*])\*(?!\s)([^*]+)\*(?!\w)/g, '$1$2')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/^\s*(?:-{3,}|\*{3,}|_{3,})\s*$/, '')
    .trimEnd()).join('\n');
}
/** A recipe file into the recipes it holds (at most 200), what was left aside and why, and how many photos were left out. */
export async function readRecipeFile(name: string, bytes: Uint8Array): Promise<FileRead> {
  const kind = recipeFileKind(name);
  if (!kind) throw new RecipeFileError('Choose a .paprikarecipes export, a .paprikarecipe, or a Markdown or text recipe (.md, .txt).');
  if (kind === 'text') {
    if (bytes.length > MAX_TEXT_FILE) throw new RecipeFileError('This text file is over 1 MB. Choose a smaller one.');
    const body = markdownToText(text(bytes));
    if (!body.trim()) throw new RecipeFileError('This file holds no text to read.');
    const parsed = parseRecipeText(body);
    return {recipes: [parsed.title === 'Pasted recipe' ? {...parsed, title: name.replace(/\.[^.]+$/, '').slice(0, 100) || 'Imported recipe'} : parsed], skipped: [], photosLeftOut: 0};
  }
  const one = async (data: Uint8Array): Promise<{recipe: FileRecipe; photos: number} | null> => {
    const raw = isGzip(data) ? await gunzip(data, MAX_RECIPE_JSON) : data.length <= MAX_RECIPE_JSON ? data : (() => { throw new RecipeFileError('larger than ZIGoals reads'); })();
    let json: unknown;
    try { json = JSON.parse(text(raw)); } catch { throw new RecipeFileError('not a recipe ZIGoals can read'); }
    return fromPaprikaJson(json);
  };
  if (kind === 'paprika-one') {
    let read: Awaited<ReturnType<typeof one>>;
    try { read = await one(bytes); } catch (e) { throw new RecipeFileError(e instanceof RecipeFileError && e.message === 'larger than ZIGoals reads' ? 'This recipe file is larger than ZIGoals reads.' : 'This recipe file could not be read. It may be damaged.'); }
    if (!read) throw new RecipeFileError('This file holds no recipe.');
    return {recipes: [read.recipe], skipped: [], photosLeftOut: read.photos};
  }
  let files, zipSkipped;
  try { ({files, skipped: zipSkipped} = await readZip(bytes, n => n.toLowerCase().endsWith('.paprikarecipe'), {caps: RECIPE_ZIP_CAPS})); }
  catch (e) { throw new RecipeFileError(e instanceof ZipError ? e.message.replace('ZIP archive', 'recipe export').replace('This ZIP', 'This export') : 'This export could not be read.'); }
  const recipes: FileRecipe[] = [], skipped: string[] = zipSkipped.map(z => `${z.name.replace(/^.*\//, '')}: ${z.reason}`);
  let photosLeftOut = 0;
  for (const f of files) {
    const label = f.name.replace(/^.*\//, '').replace(/\.paprikarecipe$/i, '');
    if (recipes.length >= MAX_FILE_RECIPES) { skipped.push(`${label}: more than ${MAX_FILE_RECIPES} recipes in one file`); continue; }
    try { const read = await one(f.data); if (read) { recipes.push(read.recipe); photosLeftOut += read.photos; } else skipped.push(`${label}: no recipe in it`); }
    catch (e) { skipped.push(`${label}: ${e instanceof RecipeFileError ? e.message : 'damaged'}`); }
  }
  if (!recipes.length && !skipped.length) throw new RecipeFileError('This export holds no recipe.');
  return {recipes, skipped, photosLeftOut};
}

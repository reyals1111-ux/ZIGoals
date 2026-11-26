'use client';
import {useState} from 'react';
import {NebulaFlow} from '../nebula-flow';
import {fromSchemaRecipe, parseRecipeText, type ParsedIngredient, type ParsedRecipe} from '../../lib/health-aa/recipe-text';
import {newHealthId, removeHealthItem, saveFood, saveRecipe, type HealthData, type HealthFood} from '../../lib/health';
import {readFormNumber} from '../../lib/decimal-input';
import type {HealthPerform} from './aa-types';
import './health-aa.css';
import { plural } from '../../lib/plural';
import {foodLine, matchIngredient, type IngredientMatch} from '../../lib/health-aa/recipe-match';
import {libraryFoodsFor, type LibraryFood} from '../../lib/food-plus/recipe-library';
import {FOOD_PLUS} from '../../lib/food-plus/schema';
import {setRecipeSteps} from '../../lib/food-plus/steps';
import {useDeviceRecord} from '../ai/use-device-record';
import {HEALTH_VITAMINS} from '../../lib/health-vitamins/schema';
import {NUTRIENT_EXTRAS_RECORD} from '../../lib/health-vitamins/extras';
import {hasLibraryExtras, keepLibraryExtras} from '../../lib/food-plus/library-extras';
import {setStars} from '../../lib/food-plus/made';
import type {FileRead, FileRecipe} from '../../lib/food-plus/recipe-files';

// Session AK (task 4.8): each row shows its match (exact, close or none) and the person can point it at any of their foods
// or make it a new one; a row the person pointed stays put while its name is edited, others follow the name.
// Session AV lane 2 (food, LEDGER #87, #95, #104; MyFitnessPal, Cronometer and MacroFactor's recipe importers): a row with
// none of the person's foods is matched to the offline food library instead of being saved with its nutrition unknown;
// `lib` is the chosen library food (an index into `libraryOptions`), saved per 100 g as the words-match flow does.
type Row = ParsedIngredient & {foodId: string; newId: string; gramsText: string; existing: HealthFood | null; keep: boolean; match: IngredientMatch; chosen: boolean; libraryOptions: LibraryFood[] | 'loading' | null; lib: number | null};
const CODES: Record<string, string> = {INVALID_URL: 'That is not a web address the import can read.', NOT_HTTPS: 'Only https addresses are read.', PRIVATE_HOST: 'That address is not a public website.', REDIRECT: 'That page redirects, which the import never follows.', TOO_LARGE: 'That page is too large to read (1 MB).', TIMEOUT: 'That site did not answer in time.', WRONG_TYPE: 'That address is not a web page.', NO_RECIPE: 'No recipe data on that page (it needs schema.org Recipe JSON-LD). Paste the recipe text instead.', UPSTREAM: 'That site could not be reached.', TRY_LATER: 'Too many imports just now; try again in a minute.'};
/**
 * N6: basic recipe import. Paste recipe text (parsed on the device) or give a URL (the server reads only that page's
 * schema.org Recipe JSON-LD, ADR-022 B8). Either way the ingredients come back as rows the person confirms: each row
 * becomes a food (an existing food with the same name is reused; nutrition stays whatever that food holds, never
 * guessed) and the recipe is saved with those foods. Nothing is written before Save.
 */
export function RecipeImport({data, perform}: {data: HealthData; perform: HealthPerform}) {
  const steps = useDeviceRecord(FOOD_PLUS); // Session AV lane 2 (food, LEDGER #200): the method, kept with the saved recipe
  // Session AV lane 2 (food, LEDGER #93): a library food keeps the vitamins and extras the library carries.
  const vitaminRecord = useDeviceRecord(HEALTH_VITAMINS), extrasRecord = useDeviceRecord(NUTRIENT_EXTRAS_RECORD);
  // Session AW (X5, LEDGER #453): a recipe file from another app (Paprika's .paprikarecipes, Markdown or text), its
  // recipes listed first, each checked line by line as pasted text is, and the last one saved can be undone.
  const [file, setFile] = useState<(FileRead & {fileName: string; saved: number[]}) | null>(null), [fileAt, setFileAt] = useState<number | null>(null), [lastSaved, setLastSaved] = useState<{recipeId: string; foodIds: string[]; name: string; fileIndex: number | null} | null>(null);
  const [mode, setMode] = useState<'paste' | 'url' | 'file'>('paste'), [text, setText] = useState(''), [url, setUrl] = useState(''), [busy, setBusy] = useState(false), [error, setError] = useState('');
  const [parsed, setParsed] = useState<ParsedRecipe | null>(null), [rows, setRows] = useState<Row[]>([]), [title, setTitle] = useState(''), [servings, setServings] = useState('4');
  async function fromFile(chosen: File | undefined) {
    if (!chosen) return;
    setBusy(true); setError(''); setFile(null); setLastSaved(null);
    try {
      const {readRecipeFile, recipeFileKind, RECIPE_ZIP_CAPS} = await import('../../lib/food-plus/recipe-files');
      if (!recipeFileKind(chosen.name)) { setError('Choose a .paprikarecipes export, a .paprikarecipe, or a Markdown or text recipe (.md, .txt).'); return; }
      if (chosen.size > RECIPE_ZIP_CAPS.maxArchive) { setError(`This file is over ${Math.round(RECIPE_ZIP_CAPS.maxArchive / 1024 / 1024)} MB. Choose a smaller one.`); return; }
      const read = await readRecipeFile(chosen.name, new Uint8Array(await chosen.arrayBuffer()));
      if (!read.recipes.length) { setError(`No recipe could be read from ${chosen.name}.${read.skipped.length ? ` Left aside: ${read.skipped.slice(0, 5).join('; ')}.` : ''}`); return; }
      if (read.recipes.length === 1 && !read.skipped.length) { setFile({...read, fileName: chosen.name, saved: []}); setFileAt(0); show(read.recipes[0]!); return; }
      setFile({...read, fileName: chosen.name, saved: []});
    } catch (e) { setError(e instanceof Error && e.message ? e.message : 'This file could not be read.'); }
    finally { setBusy(false); }
  }
  function undoLast() {
    if (!lastSaved) return;
    const {recipeId, foodIds, name, fileIndex} = lastSaved;
    void perform(latest => { let next = latest.recipes.some(r => r.id === recipeId) ? removeHealthItem(latest, 'recipes', recipeId) : latest; for (const f of foodIds) if (next.foods.some(x => x.id === f) && !next.recipes.some(r => r.ingredients.some(i => i.foodId === f)) && !next.diary.some(d => d.sourceId === f)) next = removeHealthItem(next, 'foods', f); return next; }, `“${name}” taken out again, with the foods it added.`, () => {
      try { steps.update(r => setStars(setRecipeSteps(r, recipeId, []), recipeId, null)); } catch { /* the recipe is gone; its method is never read without it */ }
      setLastSaved(null); if (fileIndex !== null) setFile(f => f ? {...f, saved: f.saved.filter(i => i !== fileIndex)} : f);
    });
  }
  function show(p: ParsedRecipe) {
    setParsed(p); setTitle(p.title); setServings(String(p.servings ?? 4)); setError('');
    const first: Row[] = p.ingredients.map(i => { const match = matchIngredient(i.name, data.foods), e = match.food, newId = newHealthId(); return {...i, foodId: e?.id ?? newId, newId, gramsText: i.grams !== null ? String(i.grams) : e?.servingGrams ? String(e.servingGrams) : '', existing: e, keep: true, match, chosen: false, libraryOptions: e ? null : 'loading', lib: null}; });
    setRows(first);
    first.forEach((r, i) => { if (!r.existing) lookUp(i, r); });
  }
  /** The offline library's closest foods for a row with none of the person's own (the first is chosen, to check). */
  function lookUp(index: number, row: Pick<ParsedIngredient, 'name' | 'quantity' | 'unit' | 'grams'>) {
    const name = row.name;
    void libraryFoodsFor(row).then(options => setRows(cur => cur.map((x, j) => j !== index || x.name !== name || x.existing ? x : {...x, libraryOptions: options, lib: x.chosen && x.lib === null ? null : options.length ? 0 : null, gramsText: x.gramsText || (options[0]?.portionGrams ? String(options[0].portionGrams) : '')})),
      () => setRows(cur => cur.map((x, j) => j === index && x.name === name ? {...x, libraryOptions: null} : x)));
  }
  async function fromUrl() {
    setBusy(true); setError('');
    try { const res = await fetch('/api/recipe-import', {method: 'POST', headers: {'content-type': 'application/json'}, body: JSON.stringify({url})}); const body = await res.json() as {error?: string; name?: string; ingredients?: string[]; servings?: number | null; instructions?: unknown[]}; if (!res.ok || body.error) { setError(CODES[body.error ?? ''] ?? 'The page could not be read.'); return; } show(fromSchemaRecipe({name: body.name!, ingredients: body.ingredients!, servings: body.servings ?? null, instructions: Array.isArray(body.instructions) ? body.instructions.filter((s): s is string => typeof s === 'string') : []})); }
    catch { setError('The page could not be read.'); } finally { setBusy(false); }
  }
  function save() {
    const kept = rows.filter(r => r.keep); if (!kept.length) { setError('Keep at least one ingredient.'); return; }
    let portions: number; try { portions = readFormNumber(servings, {min: 0.001, max: 1000}); } catch { setError('Servings: enter how many servings the recipe makes, from 0.001 to 1,000.'); return; }
    const at = new Date().toISOString(), recipeId = newHealthId(), method = parsed?.stepLines ?? [], created: string[] = [], stars = (parsed as FileRecipe | null)?.stars, fileIndex = file ? fileAt : null, savedName = title.trim().slice(0, 80) || 'Imported recipe';
    void perform(latest => {
      let next = latest; created.length = 0;
      const ingredients = kept.map(r => {
        let grams: number; try { grams = r.gramsText.trim() ? readFormNumber(r.gramsText, {min: 1, max: 100_000, whole: true}) : 100; } catch { grams = 100; }
        const lib = !r.existing && r.lib !== null && Array.isArray(r.libraryOptions) ? r.libraryOptions[r.lib] ?? null : null;
        if (!next.foods.some(f => f.id === r.foodId)) created.push(r.foodId);
        if (!next.foods.some(f => f.id === r.foodId)) next = lib
          ? saveFood(next, {id: r.foodId, name: lib.name.slice(0, 120), brand: lib.sourceName.slice(0, 80), servingGrams: 100, nutrients: lib.nutrients, createdAt: at, updatedAt: at})
          : saveFood(next, {id: r.foodId, name: r.name.slice(0, 80), brand: 'Imported recipe', servingGrams: grams, nutrients: {kcal: null, proteinMg: null, carbsMg: null, fatMg: null}, createdAt: at, updatedAt: at});
        const food = next.foods.find(f => f.id === r.foodId)!;
        const quantityMilli = food.servingGrams ? Math.max(1, Math.round(grams / food.servingGrams * 1000)) : 1000;
        return {foodId: r.foodId, quantityMilli};
      });
      next = saveRecipe(next, {id: recipeId, name: title.trim().slice(0, 80) || "Imported recipe", portionsMilli: Math.round(portions * 1000), items: ingredients}, at);
      return next;
    }, `Recipe "${title.trim() || 'Imported recipe'}" saved with ${kept.length} ${plural(kept.length, 'ingredient')}${(() => { const fromLib = kept.filter(r => !r.existing && r.lib !== null).length; return fromLib ? `, ${fromLib} from the offline food library` : ''; })()}. Foods without a label stay unknown until you fill them in.`, () => { if (method.length) { try { steps.update(r => setRecipeSteps(r, recipeId, method)); } catch { /* the recipe is saved; only its method is not kept */ } }
      for (const r of kept) { const lib = !r.existing && r.lib !== null && Array.isArray(r.libraryOptions) ? r.libraryOptions[r.lib] : undefined; if (!lib || !hasLibraryExtras(lib.extras)) continue; try { const both = keepLibraryExtras({vitamins: vitaminRecord.data, extras: extrasRecord.data}, r.foodId, lib.extras, data.diary.map(d => d.id)); vitaminRecord.update(() => both.vitamins); extrasRecord.update(() => both.extras); } catch { /* the food keeps its label values */ } }
      // Session AW (X5, LEDGER #453): the file's rating becomes the recipe's stars (the person's own, changed any time).
      if (stars) { try { steps.update(r => setStars(r, recipeId, stars)); } catch { /* the recipe is saved without its stars */ } }
      setLastSaved({recipeId, foodIds: [...created], name: savedName, fileIndex});
      if (fileIndex !== null) setFile(f => f ? {...f, saved: [...new Set([...f.saved, fileIndex])]} : f);
      setFileAt(null); setParsed(null); setRows([]); setText(''); setUrl(''); });
  }
  return <section className="panel health-aa-card" aria-labelledby="recipe-import-title">
    <p className="eyebrow">From text or a page</p><h2 id="recipe-import-title"><NebulaFlow identity="recipe-import-title">Import a recipe</NebulaFlow></h2>
    {!parsed ? <>
      <div className="health-import-tabs" role="group" aria-label="Import from"><button type="button" className="quiet" aria-pressed={mode === 'paste'} onClick={() => setMode('paste')}>Paste text</button><button type="button" className="quiet" aria-pressed={mode === 'url'} onClick={() => setMode('url')}>A web address</button><button type="button" className="quiet" aria-pressed={mode === 'file'} onClick={() => setMode('file')}>A recipe file</button></div>
      {mode === 'file' ? <div className="health-import-form"><label className="field"><span>Recipe file (.paprikarecipes, .paprikarecipe, .md or .txt)</span><input type="file" accept=".paprikarecipes,.paprikarecipe,.md,.markdown,.txt,text/plain,text/markdown" disabled={busy} onChange={e => { const f = e.target.files?.[0]; e.target.value = ''; void fromFile(f); }} /></label><p className="fine">{busy ? 'Reading the file…' : 'From Paprika (Export → Paprika Recipe Format) or a Markdown or text recipe. Read on this device; nothing in the file runs, photos inside are left out, and every ingredient is checked by you before it is saved.'}</p>
        {file && <div className="food-plus-file"><p className="fine" role="status">{file.fileName}: {file.recipes.length} {plural(file.recipes.length, 'recipe')}{file.saved.length ? `, ${file.saved.length} saved` : ''}{file.photosLeftOut ? `; ${file.photosLeftOut} ${plural(file.photosLeftOut, 'photo')} left out` : ''}. Check and save each one you want.</p>
          <ul className="food-plus-file-list" aria-label={`Recipes in ${file.fileName}`}>{file.recipes.map((r, i) => <li key={i}><span><strong>{r.title}</strong> <small>{r.ingredients.length} {plural(r.ingredients.length, 'ingredient')}{r.stepLines?.length ? ` · ${r.stepLines.length} ${plural(r.stepLines.length, 'step')}` : ''}{r.stars ? ` · ${r.stars} ${plural(r.stars, 'star')}` : ''}</small></span>{file.saved.includes(i) ? <small>Saved</small> : <button type="button" className="secondary" aria-label={`Check and save ${r.title}`} disabled={!r.ingredients.length} onClick={() => { setFileAt(i); show(r); }}>{r.ingredients.length ? 'Check and save' : 'No ingredients'}</button>}</li>)}</ul>
          {file.skipped.length > 0 && <details><summary className="fine">Left aside ({file.skipped.length})</summary><ul className="fine">{file.skipped.slice(0, 50).map((s, i) => <li key={i}>{s}</li>)}</ul></details>}
        </div>}
      </div> : mode === 'paste' ? <form className="health-import-form" aria-label="Paste a recipe" onSubmit={e => { e.preventDefault(); if (text.trim()) show(parseRecipeText(text)); }}><label className="field"><span>Recipe text</span><textarea value={text} onChange={e => setText(e.target.value)} placeholder={'Lentil soup\nServes 4\n\nIngredients\n200 g red lentils\n1 onion\n…'} maxLength={20_000} /></label><div className="actions"><button type="submit" className="secondary" disabled={!text.trim()}>Read the ingredients</button></div><p className="fine">Read on this device; nothing is sent anywhere.</p></form>
        : <form className="health-import-form" aria-label="Import from a web address" onSubmit={e => { e.preventDefault(); if (url.trim()) void fromUrl(); }}><label className="field"><span>Address (https)</span><input type="url" inputMode="url" value={url} onChange={e => setUrl(e.target.value)} placeholder="https://…" maxLength={2048} /></label><div className="actions"><button type="submit" className="secondary" disabled={busy || !url.trim()}>{busy ? 'Reading…' : 'Read the page'}</button></div><p className="fine">The server fetches only that page and reads its recipe data; it follows no links and keeps nothing.</p></form>}
      {error && <p role="alert">{error}</p>}
      {lastSaved && <p className="fine" role="status">“{lastSaved.name}” is in your recipes. <button type="button" className="quiet" onClick={undoLast}>Undo this import</button></p>}
    </> : <form className="health-import-form" aria-label="Confirm the recipe" onSubmit={e => { e.preventDefault(); save(); }}>
      <label className="field"><span>Recipe name</span><input type="text" value={title} maxLength={80} onChange={e => setTitle(e.target.value)} /></label>
      <label className="field"><span>Servings</span><input type="text" inputMode="decimal" value={servings} onChange={e => setServings(e.target.value)} /></label>
      {rows.length ? <p className="fine">{rows.length} {plural(rows.length, 'ingredient')} found{parsed.stepLines?.length ? `, ${parsed.stepLines.length} ${plural(parsed.stepLines.length, 'step')} kept for the cooking view` : parsed.steps ? `, ${parsed.steps} ${plural(parsed.steps, 'step')} left aside` : ''}. Check each name and amount; an existing food of the same name is reused.</p> : <p role="alert">No ingredient lines were found. Put one ingredient on each line, with its amount (“200 g lentils” or “Lentils, 200 g”), then read it again.</p>}
      <ul className="health-import-rows">{rows.map((r, i) => <li key={i}><input type="text" aria-label={`Ingredient ${i + 1} name`} value={r.name} maxLength={80} onChange={e => setRows(rows.map((x, j) => { if (j !== i) return x; const name = e.target.value; if (x.chosen) return {...x, name}; const match = matchIngredient(name, data.foods); const next = {...x, name, match, existing: match.food, foodId: match.food?.id ?? x.newId, libraryOptions: match.food ? null : 'loading' as const, lib: null}; if (!match.food) lookUp(i, next); return next; }))} /><input type="text" inputMode="numeric" aria-label={`Ingredient ${i + 1} grams`} placeholder="g" value={r.gramsText} onChange={e => setRows(rows.map((x, j) => j === i ? {...x, gramsText: e.target.value} : x))} /><small>{r.existing ? 'known' : r.lib !== null && Array.isArray(r.libraryOptions) ? 'library' : 'new food'}</small><MatchLine row={r} index={i} foods={data.foods} onPick={id => setRows(rows.map((x, j) => { if (j !== i) return x; if (id?.startsWith('lib:')) { const k = Number(id.slice(4)), o = Array.isArray(x.libraryOptions) ? x.libraryOptions[k] : undefined; return {...x, chosen: true, existing: null, foodId: x.newId, lib: o ? k : null, gramsText: x.gramsText || (o?.portionGrams ? String(o.portionGrams) : '')}; } const food = id ? data.foods.find(f => f.id === id) ?? null : null; return {...x, chosen: true, existing: food, foodId: food?.id ?? x.newId, lib: null, gramsText: x.gramsText || (food?.servingGrams ? String(food.servingGrams) : '')}; }))} /><button type="button" className="quiet" aria-label={`${r.keep ? 'Drop' : 'Keep'} ingredient ${i + 1}`} aria-pressed={!r.keep} onClick={() => setRows(rows.map((x, j) => j === i ? {...x, keep: !x.keep} : x))}>{r.keep ? 'Drop' : 'Keep'}</button></li>)}</ul>
      <div className="actions"><button type="submit" className="primary" disabled={!rows.some(r => r.keep)}>Save recipe</button><button type="button" className="quiet" onClick={() => { setParsed(null); setRows([]); setFileAt(null); }}>{file && file.recipes.length > 1 ? 'Back to the file' : 'Cancel'}</button></div>
      {error && <p role="alert">{error}</p>}
    </form>}
  </section>;
}
/** Session AK (task 4.8): what an ingredient line will become: the matched food (with its calories), or a new food whose
 *  nutrition stays unknown; the picker offers the closest of the person's foods first, then all of them. */
function MatchLine({row, index, foods, onPick}: {row: Row; index: number; foods: readonly HealthFood[]; onPick: (foodId: string | null) => void}) {
  const how = row.chosen ? 'chosen' : row.existing ? row.match.how : 'none', lib = !row.existing && row.lib !== null && Array.isArray(row.libraryOptions) ? row.libraryOptions[row.lib] ?? null : null;
  const others = foods.filter(f => !row.match.candidates.some(c => c.id === f.id)).slice(0, 300);
  return <span className="health-import-match" style={{gridColumn: '1 / -1', display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center'}}>
    <small>{row.raw !== row.name ? `“${row.raw}” · ` : ''}{row.existing ? `${how === 'exact' ? 'Matches' : how === 'close' ? 'Close match, check it:' : 'Uses'} your food ${row.existing.name} (${foodLine(row.existing)})` : lib ? `From the offline food library, check it: ${lib.name} (${lib.kcalPer100g === null ? 'calories unknown' : `${lib.kcalPer100g} kcal`} per 100 g, ${lib.sourceName})` : row.libraryOptions === 'loading' ? 'Looking in the offline food library…' : 'A new food: its nutrition stays unknown until you fill it in'}</small>
    <select aria-label={`Food for ingredient ${index + 1}`} style={{minHeight: 44}} value={row.existing?.id ?? (lib ? `lib:${row.lib}` : '')} onChange={e => onPick(e.target.value || null)}>
      <option value="">A new food (nutrition unknown)</option>
      {Array.isArray(row.libraryOptions) && row.libraryOptions.length > 0 && <optgroup label="From the offline food library">{row.libraryOptions.map((o, k) => <option key={`lib-${k}`} value={`lib:${k}`}>{o.name}</option>)}</optgroup>}
      {row.match.candidates.length > 0 && <optgroup label="Closest">{row.match.candidates.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}</optgroup>}
      {others.length > 0 && <optgroup label="All my foods">{others.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}</optgroup>}
    </select>
  </span>;
}

'use client';
import {useState} from 'react';
import {NebulaFlow} from '../nebula-flow';
import {fromSchemaRecipe, parseRecipeText, type ParsedIngredient, type ParsedRecipe} from '../../lib/health-aa/recipe-text';
import {newHealthId, saveFood, saveRecipe, type HealthData, type HealthFood} from '../../lib/health';
import {readFormNumber} from '../../lib/decimal-input';
import type {HealthPerform} from './aa-types';
import './health-aa.css';
import { plural } from '../../lib/plural';

type Row = ParsedIngredient & {foodId: string; gramsText: string; existing: HealthFood | null; keep: boolean};
const CODES: Record<string, string> = {INVALID_URL: 'That is not a web address the import can read.', NOT_HTTPS: 'Only https addresses are read.', PRIVATE_HOST: 'That address is not a public website.', REDIRECT: 'That page redirects, which the import never follows.', TOO_LARGE: 'That page is too large to read (1 MB).', TIMEOUT: 'That site did not answer in time.', WRONG_TYPE: 'That address is not a web page.', NO_RECIPE: 'No recipe data on that page (it needs schema.org Recipe JSON-LD). Paste the recipe text instead.', UPSTREAM: 'That site could not be reached.', TRY_LATER: 'Too many imports just now; try again in a minute.'};
/**
 * N6: basic recipe import. Paste recipe text (parsed on the device) or give a URL (the server reads only that page's
 * schema.org Recipe JSON-LD, ADR-022 B8). Either way the ingredients come back as rows the person confirms: each row
 * becomes a food (an existing food with the same name is reused; nutrition stays whatever that food holds, never
 * guessed) and the recipe is saved with those foods. Nothing is written before Save.
 */
export function RecipeImport({data, perform}: {data: HealthData; perform: HealthPerform}) {
  const [mode, setMode] = useState<'paste' | 'url'>('paste'), [text, setText] = useState(''), [url, setUrl] = useState(''), [busy, setBusy] = useState(false), [error, setError] = useState('');
  const [parsed, setParsed] = useState<ParsedRecipe | null>(null), [rows, setRows] = useState<Row[]>([]), [title, setTitle] = useState(''), [servings, setServings] = useState('4');
  function show(p: ParsedRecipe) {
    const existing = (name: string) => data.foods.find(f => f.name.toLowerCase() === name.toLowerCase()) ?? null;
    setParsed(p); setTitle(p.title); setServings(String(p.servings ?? 4)); setError('');
    setRows(p.ingredients.map(i => { const e = existing(i.name); return {...i, foodId: e?.id ?? newHealthId(), gramsText: i.grams !== null ? String(i.grams) : e?.servingGrams ? String(e.servingGrams) : '', existing: e, keep: true}; }));
  }
  async function fromUrl() {
    setBusy(true); setError('');
    try { const res = await fetch('/api/recipe-import', {method: 'POST', headers: {'content-type': 'application/json'}, body: JSON.stringify({url})}); const body = await res.json() as {error?: string; name?: string; ingredients?: string[]; servings?: number | null}; if (!res.ok || body.error) { setError(CODES[body.error ?? ''] ?? 'The page could not be read.'); return; } show(fromSchemaRecipe({name: body.name!, ingredients: body.ingredients!, servings: body.servings ?? null})); }
    catch { setError('The page could not be read.'); } finally { setBusy(false); }
  }
  function save() {
    const kept = rows.filter(r => r.keep); if (!kept.length) { setError('Keep at least one ingredient.'); return; }
    let portions: number; try { portions = readFormNumber(servings, {min: 0.001, max: 1000}); } catch { setError('Servings: a number from 0.001 to 1000.'); return; }
    const at = new Date().toISOString();
    void perform(latest => {
      let next = latest;
      const ingredients = kept.map(r => {
        let grams: number; try { grams = r.gramsText.trim() ? readFormNumber(r.gramsText, {min: 1, max: 100_000, whole: true}) : 100; } catch { grams = 100; }
        if (!next.foods.some(f => f.id === r.foodId)) next = saveFood(next, {id: r.foodId, name: r.name.slice(0, 80), brand: 'Imported recipe', servingGrams: grams, nutrients: {kcal: null, proteinMg: null, carbsMg: null, fatMg: null}, createdAt: at, updatedAt: at});
        const food = next.foods.find(f => f.id === r.foodId)!;
        const quantityMilli = food.servingGrams ? Math.max(1, Math.round(grams / food.servingGrams * 1000)) : 1000;
        return {foodId: r.foodId, quantityMilli};
      });
      next = saveRecipe(next, {id: newHealthId(), name: title.trim().slice(0, 80) || "Imported recipe", portionsMilli: Math.round(portions * 1000), items: ingredients}, at);
      return next;
    }, `Recipe "${title.trim() || 'Imported recipe'}" saved with ${kept.length} ${plural(kept.length, 'ingredient')}. Foods without a label stay unknown until you fill them in.`, () => { setParsed(null); setRows([]); setText(''); setUrl(''); });
  }
  return <section className="panel health-aa-card" aria-labelledby="recipe-import-title">
    <p className="eyebrow">From text or a page</p><h2 id="recipe-import-title"><NebulaFlow identity="recipe-import-title">Import a recipe</NebulaFlow></h2>
    {!parsed ? <>
      <div className="health-import-tabs" role="group" aria-label="Import from"><button type="button" className="quiet" aria-pressed={mode === 'paste'} onClick={() => setMode('paste')}>Paste text</button><button type="button" className="quiet" aria-pressed={mode === 'url'} onClick={() => setMode('url')}>A web address</button></div>
      {mode === 'paste' ? <form className="health-import-form" aria-label="Paste a recipe" onSubmit={e => { e.preventDefault(); if (text.trim()) show(parseRecipeText(text)); }}><label className="field"><span>Recipe text</span><textarea value={text} onChange={e => setText(e.target.value)} placeholder={'Lentil soup\nServes 4\n\nIngredients\n200 g red lentils\n1 onion\n…'} maxLength={20_000} /></label><div className="actions"><button type="submit" className="secondary" disabled={!text.trim()}>Read the ingredients</button></div><p className="fine">Read on this device; nothing is sent anywhere.</p></form>
        : <form className="health-import-form" aria-label="Import from a web address" onSubmit={e => { e.preventDefault(); if (url.trim()) void fromUrl(); }}><label className="field"><span>Address (https)</span><input type="url" inputMode="url" value={url} onChange={e => setUrl(e.target.value)} placeholder="https://…" maxLength={2048} /></label><div className="actions"><button type="submit" className="secondary" disabled={busy || !url.trim()}>{busy ? 'Reading…' : 'Read the page'}</button></div><p className="fine">The server fetches only that page and reads its recipe data; it follows no links and keeps nothing.</p></form>}
      {error && <p role="alert">{error}</p>}
    </> : <form className="health-import-form" aria-label="Confirm the recipe" onSubmit={e => { e.preventDefault(); save(); }}>
      <label className="field"><span>Recipe name</span><input type="text" value={title} maxLength={80} onChange={e => setTitle(e.target.value)} /></label>
      <label className="field"><span>Servings</span><input type="text" inputMode="decimal" value={servings} onChange={e => setServings(e.target.value)} /></label>
      <p className="fine">{rows.length} {plural(rows.length, 'ingredient')} found{parsed.steps ? `, ${parsed.steps} steps left aside` : ''}. Check each name and amount; an existing food of the same name is reused.</p>
      <ul className="health-import-rows">{rows.map((r, i) => <li key={i}><input type="text" aria-label={`Ingredient ${i + 1} name`} value={r.name} maxLength={80} onChange={e => setRows(rows.map((x, j) => j === i ? {...x, name: e.target.value} : x))} /><input type="text" inputMode="numeric" aria-label={`Ingredient ${i + 1} grams`} placeholder="g" value={r.gramsText} onChange={e => setRows(rows.map((x, j) => j === i ? {...x, gramsText: e.target.value} : x))} /><small>{r.existing ? 'known' : 'new food'}</small><button type="button" className="quiet" aria-label={`${r.keep ? 'Drop' : 'Keep'} ingredient ${i + 1}`} aria-pressed={!r.keep} onClick={() => setRows(rows.map((x, j) => j === i ? {...x, keep: !x.keep} : x))}>{r.keep ? 'Drop' : 'Keep'}</button></li>)}</ul>
      <div className="actions"><button type="submit" className="primary">Save recipe</button><button type="button" className="quiet" onClick={() => { setParsed(null); setRows([]); }}>Cancel</button></div>
      {error && <p role="alert">{error}</p>}
    </form>}
  </section>;
}

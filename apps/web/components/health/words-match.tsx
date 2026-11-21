'use client';
import {useEffect, useId, useMemo, useRef, useState} from 'react';
import {logHealthItem, newHealthId, saveFood, type HealthData, type HealthFood, type Nutrition} from '../../lib/health';
import {matchOwnFood, ownQuantityMilli, splitMealWords, type WordsItem} from '../../lib/meal-words/match';
import {removeMealWords, addMealWords, MEAL_WORDS, type MealWordsEntry} from '../../lib/meal-words/schema';
import {useDeviceRecord} from '../ai/use-device-record';
import {useHealth} from './use-health';
import {showUndo} from '../ui/undo-toast';
import {formatNumber} from '../../lib/visual-format';

/**
 * Session AV (owner follow-up 1, F-WORDS-MATCH; MyFitnessPal and Cronometer's spoken log, with no model): a meal in words
 * turned into diary entries. Each item of the words ("2 eggs", "toast") is matched to the person's own food first, else
 * to the offline food library (per 100 g, so it asks for the grams); the person ticks which to log and checks each
 * amount. "Log" writes ordinary diary entries (a library food from the offline library is saved to the person's foods,
 * as the barcode flow does) and takes the words off, with one Undo for both. Loaded when "Find these foods" is pressed.
 */
type Offline = {name: string; sourceName: string; nutrients: Nutrition};
type Row = {item: WordsItem; own: HealthFood | null; offline: Offline | null | 'loading'; on: boolean; amount: string};
export default function WordsMatch({entry, onClose}: {entry: MealWordsEntry; onClose: () => void}) {
  const id = useId(), health = useHealth(), words = useDeviceRecord(MEAL_WORDS), [status, setStatus] = useState('');
  const items = useMemo(() => splitMealWords(entry.words), [entry.words]);
  const [rows, setRows] = useState<Row[] | null>(null), started = useRef(false);
  useEffect(() => {
    if (!health.loaded || started.current) return;
    started.current = true;
    const foods = health.data.foods;
    const first: Row[] = items.map(item => { const own = matchOwnFood(item, foods); return {item, own, offline: own ? null : 'loading', on: !!own, amount: own ? String(ownQuantityMilli(item, own) / 1000) : item.unit === 'g' && item.count ? String(item.count) : ''}; });
    queueMicrotask(() => setRows(first));
    if (first.every(r => r.own)) return;
    void import('../../lib/food-generic/search').then(async lib => {
      const found = await Promise.all(first.map(async r => r.own ? null : (await lib.searchGenericLibrary(r.item.food, {limit: 1}).catch(() => ({results: []}))).results[0]?.entries[0] ?? null));
      setRows(cur => (cur ?? first).map((r, i) => r.own ? r : {...r, offline: found[i] ? {name: found[i]!.name, sourceName: found[i]!.sourceName, nutrients: found[i]!.nutrients} : null, on: !!found[i] && !!r.amount}));
    }, () => setRows(cur => (cur ?? first).map(r => r.own ? r : {...r, offline: null})));
  }, [health.loaded, health.data, items]);
  const set = (i: number, patch: Partial<Row>) => setRows(cur => cur && cur.map((r, k) => k === i ? {...r, ...patch} : r));
  const amountOk = (r: Row) => { const n = Number(r.amount.replace(',', '.')); return Number.isFinite(n) && n > 0 && n <= (r.own ? 100 : 5000); };
  const chosen = (rows ?? []).filter(r => r.on && (r.own || (r.offline && r.offline !== 'loading')));
  const ready = chosen.length > 0 && chosen.every(amountOk);
  const log = async () => {
    if (!rows || !ready) return;
    const before: HealthData = health.data, at = new Date().toISOString();
    try {
      await health.update(s => chosen.reduce((acc, r) => {
        const n = Number(r.amount.replace(',', '.'));
        if (r.own) return logHealthItem(acc, {id: newHealthId(), sourceId: r.own.id, sourceKind: 'food', date: entry.date, meal: entry.meal, quantityMilli: Math.round(n * 1000)}, at);
        const o = r.offline as Offline, foodId = newHealthId();
        const saved = saveFood(acc, {id: foodId, name: o.name.slice(0, 120), brand: o.sourceName.slice(0, 80), servingGrams: 100, nutrients: o.nutrients, createdAt: at, updatedAt: at});
        return logHealthItem(saved, {id: newHealthId(), sourceId: foodId, sourceKind: 'food', date: entry.date, meal: entry.meal, quantityMilli: Math.round(n * 10)}, at);
      }, s));
      words.update(current => removeMealWords(current, entry.id));
      const message = `${formatNumber(chosen.length)} ${chosen.length === 1 ? 'food' : 'foods'} logged to ${entry.meal.toLowerCase()} instead of the words.`;
      setStatus(message);
      showUndo({message, undone: 'The words are back; the foods are taken off.', restore: () => { void health.update(() => before); words.update(current => addMealWords(current, entry)); }});
      onClose();
    } catch { setStatus('These foods could not be logged on this device. Nothing was changed.'); }
  };
  if (!rows) return <p className="fine" role="status">Reading “{entry.words}”…</p>;
  if (!rows.length) return <p className="fine" role="status">No food could be read from “{entry.words}”. Log it with &ldquo;Quick add&rdquo; or &ldquo;Just the calories&rdquo; instead. <button type="button" className="text-link" onClick={onClose}>Close</button></p>;
  return <div className="words-match" role="group" aria-labelledby={`${id}-title`}>
    <p id={`${id}-title`} className="fine"><strong>Foods read from “{entry.words}”.</strong> Tick what to log and check each amount; nothing is logged until you press Log.</p>
    <ul className="words-match-list">{rows.map((r, i) => {
      const source = r.own ? `${r.own.name} · your food` : r.offline === 'loading' ? 'Looking in the offline food library…' : r.offline ? `${r.offline.name} · ${r.offline.sourceName}, per 100 g` : 'Not found: log it another way';
      const kcal = r.own?.nutrients.kcal ?? (r.offline && r.offline !== 'loading' ? r.offline.nutrients.kcal : null);
      const usable = !!(r.own || (r.offline && r.offline !== 'loading'));
      return <li key={i} className="words-match-row">
        <label className="words-match-pick"><input type="checkbox" checked={r.on} disabled={!usable} onChange={e => set(i, {on: e.target.checked})}/> <span><strong dir="auto">{r.item.food}</strong><small> {source}{kcal !== null && usable ? ` · ${formatNumber(kcal)} kcal ${r.own ? 'a serving' : 'per 100 g'}` : ''}</small></span></label>
        {usable && <label className="field words-match-amount"><span>{r.own ? `Servings of ${r.own.name}` : `Grams of ${(r.offline as Offline).name}`}</span><input inputMode="decimal" value={r.amount} aria-invalid={r.on && !amountOk(r) ? true : undefined} onChange={e => set(i, {amount: e.target.value, on: true})} placeholder={r.own ? '1' : '100'}/></label>}
      </li>;
    })}</ul>
    <div className="money-actions"><button type="button" className="primary" disabled={!ready} onClick={() => void log()}>Log {chosen.length ? formatNumber(chosen.length) : ''} {chosen.length === 1 ? 'food' : 'foods'}</button><button type="button" className="quiet" onClick={onClose}>Keep the words</button></div>
    {chosen.some(r => !r.own) && <p className="fine">A food from the offline library is saved to your foods, so you can pick it again.</p>}
    {status && <p className="fine" role="status">{status}</p>}
  </div>;
}

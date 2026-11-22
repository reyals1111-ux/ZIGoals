'use client';
import {useId, useLayoutEffect, useState} from 'react';
import {createPortal} from 'react-dom';
import type {HealthData} from '../../../lib/health';
import {FOOD_PLUS, EATING_STYLES} from '../../../lib/food-plus/schema';
import {fitsStyle, labelLevels, setMarks, STYLE_WORDS, type EatingStyle} from '../../../lib/food-plus/marks';
import {useDeviceRecord} from '../../ai/use-device-record';
import {plainErrorMessage} from '../../../lib/plain-error';
import './food-plus.css';

/**
 * Session AV lane 2 (food, LEDGER #198, #199; Lose It!'s diet plans, Yazio's food ratings): each food in Health → Foods
 * & recipes can show "Fits high protein" (the eating style you chose) and its label levels ("Fat: low · Sugars: high",
 * per 100 g, the UK front-of-pack rule) — from its own nutrients, in words (never a colour alone), never "good" or
 * "bad", never a Nutri-Score. Both are off until chosen in "Eating style and food marks". The rows carry an empty
 * `data-food-marks` slot (Health's first chunk stays as it was); `FoodMarks` fills it.
 */
export function FoodMarks({data}: {data: HealthData}) {
  const record = useDeviceRecord(FOOD_PLUS), [slots, setSlots] = useState<HTMLElement[]>([]);
  const key = data.foods.map(f => f.id).join(',');
  useLayoutEffect(() => {
    const find = () => setSlots(old => { const now = [...document.querySelectorAll<HTMLElement>('[data-food-marks]')]; return now.length === old.length && now.every((n, i) => n === old[i]) ? old : now; });
    find();
    const root = document.querySelector('.health-library-grid'); if (!root) return;
    const watch = new MutationObserver(find); watch.observe(root, {childList: true, subtree: true});
    return () => watch.disconnect();
  }, [key]);
  if (!record.loaded) return null;
  const style = record.data.marks?.style, levels = record.data.marks?.levels === true;
  if (!style && !levels) return null;
  const byId = new Map(data.foods.map(f => [f.id, f]));
  return <>{slots.map(slot => {
    const food = byId.get(slot.dataset.foodMarks ?? ''); if (!food) return null;
    const fits = style ? fitsStyle(food, style) : null, lv = levels ? labelLevels(food) : [];
    if (!fits && !lv.length) return null;
    return createPortal(<span className="food-plus-marks">{fits && <span className="food-plus-mark">Fits {STYLE_WORDS[style!].en}</span>}{lv.length > 0 && <span className="fine">{lv.map(l => `${l.name}: ${l.level}`).join(' · ')} <span className="sr-only">per 100 g</span></span>}</span>, slot, food.id);
  })}</>;
}

/** Health → Foods & recipes → "Eating style and food marks": the style whose fit is marked, and the label levels. */
export default function MarksSettings({data}: {data: HealthData}) {
  const record = useDeviceRecord(FOOD_PLUS), id = useId(), [note, setNote] = useState('');
  if (!record.loaded) return null;
  const style = record.data.marks?.style ?? '', levels = record.data.marks?.levels === true;
  const save = (change: Parameters<typeof setMarks>[1], said: string) => { try { record.update(r => setMarks(r, change)); setNote(said); } catch (e) { setNote(plainErrorMessage(e, 'Not kept on this device.')); } };
  const fitting = style ? data.foods.filter(f => fitsStyle(f, style as EatingStyle)).length : 0;
  return <div className="food-plus-card">
    <p className="fine">Marks from each food’s own nutrients, to help you choose; never “good” or “bad”, and not advice. Off until you choose.</p>
    <label className="field"><span>Mark the foods that fit</span><select value={style} onChange={e => { const v = (e.target.value || null) as EatingStyle | null; save({style: v}, v ? `Foods that fit ${STYLE_WORDS[v].en} are marked in your list.` : 'No eating style is marked.'); }}>
      <option value="">No eating style</option>{EATING_STYLES.map(s => <option key={s} value={s}>{STYLE_WORDS[s].en[0]!.toUpperCase() + STYLE_WORDS[s].en.slice(1)}</option>)}</select></label>
    <p className="fine" id={`${id}-rule`}>Low carb: carbs give 10 % of the calories or less. High protein: protein gives 25 % or more. High fibre: 3 g or more per 100 kcal.{style ? ` ${fitting} of your ${data.foods.length} foods fit.` : ''}</p>
    <label className="checkbox food-plus-partial"><input type="checkbox" checked={levels} aria-describedby={`${id}-levels`} onChange={e => save({levels: e.target.checked}, e.target.checked ? 'Label levels are shown in your list.' : 'Label levels are hidden.')}/> Show label levels (fat, saturated fat, sugars, salt)</label>
    <p className="fine" id={`${id}-levels`}>Per 100 g, by the UK front-of-pack rule: for example sugars low up to 5 g, high above 22.5 g. Only for foods measured in grams.</p>
    <p className="fine" role="status" aria-live="polite">{note}</p>
  </div>;
}

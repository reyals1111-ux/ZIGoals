'use client';
import {useEffect, useId, useLayoutEffect, useRef, useState} from 'react';
import {createPortal} from 'react-dom';
import {formatHealthGrams, type HealthData, type HealthRecipe} from '../../../lib/health';
import {FOOD_PLUS} from '../../../lib/food-plus/schema';
import {setRecipeSteps, stepsFromText} from '../../../lib/food-plus/steps';
import {useDeviceRecord} from '../../ai/use-device-record';
import {plainErrorMessage} from '../../../lib/plain-error';
import './food-plus.css';

/**
 * Session AV lane 2 (food, LEDGER #200; Yazio's cooking mode): each recipe in Health → Foods & recipes gets "Cook" (and,
 * with no method yet, "Add the method"). The cooking view shows the ingredients, then the method one step at a time in
 * large type with Previous and Next (and the arrow keys), and "Keep the screen on" where the browser offers a screen
 * wake lock (else that switch is not shown). The method is kept on this device (`zigoals:food-plus:v1` `steps`), from a
 * built-in recipe, an import, or typed here; the strict recipe record is unchanged. Nothing moves.
 * Each recipe row carries an empty `data-recipe-cook` slot (Health's first chunk stays as it was); this part fills it.
 */
type WakeLock = {release: () => Promise<void>; addEventListener?: (type: 'release', fn: () => void) => void};
export default function CookView({data}: {data: HealthData}) {
  const record = useDeviceRecord(FOOD_PLUS), [slots, setSlots] = useState<HTMLElement[]>([]), [open, setOpen] = useState<{id: string; mode: 'cook' | 'edit'} | null>(null);
  const key = data.recipes.map(r => r.id).join(',');
  useLayoutEffect(() => {
    const find = () => setSlots(old => { const now = [...document.querySelectorAll<HTMLElement>('[data-recipe-cook]')]; return now.length === old.length && now.every((n, i) => n === old[i]) ? old : now; });
    find();
    const root = document.querySelector('.health-library-grid'); if (!root) return;
    const watch = new MutationObserver(find); watch.observe(root, {childList: true, subtree: true});
    return () => watch.disconnect();
  }, [key]);
  if (!record.loaded) return null;
  const byId = new Map(data.recipes.map(r => [r.id, r]));
  const close = (rid: string) => { setOpen(null); requestAnimationFrame(() => document.querySelector<HTMLElement>(`[data-recipe-cook="${rid}"] .food-plus-cook-open`)?.focus()); };
  return <>{slots.map(slot => {
    const rid = slot.dataset.recipeCook ?? '', recipe = byId.get(rid); if (!recipe) return null;
    const steps = record.data.steps?.[rid] ?? [];
    return createPortal(open?.id === rid
      ? open.mode === 'cook' && steps.length ? <Cooking recipe={recipe} steps={steps} onEdit={() => setOpen({id: rid, mode: 'edit'})} onClose={() => close(rid)}/>
        : <MethodEditor recipe={recipe} steps={steps} save={lines => record.update(r => setRecipeSteps(r, rid, lines, new Set(data.recipes.map(x => x.id))))} onClose={() => close(rid)}/>
      : <span className="food-plus-row"><button type="button" className="quiet food-plus-cook-open" aria-label={steps.length ? `Cook ${recipe.name}, step by step` : `Add the method for ${recipe.name}`} onClick={() => setOpen({id: rid, mode: steps.length ? 'cook' : 'edit'})}>{steps.length ? `Cook (${steps.length} ${steps.length === 1 ? 'step' : 'steps'})` : 'Add the method'}</button></span>, slot, rid);
  })}</>;
}

function Cooking({recipe, steps, onEdit, onClose}: {recipe: HealthRecipe; steps: readonly string[]; onEdit: () => void; onClose: () => void}) {
  const id = useId(), [at, setAt] = useState(-1), [wake, setWake] = useState<WakeLock | null>(null), [note, setNote] = useState(''), heading = useRef<HTMLHeadingElement>(null);
  const canWake = typeof navigator !== 'undefined' && 'wakeLock' in navigator;
  useEffect(() => { heading.current?.focus(); }, []);
  useEffect(() => () => { void wake?.release().catch(() => {}); }, [wake]);
  const toggleWake = async () => {
    if (wake) { await wake.release().catch(() => {}); setWake(null); setNote('The screen may turn off as usual.'); return; }
    try { const lock = await (navigator as unknown as {wakeLock: {request: (type: 'screen') => Promise<WakeLock>}}).wakeLock.request('screen'); lock.addEventListener?.('release', () => setWake(null)); setWake(lock); setNote('The screen stays on while this view is open.'); }
    catch { setNote('This browser did not keep the screen on just now.'); }
  };
  const go = (to: number) => setAt(Math.max(-1, Math.min(steps.length - 1, to)));
  return <section className="food-plus-cook" aria-labelledby={`${id}-title`} onKeyDown={e => { if (e.key === 'Escape') { e.preventDefault(); onClose(); } else if (e.key === 'ArrowRight' && !(e.target instanceof HTMLSelectElement)) go(at + 1); else if (e.key === 'ArrowLeft' && !(e.target instanceof HTMLSelectElement)) go(at - 1); }}>
    <h3 id={`${id}-title`} ref={heading} tabIndex={-1}>Cooking: {recipe.name}</h3>
    {at < 0 ? <><p className="fine">Makes {formatHealthGrams(recipe.portionsMilli)} {recipe.portionsMilli === 1000 ? 'serving' : 'servings'}. Gather these first:</p>
      <ul>{recipe.ingredients.map(i => <li key={i.foodId}>{i.snapshot.servingGrams !== null ? `${formatHealthGrams(i.snapshot.servingGrams * i.quantityMilli)} g` : `${formatHealthGrams(i.quantityMilli)} × `} {i.snapshot.name}</li>)}</ul></>
      : <p className="food-plus-cook-step" aria-live="polite"><span className="sr-only">Step {at + 1} of {steps.length}: </span>{steps[at]}</p>}
    <p className="fine" aria-hidden={at >= 0 || undefined}>{at < 0 ? `${steps.length} ${steps.length === 1 ? 'step' : 'steps'}` : `Step ${at + 1} of ${steps.length}`}</p>
    <div className="food-plus-row">
      {/* One button each (their words change), so the focus never falls to the page as a step is reached. */}
      <button type="button" className="secondary" aria-disabled={at < 0 || undefined} onClick={() => { if (at >= 0) go(at - 1); }}>Previous</button>
      <button type="button" className="primary" onClick={() => { if (at < steps.length - 1) go(at + 1); else onClose(); }}>{at < 0 ? 'Start cooking' : at < steps.length - 1 ? 'Next step' : 'Done cooking'}</button>
      {canWake && <button type="button" className="quiet" aria-pressed={!!wake} onClick={() => void toggleWake()}>Keep the screen on</button>}
      <button type="button" className="quiet" onClick={onEdit}>Change the method</button>
      <button type="button" className="quiet" onClick={onClose}>Close</button>
    </div>
    {note && <p className="fine" role="status">{note}</p>}
  </section>;
}

function MethodEditor({recipe, steps, save, onClose}: {recipe: HealthRecipe; steps: readonly string[]; save: (lines: string[]) => void; onClose: () => void}) {
  const id = useId(), [text, setText] = useState(steps.join('\n')), [error, setError] = useState(''), field = useRef<HTMLTextAreaElement>(null);
  useEffect(() => { field.current?.focus(); }, []);
  return <form className="food-plus-cook" aria-label={`The method for ${recipe.name}`} noValidate onKeyDown={e => { if (e.key === 'Escape') { e.preventDefault(); onClose(); } }} onSubmit={e => { e.preventDefault(); try { save(stepsFromText(text)); onClose(); } catch (err) { setError(plainErrorMessage(err, 'The method could not be kept on this device.')); } }}>
    <label className="field"><span>Method: one step on each line</span><textarea ref={field} id={`${id}-steps`} value={text} maxLength={20_000} onChange={e => setText(e.target.value)} placeholder={'Chop the onion.\nSoften it in the oil.\n…'}/></label>
    <p className="fine">At most 60 steps. Kept on this device with the recipe; an empty method takes it off.</p>
    {error && <p className="field-error" role="alert">{error}</p>}
    <div className="food-plus-row"><button type="submit" className="primary">Save the method</button><button type="button" className="quiet" onClick={onClose}>Cancel</button></div>
  </form>;
}

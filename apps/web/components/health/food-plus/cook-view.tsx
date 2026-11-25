'use client';
import {useEffect, useId, useLayoutEffect, useRef, useState, useSyncExternalStore} from 'react';
import {createPortal} from 'react-dom';
import {formatHealthGrams, type HealthData, type HealthRecipe} from '../../../lib/health';
import {FOOD_PLUS, type FoodPlus} from '../../../lib/food-plus/schema';
import {setRecipeSteps, stepsFromText} from '../../../lib/food-plus/steps';
import {stepTime} from '../../../lib/food-plus/step-timers';
import {factorOf, scaledLines, scaleWords, SERVING_CHOICES, TIMES_CHOICES, type Scale} from '../../../lib/food-plus/scale';
import {madeLine, madeOf, markMade, setStars, sortRecipeIds, starsOf, starsText, unmarkMade, type RecipeSort} from '../../../lib/food-plus/made';
import {clockOf, EMPTY_TIMERS, pageSecondsLeft, pageTimersNow, startCookingTimer, stopPageTimer, subscribePageTimers} from '../../../lib/aw-x5/timer-adapter';
import {localDate} from '../../../lib/local-date';
import {useDeviceRecord} from '../../ai/use-device-record';
import {plainErrorMessage} from '../../../lib/plain-error';
import {deviceSettingFailureMessage} from '../../../lib/storage-error-copy';
import './food-plus.css';

/**
 * Session AV lane 2 (food, LEDGER #200; Yazio's cooking mode): each recipe in Health → Foods & recipes gets "Cook" (and,
 * with no method yet, "Add the method"). The cooking view shows the ingredients, then the method one step at a time in
 * large type with Previous and Next (and the arrow keys), and "Keep the screen on" where the browser offers a screen
 * wake lock (else that switch is not shown). The method is kept on this device (`zigoals:food-plus:v1` `steps`), from a
 * built-in recipe, an import, or typed here; the strict recipe record is unchanged. Nothing moves.
 * Each recipe row carries an empty `data-recipe-cook` slot (Health's first chunk stays as it was); this part fills it.
 *
 * Session AW (X5, Paprika; LEDGER #449–#451, #455):
 * - #449: a step that names a time ("simmer for 15 minutes", "laat 10 minuten rusten") offers "Start 15 min timer",
 *   named after the recipe and the step, started through lib/aw-x5/timer-adapter.ts (#440's Timers; an in-page
 *   countdown until that is merged). Several run at once.
 * - #450: "For 2 / 4 / 6" and "½× / 1× / 2×" multiply the amounts shown, rounded as a cook measures; the saved recipe,
 *   its nutrition and its logging stay as they are.
 * - #451: tick boxes on the ingredients, and beside the large step the whole method with the current step marked (tap
 *   one to go there). The ticks hold for this cooking only; nothing is stored.
 * - #455: "Made it today" at the last step, and on the recipe row "Last made Nov 12 · 5 times" (the diary's entries of
 *   the recipe and the "Made it" days) with the person's own stars (`made`, `stars` in the food record).
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
  const byId = new Map(data.recipes.map(r => [r.id, r])), live = new Set(data.recipes.map(x => x.id)), today = localDate();
  const close = (rid: string) => { setOpen(null); requestAnimationFrame(() => document.querySelector<HTMLElement>(`[data-recipe-cook="${rid}"] .food-plus-cook-open`)?.focus()); };
  const keep = (change: (r: FoodPlus) => FoodPlus): string => { try { record.update(change); return ''; } catch (cause) { return `Not kept on this device. ${deviceSettingFailureMessage(cause)}`; } };
  return <>{slots.map(slot => {
    const rid = slot.dataset.recipeCook ?? '', recipe = byId.get(rid); if (!recipe) return null;
    const steps = record.data.steps?.[rid] ?? [], info = madeOf(data, record.data, rid, today);
    return createPortal(open?.id === rid
      ? open.mode === 'cook' && steps.length ? <Cooking recipe={recipe} steps={steps} made={info.marked.includes(today)} onMade={on => keep(r => on ? markMade(r, rid, today, live) : unmarkMade(r, rid, today))} onEdit={() => setOpen({id: rid, mode: 'edit'})} onClose={() => close(rid)}/>
        : <MethodEditor recipe={recipe} steps={steps} save={lines => record.update(r => setRecipeSteps(r, rid, lines, live))} onClose={() => close(rid)}/>
      : <RecipeTools recipe={recipe} steps={steps.length} line={info.last ? madeLine(info, today) : ''} stars={starsOf(record.data, rid)} onStars={s => keep(r => setStars(r, rid, s, live))} onOpen={() => setOpen({id: rid, mode: steps.length ? 'cook' : 'edit'})}/>, slot, rid);
  })}</>;
}

/** The recipe row's part: Cook (or Add the method), when it was last made, and the person's own stars. */
function RecipeTools({recipe, steps, line, stars, onStars, onOpen}: {recipe: HealthRecipe; steps: number; line: string; stars: number | null; onStars: (s: number | null) => string; onOpen: () => void}) {
  const [error, setError] = useState('');
  return <>
    <span className="food-plus-row food-plus-recipe-tools">
      <button type="button" className="quiet food-plus-cook-open" aria-label={steps ? `Cook ${recipe.name}, step by step` : `Add the method for ${recipe.name}`} onClick={onOpen}>{steps ? `Cook (${steps} ${steps === 1 ? 'step' : 'steps'})` : 'Add the method'}</button>
      <label className="food-plus-stars"><span className="sr-only">Your stars for {recipe.name}</span>
        <select value={stars ?? ''} onChange={e => setError(onStars(e.target.value ? Number(e.target.value) : null))}>
          <option value="">No stars</option>{[1, 2, 3, 4, 5].map(n => <option key={n} value={n}>{n} {n === 1 ? 'star' : 'stars'}</option>)}
        </select>
        {stars !== null && <span className="food-plus-stars-shown" aria-hidden="true">{starsText(stars)}</span>}
      </label>
    </span>
    {line && <span className="fine food-plus-made-line">{line}</span>}
    {error && <span className="field-error" role="alert">{error}</span>}
  </>;
}

/** Ticks every second while an in-page countdown runs (no motion: only the numbers change). */
function useSecond(on: boolean): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => { if (!on) return; const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, [on]);
  return now;
}

function Cooking({recipe, steps, made, onMade, onEdit, onClose}: {recipe: HealthRecipe; steps: readonly string[]; made: boolean; onMade: (on: boolean) => string; onEdit: () => void; onClose: () => void}) {
  const id = useId(), [at, setAt] = useState(-1), [wake, setWake] = useState<WakeLock | null>(null), [note, setNote] = useState(''), heading = useRef<HTMLHeadingElement>(null);
  const [ticked, setTicked] = useState<ReadonlySet<number>>(() => new Set()), [scale, setScale] = useState<Scale | null>(null);
  const timers = useSyncExternalStore(subscribePageTimers, pageTimersNow, () => EMPTY_TIMERS), now = useSecond(timers.length > 0), rung = useRef(new Set<string>());
  const canWake = typeof navigator !== 'undefined' && 'wakeLock' in navigator;
  useEffect(() => { heading.current?.focus(); }, []);
  useEffect(() => () => { void wake?.release().catch(() => {}); }, [wake]);
  // An in-page countdown that reaches its end is said once, politely.
  const ended = timers.filter(t => pageSecondsLeft(t, now) === 0 && !rung.current.has(t.id));
  useEffect(() => { if (!ended.length) return; for (const t of ended) rung.current.add(t.id); setNote(`Time’s up: ${ended.map(t => t.name).join(', ')}.`); }, [ended]);
  const toggleWake = async () => {
    if (wake) { await wake.release().catch(() => {}); setWake(null); setNote('The screen may turn off as usual.'); return; }
    try { const lock = await (navigator as unknown as {wakeLock: {request: (type: 'screen') => Promise<WakeLock>}}).wakeLock.request('screen'); lock.addEventListener?.('release', () => setWake(null)); setWake(lock); setNote('The screen stays on while this view is open.'); }
    catch { setNote('This browser did not keep the screen on just now.'); }
  };
  const go = (to: number) => setAt(Math.max(-1, Math.min(steps.length - 1, to)));
  const factor = factorOf(recipe, scale), lines = scaledLines(recipe, factor), timeHere = at >= 0 ? stepTime(steps[at]!, recipe.name, `Step ${at + 1}`) : null;
  const tick = (i: number, on: boolean) => setTicked(old => { const next = new Set(old); if (on) next.add(i); else next.delete(i); return next; });
  const startTimer = async () => {
    if (!timeHere) return;
    const started = await startCookingTimer(timeHere.name, timeHere.seconds);
    setNote(started.where === 'timers' ? `Started: ${timeHere.name}, ${timeHere.words}. It runs in Timers, beside your other timers.` : `Started: ${timeHere.name}, ${timeHere.words}. It counts down here while this page is open.`);
  };
  const isOn = (s: Scale) => !scale ? s.kind === 'times' && s.times === 1 : s.kind === 'servings' ? scale.kind === 'servings' && scale.servings === s.servings : scale.kind === 'times' && scale.times === s.times;
  const ingredients = <ul className="food-plus-cook-ingredients" aria-label={`Ingredients for ${recipe.name}`}>{lines.map((l, i) => <li key={`${l.foodId}-${i}`}><label className="food-plus-choice"><input type="checkbox" checked={ticked.has(i)} onChange={e => tick(i, e.target.checked)}/> <span data-ticked={ticked.has(i) || undefined}>{l.amount} {l.name}</span></label></li>)}</ul>;
  return <section className="food-plus-cook" aria-labelledby={`${id}-title`} onKeyDown={e => { if (e.key === 'Escape') { e.preventDefault(); onClose(); } else if (e.key === 'ArrowRight' && !(e.target instanceof HTMLSelectElement)) go(at + 1); else if (e.key === 'ArrowLeft' && !(e.target instanceof HTMLSelectElement)) go(at - 1); }}>
    <h3 id={`${id}-title`} ref={heading} tabIndex={-1}>Cooking: {recipe.name}</h3>
    <div className="food-plus-row" role="group" aria-label="Cook for">
      {SERVING_CHOICES.map(n => { const s: Scale = {kind: 'servings', servings: n}; return <button key={`s${n}`} type="button" className="quiet" aria-pressed={isOn(s)} onClick={() => setScale(s)}>For {n}</button>; })}
      {TIMES_CHOICES.map(n => { const s: Scale = {kind: 'times', times: n}; return <button key={`t${n}`} type="button" className="quiet" aria-pressed={isOn(s)} onClick={() => setScale(n === 1 ? null : s)}>{n === 0.5 ? 'Half' : n === 1 ? 'As saved' : 'Double'}</button>; })}
    </div>
    {factor !== 1 && <p className="fine" role="status">{scaleWords(recipe, scale)} Only these amounts change; the saved recipe stays as it is.</p>}
    <div className="food-plus-cook-layout" data-steps={at >= 0 || undefined}>
      <div className="food-plus-cook-main">
        {at < 0 ? <><p className="fine">Makes {formatHealthGrams(recipe.portionsMilli)} {recipe.portionsMilli === 1000 ? 'serving' : 'servings'}. Gather these first{ticked.size ? ` (${ticked.size} of ${lines.length} ticked)` : ''}:</p>{ingredients}</>
          : <p className="food-plus-cook-step" aria-live="polite"><span className="sr-only">Step {at + 1} of {steps.length}: </span>{steps[at]}</p>}
        <p className="fine" aria-hidden={at >= 0 || undefined}>{at < 0 ? `${steps.length} ${steps.length === 1 ? 'step' : 'steps'}` : `Step ${at + 1} of ${steps.length}`}</p>
        {timeHere && <div className="food-plus-row"><button type="button" className="secondary food-plus-step-timer" aria-label={`Start ${timeHere.words} timer: ${timeHere.name}`} onClick={() => void startTimer()}>Start {timeHere.words} timer</button></div>}
        <div className="food-plus-row">
          {/* One button each (their words change), so the focus never falls to the page as a step is reached. Keys keep
              each button the same element when "Made it today" appears at the last step. */}
          <button key="prev" type="button" className="secondary" aria-disabled={at < 0 || undefined} onClick={() => { if (at >= 0) go(at - 1); }}>Previous</button>
          <button key="next" type="button" className="primary" onClick={() => { if (at < steps.length - 1) go(at + 1); else onClose(); }}>{at < 0 ? 'Start cooking' : at < steps.length - 1 ? 'Next step' : 'Done cooking'}</button>
          {at === steps.length - 1 && <button key="made" type="button" className="secondary" aria-pressed={made} onClick={() => { const issue = onMade(!made); setNote(issue || (made ? 'Today is taken off this recipe’s days.' : `Marked as made today. It shows on ${recipe.name} in your recipes.`)); }}>Made it today</button>}
          {canWake && <button key="wake" type="button" className="quiet" aria-pressed={!!wake} onClick={() => void toggleWake()}>Keep the screen on</button>}
          <button key="edit" type="button" className="quiet" onClick={onEdit}>Change the method</button>
          <button key="close" type="button" className="quiet" onClick={onClose}>Close</button>
        </div>
      </div>
      {at >= 0 && <div className="food-plus-cook-side">
        <h4 id={`${id}-method`}>The method</h4>
        <ol className="food-plus-cook-method" aria-labelledby={`${id}-method`}>{steps.map((s, i) => <li key={i}><button type="button" className="quiet" aria-current={i === at ? 'step' : undefined} onClick={() => go(i)}><span className="sr-only">Step {i + 1}{i === at ? ', the current step' : ''}: </span><span aria-hidden="true">{i + 1}. </span>{s}</button></li>)}</ol>
        <details className="food-plus-cook-gather"><summary>Ingredients ({ticked.size} of {lines.length} ticked)</summary>{ingredients}</details>
      </div>}
    </div>
    {timers.length > 0 && <ul className="food-plus-list food-plus-cook-timers" aria-label="Timers in this cooking">{timers.map(t => { const left = pageSecondsLeft(t, now); return <li key={t.id}><span><strong>{t.name}</strong> <span className="food-plus-time">{left ? `${clockOf(left)} left` : 'time’s up'}</span></span><button type="button" className="quiet" aria-label={`${left ? 'Stop' : 'Clear'} the timer ${t.name}`} onClick={() => stopPageTimer(t.id)}>{left ? 'Stop' : 'Clear'}</button></li>; })}</ul>}
    {note && <p className="fine" role="status">{note}</p>}
  </section>;
}

function MethodEditor({recipe, steps, save, onClose}: {recipe: HealthRecipe; steps: readonly string[]; save: (lines: string[]) => void; onClose: () => void}) {
  const id = useId(), [text, setText] = useState(steps.join('\n')), [error, setError] = useState(''), field = useRef<HTMLTextAreaElement>(null);
  useEffect(() => { field.current?.focus(); }, []);
  return <form className="food-plus-cook" aria-label={`The method for ${recipe.name}`} noValidate onKeyDown={e => { if (e.key === 'Escape') { e.preventDefault(); onClose(); } }} onSubmit={e => { e.preventDefault(); try { save(stepsFromText(text)); onClose(); } catch (err) { setError(plainErrorMessage(err, 'The method could not be kept on this device.')); } }}>
    <label className="field"><span>Method: one step on each line</span><textarea ref={field} id={`${id}-steps`} value={text} maxLength={20_000} onChange={e => setText(e.target.value)} placeholder={'Chop the onion.\nSoften it in the oil.\n…'}/></label>
    <p className="fine">At most 60 steps. Kept on this device with the recipe; an empty method takes it off. A step that names a time (“simmer for 15 minutes”) offers a timer while you cook.</p>
    {error && <p className="field-error" role="alert">{error}</p>}
    <div className="food-plus-row"><button type="submit" className="primary">Save the method</button><button type="button" className="quiet" onClick={onClose}>Cancel</button></div>
  </form>;
}

/**
 * Session AW (X5, LEDGER #455): "Sort recipes" above the recipe list — as added, last made, your stars, or by name. It
 * reports the order to the list (Health's own chunk sorts by it) and stores nothing; the choice lasts while the page is
 * open.
 */
export function RecipeOrder({data, onOrder}: {data: HealthData; onOrder: (ids: readonly string[] | null) => void}) {
  const record = useDeviceRecord(FOOD_PLUS), [sort, setSort] = useState<RecipeSort>('added');
  const order = record.loaded && sort !== 'added' ? sortRecipeIds(data, record.data, sort, localDate()).join(',') : '';
  useEffect(() => { onOrder(order ? order.split(',') : null); }, [order, onOrder]);
  useEffect(() => () => onOrder(null), [onOrder]);
  return <label className="field food-plus-recipe-sort"><span>Sort recipes</span><select value={sort} onChange={e => setSort(e.target.value as RecipeSort)}>
    <option value="added">As added</option><option value="last-made">Last made</option><option value="stars">Your stars</option><option value="name">By name</option>
  </select></label>;
}

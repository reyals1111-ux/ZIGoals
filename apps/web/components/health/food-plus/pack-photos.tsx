'use client';
import {useEffect, useId, useLayoutEffect, useRef, useState} from 'react';
import {createPortal} from 'react-dom';
import type {HealthData} from '../../../lib/health';
import {compressImage, photoScope} from '../../../lib/health-aa/photos';
import {shrinkToLimit} from '../../../lib/meal-estimates/photos';
import {deleteFoodPhoto, foodPhotoIds, getFoodPhoto, MAX_FOOD_PHOTOS, putFoodPhoto} from '../../../lib/food-plus/photos';
import {ACCOUNT_CHANGE} from '../../../lib/account-session';
import './food-plus.css';

/**
 * Session AV lane 2 (food, LEDGER #103; MacroFactor's custom food from product photos): Health → Foods & recipes →
 * "Package photos (optional)": take or choose a photo of a food's front of pack and keep it with that food on this
 * device, so the Foods list shows it beside the name. Nothing reads the photo (the name and brand stay what you typed:
 * reading them from the photo needs a model). Each library row carries an empty `data-food-photo` slot (Health's first
 * chunk stays as it was); this part fills the slots with the thumbnail and its Remove button.
 */
const PHOTOS_CHANGED = 'zigoals:food-photos-changed';
/** The kept photos' food ids, re-read after a change here, an account change or a change from the other part. */
function useKept(): [string[], () => void] {
  const [kept, setKept] = useState<string[]>([]);
  useEffect(() => {
    const read = () => { void foodPhotoIds(photoScope()).then(setKept, () => setKept([])); };
    queueMicrotask(read);
    for (const type of [ACCOUNT_CHANGE, PHOTOS_CHANGED]) window.addEventListener(type, read);
    return () => { for (const type of [ACCOUNT_CHANGE, PHOTOS_CHANGED]) window.removeEventListener(type, read); };
  }, []);
  return [kept, () => window.dispatchEvent(new Event(PHOTOS_CHANGED))];
}
/** The Foods list's thumbnails: each library row's slot gets its food's photo and a Remove button. */
export function PackThumbs({data}: {data: HealthData}) {
  const [kept, changed] = useKept(), [slots, setSlots] = useState<HTMLElement[]>([]), [note, setNote] = useState('');
  const key = data.foods.map(f => f.id).join(',');
  useLayoutEffect(() => {
    const find = () => setSlots(old => { const now = [...document.querySelectorAll<HTMLElement>('[data-food-photo]')]; return now.length === old.length && now.every((n, i) => n === old[i]) ? old : now; });
    find();
    const root = document.querySelector('.health-library-grid'); if (!root) return;
    const watch = new MutationObserver(find); watch.observe(root, {childList: true, subtree: true});
    return () => watch.disconnect();
  }, [key]);
  const byId = new Map(data.foods.map(f => [f.id, f]));
  async function remove(id: string, name: string) { try { await deleteFoodPhoto(photoScope(), id); setNote(`The package photo of ${name} is deleted from this device.`); document.querySelector<HTMLElement>(`[data-food-photo="${id}"]`)?.closest("article")?.querySelector<HTMLElement>(".health-row-actions button")?.focus(); changed(); } catch { setNote('The photo could not be deleted. Try again.'); } }
  return <>
    {slots.map(slot => { const fid = slot.dataset.foodPhoto ?? '', food = byId.get(fid); if (!food || !kept.includes(fid)) return null; return createPortal(<PhotoThumb foodId={fid} name={food.name} onRemove={() => void remove(fid, food.name)}/>, slot, fid); })}
    {note && <p className="sr-only" role="status">{note}</p>}
  </>;
}

export default function PackPhotos({data}: {data: HealthData}) {
  const id = useId(), [kept, changed] = useKept(), [foodId, setFoodId] = useState(''), [note, setNote] = useState(''), [busy, setBusy] = useState(false);
  const refresh = changed;
  const live = new Set(data.foods.map(f => f.id)), orphans = kept.filter(k => !live.has(k));
  async function add(file: File) {
    if (!foodId) { setNote('Choose the food the photo is of first.'); return; }
    setBusy(true); setNote('Preparing the photo on this device…');
    try {
      const out = await shrinkToLimit(step => compressImage(file, step.edge, step.quality));
      await putFoodPhoto(photoScope(), foodId, {blob: out.blob, type: out.type, bytes: out.blob.size, at: new Date().toISOString()});
      setNote(`Package photo kept with ${data.foods.find(f => f.id === foodId)?.name ?? 'the food'} on this device (${Math.round(out.blob.size / 1000)} kB).`); refresh();
    } catch (e) { setNote(e instanceof Error ? e.message : 'The photo was not kept.'); } finally { setBusy(false); }
  }
  return <div className="food-plus-card" id="package-photos">
    {!data.foods.length ? <p className="fine">Add a food to your library first; then keep a photo of its package with it here.</p> : <>
      <p className="fine">A photo of the front of the package, kept with the food so you know it at a glance. It stays in this browser (at most {MAX_FOOD_PHOTOS}, each shrunk to 200 kB), is never uploaded or synced, and nothing reads it: the food’s name and numbers stay what you typed.</p>
      <div className="food-plus-row">
        <label className="field"><span>Food</span><select value={foodId} onChange={e => setFoodId(e.target.value)}><option value="">Choose a food</option>{data.foods.map(f => <option key={f.id} value={f.id}>{f.name}{f.brand ? ` · ${f.brand}` : ''}{kept.includes(f.id) ? ' (has a photo)' : ''}</option>)}</select></label>
        <label className="field"><span>Package photo</span><input id={`${id}-file`} type="file" accept="image/*" capture="environment" disabled={busy || !foodId} onChange={e => { const file = e.target.files?.[0]; e.target.value = ''; if (file) void add(file); }}/></label>
      </div>
      {orphans.length > 0 && <p className="fine">{orphans.length} kept {orphans.length === 1 ? 'photo belongs' : 'photos belong'} to a food no longer in your library. <button type="button" className="quiet" onClick={() => { void Promise.all(orphans.map(o => deleteFoodPhoto(photoScope(), o))).then(() => { setNote('Photos of removed foods deleted.'); refresh(); }, () => setNote('Those photos could not be deleted. Try again.')); }}>Delete {orphans.length === 1 ? 'it' : 'them'}</button></p>}
    </>}
    <p className="fine" role="status" aria-live="polite">{note}</p>
  </div>;
}

function PhotoThumb({foodId, name, onRemove}: {foodId: string; name: string; onRemove: () => void}) {
  const [url, setUrl] = useState<string | null>(null), made = useRef<string | null>(null);
  useEffect(() => {
    let live = true;
    void getFoodPhoto(photoScope(), foodId).then(p => { if (!live || !p) return; const u = URL.createObjectURL(p.blob); made.current = u; setUrl(u); }, () => {});
    return () => { live = false; if (made.current) URL.revokeObjectURL(made.current); };
  }, [foodId]);
  if (!url) return null;
  return <span className="food-plus-photo-row">
    {/* eslint-disable-next-line @next/next/no-img-element -- a local blob of the person's own photo: next/image has nothing to optimise */}
    <img className="food-plus-photo" src={url} alt={`Package photo of ${name}`} width={72} height={72}/>
    <button type="button" className="quiet" aria-label={`Remove the package photo of ${name}`} onClick={onRemove}>Remove photo</button></span>;
}

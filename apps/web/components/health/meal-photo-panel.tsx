'use client';
import Link from 'next/link';
import {useEffect, useRef, useState} from 'react';
import {useDeviceRecord} from '../ai/use-device-record';
import {askZigi} from '../ai/ask';
import {ConfirmInline} from '../ui/confirm-inline';
import {MEAL_ESTIMATES, estimateLine} from '../../lib/meal-estimates/schema';
import {deleteAllMealPhotos, deleteMealPhoto, getMealPhoto, keepsPhotos, mealPhotoIds, putMealPhoto, setKeepPhotos, shrinkToLimit} from '../../lib/meal-estimates/photos';
import {compressImage, photoScope} from '../../lib/health-aa/photos';
import {readAiSettings} from '../../lib/ai/settings';
import {getAppStorage} from '../../lib/showcase-storage';
import {ACCOUNT_CHANGE} from '../../lib/account-session';
import {deviceSettingFailureMessage} from '../../lib/storage-error-copy';
import type {HealthData} from '../../lib/health';
import './health-aa.css';

/**
 * Session AK (task 4.2): a photo of a meal, from Health. An estimate needs the person's own AI (ZIGi): when none is
 * connected the card says so plainly and offers the two ways that work; when one is, it opens ZIGi, where the photo goes
 * only to that AI. Opt-in, a meal's photo can be kept on this device beside its estimate (IndexedDB, at most 200 kB each
 * and 200 in all, each deletable, all of them with one button); off by default. Nothing here is uploaded.
 */
export const NO_AI_PHOTO = 'No AI is connected, so ZIGoals can’t estimate from a photo. Add the meal yourself, or connect your own AI in Settings → ZIGi.';
function aiConnected(): boolean { try { const s = readAiSettings(getAppStorage()).data; return s.enabled && !!s.model; } catch { return false; } }
export function MealPhotoPanel({data}: {data: HealthData}) {
  const estimates = useDeviceRecord(MEAL_ESTIMATES), record = estimates.loaded && !estimates.unreadable ? estimates.data : {version: 1 as const, foods: {}};
  const [connected, setConnected] = useState(false), [kept, setKept] = useState<string[]>([]), [note, setNote] = useState(''), [confirming, setConfirming] = useState(false), [busy, setBusy] = useState(false);
  const keep = keepsPhotos(record);
  const refresh = () => { void mealPhotoIds(photoScope()).then(setKept, () => setKept([])); };
  useEffect(() => {
    const read = () => { setConnected(aiConnected()); refresh(); };
    queueMicrotask(read);
    window.addEventListener(ACCOUNT_CHANGE, read);
    return () => window.removeEventListener(ACCOUNT_CHANGE, read);
  }, []);
  const estimated = Object.entries(record.foods).sort((a, b) => b[1].at.localeCompare(a[1].at)).slice(0, 12)
    .map(([id, estimate]) => ({id, estimate, food: data.foods.find(f => f.id === id)})).filter(x => x.food);
  const toggleKeep = () => { try { estimates.update(r => setKeepPhotos(r, !keepsPhotos(r))); setNote(keep ? 'New photos are no longer kept. Photos already kept stay until you delete them.' : 'Photos you add below are kept on this device only, never uploaded or synced.'); } catch (e) { setNote(`Not kept on this device. ${deviceSettingFailureMessage(e)}`); } };
  async function add(foodId: string, file: File) {
    setBusy(true); setNote('Preparing the photo on this device…');
    try {
      const out = await shrinkToLimit(step => compressImage(file, step.edge, step.quality));
      await putMealPhoto(photoScope(), foodId, {blob: out.blob, type: out.type, bytes: out.blob.size, at: new Date().toISOString()});
      setNote(`Photo kept on this device (${Math.round(out.blob.size / 1000)} kB).`); refresh();
    } catch (e) { setNote(e instanceof Error ? e.message : 'The photo was not kept.'); } finally { setBusy(false); }
  }
  async function remove(foodId: string) { try { await deleteMealPhoto(photoScope(), foodId); setNote('Photo deleted from this device.'); refresh(); } catch { setNote('The photo could not be deleted. Try again.'); } }
  async function removeAll() { setConfirming(false); try { const n = await deleteAllMealPhotos(photoScope()); setNote(n ? `${n} meal ${n === 1 ? 'photo' : 'photos'} deleted from this device.` : 'No meal photos were kept.'); refresh(); } catch { setNote('The photos could not be deleted. Try again.'); } }
  return <section className="health-aa-card" aria-labelledby="meal-photo-title" style={{marginTop: 12}}>
    <h3 id="meal-photo-title">Estimate a meal from a photo</h3>
    {connected ? <><p>Open ZIGi and add the photo with 📷. It goes only to your own AI, which proposes each food with a range (an estimate). Nothing is logged until you accept a card.</p><div className="actions"><button type="button" className="secondary" onClick={() => askZigi('Log this meal from the photo.')}>Open ZIGi</button></div></>
      : <><p>{NO_AI_PHOTO}</p><div className="actions"><Link className="secondary" href="/app/settings">Open Settings</Link></div></>}
    <div className="actions"><button type="button" className="quiet" aria-pressed={keep} onClick={toggleKeep}>Keep the photo on this device</button></div>
    <p className="fine">Off by default. A kept photo is shrunk to at most 200 kB, stays in this browser only (at most 200 photos), is never uploaded or synced, and you can delete it any time.</p>
    {estimated.length > 0 && <ul className="health-micro-list" aria-label="Meals estimated by your AI">{estimated.map(({id, estimate, food}) => <MealPhotoRow key={id} id={id} name={food!.name} line={estimateLine(estimate)} has={kept.includes(id)} canAdd={keep && !busy} onAdd={file => void add(id, file)} onRemove={() => void remove(id)} />)}</ul>}
    {estimated.length === 0 && <p className="health-empty-inline">Meals your AI estimates appear here, with their ranges.</p>}
    {kept.length > 0 && (confirming ? <ConfirmInline title={`Delete all ${kept.length} meal photos from this device?`} confirmLabel="Delete all meal photos" onConfirm={() => void removeAll()} onCancel={() => setConfirming(false)}><p>The estimates and foods stay. This cannot be undone.</p></ConfirmInline> : <div className="actions"><button type="button" className="quiet" onClick={() => setConfirming(true)}>Delete all meal photos…</button></div>)}
    {note && <p className="fine" aria-live="polite">{note}</p>}
  </section>;
}
function MealPhotoRow({id, name, line, has, canAdd, onAdd, onRemove}: {id: string; name: string; line: string; has: boolean; canAdd: boolean; onAdd: (file: File) => void; onRemove: () => void}) {
  const [url, setUrl] = useState<string | null>(null), input = useRef<HTMLInputElement>(null);
  useEffect(() => {
    let made: string | null = null, live = true;
    if (has) void getMealPhoto(photoScope(), id).then(p => { if (live && p) { made = URL.createObjectURL(p.blob); setUrl(made); } }, () => undefined);
    else queueMicrotask(() => { if (live) setUrl(null); });
    return () => { live = false; if (made) URL.revokeObjectURL(made); };
  }, [has, id]);
  return <li><div><strong>{name}</strong> <small>{line}</small></div>
    <div className="actions">{has && url && (
      // eslint-disable-next-line @next/next/no-img-element -- a local blob of the person's own photo: next/image has nothing to optimise
      <img src={url} alt={`Your photo of ${name}`} width={64} height={64} style={{objectFit: 'cover', borderRadius: 10}} />)}
      {canAdd && <><input ref={input} type="file" accept="image/*" hidden tabIndex={-1} aria-hidden="true" onChange={e => { const f = e.target.files?.[0]; if (f) onAdd(f); e.target.value = ''; }} /><button type="button" className="secondary" aria-label={`${has ? 'Replace the photo of' : 'Keep a photo of'} ${name}`} onClick={() => input.current?.click()}>{has ? 'Replace the photo' : 'Keep a photo'}</button></>}
      {has && <button type="button" className="quiet" aria-label={`Delete the photo of ${name}`} onClick={onRemove}>Delete photo</button>}</div></li>;
}

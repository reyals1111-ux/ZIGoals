'use client';
import {useEffect, useId, useRef, useState} from 'react';
import {compressImage, photoScope} from '../../../lib/health-aa/photos';
import {shrinkToLimit} from '../../../lib/meal-estimates/photos';
import {deleteWorkoutPhoto, getWorkoutPhoto, newWorkoutPhotoId, PHOTOS_PER_WORKOUT, putWorkoutPhoto, sweepWorkoutPhotos} from '../../../lib/workouts/photos';
import {addPhotoId, namedPhotoIds, removePhotoId} from '../../../lib/workouts/journal';
import type {Workout, Workouts} from '../../../lib/workouts/schema';
import {formatDate} from '../../../lib/visual-format';
import {showUndo} from '../../ui/undo-toast';
import './gym-r5.css';

/**
 * Session AV lane 2, round 5 (gym; LEDGER #377, Gentler Streak's photos in the workout journal): under a finished workout in
 * Health → Workouts → Your workouts, up to four photos — taken or chosen, shrunk on the device to 200 kB and kept only in
 * this browser (lib/workouts/photos.ts), never uploaded, and nothing reads them. Remove has Undo (the photo itself is kept
 * until the arrival sweep finds no workout naming it for 30 days). Pinning photos on a map stays Carried (map tiles are an
 * outside service). Its own chunk.
 */
type Change = (fn: (w: Workouts) => Workouts, said?: string) => boolean;
export default function WorkoutPhotos({workout, change}: {workout: Workout; change: Change}) {
  const id = useId(), photos = workout.photos ?? [], [note, setNote] = useState(''), [busy, setBusy] = useState(false), input = useRef<HTMLInputElement>(null);
  const label = `${workout.name} on ${formatDate(workout.date, {year: false})}`;
  async function add(file: File) {
    setBusy(true); setNote('Preparing the photo on this device…');
    const photoId = newWorkoutPhotoId(), scope = photoScope();
    try {
      const out = await shrinkToLimit(step => compressImage(file, step.edge, step.quality));
      await putWorkoutPhoto(scope, photoId, {blob: out.blob, type: out.type, bytes: out.blob.size, at: new Date().toISOString()});
      if (!change(x => addPhotoId(x, workout.id, photoId))) { await deleteWorkoutPhoto(scope, photoId).catch(() => {}); setNote('The photo was not kept.'); return; }
      setNote(`Photo kept with ${label}, in this browser only (${Math.round(out.blob.size / 1000)} kB).`);
    } catch (e) { setNote(e instanceof Error ? e.message : 'The photo was not kept.'); } finally { setBusy(false); }
  }
  function remove(photoId: string, n: number) {
    const at = photos.indexOf(photoId);
    if (!change(x => removePhotoId(x, workout.id, photoId))) return;
    const said = `Photo ${n} of ${label} removed.`;
    setNote(said);
    showUndo({message: said, undone: `Photo ${n} is back.`, restore: () => { change(x => x.workouts.some(y => y.id === workout.id) ? addPhotoId(x, workout.id, photoId, at) : x); }});
    requestAnimationFrame(() => input.current?.focus());
  }
  return <div className="r5-photos">
    {photos.length > 0 && <ul className="r5-photo-list" aria-label={`Photos of ${label}`}>{photos.map((p, i) => <li key={p}>
      <Thumb photoId={p} alt={`Photo ${i + 1} of ${label}`}/>
      <button type="button" className="quiet" aria-label={`Remove photo ${i + 1} of ${label}`} onClick={() => remove(p, i + 1)}>Remove</button>
    </li>)}</ul>}
    <label className="field r5-photo-add"><span>{photos.length >= PHOTOS_PER_WORKOUT ? `Photos: ${PHOTOS_PER_WORKOUT} of ${PHOTOS_PER_WORKOUT}, the most a workout keeps` : `Add a photo (${photos.length} of ${PHOTOS_PER_WORKOUT})`}</span>
      <input ref={input} id={`${id}-file`} type="file" accept="image/*" disabled={busy || photos.length >= PHOTOS_PER_WORKOUT} aria-describedby={`${id}-where`} onChange={e => { const file = e.target.files?.[0]; e.target.value = ''; if (file) void add(file); }}/></label>
    <p className="fine" id={`${id}-where`}>Photos stay in this browser: never uploaded or synced, and nothing reads them.</p>
    <p className="fine" role="status" aria-live="polite">{note}</p>
  </div>;
}
function Thumb({photoId, alt}: {photoId: string; alt: string}) {
  const [url, setUrl] = useState<string | null>(null), [missing, setMissing] = useState(false), made = useRef<string | null>(null);
  useEffect(() => {
    let live = true;
    void getWorkoutPhoto(photoScope(), photoId).then(p => { if (!live) return; if (!p) { setMissing(true); return; } const u = URL.createObjectURL(p.blob); made.current = u; setUrl(u); }, () => { if (live) setMissing(true); });
    return () => { live = false; if (made.current) URL.revokeObjectURL(made.current); };
  }, [photoId]);
  if (missing) return <span className="fine">This photo is not in this browser.</span>;
  if (!url) return <span className="r5-photo" aria-hidden="true"/>;
  // eslint-disable-next-line @next/next/no-img-element -- a local blob of the person's own photo: next/image has nothing to optimise
  return <img className="r5-photo" src={url} alt={alt} width={96} height={96}/>;
}
/** The arrival sweep, once per visit to Workouts: photos no workout names are marked, and deleted after 30 days. */
export function PhotoSweep({w}: {w: Workouts}) {
  const done = useRef(false), named = namedPhotoIds(w).join(',');
  useEffect(() => {
    if (done.current) return; done.current = true;
    void sweepWorkoutPhotos(photoScope(), named ? named.split(',') : []).catch(() => {});
  }, [named]);
  return null;
}

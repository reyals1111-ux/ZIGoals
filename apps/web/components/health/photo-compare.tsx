'use client';
/* eslint-disable @next/next/no-img-element -- the progress photos are blob URLs of the person's own device-only files; next/image cannot optimise them and must never fetch them */
import {useState} from 'react';
import {beforeAfter, clampPosition, daysApart, poseNote, positionText, SLIDER_STEP, type ComparePhoto} from '../../lib/photo-compare/compare';
import {formatDate} from '../../lib/visual-format';
import './photo-compare.css';

/**
 * Session AK (F5b): the before/after slider over two progress photos the person picked (opened with "Compare with a
 * slider"; the side-by-side view stays). The images are the same device-only blob URLs the grid shows: nothing is
 * uploaded, copied or stored. A native range input moves the divider, so arrows, Page Up/Down, Home and End work; the
 * three buttons jump to before, half and after. No animation.
 */
export function PhotoCompare<T extends ComparePhoto>({a, b, urls}: {a: T; b: T; urls: Record<string, string>}) {
  const {before, after} = beforeAfter(a, b), [position, setPosition] = useState(50), note = poseNote(before, after), days = daysApart(before, after);
  const p = clampPosition(position);
  if (!urls[before.id] || !urls[after.id]) return <p className="fine">One of these photos is not available on this device.</p>;
  return <figure className="photo-compare" aria-label="Before and after">
    <div className="photo-compare-stage" style={{['--photo-split' as string]: `${p}%`}}>
      <img className="photo-compare-after" src={urls[after.id]} alt={`After: ${after.pose} photo, ${formatDate(after.date)}`} />
      <img className="photo-compare-before" src={urls[before.id]} alt={`Before: ${before.pose} photo, ${formatDate(before.date)}`} />
      <span className="photo-compare-divider" aria-hidden="true" />
      <span className="photo-compare-tag photo-compare-tag-before" aria-hidden="true">Before</span>
      <span className="photo-compare-tag photo-compare-tag-after" aria-hidden="true">After</span>
    </div>
    <label className="field photo-compare-range"><span>Divider</span><input type="range" min={0} max={100} step={SLIDER_STEP} value={p} aria-valuetext={positionText(p)} onChange={e => setPosition(clampPosition(Number(e.target.value)))} /></label>
    <div className="actions photo-compare-jumps" role="group" aria-label="Jump to">
      <button type="button" className="quiet" aria-pressed={p === 100} onClick={() => setPosition(100)}>Before</button>
      <button type="button" className="quiet" aria-pressed={p === 50} onClick={() => setPosition(50)}>Half</button>
      <button type="button" className="quiet" aria-pressed={p === 0} onClick={() => setPosition(0)}>After</button>
    </div>
    <figcaption>{formatDate(before.date)} → {formatDate(after.date)} · {days === 0 ? 'the same day' : days === 1 ? '1 day apart' : `${days} days apart`}{note ? ` · ${note}` : ''}</figcaption>
  </figure>;
}
export default PhotoCompare;

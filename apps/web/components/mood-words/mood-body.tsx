'use client';
import {useId, useState} from 'react';
import {ENERGY} from '../../lib/energy/schema';
import {BODY_AREAS, BODY_DAYS, MAX_SPOTS, SENSATIONS, bodyCounts, setSpot, spotsOn, type BodyArea, type Sensation} from '../../lib/mood-words/body';
import {QUADRANTS} from '../../lib/mood-words/words';
import {useDeviceRecord} from '../ai/use-device-record';

/**
 * Session AV lane 2 (r4-mind; LEDGER #326, How We Feel's mind-body scan): "Where do you feel it?" — up to three places,
 * each with one word for how it feels there (tight, warm, heavy, buzzing, calm), saved on the day's feeling word, and
 * the most common place and word per corner over the last 90 days, as counts. Where a feeling sits, in plain words: no
 * medical meaning, nothing read from it. Its own chunk, loaded when the fold opens.
 */
export default function MoodBody({day}: {day: string}) {
  const energy = useDeviceRecord(ENERGY), id = useId(), [said, setSaid] = useState('');
  if (!energy.loaded || energy.unreadable) return null;
  const spots = spotsOn(energy.data, day), full = spots.length >= MAX_SPOTS, counts = bodyCounts(energy.data, day);
  const set = (area: BodyArea, feel: Sensation | null) => {
    try { energy.update(r => setSpot(r, day, area, feel)); setSaid(feel ? `${area}: ${feel}. Kept on this device.` : `${area} is off today’s list.`); }
    catch (e) { setSaid(e instanceof Error ? e.message : 'This could not be saved on this device.'); }
  };
  return <div className="mood-body">
    <p className="fine">Up to {MAX_SPOTS} places, each with a word for how it feels there. Just where the feeling sits; nothing is read from it.</p>
    <div className="mood-body-grid" role="group" aria-label="Where you feel it">
      {BODY_AREAS.map(area => { const now = spots.find(s => s.area === area)?.feel ?? ''; return <label key={area} className="field mood-body-area"><span>{area[0]!.toUpperCase()}{area.slice(1)}</span>
        <select id={`${id}-${area}`} value={now} disabled={full && !now} onChange={e => set(area, (e.target.value || null) as Sensation | null)}>
          <option value="">—</option>{SENSATIONS.map(f => <option key={f} value={f}>{f}</option>)}
        </select></label>; })}
    </div>
    {full && <p className="fine">Three places chosen. Set one back to — to choose another.</p>}
    <p className="fine" role="status" aria-live="polite">{said}</p>
    <section className="mood-body-counts" aria-labelledby={`${id}-counts`}>
      <h4 id={`${id}-counts`}>Where you have felt it, the last {BODY_DAYS} days</h4>
      {counts.length ? <ul>{counts.map(c => <li key={c.quadrant}><strong>{QUADRANTS.find(q => q.id === c.quadrant)!.title}</strong>: {c.area ? `${c.area.name} most often (${c.area.count} of ${c.days === 1 ? '1 day' : `${c.days} days`})` : ''}{c.feel ? `, most often ${c.feel.name}` : ''}.</li>)}</ul>
        : <p className="fine">Once you note where you feel it on a few days, the most common place for each kind of feeling shows here, as counts.</p>}
    </section>
  </div>;
}

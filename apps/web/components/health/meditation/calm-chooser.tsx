'use client';
import {useEffect, useId, useState} from 'react';
import {CALM_VISUALS, CALM_WORDS, calmNow, NO_CALM, PACE_WORDS, SHIFT_PACES, type Calm, type CalmVisual, type ShiftPace} from '../../../lib/calm/visuals';
import {useMotionAllowed} from './breathing-visual';
import {CalmScene} from './calm-layer';
import './calm.css';

/**
 * Session AV lane 2 (habits pillar; LEDGER #79, #80): "Behind your sitting" — choose a calm visual for the timer and the
 * breathing guide: none, the slow left-right light (with its pace) or one of four scenes. Kept on this device (the habit
 * extras' `calm`); each choice is saved the moment it is made, and the focus stays on it.
 */
export default function CalmChooser() {
  const [calm, setCalmState] = useState<Calm>(NO_CALM), [note, setNote] = useState(''), motion = useMotionAllowed(), name = useId();
  useEffect(() => { setCalmState(calmNow()); }, []);
  async function save(change: {visual?: CalmVisual | null; pace?: ShiftPace}) {
    try {
      const {setCalm} = await import('../../../lib/calm/write');
      setCalm(change);
      const next = {...calm, ...(change.visual !== undefined ? {visual: change.visual} : {}), ...(change.pace ? {pace: change.pace} : {})};
      setCalmState(next);
      setNote(next.visual ? `Saved: ${CALM_WORDS[next.visual].en}${next.visual === 'shift' ? `, ${PACE_WORDS[next.pace].en.toLowerCase()}` : ''}. It shows from your next session.` : 'Saved: no visual. The session shows the clock alone.');
    } catch { setNote('This device could not keep the choice. Nothing changed.'); }
  }
  return <div className="calm-chooser">
    <p className="fine">A calm visual above the clock or the breathing guide while you sit. Something to rest your eyes on; relaxation, not therapy. Drawn on this device: no picture, video or sound.</p>
    <fieldset className="calm-choices"><legend>Behind your sitting</legend>
      <label className="calm-choice"><input type="radio" name={name} checked={!calm.visual} onChange={() => void save({visual: null})}/><span className="calm-swatch calm-none" aria-hidden="true"/><span><strong>No visual</strong><small>The clock alone.</small></span></label>
      {CALM_VISUALS.map(v => <label key={v} className="calm-choice"><input type="radio" name={name} checked={calm.visual === v} onChange={() => void save({visual: v})}/>
        {v === 'shift' ? <span className="calm-swatch calm-shift-swatch" aria-hidden="true"><span/></span> : <span className="calm-swatch" aria-hidden="true"><CalmScene visual={v} motion={false} small/></span>}
        <span><strong>{CALM_WORDS[v].en}</strong><small>{CALM_WORDS[v].about}</small></span></label>)}
    </fieldset>
    {calm.visual === 'shift' && <fieldset className="calm-choices calm-paces"><legend>Pace of the light</legend>
      {SHIFT_PACES.map(p => <label key={p} className="calm-choice"><input type="radio" name={`${name}-pace`} checked={calm.pace === p} onChange={() => void save({pace: p})}/><span><strong>{PACE_WORDS[p].en}</strong></span></label>)}
    </fieldset>}
    {!motion && <p className="fine">Motion is off on this device (Motion Off in Settings, or reduced motion on the device), so the visual stands still: the light rests in the middle and scenes do not drift.</p>}
    <p className="fine" role="status" aria-live="polite">{note}</p>
  </div>;
}

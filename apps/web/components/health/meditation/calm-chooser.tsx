'use client';
import {useEffect, useId, useRef, useState} from 'react';
import {CALM_VISUALS, CALM_WORDS, calmNow, NO_CALM, PACE_SECONDS, PACE_WORDS, SHIFT_PACES, SHIFT_SOUND_DEFAULT, type Calm, type CalmVisual, type ShiftPace} from '../../../lib/calm/visuals';
import {wakeAudio, audioContext} from '../../../lib/audio/context';
import {useMotionAllowed} from './breathing-visual';
import {CalmScene} from './calm-layer';
import './calm.css';

/**
 * Session AV lane 2 (habits pillar; LEDGER #79, #80): "Behind your sitting" — choose a calm visual for the timer and the
 * breathing guide: none, the slow left-right light (with its pace) or one of four scenes. Kept on this device (the habit
 * extras' `calm`); each choice is saved the moment it is made, and the focus stays on it.
 * Session AV lane 2 (rest, LEDGER #79; Calm's Shift): the slow left-right sound, opt-in (off until ticked), with its own
 * volume and "Try it" (six seconds). Made on the device (lib/audio/shift-sound.ts); no recording.
 */
const TRY_SECONDS = 6;
export default function CalmChooser() {
  const [calm, setCalmState] = useState<Calm>(NO_CALM), [note, setNote] = useState(''), motion = useMotionAllowed(), name = useId();
  useEffect(() => { setCalmState(calmNow()); }, []);
  async function save(change: {visual?: CalmVisual | null; pace?: ShiftPace; sound?: number | null}) {
    try {
      const {setCalm} = await import('../../../lib/calm/write');
      setCalm(change);
      const {sound: _s, ...rest} = calm; void _s;
      const sound = change.sound === null ? undefined : change.sound ?? calm.sound;
      const next: Calm = {...rest, ...(change.visual !== undefined ? {visual: change.visual} : {}), ...(change.pace ? {pace: change.pace} : {}), ...(sound ? {sound} : {})};
      setCalmState(next);
      if (change.sound !== undefined) { setNote(change.sound === null ? 'Saved: no sound. Sessions stay as quiet as your bells.' : `Saved: the slow left-right sound at volume ${change.sound}. It plays from your next session.`); return; }
      setNote(next.visual ? `Saved: ${CALM_WORDS[next.visual].en}${next.visual === 'shift' ? `, ${PACE_WORDS[next.pace].en.toLowerCase()}` : ''}. It shows from your next session.` : 'Saved: no visual. The session shows the clock alone.');
    } catch { setNote('This device could not keep the choice. Nothing changed.'); }
  }
  // "Try it": six seconds of the sound at the chosen volume and pace, then it fades; stopped when this leaves the page.
  const trying = useRef<{stop: () => void} | null>(null), tryTimer = useRef(0), [playing, setPlaying] = useState(false);
  const stopTry = () => { window.clearTimeout(tryTimer.current); trying.current?.stop(); trying.current = null; setPlaying(false); };
  useEffect(() => () => { window.clearTimeout(tryTimer.current); trying.current?.stop(); }, []);
  async function tryIt() {
    if (playing) { stopTry(); setNote('Stopped.'); return; }
    const ctx = await wakeAudio() ? audioContext() : null, {startShiftSound} = await import('../../../lib/audio/shift-sound');
    const s = ctx ? startShiftSound(ctx, {volume: calm.sound ?? SHIFT_SOUND_DEFAULT, glideSeconds: PACE_SECONDS[calm.pace], elapsedMs: 0}) : null;
    if (!s) { setNote('This browser cannot move a sound from left to right, so the sound stays off here.'); return; }
    trying.current = s; setPlaying(true); setNote(`Playing for ${TRY_SECONDS} seconds. Headphones make the movement clearest.`);
    tryTimer.current = window.setTimeout(() => { stopTry(); setNote('That was the slow left-right sound.'); }, TRY_SECONDS * 1000);
  }
  return <div className="calm-chooser">
    <p className="fine">A calm visual above the clock or the breathing guide while you sit. Something to rest your eyes on; relaxation, not therapy. Drawn on this device: no picture or video.</p>
    <fieldset className="calm-choices"><legend>Behind your sitting</legend>
      <label className="calm-choice"><input type="radio" name={name} checked={!calm.visual} onChange={() => void save({visual: null})}/><span className="calm-swatch calm-none" aria-hidden="true"/><span><strong>No visual</strong><small>The clock alone.</small></span></label>
      {CALM_VISUALS.map(v => <label key={v} className="calm-choice"><input type="radio" name={name} checked={calm.visual === v} onChange={() => void save({visual: v})}/>
        {v === 'shift' ? <span className="calm-swatch calm-shift-swatch" aria-hidden="true"><span/></span> : <span className="calm-swatch" aria-hidden="true"><CalmScene visual={v} motion={false} small/></span>}
        <span><strong>{CALM_WORDS[v].en}</strong><small>{CALM_WORDS[v].about}</small></span></label>)}
    </fieldset>
    <fieldset className="calm-choices calm-sound"><legend>A slow left-right sound</legend>
      <label className="calm-choice"><input type="checkbox" checked={!!calm.sound} onChange={e => void save({sound: e.target.checked ? SHIFT_SOUND_DEFAULT : null})}/><span><strong>Play a soft sound that moves slowly between your left and right ear</strong><small>Off unless you tick it. A gentle hush made on this device, in step with the light. Best with headphones; for relaxation, not therapy.</small></span></label>
      {/* Session AV lane 2 (fixb2): the label names the slider by its id: an <output> is labelable too, and as the label's
          first labelable child it took the label, which left the slider without a name. */}
      {!!calm.sound && <label className="field calm-volume" htmlFor={`${name}-volume`}><span>Volume of the sound <output>{calm.sound}</output></span><input id={`${name}-volume`} type="range" min={1} max={100} step={1} value={calm.sound} aria-valuetext={`${calm.sound} of 100`} onChange={e => void save({sound: Number(e.target.value)})}/></label>}
      <p><button type="button" className="secondary" onClick={() => void tryIt()}>{playing ? 'Stop' : `Try it (${TRY_SECONDS} seconds)`}</button></p>
    </fieldset>
    {(calm.visual === 'shift' || !!calm.sound) && <fieldset className="calm-choices calm-paces"><legend>{calm.sound && calm.visual === 'shift' ? 'Pace of the light and the sound' : calm.sound ? 'Pace of the sound' : 'Pace of the light'}</legend>
      {SHIFT_PACES.map(p => <label key={p} className="calm-choice"><input type="radio" name={`${name}-pace`} checked={calm.pace === p} onChange={() => void save({pace: p})}/><span><strong>{PACE_WORDS[p].en}</strong></span></label>)}
    </fieldset>}
    {!motion && <p className="fine">Motion is off on this device (Motion Off in Settings, or reduced motion on the device), so the visual stands still: the light rests in the middle and scenes do not drift.</p>}
    <p className="fine" role="status" aria-live="polite">{note}</p>
  </div>;
}

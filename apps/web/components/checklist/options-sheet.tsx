'use client';
import {useEffect, useState, type CSSProperties} from 'react';
import {PATH_COLOURS, PATH_COLOUR_IDS, pathColour} from '../../lib/path/colours';
import {vibrationAvailable} from '../../lib/checklist/feedback';
import type {ChecklistState} from './use-checklist';

/**
 * The Checklist's options, tucked away (P7.17, P7.10, P7.14, P7.15): the view, the List's accent colour from the palette,
 * sounds (off by default, never in the quiet hours), vibration (said plainly when the device has none), the gentle
 * nudges, and when the day starts. Every choice is a display choice on this device (`zigoals:ui-prefs:v1`).
 */
export function OptionsSheet({state, onClose}: {state: ChecklistState; onClose: () => void}) {
  const {prefs, setPrefs} = state, [canVibrate, setCanVibrate] = useState<boolean | null>(null), [saved, setSaved] = useState('');
  useEffect(() => { setCanVibrate(vibrationAvailable()); }, []);
  const set = (patch: Parameters<typeof setPrefs>[0], words: string) => setSaved(setPrefs(patch) ? words : 'Not saved on this device.');
  const accent = pathColour(prefs.accent);
  return <section className="panel checklist-options" aria-labelledby="checklist-options-title">
    <div className="checklist-options-head"><h2 id="checklist-options-title">Options</h2><button type="button" className="quiet" onClick={onClose}>Done</button></div>
    <fieldset className="checklist-choice"><legend>View</legend>
      {(['path', 'list'] as const).map(v => <label key={v}><input type="radio" name="checklist-view" checked={prefs.view === v} onChange={() => set({view: v}, v === 'path' ? 'Path view.' : 'List view.')}/>{v === 'path' ? 'Path' : 'List'}</label>)}
    </fieldset>
    <fieldset className="checklist-accent"><legend>List accent colour</legend>
      <div className="checklist-swatches">{PATH_COLOUR_IDS.map(id => <label key={id} className="checklist-swatch" style={{'--swatch': PATH_COLOURS[id].token} as CSSProperties}><input type="radio" name="checklist-accent" checked={accent === id} onChange={() => set({accent: id}, `${PATH_COLOURS[id].label} accent.`)}/><span aria-hidden="true"/><span className="sr-only">{PATH_COLOURS[id].label}</span></label>)}</div>
    </fieldset>
    <label className="checklist-toggle"><span><strong>Soft bell on each tick</strong><small>Never in your quiet hours, {state.quiet.from}–{state.quiet.to}</small></span><span className="checklist-switch"><input type="checkbox" role="switch" checked={prefs.sounds} onChange={e => set({sounds: e.target.checked}, e.target.checked ? 'A soft bell on each tick, outside your quiet hours.' : 'Sounds off.')}/><span className="checklist-switch-knob" aria-hidden="true"/></span></label>
    <label className="checklist-toggle"><span><strong>Short vibration on each tick</strong>{canVibrate === false && <small>Not available on this device</small>}</span><span className="checklist-switch"><input type="checkbox" role="switch" checked={prefs.haptics && canVibrate !== false} disabled={canVibrate === false} onChange={e => set({haptics: e.target.checked}, e.target.checked ? 'A short vibration on each tick.' : 'Vibration off.')}/><span className="checklist-switch-knob" aria-hidden="true"/></span></label>
    <label className="checklist-toggle"><span><strong>Gentle nudges</strong><small>On Today’s card at 10:00, 15:00 and 19:00</small></span><span className="checklist-switch"><input type="checkbox" role="switch" checked={prefs.nudges} onChange={e => set({nudges: e.target.checked}, e.target.checked ? 'Gentle nudges on.' : 'Nudges off.')}/><span className="checklist-switch-knob" aria-hidden="true"/></span></label>
    <p className="fine">Your day starts at midnight{state.dayZone ? ` (${state.dayZone})` : ''}.</p>
    {saved && <p className="fine" role="status">{saved}</p>}
  </section>;
}

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
    <label className="checkbox"><input type="checkbox" checked={prefs.sounds} onChange={e => set({sounds: e.target.checked}, e.target.checked ? 'A soft bell on each tick, outside your quiet hours.' : 'Sounds off.')}/>A soft bell when you tick a dot (never in your quiet hours, {state.quiet.from}–{state.quiet.to})</label>
    <label className="checkbox"><input type="checkbox" checked={prefs.haptics && canVibrate !== false} disabled={canVibrate === false} onChange={e => set({haptics: e.target.checked}, e.target.checked ? 'A short vibration on each tick.' : 'Vibration off.')}/>A short vibration on each tick{canVibrate === false ? ': not available on this device' : ''}</label>
    <label className="checkbox"><input type="checkbox" checked={prefs.nudges} onChange={e => set({nudges: e.target.checked}, e.target.checked ? 'Gentle nudges on.' : 'Nudges off.')}/>Gentle nudges on the Checklist card at 10:00, 15:00 and 19:00 (in the app only, never in your quiet hours)</label>
    <p className="fine">Your day starts at midnight in your journal time zone{state.dayZone ? ` (${state.dayZone})` : ''}; change the zone in Settings → Today. Your path, its history and these choices stay on this device.</p>
    {saved && <p className="fine" role="status">{saved}</p>}
  </section>;
}

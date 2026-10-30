'use client';
import {useState, useSyncExternalStore} from 'react';
import {DEFAULT_LOOK, LOOK_CHOICES, LOOK_EVENT, chooseLook, readLook, type Look, type LookKey} from '../../lib/ui-prefs/look';
import './customize-settings.css';

/** The words for each choice; the first of each is today's look, the default. */
const GROUPS: {key: LookKey; legend: string; note: string; words: Record<string, string>}[] = [
  {key: 'font', legend: 'Font', note: 'The letters of every page.', words: {system: 'System', inter: 'Inter'}},
  {key: 'textSize', legend: 'Text size', note: 'Large makes the words bigger; the page keeps its width.', words: {standard: 'Standard', large: 'Large'}},
  {key: 'density', legend: 'Density', note: 'Compact puts lists, cards and panels closer together.', words: {comfortable: 'Comfortable', compact: 'Compact'}},
  {key: 'glow', legend: 'Glow', note: 'Soft dims the glow around buttons and art. Colours stay.', words: {full: 'Full', soft: 'Soft'}},
];
const subscribe = (change: () => void) => { window.addEventListener(LOOK_EVENT, change); window.addEventListener('storage', change); return () => { window.removeEventListener(LOOK_EVENT, change); window.removeEventListener('storage', change); }; };
/** A string snapshot, so the store hands React the same value until the look really changes. */
const snapshot = () => JSON.stringify(readLook());
const serverSnapshot = () => JSON.stringify(DEFAULT_LOOK);

/**
 * Session AJ (item 32, D5): Settings → Appearance → Customize. Four choices, each applied at once and before the first
 * paint on every later page (lib/ui-prefs/look.ts, public/theme-boot.js), kept on this device only and never synced.
 */
export function CustomizeSettings() {
  const look = JSON.parse(useSyncExternalStore(subscribe, snapshot, serverSnapshot)) as Look;
  const [message, setMessage] = useState<{text: string; failed?: boolean} | null>(null);
  const save = (next: Look, done: string) => {
    try { chooseLook(next); setMessage({text: done}); }
    catch { setMessage({text: 'This browser could not save your choice. The page keeps its look.', failed: true}); }
  };
  return <div className="customize-settings" role="group" aria-labelledby="customize-title">
    <h2 id="customize-title">Customize</h2>
    <p className="fine">Only on this device.</p>
    <div className="customize-groups">
      {GROUPS.map(group => <fieldset key={group.key} className="customize-group" aria-describedby={`customize-note-${group.key}`}>
        <legend>{group.legend}</legend>
        <div className="customize-options">
          {(LOOK_CHOICES[group.key] as readonly string[]).map(value => <label key={value} className="customize-option">
            <input type="radio" name={`customize-${group.key}`} value={value} checked={look[group.key] === value}
              onChange={() => save({...look, [group.key]: value} as Look, `${group.legend}: ${group.words[value]}. Saved on this device.`)}/>
            <span>{group.words[value]}</span>
          </label>)}
        </div>
        <small id={`customize-note-${group.key}`} className="customize-note">{group.note}</small>
      </fieldset>)}
    </div>
    <button type="button" className="secondary customize-reset" onClick={() => save(DEFAULT_LOOK, 'Back to the defaults.')}>Back to the defaults</button>
    {message && <p role={message.failed ? 'alert' : 'status'}>{message.text}</p>}
  </div>;
}
export default CustomizeSettings;

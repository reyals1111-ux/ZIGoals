'use client';
import {useState, useSyncExternalStore} from 'react';
import {DEFAULT_LOOK, LOOK_CHOICES, LOOK_EVENT, chooseLook, readLook, type Look, type LookKey} from '../../lib/ui-prefs/look';
import {DARK_STYLES, DARK_STYLE_EVENT, chooseDarkStyle, readDarkStyle, type DarkStyle} from '../../lib/ui-prefs/dark-style';
import './customize-settings.css';

/** The words for each choice; the first of each is today's look, the default. */
const GROUPS: {key: LookKey; legend: string; note: string; words: Record<string, string>}[] = [
  // Session AV lane 2 (N6 #192): three more, from this device's own fonts.
  // Session AV lane 2 (r3-plan, LEDGER #263): Reading-friendly, from fonts the device may have, with wider spacing.
  {key: 'font', legend: 'Font', note: 'The letters of every page. Serif, Rounded, Monospace and Reading-friendly use the fonts this device already has. Reading-friendly uses Atkinson Hyperlegible or OpenDyslexic when the device has one (else Verdana), with more space between letters, words and lines.', words: {system: 'System', inter: 'Inter', serif: 'Serif', rounded: 'Rounded', mono: 'Monospace', reading: 'Reading-friendly'}},
  {key: 'textSize', legend: 'Text size', note: 'Large makes the words bigger; the page keeps its width.', words: {standard: 'Standard', large: 'Large'}},
  {key: 'density', legend: 'Density', note: 'Compact puts lists, cards and panels closer together.', words: {comfortable: 'Comfortable', compact: 'Compact'}},
  {key: 'glow', legend: 'Glow', note: 'Soft dims the glow around buttons and art. Colours stay.', words: {full: 'Full', soft: 'Soft'}},
];
const subscribe = (change: () => void) => { window.addEventListener(LOOK_EVENT, change); window.addEventListener('storage', change); return () => { window.removeEventListener(LOOK_EVENT, change); window.removeEventListener('storage', change); }; };
/** Session AV lane 2 (LEDGER #34, N6 #191): Dark's style, in plain words. */
const DARK_STYLE_WORDS: Record<DarkStyle, string> = {standard: 'Standard', black: 'Pure black', contrast: 'High contrast'};
const subscribeStyle = (change: () => void) => { window.addEventListener(DARK_STYLE_EVENT, change); window.addEventListener('storage', change); return () => { window.removeEventListener(DARK_STYLE_EVENT, change); window.removeEventListener('storage', change); }; };
/** A string snapshot, so the store hands React the same value until the look really changes. */
const snapshot = () => JSON.stringify(readLook());
const serverSnapshot = () => JSON.stringify(DEFAULT_LOOK);

/**
 * Session AJ (item 32, D5): Settings → Appearance → Customize. Four choices, each applied at once and before the first
 * paint on every later page (lib/ui-prefs/look.ts, public/theme-boot.js), kept on this device only and never synced.
 */
export function CustomizeSettings() {
  const look = JSON.parse(useSyncExternalStore(subscribe, snapshot, serverSnapshot)) as Look;
  const darkStyle = useSyncExternalStore(subscribeStyle, () => readDarkStyle(), () => 'standard' as DarkStyle);
  const [message, setMessage] = useState<{text: string; failed?: boolean} | null>(null);
  // Choosing Pure black or High contrast also turns Dark on (the style is Dark's); Standard leaves the theme as it is.
  const saveStyle = (style: DarkStyle) => {
    try {
      chooseDarkStyle(style);
      if (style === 'standard') { setMessage({text: 'Dark style: Standard. Saved on this device.'}); return; }
      void import('../../lib/ui-prefs/theme').then(m => { const was = m.readTheme(); if (was !== 'dark') m.chooseTheme('dark'); setMessage({text: `Dark style: ${DARK_STYLE_WORDS[style]}.${was !== 'dark' ? ' Dark is on now.' : ''} Saved on this device.`}); })
        .catch(() => setMessage({text: `Dark style: ${DARK_STYLE_WORDS[style]}. Saved on this device; it shows when Dark is on.`}));
    } catch { setMessage({text: 'This browser could not save your choice. The page keeps its look.', failed: true}); }
  };
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
      <fieldset className="customize-group" aria-describedby="customize-note-dark-style">
        <legend>Dark style</legend>
        <div className="customize-options">
          {DARK_STYLES.map(value => <label key={value} className="customize-option">
            <input type="radio" name="customize-dark-style" value={value} checked={darkStyle === value} onChange={() => saveStyle(value)}/>
            <span>{DARK_STYLE_WORDS[value]}</span>
          </label>)}
        </div>
        <small id="customize-note-dark-style" className="customize-note">Used whenever Dark is on. Pure black: a true black page for OLED screens. High contrast: white words on black, every word at least 7:1, strong focus rings.</small>
      </fieldset>
    </div>
    <button type="button" className="secondary customize-reset" onClick={() => { try { chooseDarkStyle('standard'); } catch { /* the look is reset all the same */ } save(DEFAULT_LOOK, 'Back to the defaults.'); }}>Back to the defaults</button>
    {message && <p role={message.failed ? 'alert' : 'status'}>{message.text}</p>}
  </div>;
}
export default CustomizeSettings;

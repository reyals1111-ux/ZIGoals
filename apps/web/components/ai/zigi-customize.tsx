'use client';
import Link from 'next/link';
import {useId, useState, type ReactNode} from 'react';
import {ZIGI, ZIGI_ANIMATIONS, ZIGI_GREETINGS, ZIGI_SIDES, ZIGI_SIZES, zigiPrefs, type ZigiRecord} from '../../lib/ai/store/records';
import {ZIGI_MANIFEST, ZigiAvatar} from '../zigi/zigi-avatar';
import {Switch} from './ai-switch';
import {useDeviceRecord} from './use-device-record';
import './zigi-customize.css';

/**
 * Customize ZIGi (Session V Part 12): the look (the original skin, and honest "Coming soon" tiles for the ones being
 * drawn), the animation (Full, Calm by default, Off), the side, the size, the greeting, the edge tab, and (Part 13)
 * whether ZIGi knocks when a reminder is due. The same
 * controls in the panel's Customize view and in Settings → ZIGi · your AI. Every choice is a display preference kept on
 * this device (`zigoals:zigi:v1`, in Export, never synced) and takes effect at once; nothing is sent anywhere.
 */
const ANIMATION_NOTES: Record<(typeof ZIGI_ANIMATIONS)[number], string> = {
  full: 'Livelier: a bigger breath while ZIGi waits.',
  calm: 'A slow, small breath while ZIGi waits, and a short move when something happens.',
  off: 'ZIGi holds still.',
};
const ANIMATION_LABELS = {full: 'Full', calm: 'Calm', off: 'Off'} as const;
const SIDE_LABELS = {right: 'Right', left: 'Left'} as const;
const SIZE_LABELS = {s: 'Small', m: 'Medium', l: 'Large'} as const;
const GREETING_LABELS = {friendly: 'Friendly', quiet: 'Quiet'} as const;
const GREETING_NOTES = {friendly: 'On the first open of the day, a short brief from your records, made on this device.', quiet: 'Just the chat.'} as const;
/** Session V Part 16: each option is named by its label alone ("Calm"); its note is the description. */
function Choice<T extends string>({legend, value, options, labels, notes, onChange}: {legend: string; value: T; options: readonly T[]; labels: Record<T, string>; notes?: Partial<Record<T, string>>; onChange: (next: T) => void}) {
  const name = useId();
  return <fieldset className="zigi-choice"><legend>{legend}</legend>
    <div className="zigi-choice-options">{options.map(option => <label key={option} className="zigi-choice-option">
      <input type="radio" name={name} value={option} checked={value === option} onChange={() => onChange(option)} aria-labelledby={`${name}-${option}`} aria-describedby={notes?.[option] ? `${name}-${option}-note` : undefined}/>
      <span><strong id={`${name}-${option}`}>{labels[option]}</strong>{notes?.[option] && <small id={`${name}-${option}-note`}>{notes[option]}</small>}</span>
    </label>)}</div>
  </fieldset>;
}
/** The animation choice alone (Meet ZIGi shows it next to the moves it changes). */
export function AnimationChoice() {
  const zigi = useDeviceRecord(ZIGI), prefs = zigiPrefs(zigi.data), [error, setError] = useState('');
  if (!zigi.loaded) return null;
  return <>
    <Choice legend="Animation" value={prefs.animation} options={ZIGI_ANIMATIONS} labels={ANIMATION_LABELS} notes={ANIMATION_NOTES} onChange={animation => { try { zigi.update(r => ({...r, animation})); setError(''); } catch { setError('This choice could not be saved on this device.'); } }}/>
    {error && <p role="alert">{error}</p>}
  </>;
}
export function ZigiCustomize({footer, onNavigate}: {footer?: ReactNode; onNavigate?: () => void}) {
  const zigi = useDeviceRecord(ZIGI), prefs = zigiPrefs(zigi.data), [error, setError] = useState(''), skinGroup = useId();
  const save = (change: (record: ZigiRecord) => ZigiRecord) => {
    try { zigi.update(change); setError(''); } catch { setError('This choice could not be saved on this device; ZIGi keeps its current look.'); }
  };
  if (!zigi.loaded) return <p className="ai-note" role="status">Loading…</p>;
  const skins = Object.entries(ZIGI_MANIFEST.skins), skin = ZIGI_MANIFEST.skins[prefs.skin] ? prefs.skin : ZIGI_MANIFEST.defaultSkin;
  return <div className="zigi-customize">
    {zigi.unreadable && <p role="alert">ZIGi&rsquo;s look on this device could not be read; it shows the defaults until you choose here.</p>}
    <fieldset className="zigi-choice"><legend>Look</legend>
      <ul className="zigi-skins">
        {skins.map(([id, s]) => <li key={id}><label className="zigi-skin-tile">
          <input type="radio" name={skinGroup} value={id} checked={skin === id} onChange={() => save(r => ({...r, skin: id}))}/>
          <ZigiAvatar state="idle" size={48} skin={id} decorative/>
          <span>{s.label}</span>
        </label></li>)}
        {Array.from({length: ZIGI_MANIFEST.comingSoon}, (_, i) => <li key={`soon-${i}`} className="zigi-skin-tile zigi-skin-soon"><span className="zigi-silhouette" aria-hidden="true"/><span>Coming soon</span></li>)}
      </ul>
      <small className="ai-note">More looks are being drawn. Until they land, ZIGi wears its original look.</small>
    </fieldset>
    <Choice legend="Animation" value={prefs.animation} options={ZIGI_ANIMATIONS} labels={ANIMATION_LABELS} notes={ANIMATION_NOTES} onChange={animation => save(r => ({...r, animation}))}/>
    <p className="ai-note">Your device&rsquo;s reduced-motion setting and Motion Off in Settings always come first: then ZIGi holds still.</p>
    <Choice legend="Side" value={prefs.side} options={ZIGI_SIDES} labels={SIDE_LABELS} onChange={side => save(r => ({...r, side}))}/>
    <Choice legend="Size" value={prefs.size} options={ZIGI_SIZES} labels={SIZE_LABELS} onChange={size => save(r => ({...r, size}))}/>
    <Choice legend="Greeting" value={prefs.greeting} options={ZIGI_GREETINGS} labels={GREETING_LABELS} notes={GREETING_NOTES} onChange={greeting => save(r => ({...r, greeting}))}/>
    <Switch checked={prefs.edgeTab} onChange={edgeTab => save(r => ({...r, edgeTab}))} label="Edge tab while ZIGi is hidden" note="A small “Show ZIGi” tab at the edge of the screen brings ZIGi back after you hide it. Off: Settings brings it back."/>
    <Switch checked={prefs.knock.enabled} onChange={enabled => save(r => ({...r, knock: {...r.knock, enabled, offer: r.knock?.offer ?? (enabled ? 'accepted' : 'declined')}}))} label="Knock when a reminder is due" note={`ZIGi peeks out above its button and knocks once when a habit, water or one of its weekly check-ins is due: at most ${prefs.knock.maxPerDay} a day, never between ${prefs.knock.quietFrom} and ${prefs.knock.quietTo}, never on private screens or while ZIGi is hidden, and never on Today, where the reminder has its own card. No sound. Off by default.`}/>
    {error && <p role="alert">{error}</p>}
    <p className="zigi-customize-links"><Link className="text-link" href="/app/zigi" onClick={onNavigate}>Meet ZIGi: every state and move →</Link></p>
    {footer}
  </div>;
}
export default ZigiCustomize;

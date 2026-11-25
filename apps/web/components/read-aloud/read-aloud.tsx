'use client';
import {useLocalReadAloud} from './use-local-read-aloud';
import './read-aloud.css';

/**
 * Session AW (programmes; owner decision 1d, amendment 3, ADR-046): "Read aloud" for written text (the meditation guides,
 * the stretches and programme steps), in the device's own voice. Rendered only when this browser has speech synthesis and
 * a voice that runs on this device for the language (`localService === true`); online voices are never offered. Nothing is
 * stored or sent. While it reads: Pause or Resume, and Stop, each a 44 px target. No animation: the "Reading aloud" line
 * is still text, so Motion Off and reduced motion are unaffected.
 */
const WORDS = {
  en: {read: 'Read aloud', pause: 'Pause', resume: 'Resume', stop: 'Stop', reading: 'Reading aloud with this device’s voice.', paused: 'Paused.'},
  nl: {read: 'Voorlezen', pause: 'Pauze', resume: 'Verder', stop: 'Stop', reading: 'Wordt voorgelezen met de stem van dit apparaat.', paused: 'Gepauzeerd.'},
} as const;
export function ReadAloud({text, what, lang = 'en', className = ''}: {
  /** The words to read, or a function that gives them at the moment of the tap. */
  text: string | (() => string);
  /** What is read, for the button's name ("Read aloud: Day 3"). */
  what: string;
  /** The language of the text (and of the buttons): a voice for it is needed. */
  lang?: 'en' | 'nl'; className?: string;
}) {
  const r = useLocalReadAloud(lang), w = WORDS[lang];
  if (!r.available) return null;
  return <div className={`read-aloud ${className}`.trim()} role="group" aria-label={`${w.read}: ${what}`} lang={lang} data-state={r.state}>
    {r.state === 'idle'
      ? <button type="button" className="quiet read-aloud-start" aria-label={`${w.read}: ${what}`} onClick={() => r.speak(typeof text === 'function' ? text() : text)}>{w.read}</button>
      : <>
        {r.state === 'speaking'
          ? <button type="button" className="quiet" aria-label={`${w.pause}: ${what}`} onClick={r.pause}>{w.pause}</button>
          : <button type="button" className="quiet" aria-label={`${w.resume}: ${what}`} onClick={r.resume}>{w.resume}</button>}
        <button type="button" className="quiet" aria-label={`${w.stop}: ${what}`} onClick={r.stop}>{w.stop}</button>
      </>}
    <span className="read-aloud-state" role="status">{r.state === 'speaking' ? w.reading : r.state === 'paused' ? w.paused : ''}</span>
  </div>;
}

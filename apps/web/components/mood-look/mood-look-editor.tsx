'use client';
import {useId, useState, type FormEvent} from 'react';
import {ENERGY} from '../../lib/energy/schema';
import {MAX_MOOD_WORD, MOOD_SYMBOLS, readMoodLook, resetMoodLook, setMoodLook} from '../../lib/daylio/rule';
import {MOOD_WORDS} from '../../lib/wrap-up/engine';
import {plainErrorMessage} from '../../lib/plain-error';
import {useDeviceRecord} from '../ai/use-device-record';
import './mood-look.css';

/**
 * Session AV lane 2 (habits; LEDGER #178, Daylio's custom moods): your own word and symbol for each of the five mood
 * levels, shown wherever the mood is (Health's mood card, the evening wrap-up, ZIGi's check-in, the evening check-in,
 * the Journal). Only the words change: the mood kept is still 1 to 5, so every chart, answer and older build reads the
 * same day. Kept on this device with your Health records. Loaded when its fold opens.
 */
export default function MoodLookEditor() {
  const energy = useDeviceRecord(ENERGY), look = readMoodLook(energy.loaded ? energy.data : null), id = useId();
  const [words, setWords] = useState<string[] | null>(null), [note, setNote] = useState(''), [error, setError] = useState('');
  if (!energy.loaded) return <p className="fine">Opening…</p>;
  const shown = words ?? look.words.map((w, i) => w === MOOD_WORDS[i] ? '' : w);
  const write = (change: Parameters<typeof energy.update>[0], said: string) => { try { energy.update(change); setError(''); setNote(said); return true; } catch (e) { setError(plainErrorMessage(e, 'Not saved on this device. Nothing was changed.')); return false; } };
  function save(e: FormEvent) {
    e.preventDefault();
    if (write(r => shown.reduce((acc, w, i) => setMoodLook(acc, i + 1, {word: w}), r), 'Your mood words are saved.')) setWords(null);
  }
  return <div className="mood-look">
    <p className="fine">Name the five moods your own way, with a symbol if you like. A blank word keeps ZIGoals’ word. The mood kept is still 1 to 5.</p>
    <form className="mood-look-form" onSubmit={save} aria-label="Your mood words">
      {[5, 4, 3, 2, 1].map(level => <fieldset key={level} className="mood-look-row"><legend>Mood {level} of 5 <small>(ZIGoals: {MOOD_WORDS[level - 1]})</small></legend>
        <label className="field"><span>Your word</span><input type="text" maxLength={MAX_MOOD_WORD} autoComplete="off" placeholder={MOOD_WORDS[level - 1]} value={shown[level - 1]} onChange={e => { const next = [...shown]; next[level - 1] = e.target.value; setWords(next); }}/></label>
        <label className="field"><span>Symbol</span><select value={look.symbols[level - 1] ?? ''} onChange={e => write(r => setMoodLook(r, level, {symbol: e.target.value || null}), e.target.value ? `Mood ${level}: symbol ${e.target.value}.` : `Mood ${level}: no symbol.`)}>
          <option value="">None</option>{MOOD_SYMBOLS.map(s => <option key={s} value={s}>{s}</option>)}
        </select></label>
      </fieldset>)}
      <div className="actions"><button type="submit" className="primary">Save my words</button>{look.custom && <button type="button" className="quiet" onClick={() => { if (write(r => resetMoodLook(r), 'Back to ZIGoals’ words, with no symbols.')) setWords(null); }}>Use ZIGoals’ words again</button>}</div>
    </form>
    {error && <p role="alert" id={`${id}-error`}>{error}</p>}
    <p className="fine" role="status" aria-live="polite">{note}</p>
  </div>;
}

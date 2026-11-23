'use client';
import {useEffect, useId, useRef, useState} from 'react';
import {useDeviceRecord} from '../ai/use-device-record';
import {JOURNAL, MAX_TEXT, type JournalEntry} from '../../lib/journal/schema';
import {WRITE_IT_OUT_ID, letGoLine} from '../../lib/journal/write-it-out';
import {journalDay} from '../../lib/journal/journal-day';
import {entranceAllowed} from '../use-entrance';
import {useQuestionLang} from './question-lang';
import './write-it-out.css';

/**
 * Session AV lane 2 (bodymind-r2; LEDGER #231, Reflectly's space to vent): "Write it out", a page that is never saved.
 * What is typed lives only in this component's state — no draft, no storage, nothing sent — and is gone when the page
 * closes. "Let it go" clears it on purpose, with a calm closing line (the words fade first unless motion is off); "Keep as
 * an entry" is the only way it is stored, as an ordinary journal entry. Loaded when its fold opens.
 */
export default function WriteItOut() {
  const journal = useDeviceRecord(JOURNAL), lang = useQuestionLang(), id = useId(), area = useRef<HTMLTextAreaElement>(null);
  const [text, setText] = useState(''), [closing, setClosing] = useState(''), [fading, setFading] = useState(false), [problem, setProblem] = useState('');
  const timer = useRef<number | null>(null);
  useEffect(() => () => { if (timer.current !== null) window.clearTimeout(timer.current); }, []);
  const nl = lang === 'nl';
  const letGo = () => {
    if (!text.trim()) return;
    const line = letGoLine(Date.now(), lang), done = () => { setText(''); setFading(false); setClosing(line); area.current?.focus(); };
    setProblem(''); area.current?.focus(); // the button is disabled while the words fade: focus stays on the page
    if (entranceAllowed()) { setFading(true); timer.current = window.setTimeout(done, 700); } else done();
  };
  const keep = () => {
    const words = text.trim();
    if (!words) return;
    const entry: JournalEntry = {id: crypto.randomUUID(), date: journalDay(), text: words.slice(0, MAX_TEXT), createdAt: new Date().toISOString(), template: WRITE_IT_OUT_ID};
    try { journal.update(c => ({...c, entries: [...c.entries, entry].slice(-5000)})); setText(''); setProblem(''); setClosing(nl ? 'Bewaard als een gewoon dagboekstuk van vandaag.' : 'Kept as an ordinary journal entry for today.'); area.current?.focus(); }
    catch { setProblem(nl ? 'Dit kon niet op dit apparaat worden bewaard. Je woorden staan er nog.' : 'This could not be kept on this device. Your words are still here.'); }
  };
  return <div className="write-it-out">
    <p className="fine">{nl ? 'Schrijf wat je kwijt wilt. Dit wordt nergens bewaard: niet als concept, niet op dit apparaat, nergens heen gestuurd. Sluit je de pagina, dan is het weg.' : 'Write whatever you need to get off your chest. Nothing here is saved: no draft, nothing on this device, nothing sent. Close the page and it is gone.'}</p>
    <label className="field" htmlFor={`${id}-page`}><span>{nl ? 'Schrijf het van je af' : 'Write it out'}</span></label>
    <textarea id={`${id}-page`} ref={area} className="write-it-out-page" data-fading={fading || undefined} value={text} maxLength={MAX_TEXT} rows={8} autoComplete="off" spellCheck={false} data-form-type="other"
      onChange={e => { setText(e.target.value); if (closing) setClosing(''); }}/>
    <div className="write-it-out-actions">
      <button type="button" className="secondary" disabled={!text.trim() || fading} onClick={letGo}>{nl ? 'Laat het gaan' : 'Let it go'}</button>
      <button type="button" className="quiet" disabled={!text.trim() || fading} onClick={keep}>{nl ? 'Bewaar als dagboekstuk' : 'Keep as an entry'}</button>
    </div>
    {problem && <p role="alert">{problem}</p>}
    <p className="write-it-out-closing" role="status" aria-live="polite">{closing}</p>
  </div>;
}

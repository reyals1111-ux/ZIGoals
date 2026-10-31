'use client';
import Link from 'next/link';
import {useId, useMemo, useState, type FormEvent} from 'react';
import {useDeviceRecord} from '../ai/use-device-record';
import {localDate} from '../../lib/local-date';
import {ENERGY, ENERGY_WORDS, rateEnergy} from '../../lib/energy/schema';
import {JOURNAL, MAX_TEXT, type JournalEntry} from '../../lib/journal/schema';
import {followUpFor, patternLine, patterns} from '../../lib/journal/reflect';
import {lineLanguage} from '../../lib/quick-log/multi';
import {zigiSignals} from '../zigi/bus';
import './journal.css';
// Session AK (lane S, item 6): the optional feeling word after the 1–5 (its grid loads when opened).
import {MoodWordsFold} from '../mood-words/mood-words-fold';

/**
 * Session AI (feature 6, the journal and the daily energy rating): today's energy (1–5) in one tap, a few lines of
 * journal, then ZIGi's ONE follow-up question (made on this device from what the entry says; never advice), with room to
 * answer it. Private by default; nothing here is sent anywhere. Used on Today (a For you card) and on the Journal page.
 */
export function JournalCompose({compact = false}: {compact?: boolean}) {
  const journal = useDeviceRecord(JOURNAL), energy = useDeviceRecord(ENERGY), today = localDate(), id = useId();
  const [text, setText] = useState(''), [problem, setProblem] = useState(''), [status, setStatus] = useState(''), [asked, setAsked] = useState<string | null>(null), [answer, setAnswer] = useState('');
  const todayEnergy = energy.data.days[today]?.energy ?? null;
  const pattern = useMemo(() => { const p = patterns(journal.data, energy.data)[0]; return p ? patternLine(p, 'en') : null; }, [journal.data, energy.data]);
  const rate = (n: number) => { try { energy.update(current => rateEnergy(current, today, n, new Date().toISOString())); setStatus(`Energy today: ${ENERGY_WORDS.en[n - 1]}.`); } catch { setStatus('This could not be saved on this device.'); } };
  const save = (event: FormEvent) => {
    event.preventDefault(); setProblem('');
    const words = text.trim();
    if (!words) return setProblem('Write a few words first.');
    const entry: JournalEntry = {id: crypto.randomUUID(), date: today, text: words.slice(0, MAX_TEXT), createdAt: new Date().toISOString()};
    const question = journal.data.followUps ? followUpFor(entry, journal.data.entries, lineLanguage(words)) : null;
    try { journal.update(current => ({...current, entries: [...current.entries, {...entry, ...(question ? {followUp: {question, from: 'device' as const}} : {})}].slice(-5000)})); } catch { return setProblem('This could not be saved on this device. Nothing was changed.'); }
    setText(''); setStatus('Saved in your journal, on this device.'); setAsked(question ? entry.id : null); setAnswer('');
    if (question) zigiSignals.emit('journal_reflecting'); // Session AK Part 12: ZIGi asks its one question (a Studio-4 reaction once its art lands)
  };
  const pending = asked ? journal.data.entries.find(e => e.id === asked) : null;
  const saveAnswer = (event: FormEvent) => {
    event.preventDefault();
    if (!pending || !answer.trim()) return;
    journal.update(current => ({...current, entries: current.entries.map(e => e.id === pending.id && e.followUp ? {...e, followUp: {...e.followUp, answer: answer.trim().slice(0, 2000), answeredAt: new Date().toISOString()}} : e)}));
    setAsked(null); setAnswer(''); setStatus('Your answer is with the entry.');
  };
  if (!journal.loaded || !energy.loaded) return <p className="fine">Loading your journal…</p>;
  return <div className={`journal-compose${compact ? ' journal-compose-compact' : ''}`}>
    <fieldset className="journal-energy"><legend>Energy today</legend>
      {[1, 2, 3, 4, 5].map(n => <label key={n} className="journal-energy-dot" title={ENERGY_WORDS.en[n - 1]}><input type="radio" name={`${id}-energy`} checked={todayEnergy === n} onChange={() => rate(n)}/><span aria-hidden="true">{n}</span><span className="sr-only">{n} of 5, {ENERGY_WORDS.en[n - 1]}</span></label>)}
      <span className="fine journal-energy-word">{todayEnergy ? ENERGY_WORDS.en[todayEnergy - 1] : '1 drained · 5 full of energy'}</span>
    </fieldset>
    {todayEnergy !== null && <MoodWordsFold day={today}/>}
    {!pending && <form onSubmit={save} aria-label="Write in your journal">
      <label className="field"><span>{compact ? 'A few lines about today' : 'Today’s entry'}</span><textarea rows={compact ? 3 : 5} maxLength={MAX_TEXT} value={text} onChange={e => setText(e.target.value)} placeholder="What stood out today?"/></label>
      {problem && <p role="alert">{problem}</p>}
      <div className="journal-actions"><button type="submit" className="primary">Save entry</button>{compact && <Link className="text-link" href="/app/journal">Open your journal</Link>}</div>
    </form>}
    {pending?.followUp && <form className="journal-followup" onSubmit={saveAnswer} aria-label="ZIGi's question">
      <p className="journal-question"><span className="eyebrow">ZIGi asks</span> {pending.followUp.question}</p>
      <label className="field"><span>Your answer — optional</span><textarea rows={2} maxLength={2000} value={answer} onChange={e => setAnswer(e.target.value)}/></label>
      <div className="journal-actions"><button type="submit" className="primary" disabled={!answer.trim()}>Save answer</button><button type="button" className="text-link" onClick={() => setAsked(null)}>Not now</button></div>
    </form>}
    <p className="journal-status" role="status" aria-live="polite">{status}</p>
    {pattern && <p className="journal-pattern"><span className="eyebrow">A pattern</span> {pattern}</p>}
  </div>;
}

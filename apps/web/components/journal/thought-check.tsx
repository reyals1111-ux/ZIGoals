'use client';
import {useId, useMemo, useState} from 'react';
import {useDeviceRecord} from '../ai/use-device-record';
import {JOURNAL, MAX_TEXT, type JournalEntry} from '../../lib/journal/schema';
import {possibleTraps, THOUGHT_CHECK_ID, thoughtEntryText, TRAPS, trapById} from '../../lib/journal/thinking-traps';
import {journalDay} from '../../lib/journal/journal-day';
import {useQuestionLang} from './question-lang';
import './thought-check.css';

/**
 * Session AV lane 2 (bodymind-r2; LEDGER #233, Moodnotes' thinking traps and thought checker): Journal → Write → "Check a
 * thought". Four short parts — what happened, the thought, any thinking traps that fit (twelve, each with one plain line;
 * the ones whose usual words appear in the thought are pointed out, never ticked for the person), and another way to see
 * it, with the chosen traps' questions as gentle prompts — saved as an ordinary journal entry. Self-reflection in plain
 * words, in English or Dutch (the daily question's language): never a diagnosis, a treatment or medical advice. Nothing is
 * kept until "Save as an entry". Loaded when its fold opens.
 */
export default function ThoughtCheck() {
  const journal = useDeviceRecord(JOURNAL), lang = useQuestionLang(), id = useId(), nl = lang === 'nl';
  const [situation, setSituation] = useState(''), [thought, setThought] = useState(''), [traps, setTraps] = useState<string[]>([]), [other, setOther] = useState('');
  const [said, setSaid] = useState(''), [problem, setProblem] = useState('');
  const hints = useMemo(() => new Set(possibleTraps(thought)), [thought]);
  const toggle = (trap: string, on: boolean) => setTraps(list => on ? [...list, trap] : list.filter(x => x !== trap));
  const save = () => {
    let text = '';
    try { text = thoughtEntryText({situation, thought, traps, other}, lang); } catch (e) { setProblem(e instanceof Error ? e.message : ''); document.getElementById(`${id}-thought`)?.focus(); return; }
    const entry: JournalEntry = {id: crypto.randomUUID(), date: journalDay(), text: text.slice(0, MAX_TEXT), createdAt: new Date().toISOString(), template: THOUGHT_CHECK_ID};
    try { journal.update(c => ({...c, entries: [...c.entries, entry].slice(-5000)})); setSituation(''); setThought(''); setTraps([]); setOther(''); setProblem(''); setSaid(nl ? 'Bewaard als dagboekstuk van vandaag. Goed dat je er even bij stilstond.' : 'Saved as today’s journal entry. Well done for stopping to look at it.'); document.getElementById(`${id}-situation`)?.focus(); }
    catch { setProblem(nl ? 'Dit kon niet op dit apparaat worden bewaard. Je woorden staan er nog.' : 'This could not be kept on this device. Your words are still here.'); }
  };
  return <form className="thought-check" lang={lang} onSubmit={e => { e.preventDefault(); save(); }}>
    <p className="fine">{nl ? 'Een korte oefening om naar een gedachte te kijken: wat er gebeurde, de gedachte, welke denkvalkuilen passen, en een andere kijk. Zelfreflectie in gewone woorden, geen diagnose of behandeling.' : 'A short exercise to look at a thought: what happened, the thought, which thinking traps fit, and another way to see it. Self-reflection in plain words, not a diagnosis or a treatment.'}</p>
    <label className="field"><span>{nl ? '1. Wat gebeurde er?' : '1. What happened?'}</span><textarea id={`${id}-situation`} rows={2} maxLength={1000} value={situation} onChange={e => setSituation(e.target.value)}/></label>
    <label className="field"><span>{nl ? '2. Welke gedachte kwam er op?' : '2. What went through your mind?'}</span><textarea id={`${id}-thought`} rows={2} maxLength={1000} value={thought} onChange={e => { setThought(e.target.value); if (problem) setProblem(''); }} aria-describedby={`${id}-hints`}/></label>
    <p id={`${id}-hints`} className="fine thought-check-hints" aria-live="polite">{hints.size ? (nl ? `Woorden in je gedachte passen soms bij: ${[...hints].map(h => trapById(h)!.name.nl).join(', ')}. Jij kiest of dat klopt.` : `Some words in your thought often go with: ${[...hints].map(h => trapById(h)!.name.en).join(', ')}. You decide whether that fits.`) : ''}</p>
    <fieldset className="thought-check-traps"><legend>{nl ? '3. Zie je een denkvalkuil? (kies er zoveel als passen, of geen)' : '3. Do you notice a thinking trap? (any that fit, or none)'}</legend>
      <ul>{TRAPS.map(x => <li key={x.id}><label><input type="checkbox" checked={traps.includes(x.id)} onChange={e => toggle(x.id, e.target.checked)}/><span><strong>{x.name[lang]}</strong>{hints.has(x.id) && <span className="thought-check-hint"> · {nl ? 'past mogelijk bij je woorden' : 'may fit your words'}</span>}<span className="fine thought-check-line">{x.line[lang]}</span></span></label></li>)}</ul>
    </fieldset>
    <label className="field"><span>{nl ? '4. Een andere kijk' : '4. Another way to see it'}</span><textarea rows={3} maxLength={1500} value={other} onChange={e => setOther(e.target.value)} aria-describedby={`${id}-asks`}/></label>
    <ul id={`${id}-asks`} className="fine thought-check-asks">{(traps.length ? traps.map(x => trapById(x)!.ask[lang]) : [nl ? 'Wat zou je tegen een goede vriend met deze gedachte zeggen?' : 'What would you say to a good friend with this thought?']).map(q => <li key={q}>{q}</li>)}</ul>
    {problem && <p role="alert">{problem}</p>}
    <div className="thought-check-actions"><button type="submit" className="primary">{nl ? 'Bewaar als dagboekstuk' : 'Save as an entry'}</button></div>
    <p className="fine" role="status" aria-live="polite">{said}</p>
    <p className="fine">{nl ? 'Blijven gedachten als deze lang zwaar wegen, dan kan praten met iemand die je vertrouwt of met een zorgverlener helpen.' : 'If thoughts like these weigh on you for a long time, talking to someone you trust or a health professional can help.'}</p>
  </form>;
}

'use client';
import {useId, useMemo, useState, type ReactNode} from 'react';
import {parseRecurrence, type HabitSchedule, type PartOfDay} from '../../lib/recurrence-phrase/parse';
import {phraseChips} from '../../lib/recurrence-phrase/describe';
import './recurrence-phrase.css';

/**
 * Session AK (COMPETITORS.md G3, item 21): "Type it" for a new habit's schedule. The phrase is read on this device by a
 * fixed English grammar (lib/recurrence-phrase); what it understood shows as chips, and words it does not know are marked
 * and listed, never guessed. Nothing changes in the form until "Use this"; the form's own fields stay the place to edit.
 * Loaded only when the habit form opens it.
 */
export type PhraseChoice = {schedule: HabitSchedule; time: string | null; partOfDay: PartOfDay | null};
export default function RecurrencePhrase({today, onUse}: {today: string; onUse: (choice: PhraseChoice) => void}) {
  const id = useId(), [text, setText] = useState(''), [said, setSaid] = useState('');
  const result = useMemo(() => parseRecurrence(text, today), [text, today]);
  const chips = phraseChips(result), typed = text.trim() !== '';
  const use = () => {
    if (!result.schedule) return;
    onUse({schedule: result.schedule, time: result.time, partOfDay: result.partOfDay});
    setSaid(`Schedule set: ${chips.map(c => c.text).join(' · ')}. Check it below before you save.`);
  };
  return <div className="recurrence-phrase" role="group" aria-labelledby={`${id}-label`}>
    <label className="field" id={`${id}-label`}>Type when (optional)
      <input type="text" autoComplete="off" maxLength={120} value={text} placeholder="every other tue 7am, 3x a week, mon wed fri"
        aria-describedby={`${id}-hint ${id}-read`} onChange={e => { setText(e.target.value); setSaid(''); }}
        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); use(); } }}/>
    </label>
    <p className="fine" id={`${id}-hint`}>In English, on this device: days (mon wed fri, weekdays), how often (3x a week, every other day), dates (the 1st and 15th) and a time (7am, at 19:30).</p>
    <div id={`${id}-read`} aria-live="polite">
      {typed && <p className="recurrence-phrase-echo" aria-label="What was read">{result.tokens.map((t, i) => t.role === 'unknown'
        ? <mark key={i} className="recurrence-phrase-unknown">{t.text}<span className="sr-only"> (not understood)</span></mark>
        : <span key={i} className={t.role === 'filler' ? 'recurrence-phrase-filler' : 'recurrence-phrase-known'}>{t.text}</span>).reduce<ReactNode[]>((all, node, i) => i ? [...all, ' ', node] : [node], [])}</p>}
      {chips.length > 0 && <ul className="recurrence-phrase-chips" aria-label="Understood">{chips.map(c => <li key={c.kind}><span aria-hidden="true">✓ </span>{c.text}</li>)}</ul>}
      {result.problem && <p className="recurrence-phrase-problem">{result.problem}</p>}
      {result.unknown.length > 0 && <p className="fine">Not understood, so left out: {result.unknown.map(w => `“${w}”`).join(', ')}.</p>}
      {typed && !result.problem && !result.schedule && <p className="fine">No schedule found yet. Try “weekdays”, “3x a week” or “every other tue”.</p>}
    </div>
    <div className="actions"><button type="button" className="secondary" disabled={!result.schedule} onClick={use}>Use this schedule</button></div>
    {said && <p className="fine" role="status">{said}</p>}
  </div>;
}

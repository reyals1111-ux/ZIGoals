'use client';
import {useId, useState, type FormEvent} from 'react';
import {useDeviceRecord} from '../ai/use-device-record';
import {JOURNAL, type JournalEntry} from '../../lib/journal/schema';
import {goalLine, goalReachedWords, readGoal, setWordGoal, wordsOn} from '../../lib/journal/word-goal';
import {wordCount} from '../../lib/journal/stats';
import {showStatus} from '../ui/undo-toast';

/**
 * Session AV lane 2 (r6-notes; LEDGER #400, Diarium): the daily word goal. `WordGoalLine` (lazy, in Write, only while a
 * goal is set) says today's words against it as the entry is written — the words saved today plus the ones being typed —
 * and never warns; `WordGoalSettings` (lazy, in its fold under Entries) sets the goal or turns it off.
 */
export default function WordGoalLine({entries, goal, today, draft}: {entries: readonly Pick<JournalEntry, 'date' | 'text'>[]; goal: number; today: string; draft: string}) {
  const line = goalLine(wordsOn(entries, today) + (draft.trim() ? wordCount(draft) : 0), goal);
  // Review b6n B6N-7: the count is not a live region (it changes with every word typed); a status says only once that the
  // goal is reached — its words stay the same while more is written, so it is announced once.
  return <>
    <p className="fine journal-word-goal" data-met={line.met ? '' : undefined}>{line.text}</p>
    <span className="sr-only" role="status">{goalReachedWords(line.met, goal)}</span>
  </>;
}
export function WordGoalSettings() {
  const journal = useDeviceRecord(JOURNAL), id = useId(), goal = journal.data.wordGoal ?? null;
  const [text, setText] = useState(goal ? String(goal) : ''), [problem, setProblem] = useState('');
  const save = (event: FormEvent) => {
    event.preventDefault();
    const n = readGoal(text);
    if (typeof n === 'string') { setProblem(n); return; }
    try { journal.update(c => setWordGoal(c, n)); setProblem(''); showStatus(`Your goal is ${n.toLocaleString('en-US')} words a day. Write shows today’s words beside it; the calendar marks the days it was met.`); }
    catch { setProblem('This could not be saved on this device.'); }
  };
  const off = () => { try { journal.update(c => setWordGoal(c, null)); setText(''); showStatus('No word goal: nothing is shown against your words.'); } catch { setProblem('This could not be saved on this device.'); } };
  return <form className="journal-word-goal-form" onSubmit={save} aria-label="Daily word goal" noValidate>
    <p className="fine">A number of words to aim for each day, if that helps you write. Today&rsquo;s words show beside it while you write, and the calendar marks the days you reached it. Nothing is said on a day you do not.</p>
    <label className="field"><span>Words a day</span><input inputMode="numeric" value={text} maxLength={4} onChange={e => { setText(e.target.value.replace(/\D/g, '')); setProblem(''); }} placeholder="200" aria-invalid={problem ? true : undefined} aria-describedby={problem ? `${id}-p` : undefined}/></label>
    {problem && <p id={`${id}-p`} className="field-error" role="alert">{problem}</p>}
    <div className="journal-actions"><button type="submit" className="secondary">{goal ? 'Change the goal' : 'Set the goal'}</button>{goal && <button type="button" className="quiet" onClick={off}>No goal</button>}</div>
  </form>;
}

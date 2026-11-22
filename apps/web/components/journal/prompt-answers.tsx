'use client';
import {useEffect, useId, useMemo, useRef, useState} from 'react';
import type {Journal} from '../../lib/journal/schema';
import {answersTo, promptsUsed} from '../../lib/journal/prompt-answers';
import {formatDate, formatNumber} from '../../lib/visual-format';
import {useQuestionLang} from './question-lang';

/**
 * Session AV lane 2 (r3-notes; LEDGER #265, Grid Diary's Explore and Stoic's search by prompt): "Every answer to a prompt"
 * — choose a template your entries began from, and see what you wrote under each of its headings, oldest first, each
 * answer with its day (a button that shows that day's entries). Entries whose headings were changed are listed under
 * "Written in its own way". Read from the entries on this device; nothing is stored. Loaded when its fold opens.
 */
export default function PromptAnswers({journal, picked, onDay}: {journal: Pick<Journal, 'entries' | 'templates'>; picked: string | null; onDay: (day: string) => void}) {
  const lang = useQuestionLang(), id = useId(), used = useMemo(() => promptsUsed(journal, lang), [journal, lang]);
  const [choice, setChoice] = useState<string>(picked && used.some(u => u.id === picked) ? picked : used[0]?.id ?? '');
  const head = useRef<HTMLHeadingElement>(null);
  useEffect(() => { if (picked && used.some(u => u.id === picked)) { setChoice(picked); requestAnimationFrame(() => head.current?.focus()); } }, [picked, used]);
  const found = useMemo(() => choice ? answersTo(journal, choice, lang) : null, [journal, choice, lang]);
  if (!used.length) return <p className="fine">No entry began from a prompt yet. In Write, open Start from a prompt and choose one; once you have written from it a few times, every answer to each of its headings shows here, oldest first.</p>;
  return <div className="prompt-answers">
    <label className="field"><span>Prompt</span><select id={`${id}-pick`} value={choice} onChange={e => setChoice(e.target.value)}>{used.map(u => <option key={u.id} value={u.id}>{u.title} ({u.count === 1 ? '1 entry' : `${formatNumber(u.count)} entries`})</option>)}</select></label>
    {found && <>
      <h3 ref={head} tabIndex={-1} className="prompt-answers-title" lang={lang}>{found.template.title[lang]} <span className="fine">· {found.entries === 1 ? '1 entry' : `${formatNumber(found.entries)} entries`}, oldest first</span></h3>
      {found.headings.map((h, i) => <section key={i} className="prompt-answers-heading" aria-labelledby={`${id}-h${i}`}>
        <h4 id={`${id}-h${i}`} lang={lang}>{h.heading}</h4>
        {h.answers.length ? <ol className="prompt-answers-list">{h.answers.map(a => <li key={`${a.entryId}-${i}`}>
          <button type="button" className="text-link prompt-answers-day" aria-label={`${formatDate(a.date, {weekday: true})}: show that day’s entries`} onClick={() => onDay(a.date)}>{formatDate(a.date)}</button>
          <p className="prompt-answers-words">{a.words.replace(/\s*\(SHOWCASE DATA\)\s*$/, '')}</p>
        </li>)}</ol> : <p className="fine">Nothing written under this heading yet.</p>}
      </section>)}
      {/* Session AV lane 2 (review B3C-3): a letter still folded away is counted with its day, never its words. */}
      {found.sealed.length > 0 && <p className="fine prompt-answers-sealed">{found.sealed.length === 1 ? `1 letter is folded away until ${formatDate(found.sealed[0]!)}; its words show here from that day.` : `${formatNumber(found.sealed.length)} letters are folded away, the next until ${formatDate(found.sealed[0]!)}; each letter’s words show here from its day.`}</p>}
      {found.unsplit.length > 0 && <section className="prompt-answers-heading" aria-labelledby={`${id}-own`}><h4 id={`${id}-own`}>Written in its own way</h4>
        <p className="fine">These entries began from the prompt, but its headings were changed, so they are shown whole.</p>
        <ol className="prompt-answers-list">{found.unsplit.map(e => <li key={e.id}><button type="button" className="text-link prompt-answers-day" aria-label={`${formatDate(e.date, {weekday: true})}: show that day’s entries`} onClick={() => onDay(e.date)}>{formatDate(e.date)}</button><p className="prompt-answers-words">{e.text}</p></li>)}</ol>
      </section>}
    </>}
  </div>;
}

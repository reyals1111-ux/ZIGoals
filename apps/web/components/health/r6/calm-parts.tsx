'use client';
import {useEffect, useId, useRef, useState} from 'react';
import {GROUNDING, GROUNDING_WORDS, GROUNDING_WORD_MAX, groundingLine, stepWords} from '../../../lib/calm/grounding';
import {HELP_LINE} from '../../../lib/calm/help-line';
import {addLowDayLine, LOW_DAY, LOW_DAY_LINE_MAX, LOW_DAY_MAX, LOW_DAY_NOTE_MAX, LOW_DAY_PARTS, LOW_DAY_WORDS, removeLowDayLine, restoreLowDayLine, setLowDayNote, type LowDayPart} from '../../../lib/calm/low-day';
import {JOURNAL} from '../../../lib/journal/schema';
import {localDate} from '../../../lib/local-date';
import {saveGroundingLine} from '../../../lib/calm/grounding-save';
import {getAppStorage} from '../../../lib/showcase-storage';
import {ZIGI_STORE_EVENT} from '../../../lib/ai/store/keys';
import {useDeviceRecord} from '../../ai/use-device-record';
import {showUndo} from '../../ui/undo-toast';
import './body-r6.css';

/**
 * Session AV lane 2, round 6 (r6-body; Moodfit): Calm's round 6 parts in Health → Meditation, one lazy chunk —
 * - `grounding` (LEDGER #414): "Five, four, three, two, one", one sense at a time, a word each or skipped, English or
 *   Dutch; nothing kept unless saved as a journal line. A fixed exercise: no reading of the answers.
 * - `low-day` (LEDGER #416): "On a low day", the person's own page written on a good day — small things that help,
 *   people they could message, things that can wait, a line of their own — with the help lines the app already shows.
 *   Only their own words; never sent to ZIGi's AI; kept on this device (`zigoals:low-day:v1`).
 */
export default function CalmR6({part}: {part: 'grounding' | 'low-day'}) {
  return part === 'grounding' ? <Grounding/> : <LowDayPage/>;
}

function Grounding() {
  const [lang, setLang] = useState<'en' | 'nl'>('en'), [step, setStep] = useState(0), [answers, setAnswers] = useState<string[][]>(() => GROUNDING.map(s => Array.from({length: s.count}, () => ''))), [status, setStatus] = useState('');
  const journal = useDeviceRecord(JOURNAL), heading = useRef<HTMLHeadingElement>(null), first = useRef(true), w = GROUNDING_WORDS[lang], id = useId();
  useEffect(() => { if (first.current) { first.current = false; return; } heading.current?.focus(); }, [step]);
  const s = GROUNDING[step], line = groundingLine(answers, lang);
  const restart = () => { setAnswers(GROUNDING.map(x => Array.from({length: x.count}, () => ''))); setStatus(''); setStep(0); };
  function save() {
    if (!line) { setStatus(w.nothing); return; }
    // Review B6P-1: an unreadable journal is never written over; the words stay on screen.
    try {
      if (saveGroundingLine(getAppStorage(), line, localDate()) === 'unreadable') { setStatus(w.unreadable); return; }
      window.dispatchEvent(new CustomEvent(ZIGI_STORE_EVENT, {detail: JOURNAL.key})); setStatus(w.saved);
    } catch { setStatus(lang === 'nl' ? 'Dit kon niet op dit apparaat worden bewaard. Er is niets veranderd.' : 'This could not be saved on this device. Nothing was changed.'); }
  }
  return <div className="r6-grounding" lang={lang}>
    <p className="fine">{w.about}</p>
    <p><button type="button" className="quiet" lang={lang === 'en' ? 'nl' : 'en'} onClick={() => setLang(lang === 'en' ? 'nl' : 'en')}>{w.language}</button></p>
    {s ? <section className="r6-grounding-step" aria-labelledby={`${id}-step`}>
      <p className="fine">{stepWords(lang, step + 1)}</p>
      <h4 id={`${id}-step`} ref={heading} tabIndex={-1}><span className="r6-grounding-count" aria-hidden="true">{s.count}</span> {lang === 'nl' ? s.nl : s.en}</h4>
      <div className="r6-grounding-words">{answers[step]!.map((value, k) => <label key={k} className="field"><span>{w.word} {k + 1}{s.count > 1 ? ` / ${s.count}` : ''}</span><input type="text" value={value} maxLength={GROUNDING_WORD_MAX} autoComplete="off" onChange={e => { const v = e.target.value; setAnswers(all => all.map((list, i) => i === step ? list.map((x, j) => j === k ? v : x) : list)); }}/></label>)}</div>
      <div className="r6-row">
        <button type="button" className="primary" onClick={() => setStep(step + 1)}>{w.next}</button>
        <button type="button" className="secondary" onClick={() => { setAnswers(all => all.map((list, i) => i === step ? list.map(() => '') : list)); setStep(step + 1); }}>{w.skip}</button>
        {step > 0 && <button type="button" className="quiet" onClick={() => setStep(step - 1)}>{w.back}</button>}
      </div>
    </section> : <section className="r6-grounding-step" aria-labelledby={`${id}-done`}>
      <h4 id={`${id}-done`} ref={heading} tabIndex={-1}>{w.done}</h4>
      {line && <p className="fine">{line}</p>}
      {line && journal.loaded && journal.unreadable && <p className="fine">{w.unreadable}</p>}
      <div className="r6-row">{line && !(journal.loaded && journal.unreadable) && <button type="button" className="secondary" onClick={save}>{w.save}</button>}<button type="button" className="quiet" onClick={restart}>{w.again}</button></div>
    </section>}
    <p className="fine" role="status" aria-live="polite">{status}</p>
  </div>;
}

function LowDayPage() {
  const rec = useDeviceRecord(LOW_DAY), [drafts, setDrafts] = useState<Record<LowDayPart, string>>({helps: '', people: '', later: ''}), [note, setNote] = useState<string | null>(null), [status, setStatus] = useState(''), box = useRef<HTMLDivElement>(null), id = useId();
  if (!rec.loaded) return <p className="fine">Opening your page…</p>;
  if (rec.unreadable) return <p role="alert">Your “On a low day” page on this device could not be read. It was not changed.</p>;
  const r = rec.data, empty = LOW_DAY_PARTS.every(p => !(r[p] ?? []).length) && !r.note;
  const save = (change: Parameters<typeof rec.update>[0], said: string) => { try { rec.update(change); setStatus(said); return true; } catch (cause) { setStatus(cause instanceof Error ? cause.message : 'This could not be saved on this device.'); return false; } };
  const add = (part: LowDayPart) => { const text = drafts[part]; if (save(x => addLowDayLine(x, part, text, new Date()), 'Added to your page.')) setDrafts(d => ({...d, [part]: ''})); };
  const remove = (part: LowDayPart, line: string) => {
    const at = (r[part] ?? []).indexOf(line);
    if (!save(x => removeLowDayLine(x, part, line, new Date()), `“${line}” is removed.`)) return;
    showUndo({message: `“${line}” is removed from your page.`, restore: () => rec.update(x => restoreLowDayLine(x, part, line, at, new Date())), undone: `“${line}” is back.`});
    requestAnimationFrame(() => box.current?.querySelector<HTMLInputElement>(`#${CSS.escape(`${id}-${part}`)}`)?.focus());
  };
  return <div className="r6-low-day" ref={box}>
    <p className="fine">Your own page for a harder day, written on a good one: the small things that help you, people you could message, and what can wait. Only your words; ZIGoals adds nothing to it. It stays on this device and is never sent to ZIGi’s AI.</p>
    {empty && <p className="fine">Nothing written yet. Start with one small thing that helps you, like a shower, a walk or a song.</p>}
    {LOW_DAY_PARTS.map(part => { const lines = r[part] ?? [], w = LOW_DAY_WORDS[part]; return <section key={part} aria-labelledby={`${id}-${part}-title`}>
      <h4 id={`${id}-${part}-title`} className="r6-subtitle">{w.title}</h4>
      {lines.length > 0 && <ul className="r6-lines">{lines.map(line => <li key={line}><span>{line}</span><button type="button" className="quiet" aria-label={`Remove “${line}”`} onClick={() => remove(part, line)}>Remove</button></li>)}</ul>}
      {lines.length < LOW_DAY_MAX[part] && <div className="r6-add">
        <label className="field" htmlFor={`${id}-${part}`}><span>{w.add} ({lines.length} of {LOW_DAY_MAX[part]})</span><input id={`${id}-${part}`} type="text" value={drafts[part]} maxLength={LOW_DAY_LINE_MAX} placeholder={w.hint} autoComplete="off" onChange={e => { const v = e.target.value; setDrafts(d => ({...d, [part]: v})); }} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); add(part); } }}/></label>
        <button type="button" className="secondary" onClick={() => add(part)}>Add<span className="sr-only"> to “{w.title}”</span></button>
      </div>}
    </section>; })}
    <section aria-labelledby={`${id}-note-title`}>
      <h4 id={`${id}-note-title`} className="r6-subtitle">A line for yourself</h4>
      {note === null ? <>{r.note && <p className="r6-help-line" dir="auto">{r.note}</p>}<button type="button" className="secondary" onClick={() => setNote(r.note ?? '')}>{r.note ? 'Change your line' : 'Write a line for yourself'}</button></>
        : <form className="r6-add" onSubmit={e => { e.preventDefault(); if (save(x => setLowDayNote(x, note, new Date()), note.trim() ? 'Your line is kept.' : 'Your line is removed.')) setNote(null); }}>
          <label className="field"><span>A line for yourself, such as “This passes. Be kind to yourself today.”</span><textarea rows={2} maxLength={LOW_DAY_NOTE_MAX} value={note} autoFocus onChange={e => setNote(e.target.value)}/></label>
          <div className="r6-row"><button type="submit" className="primary">Save</button><button type="button" className="quiet" onClick={() => setNote(null)}>Cancel</button></div>
        </form>}
    </section>
    <p className="r6-help-line">{HELP_LINE.en}</p>
    <p className="fine" role="status" aria-live="polite">{status}</p>
  </div>;
}

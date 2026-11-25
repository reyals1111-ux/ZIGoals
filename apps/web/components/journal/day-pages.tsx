'use client';
import Link from 'next/link';
import {useId, useMemo, useState, type FormEvent} from 'react';
import {useDeviceRecord, type DeviceRecordState} from '../ai/use-device-record';
import {JOURNAL, removeJournalEntry, type Journal} from '../../lib/journal/schema';
import {journalDay} from '../../lib/journal/journal-day';
import {NOTIFY_PREFS, typeOn} from '../../lib/notify/prefs';
import {reminderOf, withReminder} from '../../lib/journal/reminder';
import {undoEntryChange} from '../../lib/journal/versions';
import {DEFAULT_MORNING, PART_WORDS, dayPageOf, dayPagesOn, morningReminderOf, partAnswers, partToOpen, partWritten, questionsFor, withDayPages, withMorningReminder, writePart, type DayPart} from '../../lib/journal/day-pages';
import {showStatus, showUndo} from '../ui/undo-toast';
import {SecretGuard} from '../secret-guard/secret-guard';
import {useQuestionLang} from './question-lang';

/**
 * Session AW (x3; LEDGER #444, The Five Minute Journal): "Morning and evening" in the Journal's Write panel (a fold, loaded
 * when opened; open by itself once switched on). Off: what it is and the switch. On: today's page in two parts — the
 * morning page with its questions (the person's own or the usual two), and the evening page with "This morning you
 * wrote …" above its own two questions. The day stays one entry (lib/journal/day-pages.ts). Its settings hold the
 * questions and the two reminders, both off until chosen: the morning page's own, and the evening page's (the journal's
 * reminder to write). Nothing is sent anywhere; the reminders come through this device's notifications.
 */
const newId = () => (globalThis.crypto?.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`);
type JournalState = DeviceRecordState<Journal>;
/** The journal is the page's own, already read (a fresh read here would start empty and fill the answers from nothing). */
function PartForm({journal, part, onSaved}: {journal: JournalState; part: DayPart; onSaved: (part: DayPart) => void}) {
  const lang = useQuestionLang(), today = journalDay(), id = useId();
  const page = dayPageOf(journal.data, today), questions = questionsFor(journal.data, part, lang), kept = partAnswers(page, part);
  const [answers, setAnswers] = useState<string[]>(() => questions.map(q => kept.find(k => k.q === q)?.a ?? ''));
  const [problem, setProblem] = useState('');
  const morning = partAnswers(page, 'morning');
  const save = (event: FormEvent) => {
    event.preventDefault(); setProblem('');
    let undo: ReturnType<typeof writePart>['undo'] | null = null;
    try { journal.update(c => { const out = writePart(c, {day: today, part, answers: questions.map((q, i) => ({q, a: answers[i] ?? ''})), lang, now: new Date().toISOString(), id: newId()}); undo = out.undo; return out.journal; }); }
    catch (e) { setProblem(e instanceof Error ? e.message : 'This could not be saved on this device. Nothing was changed.'); return; }
    const done = undo as ReturnType<typeof writePart>['undo'] | null;
    showUndo({message: part === 'morning' ? 'Your morning page is saved in today’s entry.' : 'Your evening page is saved in today’s entry.', undone: 'Today’s page is back as it was.',
      restore: () => journal.update(c => !done ? c : done.kind === 'made' ? removeJournalEntry(c, done.entryId) : undoEntryChange(c, done.undo))});
    onSaved(part);
  };
  return <form className="day-pages-form" onSubmit={save} aria-label={PART_WORDS[part].en}>
    {part === 'evening' && <div className="day-pages-morning" role="group" aria-labelledby={`${id}-morning`}>
      <p id={`${id}-morning`} className="day-pages-morning-title">This morning you wrote</p>
      {morning.length ? <dl>{morning.map(m => <div key={m.q}><dt lang={lang}>{m.q}</dt><dd>{m.a}</dd></div>)}</dl>
        : <p className="fine">Nothing on this morning&rsquo;s page yet. You can still write the evening page; the morning page waits for tomorrow.</p>}
    </div>}
    {questions.map((q, i) => <label key={`${part}-${q}`} className="field"><span lang={lang}>{q}</span><textarea rows={2} maxLength={900} value={answers[i] ?? ''} onChange={e => setAnswers(list => questions.map((_, k) => k === i ? e.target.value : list[k] ?? ''))}/></label>)}
    <SecretGuard text={answers.join('\n')} onRemove={() => setAnswers(questions.map(() => ''))}/>
    {problem && <p className="field-error" role="alert">{problem}</p>}
    <div className="journal-actions"><button type="submit" className="primary">{part === 'morning' ? 'Save the morning page' : 'Save the evening page'}</button></div>
  </form>;
}
function Reminder({journal, which}: {journal: JournalState; which: DayPart}) {
  const prefs = useDeviceRecord(NOTIFY_PREFS);
  const [said, setSaid] = useState(''), [problem, setProblem] = useState('');
  const r = which === 'morning' ? morningReminderOf(journal.data) : reminderOf(journal.data), word = which === 'morning' ? 'morning page' : 'evening page';
  const change = (patch: {on?: boolean; time?: string}, words: string) => {
    setProblem('');
    try { journal.update(c => which === 'morning' ? withMorningReminder(c, patch) : withReminder(c, patch)); setSaid(words); } catch (e) { setProblem(e instanceof Error ? e.message : 'This could not be kept on this device.'); }
  };
  const here = prefs.loaded && prefs.data.here === true, muted = prefs.loaded && !typeOn(prefs.data, 'journal');
  return <div className="day-pages-reminder" role="group" aria-label={`Reminder for the ${word}`}>
    <label className="switch-row"><input type="checkbox" checked={r.on} onChange={e => change({on: e.target.checked}, e.target.checked ? `Reminder for the ${word} on: ${r.time}.` : `Reminder for the ${word} off.`)}/> <span>Remind me to write the {word}</span></label>
    <label className="field day-pages-time"><span>At</span><input type="time" value={r.time} required onChange={e => { if (e.target.value) change({time: e.target.value}, `Reminder for the ${word} at ${e.target.value}.`); }}/></label>
    {r.on && !here && <p className="fine">Notifications are off on this device, so the reminder cannot reach you yet. Turn them on in <Link className="text-link" href="/app/settings#notifications">Settings → Notifications</Link>.</p>}
    {r.on && here && muted && <p className="fine">&ldquo;Reminder to write&rdquo; is switched off in <Link className="text-link" href="/app/settings#notifications">Settings → Notifications</Link>.</p>}
    {problem && <p className="field-error" role="alert">{problem}</p>}
    <p className="fine" role="status" aria-live="polite">{said}</p>
  </div>;
}
export default function DayPages() {
  const journal = useDeviceRecord(JOURNAL), lang = useQuestionLang(), today = journalDay(), id = useId();
  const on = dayPagesOn(journal.data);
  const [part, setPart] = useState<DayPart | null>(null), [saved, setSaved] = useState(0);
  const shownPart = part ?? partToOpen(journal.data, today, new Date().getHours());
  const page = dayPageOf(journal.data, today), stamp = page?.updatedAt ?? page?.createdAt ?? 'none';
  const ownText = useMemo(() => (journal.data.dayPages?.questions ?? []).join('\n'), [journal.data.dayPages?.questions]);
  const [questionsText, setQuestionsText] = useState<string | null>(null), [settingsSaid, setSettingsSaid] = useState(''), [problem, setProblem] = useState('');
  if (!journal.loaded) return <p className="fine">Loading your journal…</p>;
  const turn = (value: boolean) => {
    try { journal.update(c => withDayPages(c, {on: value})); setSettingsSaid(value ? 'Morning and evening is on: today’s page has a morning part and an evening part.' : 'Morning and evening is off. Your pages stay in your entries.'); } catch { setSettingsSaid('This choice could not be kept on this device.'); }
  };
  const saveQuestions = (event: FormEvent) => {
    event.preventDefault(); setProblem('');
    try { journal.update(c => withDayPages(c, {questionsText: questionsText ?? ownText})); setQuestionsText(null); showStatus((questionsText ?? ownText).trim() ? 'Your morning questions are kept.' : 'The morning page asks the usual two questions again.'); }
    catch (e) { setProblem(e instanceof Error ? e.message : 'This could not be kept on this device.'); }
  };
  const written = (p: DayPart) => partWritten(journal.data, today, p);
  return <div className="day-pages">
    {!on && <p className="fine">Write each day in two parts: a morning page with a few questions, and an evening page that shows what the morning said above its own. The day stays one entry, and each part can have its own reminder.</p>}
    <label className="switch-row"><input type="checkbox" checked={on} onChange={e => turn(e.target.checked)}/> <span>Write each day as a morning page and an evening page</span></label>
    <p className="fine" role="status" aria-live="polite">{settingsSaid}</p>
    {on && <>
      <div className="day-pages-parts" role="group" aria-label="Today’s page">
        {(['morning', 'evening'] as const).map(p => <button key={p} type="button" className="quiet" aria-pressed={shownPart === p} onClick={() => setPart(p)}>{PART_WORDS[p].en}{written(p) ? <span className="fine"> · written</span> : null}</button>)}
      </div>
      <PartForm journal={journal} key={`${shownPart}-${stamp}-${lang}-${saved}`} part={shownPart} onSaved={p => { setSaved(n => n + 1); if (p === 'morning') setPart('morning'); }}/>
      <details className="prompt-fold day-pages-settings"><summary>Questions and reminders <span className="fine">· {journal.data.dayPages?.questions?.length ? 'your own morning questions' : 'the usual questions'}</span></summary>
        <form onSubmit={saveQuestions} aria-labelledby={`${id}-q`}>
          <label className="field"><span id={`${id}-q`}>Your morning questions, one a line</span><textarea rows={3} maxLength={700} value={questionsText ?? ownText} onChange={e => setQuestionsText(e.target.value)} placeholder={DEFAULT_MORNING[lang].join('\n')} aria-describedby={`${id}-q-hint`}/><small id={`${id}-q-hint`} className="fine">Up to five. Left empty, the morning page asks: {DEFAULT_MORNING[lang].join(' and ')}</small></label>
          {problem && <p className="field-error" role="alert">{problem}</p>}
          <button type="submit" className="secondary">Keep the questions</button>
        </form>
        <Reminder journal={journal} which="morning"/>
        <Reminder journal={journal} which="evening"/>
        <p className="fine">The evening reminder is your &ldquo;Reminder to write&rdquo;; while this is on, only the evening page quiets it. Both stay on this device and never carry a word of your journal.</p>
      </details>
    </>}
  </div>;
}

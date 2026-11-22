'use client';
import {Suspense, lazy, useEffect, useMemo, useRef, useState, type ReactNode} from 'react';
import type {WeekSummary} from '../../lib/weekly-review/engine';
import {REVIEW_NOTE_FIELDS, type Review, type ReviewNoteField} from '../../lib/weekly-review/schema';
import {formatDate, formatNumber} from '../../lib/visual-format';
import {PhoneFormSheet} from '../phone/phone-form-sheet';
import {GUIDE_LABEL} from '../../lib/coach/copy';
import '../coach/guide.css';
import {usePhoneActive} from '../phone/use-phone-layout';
import './weekly-review.css';
import {plainErrorMessage} from '../../lib/plain-error';
import {unitFor} from '../../lib/plural';
import {useDeviceRecord} from '../ai/use-device-record';
import {TASKS, TASK_TITLE_MAX} from '../../lib/tasks/schema';
import {addTask} from '../../lib/tasks/engine';
import {tasksReview, type TasksReview} from '../../lib/tasks/review';
import {projectsToReview} from '../../lib/tasks/project-states';
import Link from 'next/link';
import {JOURNAL} from '../../lib/journal/schema';
import {wordCount} from '../../lib/journal/stats';
import {addLocalDays, localDate, localWeekday} from '../../lib/local-date';
import {showStatus} from '../ui/undo-toast';
// Session AV (1c, q1 #12): the Tasks step's plan-or-let-go list and the intention's goal, a chunk of their own.
const ReviewTaskChoices = lazy(() => import('./review-task-choices'));
const IntentionGoal = lazy(() => import('./review-task-choices').then(m => ({default: m.IntentionGoal})));

/** Session AV (follow-up 1, F-REVIEW-TASKS): a step with no `field` is read only (Tasks, Journal): nothing new is stored. */
type Step = {field?: ReviewNoteField; title: string; lines: ReactNode[]; fine?: string; placeholder?: string; /** Session AV (1c): the Tasks step's own choices. */ kind?: 'tasks'};
/** Session AV (F-REVIEW-TASKS): what the week shows from Tasks and the Journal, read in the dialog itself. */
export type WeekExtras = {tasks?: TasksReview | null; journal?: {entries: number; words: number} | null; /** Session AV lane 2 (r6-plan, LEDGER #395): projects whose review has come round. */ projectsToReview?: number};
const count = (n: number, one: string, many: string) => n === 0 ? `no ${many}` : `${formatNumber(n)} ${n === 1 ? one : many}`;
/** The six steps (five without the financial domain), each a read-only summary from the records and one optional textarea. */
export function reviewSteps(summary: WeekSummary, financial: boolean, formatWealth: (subtotal: {currency: string; value: bigint}) => string, extras: WeekExtras = {}): Step[] {
  const w = summary.wentWell;
  const steps: Step[] = [
    {field: 'wentWell', title: 'What went well', lines: [`${count(w.habitCheckIns, 'habit check-in', 'habit check-ins')} · ${count(w.healthEntries, 'Health entry', 'Health entries')} · ${count(w.goalContributions, 'Goal contribution', 'Goal contributions')} this week`, ...(w.bestDay ? [`Your fullest day was ${formatDate(w.bestDay, {weekday: true})}.`] : [])]},
    {field: 'goals', title: 'Goals', lines: summary.goals.length ? summary.goals.map(g => `${g.name} · ${g.fundingHealth}${g.nextContributionDate ? ` · next ${formatDate(g.nextContributionDate)}` : ''} · ${g.progress}`) : ['No active goals.']},
    {field: 'habits', title: 'Habits', lines: summary.habits.length ? summary.habits.map(h => `${h.title} · ${h.done} of ${h.scheduled}${h.skipped ? ` (${h.skipped} skipped, not counted)` : ''} · streak ${formatNumber(h.streak)} ${unitFor(h.streak, h.unit)}`) : ['No habits were scheduled this week.']},
    {field: 'health', title: 'Health', lines: summary.health.length ? summary.health : ['Nothing in the Health journal this week.'], fine: 'Counts of your own entries. Not advice.'},
  ];
  // Session AV (follow-up 1, F-REVIEW-TASKS; Sunsama's weekly review): Tasks and the Journal, read only.
  const t = extras.tasks;
  if (t && (t.finished || t.open || t.added)) steps.push({kind: 'tasks', title: 'Tasks', lines: [`${count(t.finished, 'task finished', 'tasks finished')} this week (${formatNumber(t.before)} the week before) · ${count(t.added, 'added', 'added')}`, `${count(t.open, 'task open', 'tasks open')} now${t.overdue ? `, ${formatNumber(t.overdue)} past ${t.overdue === 1 ? 'its' : 'their'} day` : ''}.`, ...(t.titles.length ? [`Finished: ${t.titles.join(' · ')}`] : []), ...(extras.projectsToReview ? [<Link key='review' className='text-link' href='/app/tasks?view=review'>{extras.projectsToReview === 1 ? '1 project to review' : `${formatNumber(extras.projectsToReview)} projects to review`} →</Link>] : [])]});
  const j = extras.journal;
  if (j && j.entries) steps.push({title: 'Journal', lines: [`${count(j.entries, 'journal entry', 'journal entries')} this week · ${formatNumber(j.words)} ${j.words === 1 ? 'word' : 'words'}.`], fine: 'Only counts are shown here; your entries stay in the Journal.'});
  if (financial && summary.wealth) steps.push({field: 'wealth', title: 'Wealth', lines: [`Known tracked wealth: ${summary.wealth.subtotals.length ? summary.wealth.subtotals.map(formatWealth).join(' · ') : 'nothing tracked yet'}`, `${count(summary.wealth.attention, 'asset needs', 'assets need')} attention`, `${count(summary.wealth.contributions, 'contribution', 'contributions')} this week`]});
  steps.push({field: 'intention', title: 'One intention', lines: summary.lastIntention ? [`Last week you wrote: ${summary.lastIntention}`] : ['One small thing for next week.'], placeholder: 'One small thing for next week'});
  return steps;
}
/**
 * The weekly review (G1): a sheet on phones, a dialog elsewhere. Every field is optional; the typed words are saved
 * on each "Next" and on "Close" (a draft); "Finish review" completes the week.
 */
export function WeeklyReviewDialog({weekStart, weekEnd, summary, review, financial, formatWealth, onSaveNotes, onFinish, onClose, guideNote}: {
  weekStart: string; weekEnd: string; summary: WeekSummary; review: Review | undefined; financial: boolean; formatWealth: (subtotal: {currency: string; value: bigint}) => string;
  onSaveNotes: (notes: Partial<Record<ReviewNoteField, string>>) => unknown; onFinish: (notes: Partial<Record<ReviewNoteField, string>>) => unknown; onClose: () => void; /** The Guide's paragraph for the last step (ADR-011), only while the Guide is on. */ guideNote?: string;
}) {
  // Session AV (F-REVIEW-TASKS): Tasks and the Journal for this week, and the intention as a task for Monday.
  const tasksRecord = useDeviceRecord(TASKS), journalRecord = useDeviceRecord(JOURNAL);
  const extras = useMemo<WeekExtras>(() => {
    const prevStart = addLocalDays(weekStart, -7), prevEnd = addLocalDays(weekStart, -1), today = localDate();
    const tasks = tasksRecord.loaded && !tasksRecord.unreadable ? tasksReview(tasksRecord.data, {start: weekStart, end: weekEnd, prevStart, prevEnd}, today, iso => localDate(new Date(iso))) : null;
    const week = journalRecord.loaded && !journalRecord.unreadable ? journalRecord.data.entries.filter(e => e.date >= weekStart && e.date <= weekEnd) : [];
    return {tasks, journal: {entries: week.length, words: week.reduce((n, e) => n + wordCount(e.text), 0)}, projectsToReview: tasksRecord.loaded && !tasksRecord.unreadable ? projectsToReview(tasksRecord.data, localDate()).length : 0};
  }, [tasksRecord.loaded, tasksRecord.unreadable, tasksRecord.data, journalRecord.loaded, journalRecord.unreadable, journalRecord.data, weekStart, weekEnd]);
  const [asTask, setAsTask] = useState(false), [goal, setGoal] = useState('');
  // The Monday after the week reviewed, or the next one when the review is done later than that (never a past day).
  const after = [addLocalDays(weekEnd, 1), localDate()].sort().at(-1)!, monday = addLocalDays(after, (8 - localWeekday(after)) % 7);
  const phone = usePhoneActive(), steps = reviewSteps(summary, financial, formatWealth, extras);
  const [index, setIndex] = useState(0); const [error, setError] = useState('');
  const [notes, setNotes] = useState<Partial<Record<ReviewNoteField, string>>>(() => Object.fromEntries(REVIEW_NOTE_FIELDS.map(f => [f, review?.notes?.[f] ?? ''])));
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => { heading.current?.focus(); }, [index]);
  const step = steps[index]!, intentionWords = (notes.intention ?? '').replace(/\s+/g, ' ').trim().slice(0, TASK_TITLE_MAX);
  const save = async (fn: typeof onSaveNotes) => { setError(''); try { await fn(notes); return true; } catch (e) { setError(plainErrorMessage(e, 'Your words were not saved on this device.')); return false; } };
  const body = <div className="weekly-review" aria-label="Your week">
    <p className="eyebrow">Your week · {formatDate(weekStart)} – {formatDate(weekEnd)}</p>
    <p className="weekly-review-step">Step {index + 1} of {steps.length}</p>
    <h3 ref={heading} tabIndex={-1}>{step.title}</h3>
    <div className="weekly-review-summary">{step.lines.map((line, i) => <p key={i}>{line}</p>)}{step.fine && <p className="fine">{step.fine}</p>}</div>
    {step.kind === 'tasks' && tasksRecord.loaded && !tasksRecord.unreadable && <Suspense fallback={null}><ReviewTaskChoices record={tasksRecord.data} monday={monday} update={tasksRecord.update} /></Suspense>}
    {index === steps.length - 1 && guideNote && <div className="weekly-review-guide" role="note" aria-label="Guide"><p className="eyebrow">{GUIDE_LABEL}</p><p>{guideNote}</p></div>}
    {step.field && <label className="field">Your words, if you like<textarea rows={3} maxLength={2000} value={notes[step.field] ?? ''} placeholder={step.placeholder ?? 'Your words, if you like'} onChange={event => setNotes({...notes, [step.field!]: event.target.value})} /></label>}
    {/* Session AV (1c, q1 #12): the box waits for words (ticked with none, Finish added nothing and said nothing); a goal, optional. */}
    {step.field === 'intention' && <><label className="weekly-review-as-task"><input type="checkbox" checked={asTask && !!intentionWords} disabled={!tasksRecord.loaded || tasksRecord.unreadable || !intentionWords} aria-describedby={intentionWords ? undefined : 'weekly-review-as-task-why'} onChange={e => setAsTask(e.target.checked)}/><span>Also add it to Tasks for Monday, {formatDate(monday, {year: false})}</span></label>
      {!intentionWords && <p id="weekly-review-as-task-why" className="fine">Write your intention first to add it to Tasks.</p>}
      {asTask && intentionWords && <Suspense fallback={null}><IntentionGoal value={goal} onChange={setGoal} /></Suspense>}</>}
    {error && <p role="alert">{error}</p>}
    <div className="actions weekly-review-actions">
      <button type="button" className="quiet" disabled={index === 0} onClick={() => setIndex(index - 1)}>Back</button>
      {index < steps.length - 1 ? <button type="button" className="primary" onClick={() => void save(onSaveNotes).then(saved => { if (saved) setIndex(index + 1); })}>Next</button> : <button type="button" className="primary" onClick={() => void save(onFinish).then(saved => { if (!saved) return; const words = intentionWords; if (asTask && words) { try { tasksRecord.update(r => addTask(r, {title: words, due: monday, ...(goal ? {goal} : {})}, {id: `task_${crypto.randomUUID()}`, at: new Date(), today: localDate()})); showStatus(`Added “${words}” to Tasks for ${formatDate(monday, {weekday: true, year: false})}${goal ? ', for your goal' : ''}.`, {link: {href: '/app/tasks?view=upcoming', label: 'Open Tasks'}}); } catch (cause) { showStatus(plainErrorMessage(cause, 'The task could not be added on this device.'), {tone: 'error'}); } } onClose(); })}>Finish review</button>}
      <button type="button" className="secondary" onClick={() => { void save(onSaveNotes); onClose(); }}>Close</button>
    </div>
  </div>;
  return phone ? <PhoneFormSheet title="Your week" onClose={() => { void save(onSaveNotes); onClose(); }}>{body}</PhoneFormSheet> : <ReviewModal title="Your week" onClose={() => { void save(onSaveNotes); onClose(); }}>{body}</ReviewModal>;
}
function ReviewModal({title, onClose, children}: {title: string; onClose: () => void; children: ReactNode}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => { const previous = document.activeElement as HTMLElement | null, dialog = ref.current; dialog?.showModal(); return () => { dialog?.close(); previous?.focus(); }; }, []);
  return <dialog ref={ref} className="dashboard-dialog weekly-review-dialog" aria-label={title} onCancel={event => { event.preventDefault(); onClose(); }}><header><h2>{title}</h2><button className="secondary" type="button" onClick={onClose} aria-label="Close the review">Close</button></header>{children}</dialog>;
}

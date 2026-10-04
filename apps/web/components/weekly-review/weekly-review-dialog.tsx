'use client';
import {useEffect, useRef, useState, type ReactNode} from 'react';
import type {WeekSummary} from '../../lib/weekly-review/engine';
import {REVIEW_NOTE_FIELDS, type Review, type ReviewNoteField} from '../../lib/weekly-review/schema';
import {formatNumber} from '../../lib/visual-format';
import {PhoneFormSheet} from '../phone/phone-form-sheet';
import {GUIDE_LABEL} from '../../lib/coach/copy';
import '../coach/guide.css';
import {usePhoneActive} from '../phone/use-phone-layout';
import './weekly-review.css';

type Step = {field: ReviewNoteField; title: string; lines: ReactNode[]; fine?: string; placeholder?: string};
const count = (n: number, one: string, many: string) => n === 0 ? `no ${many}` : `${formatNumber(n)} ${n === 1 ? one : many}`;
/** The six steps (five without the financial domain), each a read-only summary from the records and one optional textarea. */
export function reviewSteps(summary: WeekSummary, financial: boolean, formatWealth: (subtotal: {currency: string; value: bigint}) => string): Step[] {
  const w = summary.wentWell;
  const steps: Step[] = [
    {field: 'wentWell', title: 'What went well', lines: [`${count(w.habitCheckIns, 'habit check-in', 'habit check-ins')} · ${count(w.healthEntries, 'Health entry', 'Health entries')} · ${count(w.goalContributions, 'Goal contribution', 'Goal contributions')} this week`, ...(w.bestDay ? [`Your fullest day was ${w.bestDay}.`] : [])]},
    {field: 'goals', title: 'Goals', lines: summary.goals.length ? summary.goals.map(g => `${g.name} · ${g.fundingHealth}${g.nextContributionDate ? ` · next ${g.nextContributionDate}` : ''} · ${g.progress}`) : ['No active goals.']},
    {field: 'habits', title: 'Habits', lines: summary.habits.length ? summary.habits.map(h => `${h.title} · ${h.done} of ${h.scheduled}${h.skipped ? ` (${h.skipped} skipped)` : ''} · streak ${formatNumber(h.streak)} ${h.unit}`) : ['No habits were scheduled this week.']},
    {field: 'health', title: 'Health', lines: summary.health.length ? summary.health : ['Nothing in the Health journal this week.'], fine: 'Counts of your own entries. Not advice.'},
  ];
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
  onSaveNotes: (notes: Partial<Record<ReviewNoteField, string>>) => void; onFinish: (notes: Partial<Record<ReviewNoteField, string>>) => void; onClose: () => void; /** The Guide's paragraph for the last step (ADR-011), only while the Guide is on. */ guideNote?: string;
}) {
  const phone = usePhoneActive(), steps = reviewSteps(summary, financial, formatWealth);
  const [index, setIndex] = useState(0); const [error, setError] = useState('');
  const [notes, setNotes] = useState<Partial<Record<ReviewNoteField, string>>>(() => Object.fromEntries(REVIEW_NOTE_FIELDS.map(f => [f, review?.notes?.[f] ?? ''])));
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => { heading.current?.focus(); }, [index]);
  const step = steps[index]!;
  const save = (fn: typeof onSaveNotes) => { setError(''); try { fn(notes); return true; } catch (e) { setError(e instanceof Error ? e.message : 'Your words were not saved on this device.'); return false; } };
  const body = <div className="weekly-review" aria-label="Your week">
    <p className="eyebrow">Your week · {weekStart} – {weekEnd}</p>
    <p className="weekly-review-step">Step {index + 1} of {steps.length}</p>
    <h3 ref={heading} tabIndex={-1}>{step.title}</h3>
    <div className="weekly-review-summary">{step.lines.map((line, i) => <p key={i}>{line}</p>)}{step.fine && <p className="fine">{step.fine}</p>}</div>
    {index === steps.length - 1 && guideNote && <div className="weekly-review-guide" role="note" aria-label="Guide"><p className="eyebrow">{GUIDE_LABEL}</p><p>{guideNote}</p></div>}
    <label className="field">Your words, if you like<textarea rows={3} maxLength={2000} value={notes[step.field] ?? ''} placeholder={step.placeholder ?? 'Your words, if you like'} onChange={event => setNotes({...notes, [step.field]: event.target.value})} /></label>
    {error && <p role="alert">{error}</p>}
    <div className="actions weekly-review-actions">
      <button type="button" className="quiet" disabled={index === 0} onClick={() => setIndex(index - 1)}>Back</button>
      {index < steps.length - 1 ? <button type="button" className="primary" onClick={() => { if (save(onSaveNotes)) setIndex(index + 1); }}>Next</button> : <button type="button" className="primary" onClick={() => { if (save(onFinish)) onClose(); }}>Finish review</button>}
      <button type="button" className="secondary" onClick={() => { save(onSaveNotes); onClose(); }}>Close</button>
    </div>
  </div>;
  return phone ? <PhoneFormSheet title="Your week" onClose={() => { save(onSaveNotes); onClose(); }}>{body}</PhoneFormSheet> : <ReviewModal title="Your week" onClose={() => { save(onSaveNotes); onClose(); }}>{body}</ReviewModal>;
}
function ReviewModal({title, onClose, children}: {title: string; onClose: () => void; children: ReactNode}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => { const previous = document.activeElement as HTMLElement | null, dialog = ref.current; dialog?.showModal(); return () => { dialog?.close(); previous?.focus(); }; }, []);
  return <dialog ref={ref} className="dashboard-dialog weekly-review-dialog" aria-label={title} onCancel={event => { event.preventDefault(); onClose(); }}><header><h2>{title}</h2><button className="secondary" type="button" onClick={onClose} aria-label="Close the review">Close</button></header>{children}</dialog>;
}

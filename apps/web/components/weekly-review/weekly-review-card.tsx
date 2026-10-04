'use client';
import {useState} from 'react';
import type {WeekSummary} from '../../lib/weekly-review/engine';
import {reviewState} from '../../lib/weekly-review/engine';
import {finishReview, reviewFor, saveReviewNotes, skipReview} from '../../lib/weekly-review/store';
import type {ReviewNoteField} from '../../lib/weekly-review/schema';
import {deviceSettingFailureMessage} from '../../lib/storage-error-copy';
import type {WeeklyReviewStore} from './use-weekly-review';
import {WeeklyReviewDialog} from './weekly-review-dialog';
import './weekly-review.css';

/** Today's "Your week" card (G1): due or a draft; it opens the review, or skips the week with one tap. */
export function WeeklyReviewCard({store, weekStart, weekEnd, summary, financial, formatWealth, onDone}: {store: WeeklyReviewStore; weekStart: string; weekEnd: string; summary: () => WeekSummary; financial: boolean; formatWealth: (subtotal: {currency: string; value: bigint}) => string; onDone?: (status: string) => void}) {
  const [open, setOpen] = useState(false); const [error, setError] = useState('');
  const state = reviewState(store.data, weekStart);
  if (state === 'done' || state === 'skipped') return null;
  // The finished or skipped week leaves this card; the line that says so is shown by the "For you" area (onDone).
  const setStatus = (done: string) => onDone?.(done);
  const act = (change: Parameters<WeeklyReviewStore['update']>[0], done: string) => { setError(''); try { store.update(change); setStatus(done); } catch (e) { setError(`${deviceSettingFailureMessage(e)}`); } };
  return <>
    <section className="panel for-you-card weekly-review-card" aria-labelledby="weekly-review-title">
      <p className="eyebrow">Your week</p><h2 id="weekly-review-title">{state === 'draft' ? 'Continue your review.' : 'A short look back at your week.'}</h2>
      <p className="fine">{weekStart} – {weekEnd}. Six small steps, all optional.</p>
      <div className="actions"><button type="button" className="primary" onClick={() => setOpen(true)}>{state === 'draft' ? 'Continue' : 'Start review'}</button><button type="button" className="quiet" onClick={() => act(current => skipReview(current, weekStart), 'Skipped this week.')}>Skip this week</button></div>
      {error && <p role="alert">{error}</p>}
    </section>
    {open && <WeeklyReviewDialog weekStart={weekStart} weekEnd={weekEnd} summary={summary()} review={reviewFor(store.data, weekStart)} financial={financial} formatWealth={formatWealth}
      onSaveNotes={(notes: Partial<Record<ReviewNoteField, string>>) => { store.update(current => saveReviewNotes(current, weekStart, notes)); }}
      onFinish={notes => { store.update(current => finishReview(saveReviewNotes(current, weekStart, notes), weekStart)); setStatus('Review saved on this device.'); }}
      onClose={() => setOpen(false)} />}
  </>;
}

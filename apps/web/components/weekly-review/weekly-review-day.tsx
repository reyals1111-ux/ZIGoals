'use client';
import {useState} from 'react';
import {setReviewWeekday} from '../../lib/weekly-review/store';
import {deviceSettingFailureMessage} from '../../lib/storage-error-copy';
import {useWeeklyReview} from './use-weekly-review';
import './weekly-review.css';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
/** Settings → Habits: the weekday Today offers the review (G1), kept on this device, with the last completed review read-only. */
export function WeeklyReviewDay() {
  const store = useWeeklyReview(); const [error, setError] = useState(''); const [confirming, setConfirming] = useState(false);
  const last = [...store.data.reviews].filter(r => r.completedAt).sort((a, b) => b.weekStart.localeCompare(a.weekStart))[0];
  return <div className="weekly-review-day">
    {store.unreadable ? <div className="notice" role="alert"><p>Your saved weekly reviews on this device could not be read. They were not changed.</p>
      {confirming ? <div className="actions"><p className="fine">Start over keeps the old bytes as a recovery copy and continues with no reviews.</p><button type="button" className="secondary" onClick={() => { setConfirming(false); try { store.startOver(); } catch (e) { setError(deviceSettingFailureMessage(e)); } }}>Start over</button><button type="button" className="quiet" onClick={() => setConfirming(false)}>Keep them</button></div> : <button type="button" className="quiet" onClick={() => setConfirming(true)}>Start over…</button>}</div>
    : <label className="field">Weekly review day — on this device<select value={store.data.weekday} disabled={!store.loaded} onChange={event => { setError(''); try { store.update(current => setReviewWeekday(current, Number(event.target.value))); } catch (e) { setError(deviceSettingFailureMessage(e)); } }}>{DAYS.map((day, i) => <option key={day} value={i}>{day}</option>)}</select><small>Today shows your review card on this day. The review is optional and can be skipped.</small></label>}
    {error && <p role="alert">{error}</p>}
    {last && <details className="weekly-review-last"><summary>Last review · week of {last.weekStart}</summary><dl>{Object.entries(last.notes ?? {}).map(([field, text]) => <div key={field}><dt>{field === 'wentWell' ? 'What went well' : field === 'intention' ? 'One intention' : field[0]!.toUpperCase() + field.slice(1)}</dt><dd>{text}</dd></div>)}{!last.notes && <p className="fine">Finished without words.</p>}</dl></details>}
  </div>;
}

'use client';
import {useState} from 'react';
import {habitCalendarDay, habitDay, type HabitData} from '../../lib/habits';
import {HEALTH_MEALS, type HealthData} from '../../lib/health';
import {dailyData, healthDay, waterSummary} from '../../lib/health-daily';
import {formatNumber} from '../../lib/visual-format';
import {MOOD_WORDS, moodOn, setMood} from '../../lib/wrap-up/engine';
import {useHealth} from '../health/use-health';

/**
 * The evening wrap-up card (Session W Part 13), in Today's "For you" once its time has come: the day from the person's
 * own records (habits done of those due, meals and water logged; only areas whose page is shown), how the day felt
 * (saved at once in Health, as its own record), one intention for tomorrow, and "Wrap up the day" or "Not today". It
 * never lists what was not done and never scores the day.
 */
export function WrapUpCard({habits, health, now, showHabits, showHealth, onWrap}: {habits: HabitData; health: HealthData; now: number; showHabits: boolean; showHealth: boolean; onWrap: (intention: string | null) => Promise<boolean>}) {
  const store = useHealth(), [intention, setIntention] = useState(''), [note, setNote] = useState(''), [error, setError] = useState(''), [busy, setBusy] = useState(false);
  const clock = new Date(now), habitToday = habitCalendarDay(habits, clock), healthToday = healthDay(dailyData(health).preferences.timezone, clock);
  const days = showHabits ? habits.habits.map(h => habitDay(h, habitToday, habitToday).status) : [];
  const due = days.filter(s => s === 'complete' || s === 'partial' || s === 'due' || s === 'failed').length, done = days.filter(s => s === 'complete').length;
  const meals = showHealth ? HEALTH_MEALS.filter(m => health.diary.some(e => e.date === healthToday && e.meal === m)) : [];
  const water = showHealth ? waterSummary(health, healthToday).millilitres : 0;
  const facts = [due > 0 && `Habits: ${done} of ${due} done today`, meals.length > 0 && `Meals logged: ${meals.join(', ')}`, water > 0 && `Water: ${formatNumber(Math.round(water))} mL`].filter((f): f is string => !!f);
  const mood = showHealth && store.loaded && !store.error ? moodOn(store.data, healthToday) : undefined;
  async function feel(value: number) {
    setError('');
    try { await store.update(h => setMood(h, healthToday, value, new Date().toISOString())); setNote(`Saved for today: ${MOOD_WORDS[value - 1]}.`); }
    catch (cause) { setError(cause instanceof Error && cause.message ? cause.message : 'Not saved. Your Health journal is unchanged.'); }
  }
  async function wrap(text: string | null) { setBusy(true); setError(''); try { if (!await onWrap(text)) setError('Not saved on this device. Try again.'); } finally { setBusy(false); } }
  return <article className="panel wrap-up-card" aria-label="Your evening wrap-up">
    <p className="eyebrow">Evening wrap-up</p>
    <h2>How did today go?</h2>
    {facts.length ? <ul className="wrap-up-facts">{facts.map(f => <li key={f}>{f}</li>)}</ul> : <p>Nothing recorded today. That is fine.</p>}
    {showHealth && store.loaded && !store.error && <fieldset className="wrap-up-mood"><legend>How did today feel? (optional)</legend>
      <div className="wrap-up-mood-choices">{MOOD_WORDS.map((word, i) => <button key={word} type="button" className="secondary" aria-pressed={mood?.mood === i + 1} onClick={() => void feel(i + 1)}>{word}</button>)}</div>
    </fieldset>}
    <form className="wrap-up-form" onSubmit={e => { e.preventDefault(); void wrap(intention); }}>
      <label className="field">One intention for tomorrow (optional)<input value={intention} maxLength={280} onChange={e => setIntention(e.target.value)} /></label>
      <div className="actions"><button className="primary" disabled={busy}>Wrap up the day</button><button type="button" className="quiet" disabled={busy} onClick={() => void wrap(null)}>Not today</button></div>
    </form>
    {showHealth && <p className="fine">How the day felt is kept in your Health journal, like your other Health records.</p>}
    {note && <p role="status" className="fine">{note}</p>}
    {error && <p role="alert">{error}</p>}
  </article>;
}

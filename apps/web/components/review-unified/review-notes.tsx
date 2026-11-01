'use client';
import {useMemo, useState} from 'react';
import type {HabitData} from '../../lib/habits';
import type {HealthData} from '../../lib/health';
import type {LifeReview, Period} from '../../lib/life-review/engine';
import {pillarGlance} from '../../lib/review-unified/glance';
import {balanceNote, periodNote, type Note} from '../../lib/insight-notes/notes';
import {insightCards} from '../../lib/insights/engine';
import {hiddenInsights, readInsights} from '../../lib/insights/store';
import {averageItem, balanceOf, goalItem, habitItem, healthItems} from '../../lib/life-balance';
import {habitAreasFrom} from '../../lib/goal-extras/areas';
import {getAppStorage} from '../../lib/showcase-storage';
import {INSIGHT_FEEDBACK, markInsight, notForMe, unmarkInsight, type NoteKind, type Verdict} from '../../lib/insight-feedback/store';
import {useDeviceRecord} from '../ai/use-device-record';
import {formatMonth} from '../../lib/visual-format';
import {useUnifiedGoals} from '../use-unified-goals';
import {usePlatform} from '../platform/use-platform';
import {useHealthGoals} from '../health-goals/use-health-goals';
import {useAverageGoals} from '../goals/use-average-goals';
import {useGoalExtras} from '../goals/use-goal-extras';
import {PillarMark} from '../pillars';
import {SectionHeading} from '../ui/section-heading';
import './review-unified.css';

/**
 * Session AK Part 8.1, 8.3 and 8.4, inside the unified review (/app/review), loaded after the review itself: one line per
 * pillar linking to its chapter; ZIGi's note on the week or the month (deterministic, from the person's records and
 * lib/insights' strongest pairing, never a model call); and in the month, the balance note from the balance wheel's life
 * areas. No cause, no advice; nothing is stored or sent.
 */
export default function ReviewNotes({review, period, financial, habits, health, today}: {review: LifeReview; period: Period; financial: boolean; habits: HabitData; health: HealthData; today: string}) {
  const glance = useMemo(() => pillarGlance(review, {financial}), [review, financial]);
  const feedback = useDeviceRecord(INSIGHT_FEEDBACK);
  // BUILD list 2 #21: the kinds marked "Not for me" as this visit began; a tap now changes later notes, not this one.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const skip = useMemo(() => notForMe(feedback.data), [feedback.loaded]);
  const note = useMemo(() => {
    let pairing: string | null = null;
    // A pairing the person hid on Today stays hidden here too.
    try { pairing = insightCards({habits, health, today, max: 1, hidden: hiddenInsights(readInsights(getAppStorage()).data, today)})[0]?.sentence ?? null; } catch { /* no pairing: the note goes on without it */ }
    const days = Math.round((Date.parse(`${review.window.end}T12:00:00Z`) - Date.parse(`${review.window.start}T12:00:00Z`)) / 86_400_000) + 1;
    return periodNote({period, days, counts: review.counts, trends: review.health, streak: review.streaks[0] ?? null, pairing, skip});
  }, [review, period, habits, health, today, skip]);
  return <section className="panel review-notes" aria-labelledby="review-notes-title">
    <SectionHeading id="review-notes-title" eyebrow={period === 'week' ? 'Your week, by pillar' : 'Your month, by pillar'} title="At a glance" level={3} />
    <nav aria-label="Review chapters"><ul className="review-glance">{glance.map(g => <li key={g.pillar}><a href={g.anchor} data-quiet={g.quiet || undefined}><strong><PillarMark pillar={g.pillar} size={14} />{g.title}</strong><span className="review-glance-line">{g.line}</span></a></li>)}</ul></nav>
    <NoteBlock id="review-note-period" note={note} />
    {note.lead && !note.empty && <NoteFeedback kind={note.lead} update={feedback.update} />}
    {period === 'month' && <MonthBalance today={today} habits={habits} health={health} />}
  </section>;
}

function NoteBlock({id, note}: {id: string; note: Note}) {
  return <div className="review-note" role="group" aria-labelledby={id} data-empty={note.empty || undefined}>
    <h4 id={id}>{note.title}</h4>
    <ul>{note.lines.map(line => <li key={line}>{line}</li>)}</ul>
    <p className="fine">{note.fine}</p>
  </div>;
}

/**
 * 8.4: the month's balance note. The same life areas and items as the balance wheel on Goals (components/goals/
 * life-balance-card.tsx `useLifeBalance`), gathered here from the same lib functions so the wheel's card and its styles
 * stay off this page.
 */
function MonthBalance({today, habits, health}: {today: string; habits: HabitData; health: HealthData}) {
  const unified = useUnifiedGoals(), platform = usePlatform(), healthGoals = useHealthGoals(), averages = useAverageGoals(), extras = useGoalExtras();
  const ready = unified.loaded && platform.loaded && healthGoals.loaded && averages.loaded && extras.loaded;
  const note = useMemo(() => {
    if (!ready) return null;
    let habitAreas: Record<string, string> = {};
    try { habitAreas = habitAreasFrom(getAppStorage()); } catch { /* locked: habits count under Habits & Mind */ }
    const x = extras.data, items = [
      ...unified.goals.filter(g => g.status === 'active').map(g => goalItem(g, x, platform.data.contributions ?? [], today)),
      ...habits.habits.filter(h => h.rules.at(-1)?.state === 'active').map(h => habitItem(h, x, today, habitAreas)),
      ...(healthGoals.unreadable ? [] : healthItems(healthGoals.data.goals, health, x, today)),
      ...(averages.unreadable ? [] : averages.data.goals.filter(g => g.status === 'active').map(g => averageItem(g, health, x, today))),
    ];
    return balanceNote(balanceOf(x, items).areas, formatMonth(today));
  }, [ready, unified.goals, platform.data, habits, health, healthGoals.data, healthGoals.unreadable, averages.data, averages.unreadable, extras.data, today]);
  return note ? <NoteBlock id="review-note-balance" note={note} /> : null;
}

const KIND_WORDS: Readonly<Record<NoteKind, string>> = {pairing: 'things seen together', trend: 'Health beside the week before', streak: 'your longest streak'};
/** BUILD list 2 #21: one optional tap under the note; stored on this device only and used only to leave out a kind of line. */
function NoteFeedback({kind, update}: {kind: NoteKind; update: ReturnType<typeof useDeviceRecord<import('../../lib/insight-feedback/store').InsightFeedback>>['update']}) {
  const [answered, setAnswered] = useState<Verdict | null>(null), [error, setError] = useState<string | null>(null);
  const save = (change: Parameters<typeof update>[0], next: Verdict | null) => { try { update(change); setAnswered(next); setError(null); } catch { setError('This could not be saved on this device.'); } };
  return <div className="review-note-feedback" role="group" aria-label="Was this note useful?">
    {answered
      ? <p role="status">{answered === 'useful' ? 'Thanks: noted on this device.' : `Noted on this device: later notes leave out ${KIND_WORDS[kind]}.`} <button type="button" className="quiet" onClick={() => save(r => unmarkInsight(r, kind), null)}>Undo</button></p>
      : <><span className="fine">Was this useful?</span> <button type="button" className="secondary" onClick={() => save(r => markInsight(r, kind, 'useful', new Date().toISOString()), 'useful')}>Useful</button> <button type="button" className="secondary" onClick={() => save(r => markInsight(r, kind, 'not-for-me', new Date().toISOString()), 'not-for-me')}>Not for me</button></>}
    {error && <p role="alert" className="fine">{error}</p>}
  </div>;
}

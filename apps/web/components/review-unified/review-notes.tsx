'use client';
import {useMemo} from 'react';
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
  const note = useMemo(() => {
    let pairing: string | null = null;
    // A pairing the person hid on Today stays hidden here too.
    try { pairing = insightCards({habits, health, today, max: 1, hidden: hiddenInsights(readInsights(getAppStorage()).data, today)})[0]?.sentence ?? null; } catch { /* no pairing: the note goes on without it */ }
    const days = Math.round((Date.parse(`${review.window.end}T12:00:00Z`) - Date.parse(`${review.window.start}T12:00:00Z`)) / 86_400_000) + 1;
    return periodNote({period, days, counts: review.counts, trends: review.health, streak: review.streaks[0] ?? null, pairing});
  }, [review, period, habits, health, today]);
  return <section className="panel review-notes" aria-labelledby="review-notes-title">
    <SectionHeading id="review-notes-title" eyebrow={period === 'week' ? 'Your week, by pillar' : 'Your month, by pillar'} title="At a glance" level={3} />
    <nav aria-label="Review chapters"><ul className="review-glance">{glance.map(g => <li key={g.pillar}><a href={g.anchor} data-quiet={g.quiet || undefined}><strong><PillarMark pillar={g.pillar} size={14} />{g.title}</strong><span className="review-glance-line">{g.line}</span></a></li>)}</ul></nav>
    <NoteBlock id="review-note-period" note={note} />
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

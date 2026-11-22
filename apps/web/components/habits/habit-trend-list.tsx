'use client';
import {useMemo} from 'react';
import type {Habit} from '../../lib/habits';
import {habitTrendList, TREND_WORDS, trendSentence, type TrendWord} from '../../lib/habits-v2/trend';
import './habit-r3.css';

/**
 * Session AV lane 2 (health r3; LEDGER #276, Way of Life's Trend): under "Your last 30 days", each active habit's last 30
 * days beside the 30 before, as a plain word with both shares, grouped more often, about the same, less often. Calm
 * words: nothing is flagged. In the consistency chunk (loaded with it).
 */
export function HabitTrendList({habits, today}: {habits: Habit[]; today: string}) {
  const list = useMemo(() => habitTrendList(habits, today), [habits, today]);
  if (!list.length) return null;
  const groups: {key: TrendWord | 'none'; title: string}[] = [{key: 'more', title: TREND_WORDS.more}, {key: 'same', title: TREND_WORDS.same}, {key: 'less', title: TREND_WORDS.less}, {key: 'none', title: 'Not enough days yet'}];
  const anyWord = list.some(t => t.word);
  return <article className="panel habit-trend-list" aria-labelledby="habit-trend-title">
    <header><p className="eyebrow">THE LAST 30 DAYS AND THE 30 BEFORE</p><h2 id="habit-trend-title">Trend per habit</h2>
      <p className="fine">Each habit’s share of scheduled days done, then and now. Ten points or more apart reads as more or less often; closer is about the same. Skipped, paused and rest days count for nothing either way.</p></header>
    {!anyWord && <p className="fine">A trend shows once a habit has at least 5 scheduled days in each 30-day window — about two months of a daily habit.</p>}
    {groups.map(g => { const items = list.filter(t => (t.word ?? 'none') === g.key); return items.length ? <section key={g.key} aria-labelledby={`habit-trend-${g.key}`}>
      <h3 id={`habit-trend-${g.key}`}>{g.title} <span className="fine">({items.length})</span></h3>
      <ul className="habit-trend-items">{items.map(t => <li key={t.habitId} data-trend={t.word ?? 'none'}><strong>{t.title}</strong> <span className="fine">{t.word ? `${t.recent.share}% now, ${t.before.share}% before` : `${t.recent.days} and ${t.before.days} days counted`}</span><span className="sr-only">. {trendSentence(t)}</span></li>)}</ul>
    </section> : null; })}
  </article>;
}
/** One habit's trend, as a sentence in its own patterns. */
export function HabitTrendLine({habit, today}: {habit: Habit; today: string}) {
  const t = useMemo(() => habitTrendList([habit], today)[0], [habit, today]);
  return t ? <p className="fine habit-trend-line"><strong>Trend:</strong> {trendSentence(t)}</p> : null;
}

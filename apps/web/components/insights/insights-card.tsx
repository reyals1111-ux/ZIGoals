'use client';
import {useMemo, useRef, useState} from 'react';
import type {HabitData} from '../../lib/habits';
import type {HealthData} from '../../lib/health';
import {dailyData} from '../../lib/health-daily';
import type {HabitHealthLinksV4 as HabitHealthLinks} from '../../lib/habit-health-links/schema';
import {insightCards, type InsightCard} from '../../lib/insights/engine';
import {hiddenInsights} from '../../lib/insights/store';
import {formatNumber} from '../../lib/visual-format';
import {isShowcase} from '../../lib/showcase-storage';
import {useHealthToday} from '../health/use-health-today';
import {useInsights} from './use-insights';
import './insights.css';

/** The cards Today would show, so the "For you" area can decide whether this card exists at all. */
export function useInsightCards({habits, health, links}: {habits: HabitData; health: HealthData; links?: HabitHealthLinks}) {
  const insights = useInsights(), today = useHealthToday(dailyData(health).preferences.timezone);
  const cards = useMemo(() => insights.loaded ? insightCards({habits, health, today, links, hidden: hiddenInsights(insights.data, today)}) : [], [insights.loaded, insights.data, habits, health, today, links]);
  return {cards, insights, today};
}
/** "Something you might notice" (M3): up to two pairings in counts, each with how it was counted and a Dismiss. */
export function InsightsCard({cards, insights, today}: ReturnType<typeof useInsightCards>) {
  const [error, setError] = useState(''); const heading = useRef<HTMLHeadingElement>(null);
  if (!cards.length) return null;
  const dismiss = (card: InsightCard, index: number) => {
    setError('');
    try { insights.dismiss(card.id, today); } catch (e) { setError(e instanceof Error ? e.message : 'This card could not be dismissed on this device.'); return; }
    const next = document.getElementById(`insight-${cards[index + 1]?.id ?? cards[index - 1]?.id ?? ''}`);
    (next ?? heading.current)?.focus();
  };
  return <section className="panel for-you-card insights-card" aria-label="Something you might notice">
    <p className="eyebrow">From your own records</p><h2 ref={heading} tabIndex={-1}>Something you might notice.</h2>{isShowcase() && <p className="fine">Showcase example</p>}
    {cards.map((card, index) => <article key={card.id} id={`insight-${card.id}`} tabIndex={-1} className="insight">
      <p className="insight-sentence">{card.sentence}</p>
      <div className="insight-row"><details className="insight-detail"><summary>How this is calculated</summary>
        <p>Window: {card.detail.window.start} – {card.detail.window.end} · {formatNumber(card.detail.sampleDays)} days with the records this needs.</p>
        <p>With the first: {formatNumber(card.detail.withA.yes)} of {formatNumber(card.detail.withA.total)} days. Without: {formatNumber(card.detail.withoutA.yes)} of {formatNumber(card.detail.withoutA.total)} days.</p>
        {card.detail.threshold && <p>{formatNumber(card.detail.threshold.value)} steps is {card.detail.threshold.source === 'target' ? 'your step target.' : 'your usual: the middle of your recorded days.'}</p>}
        <p>Paired by {card.detail.pairedBy}.</p><p>Counts of your own records. Not a cause, not advice.</p>
        {insights.unreadable && <p><button type="button" className="quiet" onClick={() => { try { insights.startOver(); setError(''); } catch (e) { setError(e instanceof Error ? e.message : 'Could not start over.'); } }}>Start over…</button> Your saved dismissals on this device could not be read; this replaces them and keeps the old bytes as a recovery copy.</p>}
      </details>
      <button type="button" className="quiet" aria-label={`Dismiss: ${card.sentence}`} onClick={() => dismiss(card, index)}>Dismiss</button></div>
    </article>)}
    {error && <p role="alert">{error}</p>}
    <p className="fine">Shown when at least 14 days have both records, with at least 5 days on each side.</p>
  </section>;
}

'use client';
import {useMemo} from 'react';
import type {HealthData} from '../../../lib/health';
import {foodLoggingMonth, foodMonthWords} from '../../../lib/food-log/consistency';
import {MOOD_TAGS} from '../../../lib/mood-tags/schema';
import {GOES_WITH, TAG_MIN_DAYS, goodDayTags} from '../../../lib/mood-tags/tags';
import {healthGroupIn} from '../../../lib/vault/w-homes';
import {formatDate, formatMonth} from '../../../lib/visual-format';
import {useDeviceRecord} from '../../ai/use-device-record';
import './plus.css';

/**
 * Session AP (features 1 and 7), in Health → Insights: "What goes with your good days" from the mood tags (counts, five
 * days a tag at least, "goes with, not a cause"), and the food-logging month (days with a diary entry, derived).
 */
export function GoodDaysCard({data, today}: {data: HealthData; today: string}) {
  const tags = useDeviceRecord(MOOD_TAGS);
  const result = useMemo(() => goodDayTags(healthGroupIn(data, 'moods')?.days ?? {}, tags.data, today), [data, tags.data, today]);
  if (!tags.loaded || tags.unreadable || (!result.ready.length && !result.pending.length)) return null; // no tags kept: no card
  return <section className="panel health-aa-card" aria-labelledby="ap-good-days-title">
    <p className="eyebrow">Your own tags · last 365 days</p>
    <h2 id="ap-good-days-title">What goes with your good days</h2>
    {result.ready.length ? <ul>{result.ready.map(f => <li key={f.tag}><p><strong>{f.tag}</strong>: {f.sentence}</p></li>)}</ul>
      : <p>No tag goes with your good days more often than other days yet, or none has {TAG_MIN_DAYS} days with a mood. {GOES_WITH}</p>}
    {result.pending.length > 0 && <details><summary>Still collecting</summary><ul>{result.pending.map(p => <li key={p.tag}>{p.tag}: {p.days} of {p.need} days with a mood</li>)}</ul></details>}
    <p className="fine">A good day is a mood of Good or Great. Counts from your own days, {result.moodDays} with a mood; they show things that went together, not why, and are not advice.</p>
  </section>;
}

export function FoodMonthCard({data, today}: {data: HealthData; today: string}) {
  const f = useMemo(() => foodLoggingMonth(data, today), [data, today]);
  const logged = new Set(f.loggedDays), days = Array.from({length: f.daysSoFar}, (_, i) => `${f.month}-${String(i + 1).padStart(2, '0')}`);
  return <section className="panel health-aa-card" aria-labelledby="ap-food-month-title">
    <p className="eyebrow">Food log · {formatMonth(f.month)}</p>
    <h2 id="ap-food-month-title">Days you logged food</h2>
    <p><strong>{foodMonthWords(f)}</strong></p>
    <ol className="ap-food-month" aria-label="Days of this month so far">{days.map(d => <li key={d} data-logged={logged.has(d) || undefined} aria-label={`${formatDate(d)}: ${logged.has(d) ? 'food logged' : 'nothing logged'}`}>{Number(d.slice(8))}</li>)}</ol>
    <p className="fine">Any day with at least one diary entry counts. A day without one is just that; nothing is judged.</p>
  </section>;
}

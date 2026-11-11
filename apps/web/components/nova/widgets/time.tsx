'use client';
import {useEffect, useMemo, useState} from 'react';
import {dayLeftWords, daysLeftWords, msToNextMinute, timeRings} from '../../../lib/nova/cards/time';
import {formatDate, formatNumber, formatPercent, formatTime} from '../../../lib/visual-format';
import {CardFoot, Fact, Rings, type CardProps} from '../cards/kit';
import {HoloTable} from '../holo/parts';
import '../cards/life-cards.css';

/**
 * This device's clock, to the minute. Nothing is read while the page renders on the server or before it mounts (null),
 * so the server and the browser never disagree. One timer runs, set to the next whole minute each time; while the tab is
 * hidden it is stopped, and it starts again (with a fresh reading) when the tab shows.
 */
function useMinute(): Date | null {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const stop = () => { if (timer !== undefined) clearTimeout(timer); timer = undefined; };
    const tick = () => { setNow(new Date()); timer = setTimeout(tick, msToNextMinute(Date.now()) + 25); };
    const sync = () => { stop(); if (document.visibilityState !== 'hidden') timer = setTimeout(tick, 0); };
    sync();
    document.addEventListener('visibilitychange', sync);
    return () => { stop(); document.removeEventListener('visibilitychange', sync); };
  }, []);
  return now;
}

/**
 * Session AM (ADR-038; art direction §4, The day): "Time" in the day's ice — the local time as the hero and three rings:
 * how much of today, of this week (from Monday) and of this year has passed, each with its percent and what is left in
 * words. No records are read (lib/nova/cards/time.ts); it is recomputed once a minute, never every second.
 * S: the time and the date. M: the three rings. L: larger rings, the day of the year and what is left of the month.
 */
export default function TimeWidget({size}: {size: CardProps['size']; params?: CardProps['params']}) {
  const now = useMinute(), rings = useMemo(() => now ? timeRings(now) : null, [now]);
  if (!now || !rings) return null;
  const pct = (share: number) => formatPercent(share * 100);
  const items = [
    {key: 'day', label: 'Today', share: rings.day.share, left: dayLeftWords(rings.day.minutesLeft)},
    {key: 'week', label: 'This week', share: rings.week.share, left: daysLeftWords(rings.week.daysLeft)},
    {key: 'year', label: 'This year', share: rings.year.share, left: daysLeftWords(rings.year.daysLeft)},
  ];
  return <div className="nc-body nc-time" data-size={size}>
    {/* The kit's hero in its own markup: a clock that changes every minute neither counts up nor pulses. */}
    <div className="nc-hero"><p className="nc-hero-figure"><span className="holo-num nc-hero-num">{formatTime(now)}</span></p><p className="nc-hero-label">{formatDate(now, {weekday: true, year: false})}</p></div>
    {size !== 'S' && <div className="nc-time-rings">
      <Rings size={size === 'L' ? 104 : 76} items={items.map(it => ({key: it.key, share: it.share, figure: pct(it.share), label: it.label}))}/>
      <p className="nc-time-left">{items.map(it => <span key={it.key}>{it.left}</span>)}</p>
    </div>}
    {size === 'L' && <div className="nc-facts">
      <Fact label="Day of the year" value={`${formatNumber(rings.year.dayOfYear)} of ${formatNumber(rings.year.days)}`}/>
      <Fact label="This month" value={daysLeftWords(rings.monthDaysLeft)}/>
    </div>}
    <CardFoot source="This device’s clock" asOf="now"/>
    <HoloTable caption="Time" rows={[
      ['Local time', `${formatTime(now)}, ${formatDate(now, {weekday: true})}`],
      ...items.map(it => [it.label, `${pct(it.share)} passed, ${it.left.toLowerCase()}`] as const),
      ['Day of the year', `${rings.year.dayOfYear} of ${rings.year.days}`],
    ]}/>
  </div>;
}

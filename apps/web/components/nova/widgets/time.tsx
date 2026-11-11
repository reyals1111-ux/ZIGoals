'use client';
import {useEffect, useMemo, useState, type CSSProperties} from 'react';
import {dayLeftWords, daysLeftWords, msToNextMinute, timeRings} from '../../../lib/nova/cards/time';
import {formatDate, formatNumber, formatPercent, formatTime} from '../../../lib/visual-format';
import {tickPath} from '../../../lib/nova/holo/geometry';
import {ArcMark, CardFoot, Fact, type CardProps} from '../cards/kit';
import {HoloTable, Orn} from '../holo/parts';
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
 * The day's dial (AM-2: "ice clock, rings, a compass-like bezel"): three concentric arcs — today outermost, then this week,
 * then this year — inside a tick bezel with four cardinal marks, a small compass star at its centre and one slow orbit.
 * Decoration: each ring's percent and what is left are the rows beside it and the table.
 */
function TimeDial({shares, size, hours}: {shares: readonly number[]; size: number; hours?: boolean}) {
  // Small (a 36 px dial at the head of a one-row widget): three thin arcs alone, no bezel, star or orbit.
  const mini = size < 60, px = mini ? 2.6 : size >= 150 ? 5.5 : 4.6, k = 100 / size, w = px * k, step = w * (mini ? 1.9 : 1.75), outer = mini ? 46.5 : 41;
  return <span className="nc-gauge nc-time-dial" data-hours={hours || undefined} data-mini={mini || undefined} style={{'--nc-d0': size, '--nc-w': px} as CSSProperties} aria-hidden="true">
    <svg viewBox="-50 -50 100 100" focusable="false">
      {!mini && <><path className="nc-bezel" d={tickPath(0, 0, 45, 47.5, 96)}/>
        <path className="nc-bezel nc-bezel-major" d={tickPath(0, 0, 44, 49, 24)}/>
        <path className="nc-time-cardinal" d="M0 -49.5l2.6 5h-5.2ZM49.5 0l-5 2.6v-5.2ZM0 49.5l-2.6 -5h5.2ZM-49.5 0l5 -2.6v5.2Z"/></>}
      {shares.map((share, i) => <g key={i} className="nc-time-arc" data-i={i}><ArcMark share={share} r={outer - w / 2 - i * step} w={w} k={i && !mini ? .82 : undefined}/></g>)}
      {!mini && <path className="nc-time-star" d="M0 -8.5 1.9 -1.9 8.5 0 1.9 1.9 0 8.5 -1.9 1.9 -8.5 0 -1.9 -1.9Z"/>}
    </svg>
    {!mini && <Orn view="-50 -50 100 100"><circle className="nc-gauge-orbit" r="49.4"/></Orn>}
    {hours && ['00', '06', '12', '18'].map((h, i) => <span key={h} className="nc-time-hour" data-at={i}>{h}</span>)}
  </span>;
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
    {/* Small: the three-arc dial stands before the figure, and where the row is wide the three shares follow it
        (decoration at this size: the table says each in words). */}
    <div className="nc-row">{size === 'S' && <TimeDial shares={items.map(it => it.share)} size={36}/>}
      <div className="nc-hero"><p className="nc-hero-figure"><span className="holo-num nc-hero-num">{formatTime(now)}</span></p><div className="nc-hero-words"><p className="nc-hero-label">{formatDate(now, {weekday: true, year: false})}</p></div></div>
      {size === 'S' && <ul className="nc-time-rows nc-time-inline" aria-hidden="true">{items.map((it, i) => <li key={it.key} data-i={i}><span className="nc-time-row-name">{it.label}</span><b className="nc-time-row-pct">{pct(it.share)}</b></li>)}</ul>}</div>
    {size !== 'S' && <div className="nc-time-rings">
      <TimeDial shares={items.map(it => it.share)} size={size === 'L' ? 148 : 120} hours={size === 'L'}/>
      <ul className="nc-time-rows">{items.map((it, i) => <li key={it.key} className="nc-rise" data-i={i} style={{'--nc-i': i} as CSSProperties}>
        <span className="nc-time-row-name">{it.label}</span><b className="nc-time-row-pct">{pct(it.share)}</b><span className="nc-time-row-left">{it.left}</span>
      </li>)}</ul>
    </div>}
    {/* Design review AM-D21 (L): the space is used — today as a 24-hour strip with the time marked, the week's seven
        days and the year's twelve months, each lit as far as it has passed (decoration: the same figures are the rings'
        words and the table's). */}
    {size === 'L' && <div className="nc-time-strips" aria-hidden="true">
      <div className="nc-time-strip" data-kind="day"><span className="nc-time-strip-name">Today</span><span className="nc-time-bar"><i style={{width: `${(rings.day.share * 100).toFixed(2)}%`}}/><b style={{left: `${(rings.day.share * 100).toFixed(2)}%`}}/></span><span className="nc-time-scale">{['00', '06', '12', '18', '24'].map(h => <span key={h}>{h}</span>)}</span></div>
      <div className="nc-time-strip" data-kind="week"><span className="nc-time-strip-name">This week</span><span className="nc-time-cells" style={{'--nc-cols': 7} as CSSProperties}>{['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => { const at = (now.getDay() + 6) % 7; return <i key={i} data-state={i < at ? 'past' : i === at ? 'now' : undefined}>{d}</i>; })}</span></div>
      <div className="nc-time-strip" data-kind="year"><span className="nc-time-strip-name">This year</span><span className="nc-time-cells" style={{'--nc-cols': 12} as CSSProperties}>{['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'].map((m, i) => <i key={i} data-state={i < now.getMonth() ? 'past' : i === now.getMonth() ? 'now' : undefined}>{m}</i>)}</span></div>
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

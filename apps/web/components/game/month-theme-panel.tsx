'use client';
import {useRef, useState} from 'react';
import {NebulaFlow} from '../nebula-flow';
import Link from 'next/link';
import {setMonthTheme, type GameRecord} from '../../lib/game/schema';
import {themeMonthsReached, themeProgress} from '../../lib/game/month-theme';
import {AREA_LABELS} from '../../lib/habits-extras/areas-mirror';
import type {HabitData} from '../../lib/habits';
import {formatMonth, formatNumber} from '../../lib/visual-format';
import {storageMessageOr} from '../../lib/storage-error-copy';
import type {DeviceRecordState} from '../ai/use-device-record';
import './av2-journey.css';

/**
 * Session AV lane 2 (habits; LEDGER #55, Finch's seasonal events without a pet): this month's theme on Journey — its
 * name, its line, the days with a check-in in its area of the 15 that earn the "Theme month" badge, and the months
 * reached. "Hide the monthly theme" keeps it off (the game record's `monthTheme: false`); focus stays on the switch.
 */
export default function MonthThemePanel({game, habits, extras, today}: {game: DeviceRecordState<GameRecord>; habits: HabitData; extras: unknown; today: string}) {
  const [said, setSaid] = useState(''), button = useRef<HTMLButtonElement>(null);
  const off = game.data.monthTheme === false;
  const p = themeProgress(habits.habits, extras, today.slice(0, 7), today), t = p.theme, area = AREA_LABELS[t.area] ?? t.area;
  const reached = themeMonthsReached(habits.habits, extras, today);
  const flip = () => {
    try { game.update(g => setMonthTheme(g, off)); setSaid(off ? 'The monthly theme is shown again.' : 'The monthly theme is hidden. Show it again here whenever you like.'); }
    catch (cause) { setSaid(storageMessageOr(cause, 'Not saved on this device.')); }
    requestAnimationFrame(() => button.current?.focus());
  };
  if (off) return <section className="panel journey-theme journey-theme-off" aria-labelledby="journey-theme-title"><p className="eyebrow">Each month</p><h2 id="journey-theme-title"><NebulaFlow identity="journey-theme-off">The monthly theme is hidden</NebulaFlow></h2>
    <p className="fine">Its badge is not earned while it is hidden; one already earned stays.</p>
    <button ref={button} type="button" className="secondary" onClick={flip}>Show the monthly theme</button>{said && <p className="fine" role="status">{said}</p>}</section>;
  return <section className="panel journey-theme" aria-labelledby="journey-theme-title" data-testid="journey-month-theme"><p className="eyebrow">{formatMonth(today.slice(0, 7))} · this month&rsquo;s theme</p>
    <h2 id="journey-theme-title"><span aria-hidden="true">{t.symbol} </span><NebulaFlow identity="journey-theme">{t.en}</NebulaFlow></h2>
    <p>{t.lineEn} {p.inArea ? `Check-ins on your ${area} habits count.` : `Every habit counts this month; give a habit the ${area} area (its Details → ◈ Choose an area) to make it the month’s own.`}</p>
    <p className="journey-theme-count"><strong>{formatNumber(Math.min(p.days, p.target))} of {formatNumber(p.target)} days</strong> with a check-in{p.reached ? ' · reached: the Theme month badge is yours' : ''}</p>
    <progress className="journey-theme-bar" max={p.target} value={Math.min(p.days, p.target)} aria-label={`${t.en}: ${p.days} of ${p.target} days with a check-in`} />
    {reached.length > 0 ? <p className="fine">Months reached: {reached.slice(-6).map(m => `${formatMonth(m)} · ${themeProgress(habits.habits, extras, m, today).theme.en}`).join(', ')}.</p> : <p className="fine">No month reached yet. A check-in on {p.target} days of a month reaches it; <Link href="/app/habits">your habits</Link> are where it starts.</p>}
    <button ref={button} type="button" className="quiet journey-theme-hide" onClick={flip}>Hide the monthly theme</button>{said && <p className="fine" role="status">{said}</p>}
  </section>;
}

'use client';
import {useDeviceRecord} from '../ai/use-device-record';
import {weightTrend} from '../../lib/health-aa/trend';
import {energyEstimate, ENERGY_MIN_LOGGED_DAYS} from '../../lib/health-aa/energy';
import {coachCheckIn} from '../../lib/health-aa/coach';
import {HEALTH_COACH} from '../../lib/health-aa/coach-schema';
import {weightChangeText, weightText, type WeightUnit} from '../../lib/health-units';
import {formatNumber} from '../../lib/visual-format';
import type {HealthData} from '../../lib/health';
import './health-highlights.css';

const tenths = (g: number) => Math.round(g / 100) * 100;
/** The trend line as a small ink sparkline (no axis: the tile's figure and the card below carry the numbers). */
function TrendInk({values}: {values: number[]}) {
  if (values.length < 2) return null;
  const W = 132, H = 40, lo = Math.min(...values), hi = Math.max(...values), span = Math.max(hi - lo, 1);
  const d = values.map((v, i) => `${i ? 'L' : 'M'}${(2 + i / (values.length - 1) * (W - 4)).toFixed(1)} ${(H - 4 - (v - lo) / span * (H - 8)).toFixed(1)}`).join(' ');
  return <svg className="health-hl-ink" viewBox={`0 0 ${W} ${H}`} width={W} height={H} aria-hidden="true" focusable="false">
    <defs><linearGradient id="health-hl-ink" x1="0" x2="1"><stop offset="0" stopColor="#23eaff"/><stop offset=".55" stopColor="#9273ff"/><stop offset="1" stopColor="#ff74be"/></linearGradient></defs>
    <path d={d} fill="none" stroke="url(#health-hl-ink)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>;
}

/**
 * Session AB-Design Phase 2, Part 5 (owner request 33): Health's highlights — three glass tiles at the top of the page,
 * each the one figure of a card further down (the weight trend, the energy estimate, the weekly coach) and a link to that
 * card. Nothing new is computed: the same helpers the cards use, the same "an estimate" wording. Phones: a swipeable row.
 */
export default function HealthHighlights({data, today, unit}: {data: HealthData; today: string; unit: WeightUnit}) {
  const trend = weightTrend(data, today, 42), energy = energyEstimate(data, today);
  const coachRecord = useDeviceRecord(HEALTH_COACH), coach = coachCheckIn(data, coachRecord.loaded && !coachRecord.unreadable ? coachRecord.data : {version: 1}, today, unit);
  const ink = trend.points.flatMap(p => p.trend === null ? [] : [p.trend]);
  const rate = trend.weeklyRate === null ? null : weightChangeText(tenths(trend.weeklyRate), unit);
  return <section className="health-highlights" aria-label="Health highlights">
    <ul role="list">
      <li><a className="health-hl-tile" data-tone="trend" href="#health-weight-trend">
        <span className="health-hl-label">Weight trend</span>
        {trend.latestTrend === null ? <><strong className="health-hl-figure is-quiet">No trend yet</strong><span className="health-hl-note">Two or three readings a week draw the line.</span></>
          : <><strong className="health-hl-figure">{weightText(tenths(trend.latestTrend), unit)}</strong><span className="health-hl-note">{rate ? `${rate} a week` : 'smoothed, six weeks'} · an estimate</span><TrendInk values={ink}/></>}
      </a></li>
      <li><a className="health-hl-tile" data-tone="energy" href="#health-energy">
        <span className="health-hl-label">Energy estimate</span>
        {energy.ready && energy.expenditure !== null ? <><strong className="health-hl-figure">{formatNumber(energy.expenditure)} <small>kcal a day</small></strong><span className="health-hl-note">about {formatNumber(energy.low ?? 0)}–{formatNumber(energy.high ?? 0)} · an estimate</span></>
          : <><strong className="health-hl-figure is-quiet">{energy.loggedDays} of {ENERGY_MIN_LOGGED_DAYS} days</strong><span className="health-hl-note">logged so far; about two weeks of logs make the estimate</span><span className="health-hl-bar" aria-hidden="true"><i style={{width: `${Math.min(100, energy.loggedDays / ENERGY_MIN_LOGGED_DAYS * 100)}%`}}/></span></>}
      </a></li>
      <li><a className="health-hl-tile" data-tone="coach" href="#health-coach">
        <span className="health-hl-label">Your coach{coach.answered ? ' · answered' : coach.rateGrams !== null ? ' · this week' : ''}</span>
        <span className="health-hl-sentence">{coach.sentence}</span>
        <span className="health-hl-note">{coach.answered ? 'Back next week.' : coach.rateGrams !== null ? 'Keep or adjust your target →' : 'Weekly check-in'}</span>
      </a></li>
    </ul>
  </section>;
}

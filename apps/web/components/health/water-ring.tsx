'use client';
import {NebulaFlow} from '../nebula-flow';
import {GlassRing} from '../progress/glass-progress';
import {dailyData, waterSummary} from '../../lib/health-daily';
import type {HealthData} from '../../lib/health';
import {NO_WATER_TODAY, waterText} from '../../lib/health-units';
import './health-aa.css';

/**
 * N11, then Session AC (the owner's decision of 2026-10-15: one Water card): today's water as a goal ring, alone, at the head of the Water card. Its one-tap
 * sizes were the same as the card's own buttons (both read Health → Quick logging), so the card's buttons are the one row.
 */
export function WaterRingFigure({data, date}: {data: HealthData; date: string}) {
  const daily = dailyData(data), s = waterSummary(data, date), unit = daily.preferences.waterUnit;
  const target = s.targetMl ?? null, share = target ? Math.min(1, s.millilitres / target) : 0;
  return <div className="water-ring-inline">
    <GlassRing identity="water-ring" className="water-ring" arcs={[{key: 'water', end: share * 100}]} role="img" aria-label={!s.entries ? `${NO_WATER_TODAY}${target ? `; goal ${waterText(target, unit)}` : ', no goal set'}` : target ? `${waterText(s.millilitres, unit)} of ${waterText(target, unit)} today` : `${waterText(s.millilitres, unit)} today, no goal set`}><strong>{waterText(s.millilitres, unit).replace(/\s.*$/, '')}</strong><small>{target ? `of ${waterText(target, unit)}` : unit === 'ml' ? 'mL' : 'fl oz'}</small></GlassRing>
    {/* Session AL sweep 2 (NOVA review M5): with nothing logged the ring's words say so (its 0 is not a measured zero). */}
    <p className="water-ring-inline-line"><NebulaFlow identity="water-ring-title">{!s.entries ? `${NO_WATER_TODAY}.` : target ? (share >= 1 ? 'Goal reached today.' : 'A sip at a time.') : 'Set a daily goal in Targets.'}</NebulaFlow></p>
  </div>;
}

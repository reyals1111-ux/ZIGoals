'use client';
import {GlassBar} from '../../progress/glass-progress';
import {useHealth} from '../../health/use-health';
import {dailyData, healthDay, waterSummary} from '../../../lib/health-daily';
import {shareOf, waterAmount} from '../../../lib/nova/widgets/words';
import {NovaEmpty, NovaReading, NovaUnread} from './empty';

/** "Water": today's water against the person's own target, in their unit (Health's own day and zone). */
export default function WaterWidget() {
  const health = useHealth();
  if (!health.loaded) return <NovaReading/>;
  if (health.error) return <NovaUnread what="Your Health journal"/>;
  let sum: ReturnType<typeof waterSummary>, unit: 'ml' | 'fl-oz-us';
  try { const daily = dailyData(health.data); unit = daily.preferences.waterUnit; sum = waterSummary(health.data, healthDay(daily.preferences.timezone)); } catch { return <NovaUnread what="Today’s water"/>; }
  const share = shareOf(sum.millilitres, sum.targetMl);
  if (!sum.entries && !sum.targetMl) return <NovaEmpty pillar="health" href="/app/health#water" action="Log a glass">No water logged today yet. One tap on Health adds a glass.</NovaEmpty>;
  return <div className="nova-water">
    <p className="nova-big"><span className="nova-figure">{waterAmount(sum.millilitres, unit)}</span>{sum.targetMl ? <small> of {waterAmount(sum.targetMl, unit)}</small> : null}</p>
    {share !== null && <GlassBar identity="nova-water" value={share} role="progressbar" aria-label="Water today against your target" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(share * 100)}/>}
    <p className="nova-line">{sum.entries ? `${sum.entries} ${sum.entries === 1 ? 'entry' : 'entries'} today.` : 'Nothing logged yet today.'}{!sum.targetMl ? ' Set a daily target on Health to see a bar.' : ''}</p>
  </div>;
}

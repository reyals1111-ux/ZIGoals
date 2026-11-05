'use client';
import {GlassBar} from '../../progress/glass-progress';
import {useHealth} from '../../health/use-health';
import {waterToday, type WaterDay} from '../../../lib/health-daily';
import {shareOf, waterAmount} from '../../../lib/nova/widgets/words';
import {NovaEmpty, NovaReading, NovaUnread} from './empty';

/** "Water": today's water against the person's own target, in their unit (Health's own day and zone). Session AL (L2's one
 *  source, P-NB-28): the same `waterToday` every other water figure reads (ZIGi's answers, the briefs, Today). */
export default function WaterWidget() {
  const health = useHealth();
  if (!health.loaded) return <NovaReading/>;
  if (health.error) return <NovaUnread what="Your Health journal"/>;
  let sum: WaterDay;
  try { sum = waterToday(health.data); } catch { return <NovaUnread what="Today’s water"/>; }
  const unit = sum.unit;
  const share = shareOf(sum.millilitres, sum.targetMl);
  if (!sum.entries && !sum.targetMl) return <NovaEmpty pillar="health" href="/app/health#water" action="Log a glass">No water logged today yet. One tap on Health adds a glass.</NovaEmpty>;
  return <div className="nova-water">
    {/* Review M5 (lane L8d): nothing logged today is "—", not "0 mL" (unknown is not zero; the HUD's panels say the same). */}
    <p className="nova-big"><span className="nova-figure">{sum.entries ? waterAmount(sum.millilitres, unit) : '—'}</span>{sum.targetMl ? <small> of {waterAmount(sum.targetMl, unit)}</small> : null}</p>
    {share !== null && sum.entries > 0 && <GlassBar identity="nova-water" value={share} role="progressbar" aria-label="Water today against your target" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(share * 100)}/>}
    <p className="nova-line">{sum.entries ? `${sum.entries} ${sum.entries === 1 ? 'entry' : 'entries'} today.` : 'Nothing logged yet today.'}{!sum.targetMl ? ' Set a daily target on Health to see a bar.' : ''}</p>
  </div>;
}

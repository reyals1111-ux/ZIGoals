'use client';
import type {HealthData} from '../../lib/health';
import {weekDigest} from '../../lib/health-aa/week-digest';
import {weekUsage, weekUsageText} from '../../lib/health-aa/week-usage';
import {dailyData} from '../../lib/health-daily';
import {addLocalDays} from '../../lib/local-date';
import {formatDate} from '../../lib/visual-format';
import {useFasting} from './use-fasting';

/** Session AL (P-MO-79; MO-042, C-MO-58): the week's digest at the top of Health → Insights. */
export function WeekDigestCard({data, today}: {data: HealthData; today: string}) {
  const fasting = useFasting();
  const lines = weekDigest(data, fasting.loaded && !fasting.unreadable ? fasting.data : null, today, dailyData(data).preferences.weightUnit);
  return <section className="panel health-aa-card health-week-digest" aria-labelledby="week-digest-title">
    <p className="eyebrow">{formatDate(addLocalDays(today, -6))} – {formatDate(today)}</p><h2 id="week-digest-title">This week</h2>
    <dl className="health-aa-facts">{lines.map(l => <div key={l.key} data-known={l.known || undefined}><dt>{l.label}</dt><dd>{l.text}</dd></div>)}</dl>
    {/* Session AL third pass (GAP-073, C-MO-55): how you used Health this week, counted from the journal on this device. */}
    <p className="health-week-usage">{weekUsageText(weekUsage(data, today))}</p>
    <p className="fine">From your own logs only; a part with nothing logged says so. Counted on this device: nothing about how you use ZIGoals is tracked or sent. Information, not advice.</p>
  </section>;
}

'use client';
import {useMemo} from 'react';
import {healthTrendsCard, healthTrendsRows} from '../../../lib/nova/cards/health-more';
import {useHealth} from '../../health/use-health';
import {CardFoot, CardNotice, Delta, Hero, type CardProps} from '../cards/kit';
import {HoloHidden, HoloReading, HoloTable, HoloUnread} from '../holo/parts';
import {usePillarShown} from '../holo/use-hud-data';
import {WidgetLocked} from '../stage/stage-parts';
import {NxRows} from './nx-rows';
import {useHealthDay, useHealthGate} from './use-health-gate';
import '../cards/connect-cards.css';

/**
 * Session AM-2 (step 3, round 2; ADR-040 feature 4): "Health trends" in Health's pink — the last 90 days beside the last
 * 365 for steps, sleep, weight and resting heart rate, exactly as Health → Insights reads them
 * (lib/health-trends/trends.ts; figures in lib/nova/cards/health-more.ts). A day counts only when something was recorded;
 * a measure with too few days waits and says how many it has. The direction is a word ("Up", "Down", "About the same"),
 * never a judgement and never a colour alone. Behind the Health switches (the frame's gate, and `useHealthGate` here);
 * a request for it is kept by the widget's name (AM-S5). Read only.
 */
const SHOWN = {S: 0, M: 2, L: 4} as const;
export default function HealthTrendsWidget({size = 'M'}: Partial<CardProps>) {
  const shown = usePillarShown('health'), gate = useHealthGate();
  if (!shown) return <HoloHidden pillar="Health"/>;
  if (gate === 'locked') return <WidgetLocked id="health-trends"/>;
  if (gate === 'reading') return <HoloReading/>;
  return <Trends size={size}/>;
}
/** Mounted only once the Health switch is open: the records are read here and nowhere before. */
function Trends({size}: {size: CardProps['size']}) {
  const health = useHealth(), day = useHealthDay();
  const card = useMemo(() => { if (!health.loaded || health.error) return null; try { return healthTrendsCard(health.data, day); } catch { return null; } }, [health.loaded, health.error, health.data, day]);
  if (!health.loaded) return <HoloReading/>;
  if (!card) return <HoloUnread what="Your Health records"/>;
  if (card.state === 'empty') return <CardNotice kind="empty" ghost="trend" title="Nothing recorded yet" href="/app/health" action="Log on Health">{size === 'S' ? null : 'Steps, sleep, weight or a resting heart rate you record on Health show here, your last 90 days beside your year.'}</CardNotice>;
  const foot = <CardFoot source="Your Health records" asOf={`the last ${card.recentDays} days beside the last ${card.yearDays}`}/>, table = <HoloTable caption="Health trends" rows={healthTrendsRows(card)}/>;
  const top = card.rows[0];
  const waiting = card.waiting.length > 0 && <ul className="nx-chips" aria-label="Measures that wait for more days">{card.waiting.slice(0, 4).map(w => <li key={w.id}>{w.label} · <b>{w.words}</b></li>)}</ul>;
  if (!top) return <div className="nc-body nx-card" data-size={size}>
    <div className="nx-top"><Hero value={String(card.waiting.length)} unit={card.waiting.length === 1 ? 'measure' : 'measures'} label="Waiting for more days"/></div>
    {size !== 'S' && <div className="nx-main" data-fit="rows">{waiting}</div>}
    {foot}{table}
  </div>;
  const rest = card.rows.slice(1, SHOWN[size]);
  return <div className="nc-body nx-card" data-size={size}>
    <div className="nx-top"><Hero value={top.recent} label={size === 'S' ? top.label : `${top.label} · last ${card.recentDays} days`}>
      {size !== 'S' && <Delta text={`${top.words} · your year: ${top.year}`} direction={top.direction === 'same' ? 'flat' : top.direction} good={null}/>}
    </Hero></div>
    {rest.length > 0 && <div className="nx-main" data-fit="rows">
      <NxRows label="The other measures" where="the Health page" extra={card.rows.length - 1 - rest.length} rows={rest.map(r => ({key: r.id, name: r.label, value: `${r.words} · ${r.recent}`, sub: `Your year: ${r.year} · ${r.recentDays} recent days recorded`}))}/>
    </div>}
    {size === 'L' && waiting}
    {foot}{table}
  </div>;
}

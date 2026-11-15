'use client';
import {useMemo} from 'react';
import {addLocalDays} from '../../../lib/local-date';
import {foodDaysCard, foodDaysRows} from '../../../lib/nova/cards/health-more';
import {formatMonth, formatWeekday} from '../../../lib/visual-format';
import {useHealth} from '../../health/use-health';
import {CardFoot, CardNotice, Gauge, Hero, Lattice, type CardProps} from '../cards/kit';
import {HoloHidden, HoloReading, HoloTable, HoloUnread} from '../holo/parts';
import {usePillarShown} from '../holo/use-hud-data';
import {WidgetLocked} from '../stage/stage-parts';
import {dayInWeek, isoWeekOf} from './nx-rows';
import {useHealthDay, useHealthGate} from './use-health-gate';
import '../cards/connect-cards.css';

/**
 * Session AM-2 (step 3, round 2; ADR-040 feature 7): "Food-logging days" in Health's pink — on how many days of this
 * month, up to today, at least one food was logged in the diary, as a month of days (lib/food-log/consistency.ts;
 * figures in lib/nova/cards/health-more.ts). Nothing is judged (a day without a log is just a day without a log) and
 * no calorie figure is involved. Behind the Health switches (the frame's gate, and `useHealthGate` here); a request for
 * it is kept by the widget's name (AM-S5). Read only.
 */
export default function FoodDaysWidget({size = 'M'}: Partial<CardProps>) {
  const shown = usePillarShown('health'), gate = useHealthGate();
  if (!shown) return <HoloHidden pillar="Health"/>;
  if (gate === 'locked') return <WidgetLocked id="food-days"/>;
  if (gate === 'reading') return <HoloReading/>;
  return <FoodDays size={size}/>;
}
/** Mounted only once the Health switch is open: the diary is read here and nowhere before. */
function FoodDays({size}: {size: CardProps['size']}) {
  const health = useHealth(), day = useHealthDay();
  const card = useMemo(() => { if (!health.loaded || health.error) return null; try { return foodDaysCard(health.data, day); } catch { return null; } }, [health.loaded, health.error, health.data, day]);
  if (!health.loaded) return <HoloReading/>;
  if (!card) return <HoloUnread what="Your Health records"/>;
  if (card.state === 'empty') return <CardNotice kind="empty" ghost="lattice" title="No food logged yet" href="/app/health?view=diary" action="Log a food on Health">{size === 'S' ? null : 'Each day you log a food on Health lights up here, a month at a time.'}</CardNotice>;
  const at = card.weeks.findIndex(w => { const i = dayInWeek(w.key, day); return i >= 0 && i < 7; });
  const weeks = size === 'L' ? card.weeks : card.weeks.slice(Math.max(0, (at < 0 ? card.weeks.length : at + 1) - 3), at < 0 ? undefined : at + 1).reverse(), month = formatMonth(card.month);
  return <div className="nc-body nx-card" data-size={size}>
    <div className="nx-top">
      <Gauge share={card.daysSoFar ? card.logged / card.daysSoFar : null} size={size === 'L' ? 76 : size === 'S' ? 36 : 50} bezel={size !== 'S'} spin={size === 'L'} decor/>
      <Hero value={String(card.logged)} unit={`of ${card.daysSoFar}`} label={size === 'S' ? 'Days logged' : `Days with food logged · ${month}`}>
        {size !== 'S' && <p className="nx-note">{card.run > 0 ? `${card.run} in a row` : 'No run going'}</p>}
      </Hero>
    </div>
    {size !== 'S' && <div className="nx-main nx-month" data-fit="rows">
      <Lattice columns={Array.from({length: 7}, (_, i) => formatWeekday(addLocalDays(card.firstMonday, i)).slice(0, 1))} rows={weeks.map(w => { const i = dayInWeek(w.key, day); return {key: w.key, label: `W${isoWeekOf(w.key)}`, cells: w.cells, today: i >= 0 && i < 7 ? i : undefined}; })}/>
    </div>}
    {size === 'L' && <p className="nx-note">A lit day has at least one food logged. A day without a log is just a day without a log.</p>}
    <CardFoot source="Your Health records" asOf="so far this month"/>
    <HoloTable caption={`Food-logging days, ${month}`} rows={foodDaysRows(card)}/>
  </div>;
}

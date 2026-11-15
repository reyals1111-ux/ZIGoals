'use client';
import {useMemo} from 'react';
import {meditationCard, meditationRows} from '../../../lib/nova/cards/health-more';
import {healthGroupIn} from '../../../lib/vault/w-homes';
import {useHealth} from '../../health/use-health';
import {CardFoot, CardNotice, Columns, Fact, Gauge, Hero, type CardProps} from '../cards/kit';
import {HoloHidden, HoloReading, HoloTable, HoloUnread} from '../holo/parts';
import {usePillarShown} from '../holo/use-hud-data';
import {WidgetLocked} from '../stage/stage-parts';
import {useHealthDay, useHealthGate} from './use-health-gate';
import '../cards/connect-cards.css';

/**
 * Session AM-2 (step 3, round 2): "Meditation" in Health's pink — the minutes meditated this week (against the person's
 * own weekly goal, where they set one), the last eight weeks as columns and the days in a row (Health → Meditation's own
 * counts, lib/meditation/stats.ts; figures in lib/nova/cards/health-more.ts). A week without a session is an empty slot,
 * never a zero. Behind the Health switches (the frame's gate, and `useHealthGate` here); a request for it is kept by the
 * widget's name (AM-S5). Read only: a session is logged or timed on Health.
 */
export default function MeditationWidget({size = 'M'}: Partial<CardProps>) {
  const shown = usePillarShown('health'), gate = useHealthGate();
  if (!shown) return <HoloHidden pillar="Health"/>;
  if (gate === 'locked') return <WidgetLocked id="meditation"/>;
  if (gate === 'reading') return <HoloReading/>;
  return <Minutes size={size}/>;
}
/** Mounted only once the Health switch is open: the sessions are read here and nowhere before. */
function Minutes({size}: {size: CardProps['size']}) {
  const health = useHealth(), day = useHealthDay();
  const card = useMemo(() => { if (!health.loaded || health.error) return null; try { return meditationCard(healthGroupIn(health.data, 'meditation'), day); } catch { return null; } }, [health.loaded, health.error, health.data, day]);
  if (!health.loaded) return <HoloReading/>;
  if (!card) return <HoloUnread what="Your Health records"/>;
  if (card.state === 'empty') return <CardNotice kind="empty" ghost="columns" title="No meditation logged yet" href="/app/health?view=meditation" action="Go to Meditation">{size === 'S' ? null : 'Time a session or log one on Health. Your minutes then add up here, week by week.'}</CardNotice>;
  return <div className="nc-body nx-card" data-size={size}>
    <div className="nx-top">
      {card.goal !== null && <Gauge share={card.share} size={size === 'L' ? 76 : size === 'S' ? 36 : 50} bezel={size !== 'S'} spin={size === 'L'} decor/>}
      <Hero value={card.thisWeekText} label={size === 'S' ? 'This week' : card.goal ? `This week · of your ${card.goal} min` : 'Meditated this week'}>
        {size !== 'S' && <p className="nx-note">{card.daysInARow > 0 ? `${card.daysInARow} ${card.daysInARow === 1 ? 'day' : 'days'} in a row` : 'No run going'}</p>}
      </Hero>
    </div>
    {size !== 'S' && <div className="nx-main">
      {size === 'L' && <p className="nx-cap">Minutes each week</p>}
      <Columns values={card.weeks.map(w => w.minutes)} labels={card.weeks.map(w => w.label)} height={size === 'L' ? 96 : 52} mark={card.weeks.length - 1}/>
    </div>}
    {size === 'L' && <div className="nc-facts">
      <Fact label="Sessions in all" value={String(card.sessions)}/>
      <Fact label="Time in all" value={card.totalText}/>
      <Fact label="Longest session" value={card.longestText}/>
    </div>}
    <CardFoot source="Your Health records" asOf="this week so far"/>
    <HoloTable caption="Meditation" rows={meditationRows(card, day)}/>
  </div>;
}

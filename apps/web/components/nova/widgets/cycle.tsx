'use client';
import {useMemo} from 'react';
import {CYCLE} from '../../../lib/cycle/store';
import {cycleCard, cycleRows} from '../../../lib/nova/cards/health-more';
import {formatDate} from '../../../lib/visual-format';
import {useDeviceRecord} from '../../ai/use-device-record';
import {CardFoot, CardNotice, type CardProps} from '../cards/kit';
import {HoloHidden, HoloReading, HoloTable, HoloUnread} from '../holo/parts';
import {usePillarShown} from '../holo/use-hud-data';
import {WidgetLocked} from '../stage/stage-parts';
import {useHealthDay, useHealthGate} from './use-health-gate';
import {NxDial, NxHead} from './nx-parts';
import '../cards/connect-cards.css';

/**
 * Session AM-2 (step 3, round 2): "Cycle" in Health's pink — which day of the current cycle today is and, after three
 * complete cycles, the next period as a range of days from the person's own past cycles (Health's cycle log,
 * lib/cycle/engine.ts; figures in lib/nova/cards/health-more.ts). Information for the person, not a contraceptive or a
 * diagnosis: the widget says so at every size.
 *
 * The most sensitive record NOVA shows, so it is held behind three locks and kept on the screen:
 * - the Health switches (the frame's gate: NOVA's Health permission and the device's Health switch; `useHealthGate`
 *   here again), under which the widget is made locked and its record is not read;
 * - the cycle log's own switch on Health: off means this widget shows nothing of it and says where the switch is;
 * - NOVA's words: the answer line is only "Your cycle widget is on the stage." (lib/nova/summon/more-lines.ts), the
 *   record is never read for a line (lib/nova/stage/more-extras.ts), and a request for it is kept as "Health: Cycle",
 *   never the person's words (AM-S5). No symptom and no note of the log is shown here at all.
 * Read only: a day is logged on Health.
 */
export default function CycleWidget({size = 'M'}: Partial<CardProps>) {
  const shown = usePillarShown('health'), gate = useHealthGate();
  if (!shown) return <HoloHidden pillar="Health"/>;
  if (gate === 'locked') return <WidgetLocked id="cycle"/>;
  if (gate === 'reading') return <HoloReading/>;
  return <CycleBody size={size}/>;
}
/** Mounted only once the Health switch is open: the cycle log is read here and nowhere before. */
function CycleBody({size}: {size: CardProps['size']}) {
  const record = useDeviceRecord(CYCLE), today = useHealthDay();
  const card = useMemo(() => { if (!record.loaded || record.unreadable) return null; try { return cycleCard(record.data, today); } catch { return null; } }, [record.loaded, record.unreadable, record.data, today]);
  if (!record.loaded) return <HoloReading/>;
  if (!card) return <HoloUnread what="Your cycle log"/>;
  if (card.state === 'off') return <CardNotice kind="off" ghost="ring" title="The cycle log is off" href="/app/health#cycle-log" action="Go to the cycle log">{size === 'S' ? null : 'Your cycle log has its own switch on Health. While it is off, nothing of it is shown here.'}</CardNotice>;
  if (card.state === 'empty') return <CardNotice kind="empty" ghost="ring" title="Nothing logged yet" href="/app/health#cycle-log" action="Go to the cycle log">{size === 'S' ? null : 'Log the first day of a period on Health. The day of your cycle then shows here, on your screen only.'}</CardNotice>;
  const day = (date: string) => formatDate(date, {year: date.slice(0, 4) !== today.slice(0, 4)}), e = card.estimate;
  return <div className="nc-body nx-card" data-size={size} data-lay="dial">
    <NxDial share={card.day !== null && e ? Math.min(1, card.day / Math.max(1, e.longest)) : null} figure={card.day === null ? '—' : String(card.day)} caption={card.day === null ? null : 'day'}/>
    <NxHead pulse label="Day of this cycle" title={card.day === null ? 'No recent period logged' : `Day ${card.day}`} note={card.lastStart ? `Last period started ${day(card.lastStart)}.` : null}/>
    {size !== 'S' && <div className="nx-main" data-fit="rows" data-keep="">
      <p className="nx-readout">
        <span className="nx-readout-label">Next period, an estimate</span>
        <span className="nx-readout-value" data-long={e ? '' : undefined}>{e ? `${formatDate(e.from, {year: false})} – ${formatDate(e.to, {year: false})}` : 'Not yet'}</span>
        <span className="nx-readout-sub">{e ? `${e.passed ? 'These days have passed. ' : ''}From your cycles of ${e.shortest} to ${e.longest} days.` : `After ${card.need} more complete ${card.need === 1 ? 'cycle' : 'cycles'}.`}</span>
      </p>
      {size === 'L' && <p className="nx-note">{card.rule}</p>}
    </div>}
    <CardFoot source="Your cycle log" asOf="on your screen only"/>
    <HoloTable caption="Cycle" rows={cycleRows(card, day)}/>
  </div>;
}

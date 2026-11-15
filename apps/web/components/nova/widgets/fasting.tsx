'use client';
import {useMemo} from 'react';
import {fastingCard, fastingRows} from '../../../lib/nova/cards/health-more';
import {useFasting} from '../../health/use-fasting';
import {Bars, CardFoot, CardNotice, type CardProps} from '../cards/kit';
import {HoloHidden, HoloReading, HoloTable, HoloUnread} from '../holo/parts';
import {usePillarShown} from '../holo/use-hud-data';
import {WidgetLocked} from '../stage/stage-parts';
import {useHealthDay, useHealthGate} from './use-health-gate';
import {NxDial, NxHead} from './nx-parts';
import '../cards/connect-cards.css';

/**
 * Session AM-2 (step 3, round 2): "Fasting" in Health's pink — the fast that is running against its target (a ring that
 * fills with the hours; the clock moves with the page's own minute tick, not an animation) and the last fasts, each with
 * its hours and its target (Health's fasting timer, lib/fasting/engine.ts, through the page's own hook; figures in
 * lib/nova/cards/health-more.ts). Hours and a target only: no streak, no "longest", as the timer itself.
 *
 * It starts and stops nothing. A fast is started on Health, or by asking NOVA in words ("start a 16 hour fast"): that
 * gives the usual card to confirm, with Undo (lib/ai/actions, `start-fast`). Behind the Health switches (the frame's
 * gate, and `useHealthGate` here); a request for it is kept by the widget's name (AM-S5).
 */
const SHOWN = {S: 0, M: 2, L: 5} as const;
export default function FastingWidget({size = 'M'}: Partial<CardProps>) {
  const shown = usePillarShown('health'), gate = useHealthGate();
  if (!shown) return <HoloHidden pillar="Health"/>;
  if (gate === 'locked') return <WidgetLocked id="fasting"/>;
  if (gate === 'reading') return <HoloReading/>;
  return <Fasts size={size}/>;
}
/** Mounted only once the Health switch is open: the fasts are read here and nowhere before. */
function Fasts({size}: {size: CardProps['size']}) {
  const store = useFasting(), day = useHealthDay();
  const card = useMemo(() => { if (!store.loaded || store.unreadable) return null; try { return fastingCard(store.data, store.now, day, 5); } catch { return null; } }, [store.loaded, store.unreadable, store.data, store.now, day]);
  if (!store.loaded) return <HoloReading/>;
  if (!card) return <HoloUnread what="Your fasts"/>;
  if (card.state === 'empty') return <CardNotice kind="empty" ghost="ring" title="No fast logged yet" href="/app/health#fasting" action="Go to the fasting timer">{size === 'S' ? null : 'Start a fast on Health, or ask NOVA “start a 16 hour fast” for a card to confirm. Its hours show here.'}</CardNotice>;
  const run = card.running, last = card.history[0], rows = card.history.slice(run ? 0 : 1, (run ? 0 : 1) + SHOWN[size]);
  const clock = (ms: number) => `${Math.floor(ms / 3_600_000)}:${String(Math.floor(ms % 3_600_000 / 60_000)).padStart(2, '0')}`;
  return <div className="nc-body nx-card" data-size={size} data-lay="dial">
    {run ? <NxDial share={run.share} figure={clock(run.elapsedMs)} caption={`of ${run.targetHours} h`} ticks={run.targetHours * 2} spin={size === 'L'}/>
      : <NxDial share={last ? Math.min(1, last.hours / Math.max(1, last.targetHours)) : null} figure={last ? last.hoursText.replace(/\s*h$/, '') : '—'} caption={last ? `of ${last.targetHours} h` : null}/>}
    {run ? <NxHead pulse label="Fasting now" title={run.elapsed} note={run.reached ? `The target of ${run.targetHours} h is reached.` : `Target ${run.targetHours} h`}/>
      : <NxHead pulse label={last ? `Last fast · ${last.dayText}` : 'Fasting'} title={last ? last.hoursText : 'No fast finished yet'} note={last ? `Target ${last.targetHours} h · no fast is running` : null}/>}
    {rows.length > 0 && <div className="nx-main" data-fit="rows" data-wr-limit="">
      {size === 'L' && <p className="nx-cap">{run ? 'Your last fasts' : 'Before that'}</p>}
      <Bars extra={Math.max(0, card.count - (run ? 0 : 1) - rows.length)} rows={rows.map(h => ({key: h.id, label: h.dayText, share: Math.min(1, h.hours / Math.max(1, h.targetHours)), value: `${h.hoursText} of ${h.targetHours} h`}))}/>
    </div>}
    <CardFoot source="Your Health records" asOf={run ? 'the clock updates each minute' : 'hours and a target only'}/>
    <HoloTable caption="Fasting" rows={fastingRows(card)}/>
  </div>;
}

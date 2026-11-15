'use client';
import {useMemo} from 'react';
import {supplementsCard, supplementsRows} from '../../../lib/nova/cards/health-more';
import {SUPPLEMENTS} from '../../../lib/supplements/schema';
import {useDeviceRecord} from '../../ai/use-device-record';
import {Bars, CardFoot, CardNotice, Gauge, Hero, type CardProps} from '../cards/kit';
import {HoloHidden, HoloReading, HoloTable, HoloUnread} from '../holo/parts';
import {usePillarShown} from '../holo/use-hud-data';
import {WidgetLocked} from '../stage/stage-parts';
import {NxRows} from './nx-rows';
import {useHealthDay, useHealthGate} from './use-health-gate';
import '../cards/connect-cards.css';

/**
 * Session AM-2 (step 3, round 2): "Supplements" in Health's pink — today's doses of the supplements and medication the
 * person keeps track of (taken, skipped, not logged yet) and, at Large, the last 14 days per item (Health's own log,
 * lib/supplements/log.ts; figures in lib/nova/cards/health-more.ts). Not logged is unknown, never "missed"; the widget
 * gives no advice and no reminder. Behind the Health switches (the frame's gate, and `useHealthGate` here); a request
 * for it is kept by the widget's name (AM-S5). Read only: a dose is marked on Health.
 */
const SHOWN = {S: 0, M: 2, L: 5} as const;
export default function SupplementsWidget({size = 'M'}: Partial<CardProps>) {
  const shown = usePillarShown('health'), gate = useHealthGate();
  if (!shown) return <HoloHidden pillar="Health"/>;
  if (gate === 'locked') return <WidgetLocked id="supplements"/>;
  if (gate === 'reading') return <HoloReading/>;
  return <Doses size={size}/>;
}
/** Mounted only once the Health switch is open: the log is read here and nowhere before. */
function Doses({size}: {size: CardProps['size']}) {
  const record = useDeviceRecord(SUPPLEMENTS), day = useHealthDay();
  const card = useMemo(() => { if (!record.loaded || record.unreadable) return null; try { return supplementsCard(record.data, day); } catch { return null; } }, [record.loaded, record.unreadable, record.data, day]);
  if (!record.loaded) return <HoloReading/>;
  if (!card) return <HoloUnread what="Your supplements log"/>;
  if (card.state === 'empty') return <CardNotice kind="empty" ghost="rows" title="Nothing kept track of yet" href="/app/health#supplements-title" action="Add one on Health">{size === 'S' ? null : 'Add a supplement or a medication on Health with its times. Today’s doses then show here.'}</CardNotice>;
  const doses = card.today.slice(0, SHOWN[size]);
  return <div className="nc-body nx-card" data-size={size}>
    <div className="nx-top">
      <Gauge share={card.planned ? card.taken / card.planned : null} size={size === 'L' ? 76 : size === 'S' ? 36 : 50} bezel={size !== 'S'} spin={size === 'L'} decor/>
      <Hero value={card.planned ? String(card.taken) : '—'} unit={card.planned ? `of ${card.planned}` : undefined} label={card.planned ? (size === 'S' ? 'Taken today' : 'Doses taken today') : 'Nothing planned today'}>
        {size !== 'S' && card.planned > 0 && <p className="nx-note">{card.notLogged ? `${card.notLogged} not logged yet` : 'Every dose is logged'}{card.skipped ? ` · ${card.skipped} skipped` : ''}</p>}
      </Hero>
    </div>
    {doses.length > 0 && <div className="nx-main" data-fit="rows">
      {size === 'L' && <p className="nx-cap">Today</p>}
      <NxRows label="Today’s doses" where="the Health page" extra={card.today.length - doses.length} rows={doses.map(d => ({key: d.key, name: d.dose ? `${d.name} · ${d.dose}` : d.name, value: d.statusWords, sub: d.slot}))}/>
    </div>}
    {size === 'L' && card.summary.length > 0 && <div className="nx-main" data-fit="rows">
      <p className="nx-cap">The last 14 days</p>
      <Bars rows={card.summary.slice(0, 4).map(s => ({key: s.id, label: s.name, share: s.share, value: s.words}))}/>
    </div>}
    {size === 'L' && <p className="nx-note">Not logged is unknown, never missed. Your own log, not medical advice.</p>}
    <CardFoot source="Your Health records" asOf="today"/>
    <HoloTable caption="Supplements and medication" rows={supplementsRows(card)}/>
  </div>;
}

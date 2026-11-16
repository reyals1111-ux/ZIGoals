'use client';
import {useMemo} from 'react';
import {symptomsCard, symptomsRows} from '../../../lib/nova/cards/health-insights';
import {logDayWords} from '../../../lib/nova/cards/weight';
import {SYMPTOMS} from '../../../lib/symptoms/schema';
import {useDeviceRecord} from '../../ai/use-device-record';
import {Bars, CardFoot, CardNotice, type CardProps} from '../cards/kit';
import {HoloHidden, HoloReading, HoloTable, HoloUnread} from '../holo/parts';
import {usePillarShown} from '../holo/use-hud-data';
import {WidgetLocked} from '../stage/stage-parts';
import {useHealthDay, useHealthGate} from './use-health-gate';
import {NxDial, NxHead} from './nx-parts';
import '../cards/connect-cards.css';

/**
 * Session AM-2 (step 3, "NOVA connected"; ADR-040 feature 2; owner addition 1, MERGE_REHEARSAL item 5): "Symptoms" in
 * Health's pink — the symptoms and factors the person follows, over the last 30 days: on how many of the days they
 * answered each one was there, and how often strongly (Health's own counts, lib/symptoms/symptoms.ts itemCounts; figures
 * in lib/nova/cards/health-insights.ts). A day without an answer is unknown, never "none"; an item with no answer has an
 * unlit meter. Plain counts: no pattern is claimed and nothing here is medical advice.
 *
 * Health switches (ADR-037 Q14, Q16): health-type, kept out of ZIGi and NOVA until wired behind the Health switches.
 * This widget is that wiring: made locked unless NOVA's Health permission and the device's Health switch are both on
 * (the frame's gate), its body checks the permission again (`useHealthGate`) and mounts the part that reads the record only once it is open, and
 * a request for it is kept by the widget's name, never the person's words (AM-S5). Read only: levels are set on Health.
 */
const SHOWN = {S: 0, M: 2, L: 6} as const;
export default function SymptomsWidget({size = 'M'}: Partial<CardProps>) {
  const shown = usePillarShown('health'), gate = useHealthGate();
  if (!shown) return <HoloHidden pillar="Health"/>;
  if (gate === 'locked') return <WidgetLocked id="symptoms"/>;
  if (gate === 'reading') return <HoloReading/>;
  return <SymptomsBody size={size}/>;
}
/** Mounted only once the Health switch is open: the record is read here and nowhere before. */
function SymptomsBody({size}: {size: CardProps['size']}) {
  const record = useDeviceRecord(SYMPTOMS), day = useHealthDay();
  const ready = record.loaded && !record.unreadable;
  const card = useMemo(() => { if (!ready) return null; try { return symptomsCard(record.data, day); } catch { return null; } }, [ready, record.data, day]);
  if (!record.loaded) return <HoloReading/>;
  if (!card) return <HoloUnread what="Your Health records"/>;
  if (card.state === 'empty') return <CardNotice kind="empty" ghost="bars" title="Nothing followed yet" href="/app/health?view=diary" action="Follow a symptom on Health">{size === 'S' ? null : 'Name what you want to follow on Health, such as “headache” or “pollen”, and give it a level each day.'}</CardNotice>;
  const rows = card.rows.slice(0, SHOWN[size]), more = card.rows.length - rows.length;
  return <div className="nc-body nx-card" data-size={size} data-lay="dial">
    <NxDial share={card.days ? card.answeredDays / card.days : null} figure={String(card.answeredDays)} caption={`of ${card.days}`} spin={size === 'L'}/>
    <NxHead pulse={size === 'L'} label={size === 'S' ? 'Days answered' : `Days answered · the last ${card.days} days`} title={`${card.answeredDays} of ${card.days} days`} note={size !== 'M' && card.mostNoted ? `Noted most: ${card.mostNoted.name}` : null}/>
    {rows.length > 0 && <div className="nx-main" data-fit="rows" data-wr-limit="">
      {size === 'L' && <p className="nx-cap">There on the days you answered</p>}
      <Bars extra={more} rows={rows.map(r => ({key: r.id, label: r.name, share: r.share, value: r.answered ? `${r.noted} of ${r.answered}` : 'No answer yet', ...(size === 'L' && r.strong ? {note: `Strong on ${r.strong}`} : {})}))}/>
      {size === 'L' && <p className="nx-note">A day without an answer is unknown, never counted as none. These are your own counts, not medical advice.</p>}
    </div>}
    <CardFoot source="Your Health records" asOf={card.lastDay ? `last answer ${logDayWords(card.lastDay, day)}` : 'no answer in this range'}/>
    <HoloTable caption={`Symptoms and factors, the last ${card.days} days`} rows={symptomsRows(card, Math.max(SHOWN[size], 3))}/>
  </div>;
}

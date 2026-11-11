'use client';
import {useState} from 'react';
import {NOVA_STAGE} from '../../../lib/nova/stage/record';
import {asksNewestFirst} from '../../../lib/nova/stage/requests';
import {showAgain} from '../../../lib/nova/stage/events';
import {formatRelativeDay, formatTime} from '../../../lib/visual-format';
import {useDeviceRecord} from '../../ai/use-device-record';
import {CardFoot, CardNotice, type CardProps} from '../cards/kit';
import {HoloReading, HoloUnread} from '../holo/parts';
import '../cards/nova-cards.css';

/**
 * Session AM (ADR-038 D16, D19): "Your requests" — what the person asked NOVA lately (on this device and, with sync, on
 * their phone), newest first, each one tap from being shown again. The words are the person's own, kept in the stage
 * record on this device; nothing here is sent anywhere. A request that made no widget can only be read.
 */
export default function RequestsWidget({size = 'M'}: Partial<CardProps>) {
  const stage = useDeviceRecord(NOVA_STAGE), [now] = useState(() => new Date());
  if (!stage.loaded) return <HoloReading/>;
  if (stage.unreadable) return <HoloUnread what="Your requests"/>;
  const asks = asksNewestFirst(stage.data), shown = asks.slice(0, size === 'S' ? 1 : size === 'M' ? 2 : 7);
  if (!asks.length) return <CardNotice kind="empty" title="Nothing asked yet">Ask NOVA something, or tap one of the requests above the command bar. What you ask is kept here.</CardNotice>;
  return <div className="nc-body nc-requests">
    <ul className="nc-requests-list" aria-label="Your recent requests">{shown.map(a => <li key={a.id} className="nc-request">
      <p className="nc-request-text">“{a.text}”</p>
      <p className="nc-request-meta">{formatRelativeDay(a.at, now)} · {formatTime(a.at)}{a.device === 'phone' ? ' · from your phone' : ''}{a.by === 'model' ? ' · your AI' : ' · on this device'}</p>
      {a.widgets?.length ? <button type="button" className="nc-action nc-request-again" onClick={() => showAgain(a.id)} aria-label={`Show again: ${a.text}`}>Show again</button> : null}
    </li>)}</ul>
    {asks.length > shown.length && <p className="nc-requests-more">+{asks.length - shown.length} earlier, in Behind the intelligence → Requests</p>}
    <CardFoot source="Your requests on this device" asOf={`latest ${formatRelativeDay(asks[0]!.at, now).toLowerCase()}`}/>
  </div>;
}

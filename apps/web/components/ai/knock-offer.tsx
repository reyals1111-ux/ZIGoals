'use client';
import {useState} from 'react';
import {KNOCK_OFFER, offerDue} from '../../lib/ai/knock/offer';
import {ZIGI} from '../../lib/ai/store/records';
import {isShowcase} from '../../lib/showcase-storage';
import {ZigiAvatar} from '../zigi/zigi-avatar';
import {useDeviceRecord} from './use-device-record';
import './knock-offer.css';

/** The knock, offered once (Session V Part 13): the question and its two answers; when it shows is lib/ai/knock/offer.ts. In Showcase only with the fictional label. */
export function KnockOffer({connected, sensitive, chatEnded, today, connectedOn}: {connected: boolean; sensitive: boolean; chatEnded: boolean; today: string; connectedOn: string | null}) {
  const zigi = useDeviceRecord(ZIGI), [error, setError] = useState('');
  if (!zigi.loaded || zigi.unreadable || !offerDue({record: zigi.data, connected, sensitive, chatEnded, today, connectedOn})) return error ? <p role="alert">{error}</p> : null;
  const answer = (yes: boolean) => {
    try { zigi.update(r => ({...r, knock: {...r.knock, offer: yes ? 'accepted' : 'declined', ...(yes ? {enabled: true} : {})}})); }
    catch { setError('Your answer could not be saved on this device; Customize has the same switch.'); }
  };
  return <div className="ai-knock-offer" role="group" aria-label="A question from ZIGi">
    <ZigiAvatar state="curious" size={36} decorative/>
    <div className="ai-knock-offer-body">
      {isShowcase() && <p className="ai-knock-offer-label">Showcase · fictional</p>}
      <p>{KNOCK_OFFER}</p>
      <div className="ai-card-actions"><button type="button" className="primary" onClick={() => answer(true)}>Yes, knock</button><button type="button" className="secondary" onClick={() => answer(false)}>Not now</button></div>
    </div>
  </div>;
}

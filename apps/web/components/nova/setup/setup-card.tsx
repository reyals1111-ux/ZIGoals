'use client';
import Link from 'next/link';
import {NOVA_SETUP, novaOnline, setCardHidden, setupProgress, showSetupCard} from '../../../lib/nova/setup';
import {PLANETS} from '../../../lib/nova/setup-guide';
import {useDeviceRecord} from '../../ai/use-device-record';
import './setup.css';

/** "NOVA online": the badge earned by lighting all ten planets (static: no animation is needed to read it). */
export function NovaOnlineBadge() {
  return <span className="nova-badge" data-nova-online=""><span className="nova-badge-dot" aria-hidden="true"/>NOVA online</span>;
}
/**
 * The setup card for NOVA's own page (lane NA mounts it in its slot): progress, the next planet and the way into the guide,
 * until the guide is finished; then the "NOVA online" badge. The person may put the card away (it comes back from the guide).
 */
export function NovaSetupCard() {
  const record = useDeviceRecord(NOVA_SETUP);
  if (!record.loaded) return null;
  const data = record.data, progress = setupProgress(data);
  if (novaOnline(data)) return <div className="nova-setup-card nova-setup-card-done"><NovaOnlineBadge/></div>;
  if (!showSetupCard(data)) return null;
  const hide = () => { try { record.update(r => setCardHidden(r, true)); } catch { /* it stays; nothing is lost */ } };
  return <section className="nova-setup-card" aria-labelledby="nova-setup-card-title">
    <p className="eyebrow">Build your own NOVA</p>
    <h2 id="nova-setup-card-title">{progress.done ? `${progress.done} of 10 planets lit` : 'Give NOVA a brain of your own'}</h2>
    <p>{progress.done ? `Next: ${PLANETS[progress.next!].label}.` : 'Ten short steps: a private brain on your computer (or your own key), what NOVA may see, memory, voice and briefs. Each step checks that it worked.'}</p>
    <div className="nova-setup-card-bar" role="progressbar" aria-label="Setup progress" aria-valuemin={0} aria-valuemax={10} aria-valuenow={progress.done}><span style={{width: `${progress.done * 10}%`}}/></div>
    <div className="ai-card-actions"><Link className="primary" href="/app/nova/setup">{progress.done ? 'Continue the guide' : 'Start the guide'}</Link><button type="button" className="text-link" onClick={hide}>Not now</button></div>
  </section>;
}

'use client';
import Link from 'next/link';
import {useMemo, useState} from 'react';
import {EARN_PATH, setTodayCard} from '../../lib/earn/records';
import {todayCardState} from '../../lib/earn/today-card';
import {STAKING_JOURNAL, stakingEntriesOf} from '../../lib/staking/journal';
import {deviceSettingFailureMessage} from '../../lib/storage-error-copy';
import type {LayoutAttrs} from '../layout-edit';
import {useDeviceRecord} from '../ai/use-device-record';
import {usePlatform} from '../platform/use-platform';
import {EarnGlyphMark} from './earn-glyph';
import './today-earn-card.css';

/**
 * Session AF chunk 2 (P1.30, H29, H43): Today's EARN card, "Learn to stake, earn and swap — in 30 minutes", for newcomers;
 * it opens the Earn page's Start-here path. It steps aside once the person holds a real position (stake or stZIG on
 * ZIGChain, as their tracked wallets or their staking journal show it; practice stake does not count, H11), and can be
 * dismissed on this device (`zigoals:earn-path:v1` todayCard) and brought back from the Earn page or Settings. One DOM
 * root, carrying `hidden` whenever it does not show, so Today's layout never shifts. Exported for the lead to mount.
 */
export function TodayEarnCard(layout: Partial<LayoutAttrs>) {
  const path = useDeviceRecord(EARN_PATH), journal = useDeviceRecord(STAKING_JOURNAL), platform = usePlatform();
  const [error, setError] = useState('');
  const state = useMemo(() => todayCardState({
    loaded: path.loaded && journal.loaded && platform.loaded, unreadable: path.unreadable, record: path.data,
    positions: platform.error ? [] : platform.data.positions, journal: journal.unreadable ? [] : stakingEntriesOf(journal.data),
  }), [path.loaded, path.unreadable, path.data, journal.loaded, journal.unreadable, journal.data, platform.loaded, platform.error, platform.data]);
  const shown = state === 'shown';
  const dismiss = () => { try { path.update(setTodayCard('dismissed')); } catch (cause) { setError(deviceSettingFailureMessage(cause)); } };
  return <section {...layout} className="panel today-earn-card" aria-labelledby="today-earn-title" data-earn-card={state} hidden={!shown || undefined}>
    {shown && <>
      <span className="today-earn-mark" aria-hidden="true"><EarnGlyphMark/></span>
      <div className="today-earn-body">
        <p className="eyebrow">Earn · start here</p>
        <h2 id="today-earn-title">Learn to stake, earn and swap — in 30 minutes</h2>
        <p>Six steps from no wallet to your first stake, with a free practice round first. You sign in your own wallet; ZIGoals never holds your keys.</p>
        <p className="today-earn-actions"><Link className="primary" href="/app/earn#start-here">Start here</Link> <button type="button" className="secondary" onClick={dismiss}>Not now</button></p>
        <p className="fine">“Not now” hides this card on this device; Earn’s Start-here brings it back.</p>
        {error && <p role="alert" className="fine">{error}</p>}
      </div>
    </>}
  </section>;
}
export default TodayEarnCard;

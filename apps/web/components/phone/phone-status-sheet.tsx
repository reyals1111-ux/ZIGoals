'use client';
import type {ReactNode} from 'react';
import {PhoneFormSheet} from './phone-form-sheet';
import {useWorkspaceStatusText} from '../workspace-status';
import {SHOWCASE_BANNER} from '../../lib/showcase-copy';

/**
 * Session Z-Cloud Part 4.2 (persona item 2): on a phone the honesty notices are one 44 px line under the top bar
 * ("Demo · no real money"); a tap opens this sheet with every notice in full, the same words the computer shows: the
 * network line and its sentence, the wallet buttons, the mode and the balance, and the Showcase's line in the Showcase.
 * Loaded on the first tap (components/shell.tsx); Escape, the close button and the backdrop close it.
 */
export default function PhoneStatusSheet({onClose, label, sentence, mode, balance, showcase, children}: {onClose: () => void; label: string; sentence: string; mode: string; balance: string; showcase: boolean; children: ReactNode}) {
  // Gate C (persona round): the storage line ("This device only · account sync is off") is shortened on the page; here in full.
  const storage = useWorkspaceStatusText();
  return <PhoneFormSheet title="Status" onClose={onClose}>
    <div className="phone-status-sheet">
      <p className="phone-status-network"><strong>{label}</strong><span>{sentence}</span></p>
      <div className="wallet phone-status-wallet">{children}</div>
      <p className="phone-status-mode">{mode}<strong>{balance}</strong></p>
      <p className="phone-status-storage"><strong>STORAGE &amp; SYNC</strong><span>{storage}</span></p>
      {showcase && <p className="phone-status-showcase"><strong>SHOWCASE DATA</strong><span>{SHOWCASE_BANNER}.</span></p>}
    </div>
  </PhoneFormSheet>;
}

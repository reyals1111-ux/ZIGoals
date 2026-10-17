'use client';
import type {ReactNode} from 'react';
import {PhoneFormSheet} from './phone-form-sheet';
import {useWorkspaceStatusText} from '../workspace-status';
import {SHOWCASE_FOOTER} from '../../lib/showcase-copy';
import WalletMenu from '../wallet/wallet-menu';

/**
 * Session Z-Cloud Part 4.2 (persona item 2): on a phone the honesty notices are one 44 px line under the top bar
 * ("Demo · no real money"); a tap opens this sheet with every notice in full, the same words the computer shows: the
 * network line and its sentence, the wallet buttons, the mode, and the Showcase's line in the Showcase.
 * Loaded on the first tap (components/shell.tsx); Escape, the close button and the backdrop close it.
 * Session AE (Part 1, ADR-027; owner): the demo balance is no longer repeated here; Today's wallet card shows it.
 */
export default function PhoneStatusSheet({onClose, label, sentence, mode, showcase, children}: {onClose: () => void; label: string; sentence: string; mode: string; showcase: boolean; children: ReactNode}) {
  // Gate C (persona round): the storage line ("This device only · account sync is off") is shortened on the page; here in full.
  const storage = useWorkspaceStatusText();
  return <PhoneFormSheet title="Status" onClose={onClose}>
    <div className="phone-status-sheet">
      <p className="phone-status-network"><strong>{label}</strong><span>{sentence}</span></p>
      <div className="wallet phone-status-wallet">{children}</div>
      <p className="phone-status-mode">{mode}</p>
      <p className="phone-status-storage"><strong>STORAGE &amp; SYNC</strong><span>{storage}</span></p>
      {/* Session AC (one Showcase wording): the same sentence Settings' facts block shows in the Showcase. */}
      {showcase && <p className="phone-status-showcase"><strong>SHOWCASE DATA</strong><span>{SHOWCASE_FOOTER}</span></p>}
      {/* Session AE (Part 6, ADR-027): the ▾'s choices as rows (Disconnect, read-only links, Bitcoin watch-only, Remove), after every notice. */}
      <WalletMenu variant="sheet"/>
    </div>
  </PhoneFormSheet>;
}

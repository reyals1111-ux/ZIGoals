'use client';
import type {ReactNode} from 'react';
import {PhoneFormSheet} from './phone-form-sheet';

/**
 * Session Z-Cloud Part 4.2 (persona item 2): on a phone the honesty notices are one 44 px line under the top bar
 * ("Demo · no real money"); a tap opens this sheet with every notice in full, the same words the computer shows: the
 * network line and its sentence, the wallet buttons, the mode and the balance, and the Showcase's line in the Showcase.
 * Loaded on the first tap (components/shell.tsx); Escape, the close button and the backdrop close it.
 */
export default function PhoneStatusSheet({onClose, label, sentence, mode, balance, showcase, children}: {onClose: () => void; label: string; sentence: string; mode: string; balance: string; showcase: boolean; children: ReactNode}) {
  return <PhoneFormSheet title="Status" onClose={onClose}>
    <div className="phone-status-sheet">
      <p className="phone-status-network"><strong>{label}</strong><span>{sentence}</span></p>
      <div className="wallet phone-status-wallet">{children}</div>
      <p className="phone-status-mode">{mode}<strong>{balance}</strong></p>
      {showcase && <p className="phone-status-showcase"><strong>SHOWCASE DATA</strong><span>Fictional portfolio &amp; history · anything you add here stays in the demo when you exit.</span></p>}
    </div>
  </PhoneFormSheet>;
}

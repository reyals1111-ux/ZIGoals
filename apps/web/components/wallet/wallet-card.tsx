'use client';
import './wallet-card.css';
import Link from 'next/link';
import {Suspense, lazy, type ReactNode} from 'react';
import {formatUnits, TESTNET} from '@zigoals/chain-config';
import {AppIcon} from '../app-icon';
import {useGoals} from '../goal-provider';
import {formatExactNumber} from '../../lib/visual-format';

/** Session AE (Part 6, ADR-027): the wallet chooser and the display currency load after the page (Today's weight). */
const WalletCardBody = lazy(() => import('./wallet-card-body'));

/** The card's frame, the same before and after its controls load (the controls' row is reserved, so nothing moves). */
export function WalletCardFrame({pill, value, lines, controls}: {pill: string; value: ReactNode; lines: ReactNode; controls?: ReactNode}) {
  return <section className="account-panel"><div><h2>Your wallet <span className="pill">{pill}</span></h2>{value}{lines}{controls}<Link href="/app/settings" className="secondary account-action"><AppIcon name="wallet" luminous/>Wallet &amp; data →</Link></div></section>;
}
/** The app's own wallet as the card has always shown it: the local demo's simulated balance, or Keplr's testnet account. */
export function useAppWallet(plainWords: boolean) {
  const legacy = useGoals(), local = legacy.mode === 'local';
  return {local, balance: legacy.balance, pill: local ? plainWords ? 'Demo records' : 'Local demo' : 'Testnet',
    zig: <strong className="account-value">{formatExactNumber(formatUnits(legacy.balance, TESTNET.nativeAsset.decimals))} <span>ZIG</span></strong>,
    line: local ? 'Simulated balance · this browser' : `${legacy.owner.slice(0, 10)}…${legacy.owner.slice(-5)}`};
}
/** Today's wallet card: the app's wallet in ZIG at first paint; the chooser and the currency switch join it once loaded. */
export function WalletCard({plainWords}: {plainWords: boolean}) {
  const app = useAppWallet(plainWords);
  return <Suspense fallback={<WalletCardFrame pill={app.pill} value={app.zig} lines={<p>{app.line}</p>} controls={<div className="wallet-card-controls" aria-hidden="true"/>}/>}><WalletCardBody plainWords={plainWords}/></Suspense>;
}

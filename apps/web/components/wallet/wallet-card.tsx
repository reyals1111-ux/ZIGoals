'use client';
import {WhatsThis} from '../earn/whats-this';
import './wallet-card.css';
import Link from 'next/link';
import {Suspense, lazy, type ReactNode} from 'react';
import {formatUnits, TESTNET} from '@zigoals/chain-config';
import {AppIcon} from '../app-icon';
import {useGoals} from '../goal-provider';
import {useShowcase} from '../showcase-controls';
import {initialLedger} from '../../lib/local-ledger';
import {formatExactNumber} from '../../lib/visual-format';

/** The practice ledger's starting balance (lib/local-ledger.ts), which no person put there. */
const UNTOUCHED_BALANCE = initialLedger().balance;

/** Session AE (Part 6, ADR-027): the wallet chooser and the display currency load after the page (Today's weight). */
const WalletCardBody = lazy(() => import('./wallet-card-body'));

/** The card's frame, the same before and after its controls load (the controls' row shows only with a linked wallet). */
export function WalletCardFrame({pill, value, lines, controls}: {pill: string; value: ReactNode; lines: ReactNode; controls?: ReactNode}) {
  return <section className="account-panel"><div><h2>Your wallet <span className="pill">{pill}</span></h2>{/* Session AH (AF4, ledger N1): the older "Testnet" label explains itself. */}{pill === 'Testnet' && <p className="wallet-card-whats"><WhatsThis term="practice-network"/></p>}{value}{lines}{controls}<Link href="/app/settings" className="secondary account-action"><AppIcon name="wallet" luminous/>Wallet &amp; data →</Link></div></section>;
}
/** The app's own wallet as the card has always shown it: the local demo's simulated balance, or Keplr's testnet account. */
export function useAppWallet(plainWords: boolean) {
  const legacy = useGoals(), local = legacy.mode === 'local', showcase = useShowcase();
  // Session AK X1 (RELEASE_REVIEW R2): the untouched practice ledger's starting 1,000 ZIG is not the person's money, so
  // outside the Showcase it shows only once they have practice goals of their own (any other balance, a damaged ledger's 0
  // included, is shown as it is); the default mode reads "On this device".
  const practice = !local || showcase || legacy.goals.length > 0 || legacy.balance !== UNTOUCHED_BALANCE;
  return {local, balance: legacy.balance, pill: local ? plainWords ? 'On this device' : 'Local demo' : 'Testnet',
    zig: practice ? <strong className="account-value">{formatExactNumber(formatUnits(legacy.balance, TESTNET.nativeAsset.decimals))} <span>ZIG</span></strong> : <strong className="account-value">No balance yet</strong>,
    line: local ? practice ? 'Simulated balance · this browser' : 'Connect Keplr or link a wallet to see one here.' : `${legacy.owner.slice(0, 10)}…${legacy.owner.slice(-5)}`,
    // Session AH (TR7): why the card shows ZIG only (ADR-027 G16).
    why: local ? practice ? 'Practice money has no market value, so it is never shown in another currency.' : '' : 'Testnet ZIG has no market price, so it is never shown in another currency.'};
}
/** Today's wallet card: the app's wallet in ZIG at first paint; the chooser and the currency switch join it once loaded. */
export function WalletCard({plainWords}: {plainWords: boolean}) {
  const app = useAppWallet(plainWords);
  return <Suspense fallback={<WalletCardFrame pill={app.pill} value={app.zig} lines={<p>{app.line}<br/><span className="wallet-card-why">{app.why}</span></p>}/>}><WalletCardBody plainWords={plainWords}/></Suspense>;
}

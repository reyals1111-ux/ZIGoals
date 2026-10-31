'use client';
import {useEffect, useMemo, useState} from 'react';
import {VerifiedLink} from '../links/verified-link';
import {STAKING_JOURNAL, stakingEntriesOf} from '../../lib/staking/journal';
import {STAKING_PREFS} from '../../lib/staking/prefs';
import {readStakingSession} from '../../lib/wallets/keplr-session';
import {practiceProgress, practiceSteps} from '../../lib/zigchain-eco/practice';
import {useDeviceRecord} from '../ai/use-device-record';
import './zigchain-eco.css';

/**
 * Session AK (F4, testnet practice journey polish): the practice round as six steps that tick themselves from this
 * device's own staking journal (confirmed entries on zig-test-2 only), with the official faucet link and the opt-in
 * practice badge. Test ZIG has no value; nothing here signs or reads the chain.
 */
export function PracticeJourney() {
  const journal = useDeviceRecord(STAKING_JOURNAL), prefs = useDeviceRecord(STAKING_PREFS);
  const [connected, setConnected] = useState(false);
  useEffect(() => { queueMicrotask(() => { let storage: Storage | null = null; try { storage = window.sessionStorage; } catch { storage = null; } setConnected(!!readStakingSession(storage, 'practice')); }); }, []);
  const steps = useMemo(() => practiceSteps({journal: journal.unreadable ? [] : stakingEntriesOf(journal.data), practiceWallet: connected, badgesOn: prefs.data.attestations === 'on'}), [journal.data, journal.unreadable, connected, prefs.data.attestations]);
  const progress = practiceProgress(steps);
  return <section className="zeco zeco-card" aria-labelledby="zeco-practice-title">
    <h4 id="zeco-practice-title">Your practice round <span className="zeco-practice-tag">Practice</span></h4>
    <p className="fine">{progress.complete ? 'Practice round complete. You know every step; the real network works the same way.' : `${progress.done} of ${progress.total} steps done on the practice network.`}</p>
    <ol className="zeco-steps">{steps.map(s => <li key={s.id} data-done={s.done}>
      <span className="zeco-step-title">{s.done ? 'Done: ' : ''}{s.title}{s.optional ? ' (optional)' : ''}</span>
      <br/><span className="fine">{s.how}</span>
      {s.id === 'faucet' && !s.done && <> <VerifiedLink provider="zig-finance" kind="faucet" className="text-link" mark="compact">ZIGChain faucet</VerifiedLink></>}
    </li>)}</ol>
  </section>;
}
export default PracticeJourney;

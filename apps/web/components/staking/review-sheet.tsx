'use client';
import {useEffect, useRef, useState, type FormEvent} from 'react';
import {NETWORK_WORDS} from '@zigoals/chain-config/networks';
import {getAppStorage} from '../../lib/showcase-storage';
import {executeSigned, StakingFailure, type StakingReceipt} from '../../lib/staking/execute';
import {STAKING_TYPE_URLS, type StakingMessage} from '../../lib/staking/messages';
import {GAS_MULTIPLIER, type StakingQuote} from '../../lib/staking/quote';
import {issueSignTicket, PRESS_SIGN} from '../../lib/staking/sign-gate';
import {shortAddress} from '../../lib/staking/address';
import {daysText, feeText, groupDigits, zigText} from '../../lib/staking/view';
import {NO_KEPLR} from '../../lib/wallets/keplr-session';
import {NetworkLine} from './network-switch';
import {TxProgress, type Progress} from './tx-progress';

/**
 * Session AF (ADR-028 H4, H60, H61; `TIER 3 (wallet/signing)`): the review screen, the only door to the signer. It shows
 * the exact action, the validator(s), the amount the person typed (in ZIG and azig), the network fee from the simulation
 * and that the wallet may raise it, what unstaking means, that the person signs in their own wallet and ZIGoals never sees
 * keys, what becomes public, and the raw message. Its form's own submit — the person's press of "Sign in Keplr" — is the
 * one place a sign ticket is issued and the signer is called (lib/staking/staking-guard.test.ts pins it).
 */
const ACTIONS: Record<StakingQuote['action'], string> = {delegate: 'Stake (delegate)', undelegate: 'Unstake (undelegate)', redelegate: 'Move stake (redelegate)', claim: 'Claim rewards', vote: 'Vote'};
const json = (value: unknown) => JSON.stringify(value, (_, v) => typeof v === 'bigint' ? v.toString() : v, 2);
export type ReviewProps = {
  quote: StakingQuote;
  names: ReadonlyMap<string, string>;
  rewards?: ReadonlyMap<string, string>;
  expired: boolean;
  /** While the signature is under way, its progress shows here, inside the sheet. */
  progress?: Progress | null;
  onBack: () => void;
  onProgress: (progress: Progress) => void;
  onDone: (receipt: StakingReceipt) => void;
  onFailed: (failure: StakingFailure | Error) => void;
};
function ValidatorLine({operator, names}: {operator: string; names: ReadonlyMap<string, string>}) {
  return <span title={operator}>{names.get(operator) ?? shortAddress(operator)} · <span className="staking-validator-address">{shortAddress(operator)}</span></span>;
}
export function ReviewSheet({quote, names, rewards, expired, progress, onBack, onProgress, onDone, onFailed}: ReviewProps) {
  const ref = useRef<HTMLDialogElement>(null), [signing, setSigning] = useState(false), [error, setError] = useState('');
  // The Sign button's own click, kept for the submit that follows it (lib/staking/sign-gate.ts checks both belong together).
  const press = useRef<MouseEvent | null>(null);
  useEffect(() => {
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null, dialog = ref.current;
    dialog?.showModal();
    return () => { dialog?.close(); if (previous?.isConnected) previous.focus(); };
  }, []);
  const words = NETWORK_WORDS[quote.network];
  const messages = quote.messages as readonly StakingMessage[];
  const first = messages[0]!;
  const sign = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (signing || expired) return;
    const keplr = typeof window === 'undefined' ? undefined : window.keplr;
    if (!keplr) { setError(NO_KEPLR); return; }
    const activation = press.current;
    press.current = null;
    let ticket;
    try { ticket = issueSignTicket(quote, {submit: event.nativeEvent as SubmitEvent, activation}); } catch (cause) { setError(cause instanceof Error ? cause.message : PRESS_SIGN); return; }
    setSigning(true); setError('');
    try {
      const receipt = await executeSigned(ticket, keplr, (state, details) => { if (state !== 'IDLE') onProgress({state, hash: details?.hash, height: details?.height, uncertain: details?.uncertain}); }, {storage: getAppStorage});
      onDone(receipt);
    } catch (cause) { onFailed(cause instanceof Error ? cause : Error(String(cause))); }
    finally { setSigning(false); }
  };
  return <dialog ref={ref} className={`wealth-sheet staking-sheet staking-review is-${quote.network}`} aria-labelledby="staking-review-title" onCancel={event => { event.preventDefault(); if (!signing) onBack(); }}>
    <header><div><p className="eyebrow">{words.badge} · {words.name} ({words.chainId}) · {words.value}</p><h2 id="staking-review-title">Review before you sign</h2></div></header>
    <form className="wealth-sheet-body staking-sheet-body" onSubmit={sign}>
      <NetworkLine network={quote.network}/>
      <dl className="staking-review-facts">
        <div><dt>Action</dt><dd>{ACTIONS[quote.action]}{messages.length > 1 ? ` · one signature, ${messages.length} withdrawals` : ''}</dd></div>
        {first.typeUrl === STAKING_TYPE_URLS.redelegate ? <>
          <div><dt>From</dt><dd><ValidatorLine operator={first.value.validatorSrcAddress} names={names}/></dd></div>
          <div><dt>To</dt><dd><ValidatorLine operator={first.value.validatorDstAddress} names={names}/></dd></div>
        </> : first.typeUrl === STAKING_TYPE_URLS.claim ? <div><dt>{messages.length > 1 ? 'Validators' : 'Validator'}</dt><dd><ul className="staking-claim-list">{messages.map(m => {
          const operator = (m.value as {validatorAddress: string}).validatorAddress, pending = rewards?.get(operator);
          return <li key={operator}><ValidatorLine operator={operator} names={names}/>{pending !== undefined && <> · about {zigText(pending)} waiting</>}</li>;
        })}</ul></dd></div> : 'validatorAddress' in first.value ? <div><dt>Validator</dt><dd><ValidatorLine operator={first.value.validatorAddress} names={names}/></dd></div> : null}
        {'amount' in first.value && <div><dt>Amount</dt><dd><strong>{zigText(first.value.amount.amount)}</strong> <span className="fine">({first.value.amount.amount} azig)</span><NetworkLine network={quote.network}/></dd></div>}
        <div><dt>Network fee</dt><dd>{feeText(quote.feeAmount)} <span className="fine">({groupDigits(quote.gasUsed)} gas simulated × {GAS_MULTIPLIER} × 2.5 Gazig per gas; your wallet may let you raise it)</span></dd></div>
        {quote.action === 'delegate' && <div><dt>Unstaking later</dt><dd>Getting this ZIG back takes {daysText(quote.unbondingSeconds)} after you unstake; it earns nothing and cannot move meanwhile.</dd></div>}
        {quote.action === 'undelegate' && <div><dt>What unstaking means</dt><dd>This ZIG comes back to your wallet after {daysText(quote.unbondingSeconds)} (read from the chain now). Meanwhile it earns nothing and cannot move. A validator allows at most 7 unstakings from you at a time.</dd></div>}
        {quote.action === 'redelegate' && <div><dt>What moving means</dt><dd>The stake keeps earning with the new validator at once. The same ZIG cannot be moved again for {daysText(quote.unbondingSeconds)}.</dd></div>}
        {quote.action === 'claim' && <div><dt>Rewards</dt><dd>Rewards waiting are paid to your wallet&rsquo;s liquid ZIG; the exact amount is the chain&rsquo;s at the block it is included.</dd></div>}
        <div><dt>Balance</dt><dd>{zigText(quote.balance)} liquid · after the fee{quote.action === 'delegate' ? ' and this amount' : ''}: {zigText((BigInt(quote.balance) - BigInt(quote.feeAmount) - BigInt(quote.spend)).toString())}</dd></div>
        <div><dt>What happens</dt><dd>You will sign this in your wallet. ZIGoals never sees your keys and cannot sign for you.{quote.isLedger ? ' Your Ledger signs it through Keplr: confirm on the device.' : ''}</dd></div>
        <div><dt>What becomes public</dt><dd>Your address, the validator and the amount are recorded on {words.name} for anyone to see, forever.</dd></div>
      </dl>
      <details className="staking-raw"><summary>Raw message</summary><pre>{json({messages: messages.map(m => ({typeUrl: m.typeUrl, value: m.value})), fee: quote.fee, memo: ''})}</pre></details>
      {progress && <TxProgress progress={progress} network={quote.network} chainId={quote.chainId}/>}
      {expired && <p role="status" className="notice">The fee estimate expired. A fresh one is being read…</p>}
      {error && <p role="alert" className="notice">{error}</p>}
      <div className="staking-sheet-actions">
        <button type="button" className="secondary" onClick={onBack} disabled={signing}>Back</button>
        <button type="submit" className="primary" disabled={signing || expired} onClick={event => { press.current = event.nativeEvent; }}>{signing ? 'Waiting for Keplr…' : 'Sign in Keplr →'}</button>
      </div>
    </form>
  </dialog>;
}

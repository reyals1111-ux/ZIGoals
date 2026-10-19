'use client';
import {useCallback, useEffect, useMemo, useRef, useState, type FormEvent} from 'react';
import {NETWORK_WORDS, STAKING_NETWORKS, type StakingNetwork} from '@zigoals/chain-config/networks';
import {usePlatform} from '../platform/use-platform';
import {useShowcase} from '../showcase-controls';
import {usePhoneActive} from '../phone/use-phone-layout';
import {getAppStorage} from '../../lib/showcase-storage';
import {readPublicPositions} from '../../lib/position-reader';
import {validatorsWireSchema, type ValidatorsWire} from '../../lib/chain/validators-wire';
import {parseAmountInput} from '../../lib/amount-input';
import {KEPLR_SITE} from '../../lib/wallet-link';
import {attest, claim, delegate, redelegate, revoke, undelegate, StakingInputError, type StakingMessage} from '../../lib/staking/messages';
import {lastValidatorOf, networkChoiceOf, readStakingPrefs, realConfirmedAtOf, updateStakingPrefs, withLastValidator, withNetworkChoice, withRealConfirmed} from '../../lib/staking/prefs';
import {takeStakingPrefill} from '../../lib/staking/prefill';
import {STAKING_PREFILL_EVENT} from '../../lib/af-signing-keys';
import {READ_MODE, readPositionsAfter, withStakingObservation} from '../../lib/staking/refresh';
import {plainWords} from '../../lib/staking/errors';
import {StakingFailure, type StakingReceipt} from '../../lib/staking/execute';
import type {StakingQuote} from '../../lib/staking/quote';
import {daysText, holdingsOf, zigText} from '../../lib/staking/view';
import {connectStaking, dropStakingSession, keplrMobileLink, onKeystoreChange, readStakingSession, saveStakingSession, type StakingSession} from '../../lib/wallets/keplr-session';
import {NetworkLine, NetworkSwitch} from './network-switch';
import {RealConfirm} from './real-confirm';
import {ReviewSheet} from './review-sheet';
import {TxProgress, type Progress} from './tx-progress';
import {ValidatorPicker} from './validator-picker';
import {RewardsSweep} from './rewards-sweep';
import {ValidatorHealthPanel} from './validator-health';
import {GrantsPanel} from './grants-panel';
import {AttestationCard} from './attestation-card';
import {ZIGI_STORE_EVENT} from '../../lib/ai/store/keys';
import {STAKING_JOURNAL} from '../../lib/staking/journal';
import type {Attestation} from '../../lib/staking/attestation';
import type {Grant} from '../../lib/staking/grants';
import './staking.css';

/**
 * Session AF (ADR-028 H46, H47, H60–H63, H87; L2 design §4): stake, unstake, move and claim on the Staking page, a lazy
 * chunk. Practice (ZIGChain Testnet) or real (ZIGChain mainnet), in big plain words; the first real switch asks once.
 * Keplr connects through its own session for the chosen network (lib/wallets/keplr-session.ts) — the app's "Connect
 * Keplr" button and its flow are untouched. Amounts are typed by the person (no default amount, nothing preselected that
 * moves money). Review simulates the action (the signing client loads on that first press), then the review screen's own
 * Sign press is the only way to the signer. After a confirmed action the positions are read again through the relay at
 * the confirmed block, so Staking, Today, Wealth and Portfolio update through the tracker's path. ZIGi may pre-fill the
 * form (never review or sign). The Showcase never stakes.
 */
type Action = 'delegate' | 'undelegate' | 'redelegate' | 'claim';
const TABS: readonly [Action, string][] = [['delegate', 'Stake'], ['undelegate', 'Unstake'], ['redelegate', 'Move stake'], ['claim', 'Claim rewards']];
const session = () => { try { return window.sessionStorage; } catch { return null; } };
const storage = () => { try { return getAppStorage(); } catch { return null; } };

/** `onObserved`: the page's own reader follows the network the connected wallet was just read on (Staking's totals). */
export function StakingActions({onObserved}: {onObserved?: (chainId: string) => void} = {}) {
  const showcase = useShowcase(), phone = usePhoneActive(), store = usePlatform();
  const [network, setNetwork] = useState<StakingNetwork>('practice'), [askReal, setAskReal] = useState(false), [realError, setRealError] = useState('');
  const [wallet, setWallet] = useState<StakingSession | null>(null), [connecting, setConnecting] = useState(false);
  const [action, setAction] = useState<Action>('delegate'), [validator, setValidator] = useState(''), [destination, setDestination] = useState(''), [amount, setAmount] = useState(''), [claimAll, setClaimAll] = useState(true);
  const [validators, setValidators] = useState<ValidatorsWire | null>(null), [validatorsError, setValidatorsError] = useState('');
  const [quote, setQuote] = useState<StakingQuote | null>(null), [quoting, setQuoting] = useState(false), [expired, setExpired] = useState(false);
  const [progress, setProgress] = useState<Progress | null>(null), [error, setError] = useState(''), [note, setNote] = useState('');
  const [hasKeplr, setHasKeplr] = useState(false), [android, setAndroid] = useState(false), [origin, setOrigin] = useState('');
  // Session AF chunk 3: arriving from a Goal Vault's "Put your rewards to work" (#rewards-sweep); the revoke and badge
  // reviews' own errors (shown in their own panels); a re-read of the permissions after a revoke confirms.
  const [fromVault, setFromVault] = useState(false), [otherError, setOtherError] = useState<{action: 'revoke' | 'attest'; message: string} | null>(null), [grantsRead, setGrantsRead] = useState(0);
  const revision = useRef(0);
  // True while a signature or broadcast is under way: a pre-fill arriving then waits in the tab for the next opening.
  const signing = useRef(false);
  signing.current = !!progress && ['AWAITING_SIGNATURE', 'BROADCASTING', 'CONFIRMING'].includes(progress.state);
  const config = STAKING_NETWORKS[network];

  // The device's choice of network, the tab's staking session, ZIGi's pre-fill (read once) and whether Keplr is here.
  useEffect(() => {
    setHasKeplr(typeof window.keplr === 'object' && window.keplr !== null);
    setAndroid(/Android/i.test(navigator.userAgent)); setOrigin(window.location.origin); setFromVault(window.location.hash === '#rewards-sweep');
    if (showcase) return;
    const prefs = storage() ? readStakingPrefs(storage()!).data : {version: 1 as const};
    setNetwork(networkChoiceOf(prefs) === 'real' && !realConfirmedAtOf(prefs) ? 'practice' : networkChoiceOf(prefs));
    // ZIGi's pre-fill, read once on opening and again whenever ZIGi writes one while this form is open (the window event):
    // it fills the plain fields and drops a review already open, so the person reviews the new values from the start.
    const take = (opening: boolean) => {
      if (!opening && signing.current) return;
      const prefill = takeStakingPrefill(session());
      if (!prefill) return;
      const current = storage() ? readStakingPrefs(storage()!).data : prefs;
      setNetwork(prefill.network === 'real' && !realConfirmedAtOf(current) ? 'practice' : prefill.network);
      if (!opening) { setQuote(null); setError(''); setValidator(''); setAmount(''); }
      setAction(prefill.action); if (prefill.validator) setValidator(prefill.validator); if (prefill.amount) setAmount(prefill.amount);
      setNote(prefill.network === 'real' && !realConfirmedAtOf(current) ? 'ZIGi filled this in for the real network. Switch to the real network to use it; nothing is signed until you review and sign.' : 'ZIGi filled this in. Check every field; nothing is signed until you review and sign.');
    };
    take(true);
    const onPrefill = () => take(false);
    window.addEventListener(STAKING_PREFILL_EVENT, onPrefill);
    return () => window.removeEventListener(STAKING_PREFILL_EVENT, onPrefill);
  }, [showcase]);
  useEffect(() => { setWallet(showcase ? null : readStakingSession(session(), network)); }, [network, showcase]);
  useEffect(() => onKeystoreChange(() => { dropStakingSession(session()); setWallet(null); setQuote(null); setNote('Keplr changed accounts. Connect again to continue.'); }), []);
  useEffect(() => {
    if (!wallet) return;
    const remembered = storage() ? lastValidatorOf(readStakingPrefs(storage()!).data, config.chainId) : undefined;
    if (remembered) setValidator(current => current || remembered);
  }, [wallet, config.chainId]);
  // Validator facts for the chosen network, address-free, from ZIGoals' relay (GET /api/chain/validators).
  useEffect(() => {
    if (showcase || !wallet) return;
    let live = true; setValidators(null); setValidatorsError('');
    fetch(`/api/chain/validators?network=${config.chainId}`, {credentials: 'omit', referrerPolicy: 'no-referrer', cache: 'no-store', signal: AbortSignal.timeout(60_000)})
      .then(async response => { if (!response.ok) throw Error(response.status === 429 ? 'Too many reads just now. Try again in a minute.' : 'Validator facts are unavailable just now.'); return validatorsWireSchema.parse(await response.json()); })
      .then(wire => { if (!live) return; setValidators(wire); if (wire.status === 'unavailable') setValidatorsError(wire.reason ?? 'Validator facts are unavailable just now.'); })
      .catch(cause => { if (live) setValidatorsError(cause instanceof Error && cause.message.length < 200 ? cause.message : 'Validator facts are unavailable just now.'); });
    return () => { live = false; };
  }, [wallet, config.chainId, showcase]);
  // A review re-reads its fee when the estimate expires (every 60 s while it is open).
  useEffect(() => {
    if (!quote) return;
    setExpired(false);
    const timer = setTimeout(() => setExpired(true), Math.max(0, quote.expiresAt - Date.now()));
    return () => clearTimeout(timer);
  }, [quote]);

  const holdings = useMemo(() => wallet ? holdingsOf(store.data.positions, wallet.chainId, wallet.address) : null, [store.data.positions, wallet]);
  const names = useMemo(() => {
    const map = new Map<string, string>();
    for (const v of validators?.validators ?? []) if (v.moniker) map.set(v.operator, v.moniker);
    for (const h of [...(holdings?.delegations ?? []), ...(holdings?.rewards ?? [])]) if (!map.has(h.validator)) map.set(h.validator, h.name);
    return map;
  }, [validators, holdings]);
  const rewards = useMemo(() => new Map((holdings?.rewards ?? []).map(r => [r.validator, r.amount])), [holdings]);

  const readPositions = useCallback(async (connected: StakingSession) => {
    const positions = await readPublicPositions(READ_MODE[connected.network], connected.address);
    await store.update(s => withStakingObservation(s, connected.chainId, connected.address, positions));
    onObserved?.(connected.chainId);
  }, [store, onObserved]);
  function choose(next: StakingNetwork) {
    setQuote(null); setProgress(null); setError(''); setNote('');
    if (next === 'real' && !realConfirmedAtOf(storage() ? readStakingPrefs(storage()!).data : {version: 1})) { setAskReal(true); return; }
    setNetwork(next); revision.current++;
    try { const s = storage(); if (s) updateStakingPrefs(s, p => withNetworkChoice(p, next)); } catch { /* the choice holds for this page */ }
  }
  function confirmReal() {
    try { const s = storage(); if (!s) throw Error('unavailable'); updateStakingPrefs(s, p => withNetworkChoice(withRealConfirmed(p), 'real')); }
    catch { setRealError('Your answer could not be saved on this device, so the real network stays off. Nothing changed.'); return; }
    setAskReal(false); setRealError(''); setNetwork('real'); revision.current++;
  }
  async function connect() {
    setConnecting(true); setError(''); setNote('');
    try {
      const connected = await connectStaking(network, window.keplr);
      saveStakingSession(session(), connected); setWallet(connected);
      try { await readPositions(connected); } catch { setNote('Connected. Your stake could not be read just now; it will show after the next refresh.'); }
    } catch (cause) { setError(plainWords(cause, {chainId: config.chainId}).kind === 'rejected' ? 'You stopped this in Keplr. Nothing was connected.' : cause instanceof Error && cause.message.length < 300 ? cause.message : 'Keplr did not connect.'); }
    finally { setConnecting(false); }
  }
  function disconnect() { dropStakingSession(session()); setWallet(null); setQuote(null); setProgress(null); }
  function messagesFor(connected: StakingSession): StakingMessage[] {
    if (action === 'claim') {
      const withRewards = (holdings?.rewards ?? []).filter(r => r.amount !== '0').map(r => r.validator);
      return claim({delegator: connected.address, validators: claimAll ? withRewards : validator ? [validator] : []});
    }
    if (!validator) throw new StakingInputError(action === 'redelegate' ? 'Choose the validator to move stake from.' : 'Choose a validator.');
    let azig: bigint;
    try { azig = parseAmountInput(amount.trim(), 18); } catch { throw new StakingInputError('Enter an amount of ZIG, for example 25 or 0.5.'); }
    if (azig <= 0n) throw new StakingInputError('Enter an amount of ZIG above zero.');
    const staked = holdings?.delegations.find(d => d.validator === validator)?.amount;
    if ((action === 'undelegate' || action === 'redelegate') && staked !== undefined && azig > BigInt(staked)) throw new StakingInputError(`That is more than you have staked with this validator (${zigText(staked)}).`);
    const input = {delegator: connected.address, validator, amount: azig.toString()};
    if (action === 'delegate') return [delegate(input)];
    if (action === 'undelegate') return [undelegate(input)];
    if (!destination) throw new StakingInputError('Choose the validator to move your stake to.');
    return [redelegate({delegator: connected.address, source: validator, destination, amount: azig.toString()})];
  }
  const review = useCallback(async (event?: FormEvent) => {
    event?.preventDefault();
    if (!wallet || quoting) return;
    setError(''); setProgress(null); setQuoting(true);
    try {
      const messages = messagesFor(wallet);
      // The signing client loads here, on the first Review press, never with the page.
      const {quoteStaking} = await import('../../lib/staking/quote');
      setQuote(await quoteStaking({network: wallet.network, address: wallet.address, action, messages, keplr: window.keplr!, revision: revision.current}));
    } catch (cause) {
      setQuote(null);
      setError(cause instanceof StakingInputError || (cause instanceof Error && /Keep enough ZIG|switched accounts|cannot sign/.test(cause.message)) ? (cause as Error).message : plainWords(cause, {chainId: wallet.chainId}).message);
    } finally { setQuoting(false); }
  }, [wallet, quoting, action, validator, destination, amount, claimAll, holdings]); // eslint-disable-line react-hooks/exhaustive-deps -- messagesFor reads exactly these
  // Session AF chunk 3 (H60): restake one validator's waiting rewards — one MsgDelegate of that amount to it.
  const sweep = useRef<{validator: string; amount: string} | null>(null);
  const reviewSweep = useCallback(async (target: string, rewardsAzig: string) => {
    if (!wallet || quoting) return;
    setError(''); setProgress(null); setQuoting(true); sweep.current = {validator: target, amount: rewardsAzig};
    try {
      const messages = [delegate({delegator: wallet.address, validator: target, amount: rewardsAzig})];
      const {quoteStaking} = await import('../../lib/staking/quote');
      setQuote(await quoteStaking({network: wallet.network, address: wallet.address, action: 'sweep', messages, keplr: window.keplr!, revision: revision.current}));
    } catch (cause) {
      setQuote(null); sweep.current = null;
      setError(cause instanceof StakingInputError || (cause instanceof Error && /Keep enough ZIG|switched accounts|cannot sign|restake/.test(cause.message)) ? (cause as Error).message : plainWords(cause, {chainId: wallet.chainId}).message);
    } finally { setQuoting(false); }
  }, [wallet, quoting]);
  // Session AF chunk 3 (H45, D4): end a grant the person gave (MsgRevoke, direct signers), or a practice badge (testnet).
  const other = useRef<{action: 'revoke' | 'attest'; messages: StakingMessage[]; memo?: string; attestation?: StakingQuote['attestation']} | null>(null);
  const reviewOther = useCallback(async (next: NonNullable<typeof other.current>) => {
    if (!wallet || quoting) return;
    setError(''); setOtherError(null); setProgress(null); setQuoting(true); other.current = next;
    try {
      const {quoteStaking} = await import('../../lib/staking/quote');
      setQuote(await quoteStaking({network: wallet.network, address: wallet.address, action: next.action, messages: next.messages, keplr: window.keplr!, revision: revision.current, ...(next.memo ? {memo: next.memo} : {}), ...(next.attestation ? {attestation: next.attestation} : {})}));
    } catch (cause) {
      setQuote(null); other.current = null;
      setOtherError({action: next.action, message: cause instanceof StakingInputError || (cause instanceof Error && /Keep enough ZIG|switched accounts|cannot sign|practice badge|Ledger|Nothing to sign/.test(cause.message)) ? (cause as Error).message : plainWords(cause, {chainId: wallet.chainId}).message});
    } finally { setQuoting(false); }
  }, [wallet, quoting]);
  const revokeGrant = (grant: Grant) => { if (!wallet || !grant.msgTypeUrl) return; try { void reviewOther({action: 'revoke', messages: [revoke({granter: wallet.address, grantee: grant.grantee, msgTypeUrl: grant.msgTypeUrl})]}); } catch (cause) { setOtherError({action: 'revoke', message: cause instanceof Error ? cause.message : 'This permission cannot be revoked here.'}); } };
  const reviewBadge = (badge: Attestation) => { if (!wallet) return; void reviewOther({action: 'attest', messages: [attest({address: wallet.address})], memo: badge.memo, attestation: {kind: badge.kind, note: badge.note, ...(badge.salt ? {salt: badge.salt} : {})}}); };
  useEffect(() => { if (expired && quote && !progress) void (quote.action === 'sweep' && sweep.current ? reviewSweep(sweep.current.validator, sweep.current.amount) : (quote.action === 'revoke' || quote.action === 'attest') && other.current ? reviewOther(other.current) : review()); }, [expired]); // eslint-disable-line react-hooks/exhaustive-deps -- re-quote once per expiry
  async function done(receipt: StakingReceipt) {
    const finished = quote?.action;
    setQuote(null);
    window.dispatchEvent(new CustomEvent(ZIGI_STORE_EVENT, {detail: STAKING_JOURNAL.key}));
    if (finished === 'revoke') setGrantsRead(n => n + 1);
    setProgress({state: 'SUCCESS', hash: receipt.hash, height: receipt.height, refreshed: 'Reading your positions again at this block…'});
    setAmount(''); revision.current++;
    try { const s = storage(); if (s && action !== 'claim' && validator) updateStakingPrefs(s, p => withLastValidator(p, receipt.chainId, validator)); } catch { /* remembered next time */ }
    if (!wallet) return;
    try {
      const {positions, height} = await readPositionsAfter(wallet.network, wallet.address, receipt.height);
      await store.update(s => withStakingObservation(s, wallet.chainId, wallet.address, positions));
      onObserved?.(wallet.chainId);
      setProgress(p => p && {...p, refreshed: `Positions refreshed at block ${height}.`});
    } catch { setProgress(p => p && {...p, refreshed: 'Your positions will update on the next refresh.'}); }
  }
  function failed(failure: StakingFailure | Error) {
    setQuote(null);
    window.dispatchEvent(new CustomEvent(ZIGI_STORE_EVENT, {detail: STAKING_JOURNAL.key}));
    if (failure instanceof StakingFailure) setProgress({state: failure.state === 'REJECTED' ? 'REJECTED' : 'FAILED', hash: failure.plain.hash, message: failure.plain.message, uncertain: failure.uncertain});
    else setProgress({state: 'FAILED', message: plainWords(failure, {chainId: config.chainId}).message});
  }

  if (showcase) return <section className="panel staking-actions" aria-labelledby="staking-actions-title"><h2 id="staking-actions-title">Stake, unstake and claim</h2><p>Exit the Showcase to stake. The Showcase keeps its simulated wallet and signs nothing.</p></section>;
  const delegations = holdings?.delegations ?? [];
  const max = action === 'delegate' ? undefined : delegations.find(d => d.validator === validator)?.amount;
  return <section className={`panel staking-actions is-${network}`} aria-labelledby="staking-actions-title">
    <div className="staking-actions-head">
      <div><p className="eyebrow">Signed in your own wallet</p><h2 id="staking-actions-title">Stake, unstake and claim</h2></div>
      <NetworkSwitch network={network} onChoose={choose} disabled={quoting || !!quote}/>
    </div>
    <p className={`staking-network-banner is-${network}`}><strong>{NETWORK_WORDS[network].label}</strong> · {NETWORK_WORDS[network].name} ({NETWORK_WORDS[network].chainId})</p>
    {askReal && <RealConfirm onConfirm={confirmReal} onCancel={() => { setAskReal(false); setRealError(''); }} error={realError}/>}
    {note && <p role="status" className="fine">{note}</p>}
    {!wallet ? <div className="staking-connect">
      {fromVault && <p role="status" className="fine">From your Goal Vault: connect Keplr to restake its rewards. Goal Vaults count your stake on the real network.</p>}
      {hasKeplr ? <>
        <p>Connect Keplr for the {network === 'real' ? 'real' : 'practice'} network to stake from your own wallet. ZIGoals reads your address only; every action asks you to sign in Keplr.</p>
        <button type="button" className="primary" onClick={connect} disabled={connecting}>{connecting ? 'Waiting for Keplr…' : `Connect Keplr for ${network === 'real' ? 'REAL' : 'PRACTICE'}`}</button>
      </> : phone ? <>
        <p>On a phone, staking works inside the Keplr app&rsquo;s own browser.</p>
        {origin && <a className="primary staking-open-keplr" href={keplrMobileLink(origin, android)}>Open ZIGoals in Keplr</a>}
        <p className="fine">Keplr Mobile opens this page in its browser; nothing is sent from here. Other phone wallets cannot sign ZIGChain staking yet.</p>
      </> : <>
        <p>Keplr is not installed in this browser. Staking signs in Keplr, so install it to continue.</p>
        <a className="secondary" href={KEPLR_SITE} target="_blank" rel="noopener noreferrer">Get Keplr ↗</a>
      </>}
    </div> : <div className="staking-connected">
      <p className="staking-wallet-row"><span>Keplr <strong title={wallet.address}>{wallet.address.slice(0, 10)}…{wallet.address.slice(-6)}</strong>{wallet.isLedger && <span className="pill">Ledger</span>}</span>
        <span>{holdings?.liquid !== undefined ? `${zigText(holdings.liquid)} available` : 'Balance not read yet'}</span>
        <button type="button" className="text-link" onClick={() => { void readPositions(wallet).catch(() => setNote('Your stake could not be read just now.')); }}>Refresh</button>
        <button type="button" className="text-link" onClick={disconnect}>Disconnect</button></p>
      <div className="staking-tabs" role="tablist" aria-label="Staking action">
        {TABS.map(([id, label]) => <button key={id} type="button" role="tab" aria-selected={action === id} className={action === id ? 'is-active' : ''} onClick={() => { setAction(id); setQuote(null); setError(''); setAmount(''); setProgress(null); }}>{label}</button>)}
      </div>
      <form className="staking-form" onSubmit={review} noValidate>
        {action === 'delegate' && (validators?.status === 'ok' ? <ValidatorPicker validators={validators.validators} value={validator} onChange={setValidator} legend="Validator to stake with" name="staking-validator"/> : <p className="notice">{validatorsError || 'Reading the validators…'}</p>)}
        {(action === 'undelegate' || action === 'redelegate') && (delegations.length ? <fieldset className="staking-validators"><legend>{action === 'undelegate' ? 'Unstake from' : 'Move stake from'}</legend>
          {delegations.map(d => <label key={d.validator} className="staking-validator" title={d.validator}><input type="radio" name="staking-source" value={d.validator} checked={validator === d.validator} onChange={() => setValidator(d.validator)}/><span className="staking-validator-text"><strong>{names.get(d.validator) ?? d.name}</strong><span>{zigText(d.amount)} staked</span></span></label>)}
        </fieldset> : <p>No stake on this network yet{holdings?.observed ? '' : ' (or not read yet: press Refresh)'}.</p>)}
        {action === 'redelegate' && delegations.length > 0 && (validators?.status === 'ok' ? <ValidatorPicker validators={validators.validators} value={destination} onChange={setDestination} exclude={validator} legend="Move it to" name="staking-destination"/> : <p className="notice">{validatorsError || 'Reading the validators…'}</p>)}
        {action === 'claim' && (holdings?.rewards.length ? <fieldset className="staking-validators"><legend>Claim rewards</legend>
          <label className="staking-validator"><input type="radio" name="staking-claim" checked={claimAll} onChange={() => setClaimAll(true)}/><span className="staking-validator-text"><strong>Claim all</strong><span>One signature, {holdings.rewards.length} withdrawal{holdings.rewards.length === 1 ? '' : 's'}</span></span></label>
          {holdings.rewards.map(r => <label key={r.validator} className="staking-validator" title={r.validator}><input type="radio" name="staking-claim" checked={!claimAll && validator === r.validator} onChange={() => { setClaimAll(false); setValidator(r.validator); }}/><span className="staking-validator-text"><strong>{names.get(r.validator) ?? r.name}</strong><span>about {zigText(r.amount)} waiting</span></span></label>)}
        </fieldset> : <p>No rewards waiting on this network{holdings?.observed ? '' : ' (or not read yet: press Refresh)'}.</p>)}
        {action !== 'claim' && <div className="staking-amount">
          <label className="field">Amount of ZIG<input value={amount} onChange={event => setAmount(event.target.value)} inputMode="decimal" autoComplete="off" placeholder="0.0" aria-describedby="staking-amount-network"/></label>
          {max !== undefined && <button type="button" className="secondary" onClick={() => setAmount(zigText(max).replace(/ ZIG$/, '').replaceAll(',', ''))}>Max</button>}
          <div id="staking-amount-network"><NetworkLine network={network}/></div>
          {action === 'delegate' && <p className="fine">The network fee is kept back from your balance; the review shows the exact fee.</p>}
        </div>}
        {(action === 'undelegate' || action === 'delegate') && <details className="staking-explainer"><summary>What unstaking means</summary><p>Unstaking takes {daysText(1814400)} (the chain&rsquo;s unbonding time, checked again before every review). During that time the ZIG earns nothing and cannot move. A validator allows at most 7 unstakings from you at a time.</p></details>}
        {error && <p role="alert" className="notice">{error}</p>}
        <button type="submit" className="primary" disabled={quoting || (action !== 'claim' && !validator)}>{quoting ? 'Estimating the fee…' : 'Review'}</button>
      </form>
      {holdings?.unbonding.length ? <p className="fine">{holdings.unbonding.length} unstaking{holdings.unbonding.length === 1 ? '' : 's'} in progress; see them in Positions below.</p> : null}
      <RewardsSweep rewards={holdings?.rewards ?? []} delegations={delegations} names={names} busy={quoting || !!quote} onReview={(v, a) => void reviewSweep(v, a)}
        note={fromVault && network === 'practice' ? 'From your Goal Vault: Goal Vaults count your stake on the real network. Choose the real network above, connect, and restake its rewards here.' : undefined}/>
      <ValidatorHealthPanel chainId={config.chainId} operators={delegations.map(d => d.validator)} validators={validators}/>
      <GrantsPanel wallet={wallet} busy={quoting || !!quote} refresh={grantsRead} error={otherError?.action === 'revoke' ? otherError.message : undefined} onRevoke={revokeGrant}/>
      {network === 'practice' && <AttestationCard wallet={wallet} busy={quoting || !!quote} error={otherError?.action === 'attest' ? otherError.message : undefined} onReview={reviewBadge}/>}
    </div>}
    {progress && !quote && <TxProgress progress={progress} network={network} chainId={config.chainId} onClose={() => setProgress(null)}/>}
    {quote && <ReviewSheet quote={quote} names={names} rewards={rewards} expired={expired && !progress} progress={progress} onBack={() => { setQuote(null); setProgress(null); }} onProgress={setProgress} onDone={done} onFailed={failed}/>}
  </section>;
}
export default StakingActions;

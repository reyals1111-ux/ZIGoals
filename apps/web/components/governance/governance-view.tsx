'use client';
import Link from 'next/link';
import {lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {NETWORK_WORDS, STAKING_NETWORKS, type StakingNetwork} from '@zigoals/chain-config/networks';
import {PageHeader} from '../page-header';
import {useShowcase} from '../showcase-controls';
import {usePhoneActive} from '../phone/use-phone-layout';
import {useDeviceRecord} from '../ai/use-device-record';
import {NetworkBanner, NetworkSwitch} from '../staking/network-switch';
import {RealConfirm} from '../staking/real-confirm';
import {TxProgress, type Progress} from '../staking/tx-progress';
import {ZIGI_STORE_EVENT} from '../../lib/ai/store/keys';
import {getAppStorage} from '../../lib/showcase-storage';
import {readPublicPositions} from '../../lib/position-reader';
import {KEPLR_SITE} from '../../lib/wallet-link';
import {READ_MODE} from '../../lib/staking/refresh';
import {StakingInputError, vote as voteMessage} from '../../lib/staking/messages';
import {STAKING_JOURNAL} from '../../lib/staking/journal';
import {networkChoiceOf, readStakingPrefs, realConfirmedAtOf, updateStakingPrefs, withNetworkChoice, withRealConfirmed} from '../../lib/staking/prefs';
import {plainWords, type PlainError} from '../../lib/staking/errors';
import {zigText} from '../../lib/staking/view';
import type {StakingQuote} from '../../lib/staking/quote';
import type {StakingReceipt} from '../../lib/staking/execute';
import {connectStaking, dropStakingSession, keplrMobileLink, onKeystoreChange, readStakingSession, saveStakingSession, type StakingSession} from '../../lib/wallets/keplr-session';
import {readProposals, readVote, type Read} from '../../lib/governance/client';
import {WHY_VOTING_MATTERS, durationWords} from '../../lib/governance/plain-words';
import {confirmedVote, eligibilityOf, votesOf, type Eligibility} from '../../lib/governance/votes';
import type {ProposalWire, ProposalsWire, VoteChoiceWire} from '../../lib/governance/wire';
import {formatDateTime} from '../../lib/visual-format';
import {ProposalCard, type VoteState} from './proposal-card';
import {WhatsThis} from '../earn/whats-this';
import '../staking/staking.css';
import './governance.css';

/**
 * Session AF chunk 3 (lane L2a; ADR-028 H16, H46, H61, H87; P6.5, P6.6, D6): /app/governance. Live proposals of the chosen
 * network in plain words (ZIGoals' address-free relay GET /api/chain/proposals, read at one block), why voting matters, and
 * — for a connected Keplr with stake on that network — a vote of Yes, No, Abstain or No with veto through the same review
 * screen as staking (gov v1beta1 MsgVote; the screen says the vote is public and tied to the address forever before the
 * Sign press, which is the only way to the signer). Practice (ZIGChain Testnet) comes first and works the same; the real
 * network asks the first-real confirm once. The person's own vote is read through the relay with their address during the
 * voting period; the device's vote journal keeps every vote after the chain removes it at the tally. The Showcase never
 * votes. The review screen and the signing client load only on the first "Review my vote".
 */
const ReviewSheet = lazy(() => import('../staking/review-sheet').then(m => ({default: m.ReviewSheet})));
const session = () => { try { return window.sessionStorage; } catch { return null; } };
const storage = () => { try { return getAppStorage(); } catch { return null; } };
const NO_NAMES: ReadonlyMap<string, string> = new Map();
type Stake = {phase: 'idle'} | {phase: 'reading'} | {phase: 'ok'; eligibility: Eligibility} | {phase: 'unavailable'};
export function GovernanceView() {
  const showcase = useShowcase(), phone = usePhoneActive(), journal = useDeviceRecord(STAKING_JOURNAL);
  const [network, setNetwork] = useState<StakingNetwork>('practice'), [askReal, setAskReal] = useState(false), [realError, setRealError] = useState('');
  const [proposals, setProposals] = useState<Read<ProposalsWire> | null>(null);
  const [wallet, setWallet] = useState<StakingSession | null>(null), [connecting, setConnecting] = useState(false), [connectError, setConnectError] = useState('');
  const [stake, setStake] = useState<Stake>({phase: 'idle'}), [votes, setVotes] = useState<Record<string, VoteState>>({});
  const [reviewing, setReviewing] = useState<string | null>(null), [voteErrors, setVoteErrors] = useState<Record<string, string>>({});
  const [quote, setQuote] = useState<{quote: StakingQuote; title: string} | null>(null), [expired, setExpired] = useState(false), [progress, setProgress] = useState<Progress | null>(null);
  const [hasKeplr, setHasKeplr] = useState(false), [android, setAndroid] = useState(false), [origin, setOrigin] = useState(''), [now, setNow] = useState(() => Date.now());
  const revision = useRef(0);
  const config = STAKING_NETWORKS[network], chainId = config.chainId as 'zigchain-1' | 'zig-test-2', words = NETWORK_WORDS[network];

  useEffect(() => {
    setHasKeplr(typeof window.keplr === 'object' && window.keplr !== null); setAndroid(/Android/i.test(navigator.userAgent)); setOrigin(window.location.origin);
    if (showcase) return;
    const prefs = storage() ? readStakingPrefs(storage()!).data : {version: 1 as const};
    setNetwork(networkChoiceOf(prefs) === 'real' && realConfirmedAtOf(prefs) ? 'real' : 'practice');
  }, [showcase]);
  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 30_000); return () => clearInterval(timer); }, []);
  // Proposals of the chosen network: on open, on a network change, and every minute while one is being voted on.
  const load = useCallback(async () => { setProposals(await readProposals(chainId)); }, [chainId]);
  useEffect(() => { setProposals(null); void load(); }, [load]);
  const anyVoting = proposals?.phase === 'ok' && proposals.wire.proposals.some(p => p.state === 'voting');
  useEffect(() => {
    if (!anyVoting) return;
    const timer = setInterval(() => { if (document.visibilityState === 'visible') void load(); }, 60_000);
    return () => clearInterval(timer);
  }, [anyVoting, load]);
  useEffect(() => { setWallet(showcase ? null : readStakingSession(session(), network)); setStake({phase: 'idle'}); setVotes({}); }, [network, showcase]);
  useEffect(() => onKeystoreChange(() => { dropStakingSession(session()); setWallet(null); setQuote(null); setConnectError('Keplr changed accounts. Connect again to vote.'); }), []);
  // The connected address's stake on this network (the read-only relay): a vote counts only with bonded stake.
  const readStake = useCallback(async (connected: StakingSession) => {
    setStake({phase: 'reading'});
    try { setStake({phase: 'ok', eligibility: eligibilityOf(await readPublicPositions(READ_MODE[connected.network], connected.address), connected.chainId, connected.address)}); }
    catch { setStake({phase: 'unavailable'}); }
  }, []);
  useEffect(() => { if (wallet) void readStake(wallet); }, [wallet, readStake]);
  // The person's own vote on each proposal in its voting period (at most five reads), through the relay with the address.
  const votingIds = proposals?.phase === 'ok' ? proposals.wire.proposals.filter(p => p.state === 'voting').slice(0, 5).map(p => p.id).join(',') : '';
  const readVotes = useCallback(async (connected: StakingSession, ids: string[]) => {
    setVotes(v => ({...v, ...Object.fromEntries(ids.map(id => [id, {phase: 'reading'} as VoteState]))}));
    for (const id of ids) {
      const answer = await readVote(connected.chainId as 'zigchain-1' | 'zig-test-2', id, connected.address);
      setVotes(v => ({...v, [id]: answer.phase === 'ok' ? {phase: 'ok', wire: answer.wire} : {phase: 'unavailable', reason: answer.reason}}));
    }
  }, []);
  useEffect(() => { if (wallet && votingIds) void readVotes(wallet, votingIds.split(',')); }, [wallet, votingIds, readVotes]);
  useEffect(() => {
    if (!quote) return;
    setExpired(false);
    const timer = setTimeout(() => setExpired(true), Math.max(0, quote.quote.expiresAt - Date.now()));
    return () => clearTimeout(timer);
  }, [quote]);

  function choose(next: StakingNetwork) {
    setQuote(null); setProgress(null); setConnectError('');
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
    setConnecting(true); setConnectError('');
    try { const connected = await connectStaking(network, window.keplr); saveStakingSession(session(), connected); setWallet(connected); }
    catch (cause) { setConnectError(plainWords(cause, {chainId}).kind === 'rejected' ? 'You stopped this in Keplr. Nothing was connected.' : cause instanceof Error && cause.message.length < 300 ? cause.message : 'Keplr did not connect.'); }
    finally { setConnecting(false); }
  }
  const review = useCallback(async (proposal: ProposalWire, choice: VoteChoiceWire) => {
    if (!wallet || reviewing) return;
    setReviewing(proposal.id); setVoteErrors(e => ({...e, [proposal.id]: ''})); setProgress(null);
    try {
      const messages = [voteMessage({voter: wallet.address, proposalId: proposal.id, option: choice})];
      // The signing client loads here, on the first Review press, never with the page.
      const {quoteStaking} = await import('../../lib/staking/quote');
      setQuote({quote: await quoteStaking({network: wallet.network, address: wallet.address, action: 'vote', messages, keplr: window.keplr!, revision: revision.current}), title: proposal.title});
    } catch (cause) {
      setQuote(null);
      setVoteErrors(e => ({...e, [proposal.id]: cause instanceof StakingInputError || (cause instanceof Error && /Keep enough ZIG|switched accounts|cannot sign/.test(cause.message)) ? (cause as Error).message : plainWords(cause, {chainId: wallet.chainId}).message}));
    } finally { setReviewing(null); }
  }, [wallet, reviewing]);
  // A review re-reads its fee once when the estimate expires.
  useEffect(() => {
    if (!expired || !quote || progress) return;
    const proposal = proposals?.phase === 'ok' ? proposals.wire.proposals.find(p => p.id === (quote.quote.messages[0]?.value as {proposalId?: bigint}).proposalId?.toString()) : undefined;
    const option = (quote.quote.messages[0]?.value as {option?: number}).option;
    const choice = (['yes', 'abstain', 'no', 'no_with_veto'] as const)[(option ?? 0) - 1];
    if (proposal && choice) void review(proposal, choice);
  }, [expired]); // eslint-disable-line react-hooks/exhaustive-deps -- re-quote once per expiry
  function done(receipt: StakingReceipt) {
    setQuote(null); revision.current++;
    setProgress({state: 'SUCCESS', hash: receipt.hash, height: receipt.height, refreshed: 'Your vote is in this device’s vote journal. The chain’s own record of it shows here within a minute.'});
    window.dispatchEvent(new CustomEvent(ZIGI_STORE_EVENT, {detail: STAKING_JOURNAL.key}));
    if (wallet && votingIds) setTimeout(() => void readVotes(wallet, votingIds.split(',')), 61_000);
  }
  function failed(failure: Error) {
    setQuote(null);
    window.dispatchEvent(new CustomEvent(ZIGI_STORE_EVENT, {detail: STAKING_JOURNAL.key}));
    const plain = (failure as Error & {plain?: PlainError}).plain;
    const state = (failure as Error & {state?: string}).state;
    setProgress(plain ? {state: state === 'REJECTED' ? 'REJECTED' : 'FAILED', hash: plain.hash, message: plain.message, uncertain: (failure as Error & {uncertain?: boolean}).uncertain} : {state: 'FAILED', message: plainWords(failure, {chainId}).message});
  }

  const myVotes = useMemo(() => votesOf(journal.data, chainId, wallet?.address), [journal.data, chainId, wallet?.address]);
  const wire = proposals?.phase === 'ok' ? proposals.wire : null;
  const ordered = wire ? [...wire.proposals.filter(p => p.state === 'voting'), ...wire.proposals.filter(p => p.state === 'deposit'), ...wire.proposals.filter(p => p.state !== 'voting' && p.state !== 'deposit')] : [];
  const eligible = stake.phase === 'ok' && stake.eligibility.eligible;
  return <div className="dashboard governance-page">
    <PageHeader className="page-heading" titleId="governance-title" eyebrow="Staking · Governance" title="Governance"
      lede="See what is being decided on ZIGChain, in plain words, and vote with your own stake. You sign every vote in your own wallet; ZIGoals never holds your keys."
      actions={<Link className="secondary" href="/app/staking">Staking</Link>}/>
    <section className="panel governance-why" aria-labelledby="governance-why-title">
      <h2 id="governance-why-title">Why voting matters</h2>
      <p>{WHY_VOTING_MATTERS} <WhatsThis term="proposal"/> <WhatsThis term="validator"/> <WhatsThis term="voting-power"/></p>
      <p className="fine">Practice first: the practice network (ZIGChain Testnet, no real value) votes the same way{wire && network === 'practice' ? `, with ${durationWords(wire.params!.votingPeriodSeconds)} of voting and ${zigText(wire.params!.minDeposit)} of deposit to start a proposal (read from the chain)` : ''}. The chain removes votes when it counts them, so this device keeps its own record of the votes you sign here. <WhatsThis term="practice-network"/></p>
    </section>
    <section className={`panel staking-actions governance-network is-${network}`} aria-labelledby="governance-network-title">
      <div className="staking-actions-head">
        <div><p className="eyebrow">Signed in your own wallet</p><h2 id="governance-network-title">Vote on a network</h2></div>
        {/* Session AH (ST7, M-052): the Showcase never offers the real network (no real-money warning inside the demo). */}<NetworkSwitch network={network} onChoose={choose} disabled={showcase || !!quote || !!reviewing}/>
      </div>
      <NetworkBanner network={network}/>
      {askReal && <RealConfirm onConfirm={confirmReal} onCancel={() => { setAskReal(false); setRealError(''); }} error={realError}/>}
      {showcase ? <p>Exit the Showcase to vote. The Showcase keeps its simulated wallet and signs nothing; the proposals below are ZIGChain&rsquo;s own, read live from the practice network.</p>
        : !wallet ? <div className="staking-connect">
          {hasKeplr ? <>
            <p>Connect Keplr for the {network === 'real' ? 'real' : 'practice'} network to vote with your stake. Reading proposals needs no wallet.</p>
            <button type="button" className="primary" onClick={connect} disabled={connecting}>{connecting ? 'Waiting for Keplr…' : `Connect Keplr for ${network === 'real' ? 'REAL' : 'PRACTICE'}`}</button>
          </> : phone ? <>
            <p>On a phone, voting works inside the Keplr app&rsquo;s own browser.</p>
            {origin && <a className="primary staking-open-keplr" href={keplrMobileLink(origin, android, '/app/governance')}>Open ZIGoals in Keplr</a>}
          </> : <>
            <p>Keplr is not installed in this browser. Votes are signed in Keplr; reading proposals needs no wallet.</p>
            <a className="secondary" href={KEPLR_SITE} target="_blank" rel="noopener noreferrer">Get Keplr ↗</a>
          </>}
        </div>
        : <div className="staking-connected">
          <p className="staking-wallet-row"><span>Keplr <strong title={wallet.address}>{wallet.address.slice(0, 10)}…{wallet.address.slice(-6)}</strong>{wallet.isLedger && <span className="pill">Ledger</span>}</span>
            <button type="button" className="text-link" onClick={() => void readStake(wallet)}>Refresh</button>
            <button type="button" className="text-link" onClick={() => { dropStakingSession(session()); setWallet(null); setQuote(null); setProgress(null); }}>Disconnect</button></p>
          <p role="status" className="governance-eligibility">{stake.phase === 'reading' || stake.phase === 'idle' ? 'Reading your stake on this network…'
            : stake.phase === 'unavailable' ? 'Your stake could not be read just now, so voting waits. Press Refresh to try again.'
            : stake.eligibility.eligible ? <>You have <strong>{zigText(stake.eligibility.bonded)}</strong> staked with {stake.eligibility.validators} active validator{stake.eligibility.validators === 1 ? '' : 's'} on this network: your vote counts with it.</>
            : <>You have no stake with an active validator on this network, so a vote would not count. <Link href="/app/staking">Stake first</Link>.</>}</p>
        </div>}
      {connectError && <p role="alert" className="notice">{connectError}</p>}
    </section>
    {progress && !quote && <TxProgress progress={progress} network={network} chainId={chainId} onClose={() => setProgress(null)}/>}
    <section className="governance-proposals" aria-labelledby="governance-proposals-title">
      <h2 id="governance-proposals-title">Proposals on {words.name}</h2>
      {!proposals ? <p role="status">Reading the proposals…</p>
        : proposals.phase === 'unavailable' ? <p className="notice" role="status">Proposals are unavailable: {proposals.reason} <button type="button" className="text-link" onClick={() => { setProposals(null); void load(); }}>Read again</button></p>
        : <>
          <p className="fine">Read from {wire!.source} at block {wire!.height}, {formatDateTime(wire!.observedAt!)}. {ordered.some(p => p.state === 'voting') ? `${ordered.filter(p => p.state === 'voting').length} open for voting now.` : 'None is open for voting right now.'} <button type="button" className="text-link" onClick={() => { setProposals(null); void load(); }}>Read again</button></p>
          {!ordered.length && <p>No proposals on this network yet.</p>}
          {ordered.map(p => <ProposalCard key={p.id} explainQuorum={p === ordered.find(o => o.tallyKind !== 'none')} proposal={p} params={wire!.params!} bondedTotal={wire!.bondedTotal!} now={now} chainId={chainId}
            voting={wallet && !showcase ? {eligible, reviewing: reviewing === p.id, myVote: votes[p.id] ?? {phase: 'idle'}, journal: confirmedVote(myVotes, p.id), onReview: review, error: voteErrors[p.id]} : undefined}/>)}
        </>}
    </section>
    {wallet && myVotes.length > 0 && <section className="panel governance-journal-list" aria-labelledby="governance-journal-title">
      <h2 id="governance-journal-title">Your votes from this device</h2>
      <p className="fine">The chain deletes votes when it counts them, so this list is this device&rsquo;s own record (in Export everything).</p>
      <ul>{myVotes.map(v => <li key={`${v.proposalId}-${v.at}`}>Proposal #{v.proposalId}: <strong>{v.choice === 'no_with_veto' ? 'No with veto' : v.choice[0]!.toUpperCase() + v.choice.slice(1)}</strong> · {v.state === 'CONFIRMED' ? 'confirmed' : v.state.toLowerCase().replaceAll('_', ' ')} · <time dateTime={v.at}>{formatDateTime(v.at)}</time></li>)}</ul>
    </section>}
    {quote && <Suspense fallback={null}><ReviewSheet quote={quote.quote} names={NO_NAMES} expired={expired && !progress} progress={progress} about={{kind: 'vote', proposalTitle: quote.title}}
      onBack={() => { setQuote(null); setProgress(null); }} onProgress={setProgress} onDone={done} onFailed={failed}/></Suspense>}
  </div>;
}
export default GovernanceView;

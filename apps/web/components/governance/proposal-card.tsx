'use client';
import Link from 'next/link';
import {useId, useState, type FormEvent} from 'react';
import {explorerLinksFor} from '@zigoals/ecosystem-registry/links';
import {CHOICE_WORDS, STATE_WORDS, deadlineWords, durationWords, percentOf, scaled, tallyView, whatChanges} from '../../lib/governance/plain-words';
import {VOTE_CHOICES, type GovParams, type ProposalWire, type VoteChoiceWire, type VoteWire} from '../../lib/governance/wire';
import type {JournalVote} from '../../lib/governance/votes';
import {zigText} from '../../lib/staking/view';
import {formatDateTime} from '../../lib/visual-format';
import {WhatsThis} from '../earn/whats-this';

/**
 * Session AF chunk 3 (lane L2a; ADR-028 H46; P6.5, P6.6): one proposal in plain words — its number and state, the deadline,
 * what it would change (from its messages), the tally as shares with the quorum, threshold and veto beside them (a live
 * tally says what would happen if voting ended now), the deposit, and the proposer's own words apart and labelled. During
 * its voting period, a connected person with stake chooses Yes, No, Abstain or No with veto and presses Review; the review
 * screen is the only way to the signer. Nothing here moves by itself: no motion, nothing preselected.
 */
export type VoteState = {phase: 'idle'} | {phase: 'reading'} | {phase: 'ok'; wire: VoteWire} | {phase: 'unavailable'; reason: string};
type Props = {
  proposal: ProposalWire;
  params: GovParams;
  bondedTotal: string;
  now: number;
  chainId: string;
  /** Present when a wallet is connected on this network. */
  voting?: {eligible: boolean; reviewing: boolean; myVote: VoteState; journal?: JournalVote; onReview: (proposal: ProposalWire, choice: VoteChoiceWire) => void; error?: string};
  /** Session AF (L1c, N1): the first card with a tally explains the quorum, once on the page. */
  explainQuorum?: boolean;
};
const SHARES: readonly [keyof ReturnType<typeof tallyView>['shares'], string][] = [['yes', 'Yes'], ['no', 'No'], ['abstain', 'Abstain'], ['noWithVeto', 'No with veto']];
export function ProposalCard({proposal, params, bondedTotal, now, chainId, voting, explainQuorum = false}: Props) {
  const id = useId(), [choice, setChoice] = useState<VoteChoiceWire | ''>('');
  const live = proposal.tallyKind === 'live';
  const view = tallyView(proposal.tally, params, proposal.expedited, bondedTotal, live);
  const needed = proposal.expedited ? params.expeditedMinDeposit : params.minDeposit;
  const threshold = proposal.expedited ? params.expeditedThreshold : params.threshold;
  const links = voting?.journal?.hash ? explorerLinksFor(chainId, 'transaction', voting.journal.hash) : [];
  const submit = (event: FormEvent) => { event.preventDefault(); if (choice && voting?.eligible && !voting.reviewing) voting.onReview(proposal, choice); };
  const mine = voting?.myVote.phase === 'ok' ? voting.myVote.wire.vote : null;
  return <article className={`panel governance-proposal is-${proposal.state}`} aria-labelledby={`${id}-title`} data-proposal={proposal.id}>
    <header className="governance-proposal-head">
      <p className="eyebrow"><span className={`governance-state is-${proposal.state}`}>{STATE_WORDS[proposal.state]}</span> · Proposal #{proposal.id}{proposal.expedited ? ' · expedited' : ''}</p>
      <h3 id={`${id}-title`}>{proposal.title}</h3>
      <p className="governance-deadline"><strong>{deadlineWords(proposal, now)}</strong>{proposal.votingEndTime ? <> · <time dateTime={proposal.votingEndTime}>{formatDateTime(proposal.votingEndTime)}</time></> : null}</p>
    </header>
    <section className="governance-changes" aria-label="What it would change">
      <h4>What it would change</h4>
      <ul>{whatChanges(proposal.messageTypes).map(line => <li key={line}>{line}</li>)}</ul>
    </section>
    {proposal.tallyKind !== 'none' && <section className="governance-tally" aria-label={live ? 'Votes so far' : 'Final votes'}>
      <h4>{live ? 'Votes so far' : 'Final votes'}</h4>
      {view.total > 0n ? <>
        <div className="governance-bar" role="img" aria-label={SHARES.map(([k, label]) => `${label} ${view.shares[k]}`).join(', ')}>
          {SHARES.map(([k]) => <span key={k} className={`is-${k}`} style={{width: view.shares[k]}}/>)}
        </div>
        <ul className="governance-shares">{SHARES.map(([k, label]) => <li key={k} className={`is-${k}`}><span>{label}</span> <strong>{view.shares[k]}</strong></li>)}</ul>
      </> : <p>No votes {live ? 'yet' : 'were counted'}.</p>}
      <p className="fine">To pass, at least {percentOf(scaled(params.quorum))} of all staked ZIG must vote (the quorum), Yes must be more than {percentOf(scaled(threshold))} of the votes that are not Abstain, and No with veto must stay at or below {percentOf(scaled(params.vetoThreshold))} of all votes{params.burnVoteVeto ? ' (above it, the deposit is burned)' : ''}. These are the chain&rsquo;s own numbers.{explainQuorum && <> <WhatsThis term="quorum"/></>}</p>
      {live && view.verdict && <p className="governance-verdict">{view.verdict} Turnout so far: {view.turnout} of staked ZIG.</p>}
    </section>}
    <dl className="governance-facts">
      <div><dt>Deposit</dt><dd>{zigText(proposal.totalDeposit)}{proposal.state === 'deposit' ? ` of ${zigText(needed)} needed to start voting` : ''}</dd></div>
      {/* Session AH (ST7, D-169): an ended or running proposal states its own voting period, not today's setting. */}
      <div><dt>Voting period</dt><dd>{proposal.votingStartTime && proposal.votingEndTime && Date.parse(proposal.votingEndTime) > Date.parse(proposal.votingStartTime) ? <>{durationWords(Math.round((Date.parse(proposal.votingEndTime) - Date.parse(proposal.votingStartTime)) / 1000))} for this proposal</> : <>{durationWords(proposal.expedited ? params.expeditedVotingPeriodSeconds : params.votingPeriodSeconds)} on this network</>}</dd></div>
      <div><dt>Submitted</dt><dd><time dateTime={proposal.submitTime}>{formatDateTime(proposal.submitTime)}</time></dd></div>
      {/* Session AH (ST7, L-043, B-112): "Rejected" with mostly Yes votes is explained in words; the chain's own reason is quoted as the chain's. */}
      {proposal.state === 'rejected' && BigInt(proposal.tally.yes) > BigInt(proposal.tally.no) + BigInt(proposal.tally.noWithVeto) && <div><dt>Why Rejected with mostly Yes</dt><dd>A proposal also needs enough of all staked ZIG to vote (the quorum, above). When too few vote, the chain rejects it whatever the votes say.</dd></div>}
      {proposal.failedReason && <div><dt>The chain&rsquo;s own reason</dt><dd><q>{proposal.failedReason}</q></dd></div>}
    </dl>
    {proposal.summary && <details className="governance-summary"><summary>In the proposer&rsquo;s own words</summary><p className="fine">The proposer wrote this; ZIGoals has not checked it.</p><p className="governance-summary-text">{proposal.summary}</p></details>}
    {voting?.journal && <p className="governance-journal" role="status">You voted <strong>{CHOICE_WORDS[voting.journal.choice].label}</strong> from this device on {formatDateTime(voting.journal.at)}.{links.map(link => <span key={link.url}> <a href={link.url} target="_blank" rel="noopener noreferrer">Check it on {link.name} ↗</a></span>)}</p>}
    {proposal.state === 'voting' && voting && <form className="governance-vote" onSubmit={submit} aria-label={`Your vote on proposal ${proposal.id}`}>
      {voting.myVote.phase === 'reading' && <p className="fine">Reading your vote from the chain…</p>}
      {voting.myVote.phase === 'ok' && <p className="fine">{mine ? <>The chain has your vote: <strong>{mine.options.map(o => CHOICE_WORDS[o.option].label).join(', ')}</strong> (block {voting.myVote.wire.height}). Voting again replaces it.</> : `You have not voted on this proposal yet (read at block ${voting.myVote.wire.height}).`}</p>}
      {voting.myVote.phase === 'unavailable' && <p className="fine">Your vote could not be read just now: {voting.myVote.reason}</p>}
      {voting.eligible ? <>
        <fieldset className="governance-choices"><legend>Your vote</legend>
          {VOTE_CHOICES.map(c => <label key={c} className="governance-choice"><input type="radio" name={`${id}-vote`} value={c} checked={choice === c} onChange={() => setChoice(c)}/><span><strong>{CHOICE_WORDS[c].label}</strong><span>{CHOICE_WORDS[c].means}</span></span></label>)}
        </fieldset>
        {voting.error && <p role="alert" className="notice">{voting.error}</p>}
        <button type="submit" className="primary" disabled={!choice || voting.reviewing}>{voting.reviewing ? 'Estimating the fee…' : 'Review my vote'}</button>
        <p className="fine">The review shows exactly what you sign. Your vote is public and tied to your address forever.</p>
      </> : <p className="notice">Voting needs at least 1 ZIG staked with active validators on this network, so a vote from this address would not count yet. Stake first on <Link href="/app/staking">Staking</Link>, then come back to vote.</p>}
    </form>}
  </article>;
}

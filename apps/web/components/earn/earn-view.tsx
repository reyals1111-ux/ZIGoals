'use client';
import Link from 'next/link';
import {lazy, memo, Suspense, useMemo} from 'react';
import {aprAtCommission} from '../../lib/earn/apr';
import {fixed, rounded} from '../../lib/earn/decimal';
import {pct, pctShort} from '../../lib/earn/format';
import {EARN_SECTIONS} from '../../lib/earn/options';
import type {StartFacts} from '../../lib/earn/start-here';
import {OrbitArt} from '../header-art/orbit-art';
import {PageHeader} from '../page-header';
import {SectionHeading} from '../ui/section-heading';
import {AcademySection} from './academy-section';
import {CompareTable} from './compare-table';
import {DefaSection, NawaSection, PermapodSection, ZignalySection} from './apps-sections';
import {EarnChips} from './earn-chips';
import {EarnGlyph} from './earn-glyph';
import {EarnJump} from './earn-jump';
import {GuideProvider} from './guide-panel';
import {LiveSummary} from './live-summary';
import {NativeSection, commissionChoices} from './native-section';
import {OroswapSection} from './oroswap-section';
import {SafetyBlock} from './safety-block';
import {StartHereSection} from './start-here-section';
import {useEarnWallets, usePositionReads, useStakingFacts, walletReads} from './use-earn-positions';
import {useEarnShares} from './your-shares';
import {useEarnLive, useMinuteClock} from './use-earn-live';
import {ValdoraSection} from './valdora-section';
import {ValidatorsSection} from './validators-section';
import {VaultsSection} from './vaults-section';
import {SourceLine, Unavailable} from './live-figure';
import {SectionBoundary} from './section-boundary';
import {PhoneFold} from '../phone/phone-fold';
import './earn.css';

// Session AK (F4): staking clarity (claimable rewards, the unbonding calendar, rewards claimed here, the CSV) loads only
// when a wallet is linked or connected, from the reads this page already makes.
const StakingClarity = lazy(() => import('../zigchain-eco/staking-clarity'));
/**
 * Session AL (D9: Earn's first load, ≈ 3.9 s TBT on the phone profile; the page's loading model is unchanged). Seven live
 * answers and the wallet reads arrive one by one while the page loads, and each one re-rendered every section of this
 * long page. The sections are pure functions of their own props (the live answers, the minute clock, the reads), so
 * each is memoised: an arrival now re-renders only the sections that show that answer. Same elements, same order, same
 * output; only the repeated work goes.
 */
const Summary = memo(LiveSummary), StartHere = memo(StartHereSection), Native = memo(NativeSection), Valdora = memo(ValdoraSection);
const Vaults = memo(VaultsSection), Oroswap = memo(OroswapSection), Nawa = memo(NawaSection), Defa = memo(DefaSection), Permapod = memo(PermapodSection);
// Session AP (route weights): the three wider sections near the end of the page (governance, goal-linked stake,
// stablecoins) load after the page shows; their headings and anchors are on the page at once (SectionBoundary).
const wider = () => import('./wider-sections');
const GovernanceLazy = lazy(() => wider().then(m => ({default: m.GovernanceSection}))), GoalVaultsLazy = lazy(() => wider().then(m => ({default: m.GoalVaultsSection}))), StablecoinsLazy = lazy(() => wider().then(m => ({default: m.StablecoinsSection})));
// Until a section arrives its anchor holds its place, so an address such as /app/earn#governance lands on it at once.
const Holding = ({id}: {id: string}) => <div id={id} className="panel earn-option earn-option-loading" aria-busy="true"/>;
function GovernanceSlot() { return <Suspense fallback={<Holding id="governance"/>}><GovernanceLazy/></Suspense>; }
function GoalVaultsSlot({now}: {now: number}) { return <Suspense fallback={<Holding id="goal-vaults"/>}><GoalVaultsLazy now={now}/></Suspense>; }
function StablecoinsSlot(p: Parameters<typeof StablecoinsLazy>[0]) { return <Suspense fallback={<Holding id="stablecoins"/>}><StablecoinsLazy {...p}/></Suspense>; }
const Zignaly = memo(ZignalySection), Governance = memo(GovernanceSlot), GoalVaults = memo(GoalVaultsSlot), Stablecoins = memo(StablecoinsSlot);
const Validators = memo(ValidatorsSection), Academy = memo(AcademySection), Safety = memo(SafetyBlock), Compare = memo(CompareTable);

/**
 * Session AF (L1, ADR-028 H5, H16, H17, H84): the Earn hub, /app/earn. Every way to earn on ZIGChain that is live today,
 * in a fixed order (never ranked by rate), each with live numbers from its own source or "unavailable" with the reason,
 * its risks, who holds the funds and the steps on the app's own site (guide mode: a new tab plus a panel here; nothing is
 * framed). Reads go only to the app's own /api routes, polled while the page is visible. Without a wallet every
 * explanation is still here; with one, a read-only summary leads.
 *
 * Session AF chunk 2 (amendment 3, P1.7–P1.30, Part 5): the Start-here path, every other way to earn in depth (the USDC
 * vaults, Nawa, DeFa, Permapod, Zignaly, governance, Goal Vaults, stablecoins), the measured staking figure beside the
 * issuance figure (H97), the Academy. Each wallet is read once for the summary and the
 * Start-here detectors.
 */
export function EarnView() {
  const now = useMinuteClock();
  const chain = useEarnLive('chain'), valdora = useEarnLive('valdora'), oroswap = useEarnLive('oroswap'), llama = useEarnLive('defillama'), validators = useEarnLive('validators');
  const vaults = useEarnLive('vaults'), measured = useEarnLive('measured');
  const wallets = useEarnWallets(), {journal} = useStakingFacts();
  const reads = usePositionReads(wallets, journal), shares = useEarnShares(wallets);
  const facts: StartFacts = useMemo(() => ({linked: wallets.filter(w => w.via === 'linked').length, connected: wallets.filter(w => w.via !== 'linked').length, journal, reads: walletReads(reads)}), [wallets, journal, reads]);
  const live = useMemo(() => ({chain, oroswap}), [chain, oroswap]);
  const chips = useMemo(() => EARN_SECTIONS.filter(s => !('when' in s) || wallets.length > 0).map(s => ({id: s.id, label: s.label})), [wallets.length]);
  const lowest = commissionChoices(validators)[0];
  const rate = chain.phase === 'ok' ? lowest ? aprAtCommission(chain.answer.data.apr, lowest) : chain.answer.data.apr.beforeCommission : null;
  const calculatorHref = rate ? `/app/wealth/calculator?${new URLSearchParams({from: 'earn', rate: rounded(fixed(rate) * 100n, 2), label: 'illustration'})}` : null;
  return <GuideProvider>
    <div className="dashboard earn-page">
      <PageHeader className="page-heading earn-hero" titleId="earn-title" eyebrow="Wealth · Earn" title="Ways to earn on ZIGChain"
        lede="The ways to earn on ZIGChain that ZIGoals reads, in plain words, with figures read live from their own sources. Information, not advice: you decide, and you sign in your own wallet; ZIGoals never holds your keys."
        actions={<><a className="primary" href="#start-here">Start here</a> <a className="secondary" href="#safety">Safety first</a></>}
        art={<OrbitArt glyph={EarnGlyph} tone="wealth" spin={-24}/>}/>
      <p className="earn-hero-note fine">Options are listed in the order the network is built, not by how much they pay. Nothing here is advice or a promise of returns.</p>
      {/* Session AL (P-BN-48; BN-074, BN-126, N-BN-05, D-123): one topic strip. The phones' round app strip repeated five
          of this index's targets on the first screen (at 500 px it sat under the bottom bar); O3 put the Earn dock's role
          below 901 px in Apps & extras, so the index alone leads every width. */}
      <EarnChips chips={chips}/>
      <div className="earn-sections">
        <EarnJump/>
        <SectionBoundary id="summary" title="Your Earn summary"><Summary wallets={wallets} reads={reads}/></SectionBoundary>
        {wallets.length > 0 && <SectionBoundary id="staking-clarity" title="Rewards, unstaking and history"><Suspense fallback={null}><StakingClarity now={now} reads={reads.flatMap(r => r.state.phase === 'ok' ? [{address: r.address, label: r.label, positions: r.state.positions}] : [])}/></Suspense></SectionBoundary>}
        <SectionBoundary id="start-here" title="Start here"><StartHere facts={facts} live={live}/></SectionBoundary>
        {/* Session AL fifth pass (C-BN-07, N-BN-05): the ways to earn side by side, with their labels and sources (no chip:
            the one topic strip keeps its list); on a phone it folds to one row, as the wider sections do (open, its eight
            cards are about 3,000 px at 375). */}
        <PhoneFold label="The ways to earn, compared"><SectionBoundary id="compare" title="The ways to earn, compared"><Compare valdora={valdora} vaults={vaults}/></SectionBoundary></PhoneFold>
        {/* Session AO (N-BN-05): Earn was 15,769 px at 375 with the Showcase (about 19 screens). On a phone the four ways
            to earn below Start here, the validator list and the Academy fold to one row each too, named as their headings;
            the topic strip, Start here's links and any #hash open the one they name. Wider screens show them as before. */}
        <PhoneFold label="Stake ZIG with a validator"><SectionBoundary id="native-staking" title="Stake ZIG with a validator"><Native chain={chain} validators={validators} measured={measured} now={now} reads={reads}/></SectionBoundary></PhoneFold>
        <PhoneFold label="Stake and keep a token: stZIG"><SectionBoundary id="valdora" title="Stake and keep a token: stZIG"><Valdora valdora={valdora} llama={llama} now={now} reads={reads}/></SectionBoundary></PhoneFold>
        <PhoneFold label="Lend USDC through a vault"><SectionBoundary id="valdora-vaults" title="Lend USDC through a vault"><Vaults vaults={vaults} valdora={valdora} now={now} shares={shares}/></SectionBoundary></PhoneFold>
        <PhoneFold label="Swap, or earn swap fees in a pool"><SectionBoundary id="oroswap" title="Swap, or earn swap fees in a pool"><Oroswap oroswap={oroswap} llama={llama} now={now} shares={shares}/></SectionBoundary></PhoneFold>
        {/* Session AL sweep 4 (N-BN-05, D-005): on a phone the wider ways to earn fold to one row each (components/phone/
            phone-fold.tsx), so the page is shorter to scan; the index's links and any #hash open the one they point to.
            Wider screens show them as before. */}
        <PhoneFold label="Shariah-compliant vaults: Nawa"><SectionBoundary id="nawa" title="Shariah-compliant vaults: Nawa"><Nawa vaults={vaults} llama={llama} now={now}/></SectionBoundary></PhoneFold>
        <PhoneFold label="Invoice finance pools: DeFa"><SectionBoundary id="defa" title="Invoice finance pools: DeFa"><Defa vaults={vaults} llama={llama} now={now}/></SectionBoundary></PhoneFold>
        <PhoneFold label="Borrow and lend: Permapod"><SectionBoundary id="permapod" title="Borrow and lend: Permapod"><Permapod llama={llama} now={now}/></SectionBoundary></PhoneFold>
        <PhoneFold label="Zignaly is closing: how to withdraw"><SectionBoundary id="zignaly" title="Zignaly is closing: how to withdraw"><Zignaly now={now}/></SectionBoundary></PhoneFold>
        <PhoneFold label="Have a say: governance"><SectionBoundary id="governance" title="Have a say: governance"><Governance/></SectionBoundary></PhoneFold>
        <PhoneFold label="Link stake you already hold to a goal"><SectionBoundary id="goal-vaults" title="Link stake you already hold to a goal"><GoalVaults now={now}/></SectionBoundary></PhoneFold>
        <PhoneFold label="Stablecoins on ZIGChain: what exists"><SectionBoundary id="stablecoins" title="Stablecoins on ZIGChain: what exists"><Stablecoins oroswap={oroswap} vaults={vaults} now={now}/></SectionBoundary></PhoneFold>
        <PhoneFold label="Choose a validator from facts"><SectionBoundary id="validators" title="Choose a validator from facts"><Validators validators={validators} now={now}/></SectionBoundary></PhoneFold>
        <PhoneFold label="Earn Academy: learn it before you earn it"><SectionBoundary id="academy" title="Earn Academy"><Academy/></SectionBoundary></PhoneFold>
        <section id="calculator" className="earn-calculator panel" aria-labelledby="calculator-title">
          <SectionHeading id="calculator-title" eyebrow="Planning, not a promise" title="See what a rate could do over time"
            lede="Open the compound interest calculator with today’s native staking rate filled in, as an illustration. Rates move; nothing here is guaranteed."/>
          {/* Critique round 2 (L5c): the rate the calculator opens at carries the same source line as the native figures. */}
          {calculatorHref && rate && chain.phase === 'ok' ? <div className="earn-calculator-live" data-live-figure="calculator" data-state="ok">
            <p className="earn-calculator-cta"><Link className="primary" href={calculatorHref} data-rate={rounded(fixed(rate) * 100n, 2)}>Open the calculator at {pct(rate)}</Link> <span className="fine">The native staking rate{lowest ? ` at a ${pctShort(lowest)} commission` : ' before the validator’s commission'}, read live; simple yearly rate.</span></p>
            <SourceLine answer={chain.answer} now={now}/>
            {lowest && validators.phase === 'ok' ? <small className="earn-hint">The commission, from the validator list: <SourceLine answer={validators.answer} now={now}/></small> : null}
          </div>
            : <p className="earn-figure" data-live-figure="calculator" data-state={chain.phase === 'loading' ? 'loading' : 'unavailable'} data-reason={chain.phase === 'unavailable' ? chain.reason : undefined}>{chain.phase === 'loading' ? 'Reading today’s rate…' : <>Today’s rate is <Unavailable reason={chain.phase === 'unavailable' ? chain.reason : 'UPSTREAM_DOWN'}/>, so the calculator opens with your own numbers: <Link className="text-link" href="/app/wealth/calculator">Open the calculator</Link></>}</p>}
        </section>
        <Safety/>
      </div>
    </div>
  </GuideProvider>;
}

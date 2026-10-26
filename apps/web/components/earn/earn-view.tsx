'use client';
import Link from 'next/link';
import {useMemo} from 'react';
import {aprAtCommission} from '../../lib/earn/apr';
import {fixed, rounded} from '../../lib/earn/decimal';
import {pct, pctShort} from '../../lib/earn/format';
import {EARN_SECTIONS} from '../../lib/earn/options';
import type {StartFacts} from '../../lib/earn/start-here';
import {OrbitArt} from '../header-art/orbit-art';
import {PageHeader} from '../page-header';
import {SectionHeading} from '../ui/section-heading';
import {AcademySection} from './academy-section';
import {DefaSection, NawaSection, PermapodSection, ZignalySection} from './apps-sections';
import {EarnAppsStrip} from './earn-apps-strip';
import {EarnChips} from './earn-chips';
import {EarnGlyph} from './earn-glyph';
import {GuideProvider} from './guide-panel';
import {LiveSummary} from './live-summary';
import {NativeSection, commissionChoices} from './native-section';
import {OroswapSection} from './oroswap-section';
import {SafetyBlock} from './safety-block';
import {StartHereSection} from './start-here-section';
import {useEarnWallets, usePositionReads, useStakingFacts, walletReads} from './use-earn-positions';
import {useEarnLive, useMinuteClock} from './use-earn-live';
import {ValdoraSection} from './valdora-section';
import {ValidatorsSection} from './validators-section';
import {VaultsSection} from './vaults-section';
import {GoalVaultsSection, GovernanceSection, StablecoinsSection} from './wider-sections';
import {SourceLine, Unavailable} from './live-figure';
import {SectionBoundary} from './section-boundary';
import './earn.css';

/**
 * Session AF (L1, ADR-028 H5, H16, H17, H84): the Earn hub, /app/earn. Every way to earn on ZIGChain that is live today,
 * in a fixed order (never ranked by rate), each with live numbers from its own source or "unavailable" with the reason,
 * its risks, who holds the funds and the steps on the app's own site (guide mode: a new tab plus a panel here; nothing is
 * framed). Reads go only to the app's own /api routes, polled while the page is visible. Without a wallet every
 * explanation is still here; with one, a read-only summary leads.
 *
 * Session AF chunk 2 (amendment 3, P1.7–P1.30, Part 5): the Start-here path, every other way to earn in depth (the USDC
 * vaults, Nawa, DeFa, Permapod, Zignaly, governance, Goal Vaults, stablecoins), the measured staking figure beside the
 * issuance figure (H97), the Academy, and on phones the dock's app strip. Each wallet is read once for the summary and the
 * Start-here detectors.
 */
export function EarnView() {
  const now = useMinuteClock();
  const chain = useEarnLive('chain'), valdora = useEarnLive('valdora'), oroswap = useEarnLive('oroswap'), llama = useEarnLive('defillama'), validators = useEarnLive('validators');
  const vaults = useEarnLive('vaults'), measured = useEarnLive('measured');
  const wallets = useEarnWallets(), {journal} = useStakingFacts();
  const reads = usePositionReads(wallets, journal);
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
      <EarnAppsStrip/>
      <EarnChips chips={chips}/>
      <div className="earn-sections">
        <SectionBoundary id="summary" title="Your Earn summary"><LiveSummary wallets={wallets} reads={reads}/></SectionBoundary>
        <SectionBoundary id="start-here" title="Start here"><StartHereSection facts={facts} live={live}/></SectionBoundary>
        <SectionBoundary id="native-staking" title="Stake ZIG with a validator"><NativeSection chain={chain} validators={validators} measured={measured} now={now} reads={reads}/></SectionBoundary>
        <SectionBoundary id="valdora" title="Stake and keep a token: stZIG"><ValdoraSection valdora={valdora} llama={llama} now={now} reads={reads}/></SectionBoundary>
        <SectionBoundary id="valdora-vaults" title="Lend USDC through a vault"><VaultsSection vaults={vaults} valdora={valdora} now={now}/></SectionBoundary>
        <SectionBoundary id="oroswap" title="Swap, or earn swap fees in a pool"><OroswapSection oroswap={oroswap} llama={llama} now={now}/></SectionBoundary>
        <SectionBoundary id="nawa" title="Shariah-compliant vaults: Nawa"><NawaSection vaults={vaults} llama={llama} now={now}/></SectionBoundary>
        <SectionBoundary id="defa" title="Invoice finance pools: DeFa"><DefaSection vaults={vaults} llama={llama} now={now}/></SectionBoundary>
        <SectionBoundary id="permapod" title="Borrow and lend: Permapod"><PermapodSection llama={llama} now={now}/></SectionBoundary>
        <SectionBoundary id="zignaly" title="Zignaly is closing: how to withdraw"><ZignalySection now={now}/></SectionBoundary>
        <SectionBoundary id="governance" title="Have a say: governance"><GovernanceSection/></SectionBoundary>
        <SectionBoundary id="goal-vaults" title="Put your stake to work for a goal"><GoalVaultsSection now={now}/></SectionBoundary>
        <SectionBoundary id="stablecoins" title="Earn with stablecoins"><StablecoinsSection oroswap={oroswap} vaults={vaults} now={now}/></SectionBoundary>
        <SectionBoundary id="validators" title="Choose a validator from facts"><ValidatorsSection validators={validators} now={now}/></SectionBoundary>
        <SectionBoundary id="academy" title="Earn Academy"><AcademySection/></SectionBoundary>
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
        <SafetyBlock/>
      </div>
    </div>
  </GuideProvider>;
}

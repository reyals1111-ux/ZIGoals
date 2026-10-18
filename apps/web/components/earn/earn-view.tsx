'use client';
import Link from 'next/link';
import {useMemo} from 'react';
import {aprAtCommission} from '../../lib/earn/apr';
import {fixed, rounded} from '../../lib/earn/decimal';
import {pct, pctShort} from '../../lib/earn/format';
import {EARN_SECTIONS} from '../../lib/earn/options';
import {OrbitArt} from '../header-art/orbit-art';
import {PageHeader} from '../page-header';
import {SectionHeading} from '../ui/section-heading';
import {EarnChips} from './earn-chips';
import {EarnGlyph} from './earn-glyph';
import {GuideProvider} from './guide-panel';
import {LiveSummary, useEarnWallets} from './live-summary';
import {NativeSection, commissionChoices} from './native-section';
import {OroswapSection} from './oroswap-section';
import {SafetyBlock} from './safety-block';
import {useEarnLive, useMinuteClock} from './use-earn-live';
import {ValdoraSection} from './valdora-section';
import {ValidatorsSection} from './validators-section';
import {Unavailable} from './live-figure';
import {SectionBoundary} from './section-boundary';
import './earn.css';

/**
 * Session AF (L1, ADR-028 H5, H16, H17, H84): the Earn hub, /app/earn. Every way to earn on ZIGChain that is live today,
 * in a fixed order (never ranked by rate), each with live numbers from its own source or "unavailable" with the reason,
 * its risks, who holds the funds and the steps on the app's own site (guide mode: a new tab plus a panel here; nothing is
 * framed). Reads go only to the app's own /api routes, polled while the page is visible. Without a wallet every
 * explanation is still here; with one, a read-only summary leads.
 */
export function EarnView() {
  const now = useMinuteClock();
  const chain = useEarnLive('chain'), valdora = useEarnLive('valdora'), oroswap = useEarnLive('oroswap'), llama = useEarnLive('defillama'), validators = useEarnLive('validators');
  const wallets = useEarnWallets();
  const chips = useMemo(() => EARN_SECTIONS.filter(s => !('when' in s) || wallets.length > 0).map(s => ({id: s.id, label: s.label})), [wallets.length]);
  const lowest = commissionChoices(validators)[0];
  const rate = chain.phase === 'ok' ? lowest ? aprAtCommission(chain.answer.data.apr, lowest) : chain.answer.data.apr.beforeCommission : null;
  const calculatorHref = rate ? `/app/wealth/calculator?${new URLSearchParams({from: 'earn', rate: rounded(fixed(rate) * 100n, 2), label: 'illustration'})}` : null;
  return <GuideProvider>
    <div className="dashboard earn-page">
      <PageHeader className="page-heading earn-hero" titleId="earn-title" eyebrow="Wealth · Earn" title="Make your money work"
        lede="Every live way to earn on ZIGChain, in plain words, with numbers read live from their own sources. You choose and you sign in your own wallet; ZIGoals shows the way and never holds your keys."
        actions={<a className="secondary" href="#safety">Safety first</a>}
        art={<OrbitArt glyph={EarnGlyph} tone="wealth" spin={-24}/>}/>
      <p className="earn-hero-note fine">Options are listed in the order the network is built, not by how much they pay. Nothing here is advice or a promise of returns.</p>
      <EarnChips chips={chips}/>
      <div className="earn-sections">
        <SectionBoundary id="summary" title="Your Earn summary"><LiveSummary wallets={wallets}/></SectionBoundary>
        <SectionBoundary id="native-staking" title="Stake ZIG with a validator"><NativeSection chain={chain} validators={validators} now={now}/></SectionBoundary>
        <SectionBoundary id="valdora" title="Stake and keep a token: stZIG"><ValdoraSection valdora={valdora} llama={llama} now={now}/></SectionBoundary>
        <SectionBoundary id="oroswap" title="Swap, or earn swap fees in a pool"><OroswapSection oroswap={oroswap} llama={llama} now={now}/></SectionBoundary>
        <SectionBoundary id="validators" title="Choose a validator from facts"><ValidatorsSection validators={validators} now={now}/></SectionBoundary>
        <section id="calculator" className="earn-calculator panel" aria-labelledby="calculator-title">
          <SectionHeading id="calculator-title" eyebrow="Planning, not a promise" title="See what a rate could do over time"
            lede="Open the compound interest calculator with today’s native staking rate filled in, as an illustration. Rates move; nothing here is guaranteed."/>
          {calculatorHref && rate ? <p className="earn-calculator-cta"><Link className="primary" href={calculatorHref} data-rate={rounded(fixed(rate) * 100n, 2)}>Open the calculator at {pct(rate)}</Link> <span className="fine">The native staking rate{lowest ? ` at a ${pctShort(lowest)} commission` : ' before the validator’s commission'}, read live; simple yearly rate.</span></p>
            : <p className="earn-figure" data-live-figure="calculator" data-state={chain.phase === 'loading' ? 'loading' : 'unavailable'} data-reason={chain.phase === 'unavailable' ? chain.reason : undefined}>{chain.phase === 'loading' ? 'Reading today’s rate…' : <>Today’s rate is <Unavailable reason={chain.phase === 'unavailable' ? chain.reason : 'UPSTREAM_DOWN'}/>, so the calculator opens with your own numbers: <Link className="text-link" href="/app/wealth/calculator">Open the calculator</Link></>}</p>}
        </section>
        <SafetyBlock/>
      </div>
    </div>
  </GuideProvider>;
}

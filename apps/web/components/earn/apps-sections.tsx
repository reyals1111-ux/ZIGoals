'use client';
import type {LiveState} from '../../lib/earn/client';
import {tokenAmount, usd} from '../../lib/earn/format';
import type {DefillamaData, VaultRow, VaultsData} from '../../lib/earn/live/types';
import {DEFA_SITE, NAWA_METHOD, NOBLE_USDC, PERMAPOD_STATUS, ZIGNALY_CLOSURE} from '../../lib/earn/options';
import {formatDate, formatNumber} from '../../lib/visual-format';
import {VerifiedLink} from '../links/verified-link';
import {IllustrationSlot} from './illustrations/slot';
import {LiveFigure, Unavailable, shown, type Shown} from './live-figure';
import {OptionSection} from './option-section';
import {vaultHint} from './vaults-section';

/**
 * Session AF chunk 2 (amendment 3, D8, H43, H84, H88): the ecosystem apps that are not a way to earn for most people today,
 * each in full so people understand why: Nawa (its USDC vault depends on Zignaly, which is closing), DeFa by InvoiceMate
 * (private, information only), Permapod (paused after an exploit: DefiLlama's dated incident, read live) and Zignaly
 * (closing: how to withdraw). Neutral words, each fact with its source and the day it was read; every number live.
 */
const day = (iso: string) => formatDate(`${iso}T12:00:00Z`, {timeZone: 'UTC'});
type Ok = Extract<VaultRow, {status: 'ok'}>;
const llamaTvl = (llama: LiveState<DefillamaData>, slug: keyof DefillamaData['protocols']): Shown => shown(llama, d => { const p = d.protocols[slug]; return p.status === 'ok' ? p.tvlUsd === null ? {unavailable: 'NOT_PUBLISHED'} : usd(p.tvlUsd) : {unavailable: p.reason}; });

export function NawaSection({vaults, llama, now}: {vaults: LiveState<VaultsData>; llama: LiveState<DefillamaData>; now: number}) {
  const usdc = vaults.phase === 'ok' ? vaults.answer.data.vaults['nawa-usdc'] : null;
  const pool = llama.phase === 'ok' && llama.answer.data.pools.status === 'ok' ? llama.answer.data.pools.rows.find(r => r.project === 'nawa-protocol' && /USDC/i.test(r.symbol)) : undefined;
  return <OptionSection id="nawa" eyebrow="Nawa Finance · information" title="Shariah-compliant vaults: Nawa"
    lede="Nawa runs vaults built to follow Islamic finance rules: a USDC vault and a stZIG vault on ZIGChain, sharing in the results of real-economy financing."
    logo={{src: '/ecosystem-logos/nawa.png', alt: 'Nawa site icon'}}
    tags={[{tone: 'live', text: 'Live on ZIGChain'}, {tone: 'paused', text: 'USDC vault depends on Zignaly'}, {tone: 'third', text: 'Off-chain custody'}]}
    notice={<>
      <p><b>Its USDC vault depends on Zignaly, which is closing.</b> {NAWA_METHOD.text} <span className="fine">({NAWA_METHOD.source}, read {day(NAWA_METHOD.readOn)})</span> <VerifiedLink provider="nawa" kind="defillama" className="text-link" mark="compact">Nawa on DefiLlama</VerifiedLink></p>
      <p>Zignaly’s own notice: the last day to request a Private Credit withdrawal is {day('2026-11-01')}, and the app closes on {day('2026-12-01')} at 23:59 UTC <span className="fine">(read {day(ZIGNALY_CLOSURE.readOn)})</span>. What this means for the vault’s money is not stated anywhere ZIGoals read. <VerifiedLink provider="zignaly" kind="closure-notice" className="text-link" mark="compact">Zignaly’s notice</VerifiedLink></p>
    </>}
    facts={[
      {label: 'Best for', value: 'Understanding a Nawa vault you already hold. Joining now means depending on an off-chain route that is closing.'},
      {label: 'Who runs it', value: 'Nawa Finance, through vault contracts on ZIGChain (its USDC vault runs on the same vault code as Valdora’s).'},
      {label: 'Who holds the funds', value: 'Your vault shares sit in your wallet; the USDC vault’s money is deployed away from the chain via Zignaly, as DefiLlama describes it.'},
      {label: 'Who can use it', value: 'Nawa’s site did not show its eligibility or identity-check rules to ZIGoals (read 18 Oct 2026); its app shows its vaults only once a wallet is connected.'},
    ]}
    figures={<>
      <LiveFigure id="nawa-usdc" label="Nawa’s USDC vault: what it reports managing" now={now} figure={shown(vaults, d => { const v = d.vaults['nawa-usdc']; return v.status === 'ok' ? tokenAmount(v.aumUnits, v.decimals, v.asset === 'other' ? 'units' : v.asset, {compact: true}) : {unavailable: v.reason}; })}
        hint={usdc?.status === 'ok' ? vaultHint(usdc as Ok) : undefined}/>
      <LiveFigure id="nawa-zig" label="Nawa’s stZIG vault holds" now={now} figure={shown(vaults, d => d.nawaZig.status === 'ok' ? tokenAmount(d.nawaZig.totalAumUnits, 6, 'stZIG', {compact: true}) : {unavailable: d.nawaZig.reason})}
        hint="Its own figure, read as stZIG with 6 decimals."/>
      <LiveFigure id="nawa-llama-apy" label="DefiLlama’s yearly figure for the USDC vault" third now={now}
        figure={pool ? pool.apy === null ? {kind: 'unavailable', reason: 'NOT_PUBLISHED'} : {kind: 'ok', value: <>{formatNumber(pool.apy, {maximumFractionDigits: 2})} % (APY)</>, answer: (llama as Extract<typeof llama, {phase: 'ok'}>).answer} : shown(llama, d => d.pools.status === 'ok' ? {unavailable: 'NOT_PUBLISHED'} : {unavailable: d.pools.reason})}
        hint="DefiLlama’s own estimate of past results, not ZIGoals’ and not a promise."/>
      <LiveFigure id="nawa-llama-tvl" label="Value locked in Nawa on ZIGChain" third now={now} figure={llamaTvl(llama, 'nawa-protocol')}/>
    </>}
    columns={[
      {title: 'Fees', body: <p>{vaults.phase === 'ok' && vaults.answer.data.nawaZig.status === 'ok' ? <>The stZIG vault reports a fee number of {formatNumber(vaults.answer.data.nawaZig.feeNumber)}; Nawa does not publish its unit (on Valdora’s contract the same number means 10 % of rewards).</> : <>The fee number is <Unavailable reason={vaults.phase === 'unavailable' ? vaults.reason : 'UPSTREAM_DOWN'} short/> right now.</>} Plus a small network fee in ZIG.</p>},
      {title: 'Lockups', body: <p>Leaving is a withdrawal request, paid out later; Nawa does not publish how long that takes.</p>},
      {title: 'Minimums', body: <p>Not published where ZIGoals could read them.</p>},
      {title: 'Risks', body: <ul className="earn-risks">
        <li>Off-chain custody: the USDC vault’s money is with Zignaly’s private credit route, which is closing (above).</li>
        <li>Credit risk: the businesses financed may repay late or not at all.</li>
        <li>The asset: the USDC vault holds USDC on Noble, which Circle is winding down ({day(NOBLE_USDC.fullyPaused)} full pause). <VerifiedLink provider="zig-finance" kind="circle-noble" className="text-link" mark="compact">Circle’s notice</VerifiedLink></li>
        <li>Who can change the vaults: each has an admin account; when ZIGoals read the chain on {day('2026-10-18')}, each was a single key.</li>
      </ul>},
    ]}
    stepsTitle="What you can do"
    steps={[
      {text: 'If you hold a Nawa vault: read Nawa’s own site for what it says about Zignaly’s closure, and watch your vault on its app.'},
      {text: 'To leave: request a withdrawal in Nawa’s app.', sign: 'one withdrawal request to the vault’s contract.'},
      {text: 'If you do not hold one: the other sections here explain options that do not depend on a closing platform.'},
    ]}
    stepsTime="a few minutes to request; the payout follows Nawa’s own timing."
    illustration={<IllustrationSlot set="nawa-vaults"/>}
    actions={<>
      <VerifiedLink provider="nawa" kind="site" className="secondary">Nawa’s site</VerifiedLink>
      <VerifiedLink provider="nawa" kind="defillama" className="secondary" mark="compact">On DefiLlama</VerifiedLink>
    </>}
  />;
}

export function DefaSection({vaults, llama, now}: {vaults: LiveState<VaultsData>; llama: LiveState<DefillamaData>; now: number}) {
  return <OptionSection id="defa" eyebrow="DeFa by InvoiceMate · information only" title="Invoice finance pools: DeFa"
    lede="DeFa pools money that businesses borrow against their unpaid invoices. On ZIGChain it reports its value through an on-chain counter; there is no app for the public."
    logo={{src: '/ecosystem-logos/defa-invoicemate.png', alt: 'DeFa by InvoiceMate site icon'}}
    tags={[{tone: 'paused', text: 'Private: no public sign-up'}, {tone: 'third', text: 'Information only'}]}
    facts={[
      {label: 'Best for', value: 'Understanding where Valdora’s Private Credit vault lends: it is deployed with DeFa. There is no way to join DeFa directly today.'},
      {label: 'Who runs it', value: 'InvoiceMate, which runs DeFa’s pools.'},
      {label: 'Who holds the funds', value: 'DeFa’s pools and the businesses they finance, away from the chain.'},
      {label: 'Who can use it', value: <>Not the public today. {DEFA_SITE.text} <span className="fine">({DEFA_SITE.source}, read {day(DEFA_SITE.readOn)})</span></>},
    ]}
    figures={<>
      <LiveFigure id="defa-counter" label="DeFa’s own value counter on ZIGChain" now={now}
        figure={shown(vaults, d => d.defa.status === 'ok' ? usd(Number(d.defa.activeTvlUnits) / 1e6) : {unavailable: d.defa.reason})}
        hint="DeFa’s own figure from its on-chain counter, read as dollars with 6 decimals. Nobody else checks it."/>
      <LiveFigure id="defa-llama-tvl" label="DefiLlama’s value for DeFa on ZIGChain" third now={now} figure={llamaTvl(llama, 'defa-by-invoicemate')}
        hint="DefiLlama flags DeFa’s figures as tokens it may not price correctly."/>
    </>}
    columns={[
      {title: 'Fees', body: <p>No fee is published in a form ZIGoals can check.</p>},
      {title: 'Lockups', body: <p>The site lists products of 7 to 180 days; its own figures do not agree with each other.</p>},
      {title: 'Minimums', body: <p>Not published.</p>},
      {title: 'Risks', body: <ul className="earn-risks">
        <li>Private: its terms, docs and audit were “coming soon” on the site when ZIGoals read it.</li>
        <li>Credit risk: businesses may not pay their invoices.</li>
        <li>Off-chain: the pools and the businesses are away from the chain; only a counter is on it.</li>
      </ul>},
    ]}
    stepsTitle="What you can do"
    steps={[
      {text: 'Read DeFa’s site to understand invoice finance.'},
      {text: 'If you hold Valdora’s Private Credit vault, this is the team it is deployed with (see the USDC vaults above).'},
    ]}
    stepsTime="a few minutes of reading. You sign nothing."
    actions={<>
      <VerifiedLink provider="defa-invoicemate" kind="site" className="secondary">DeFa’s site</VerifiedLink>
      <VerifiedLink provider="defa-invoicemate" kind="defillama" className="secondary" mark="compact">On DefiLlama</VerifiedLink>
    </>}
  />;
}

export function PermapodSection({llama, now}: {llama: LiveState<DefillamaData>; now: number}) {
  const p = llama.phase === 'ok' ? llama.answer.data.protocols.permapod : null;
  const incident = p?.status === 'ok' ? p.incidents[0] : undefined;
  return <OptionSection id="permapod" eyebrow="Permapod · paused after an exploit" title="Borrow and lend: Permapod"
    lede="Permapod is a lending app on ZIGChain: deposit tokens as collateral and borrow against them. After an exploit its contracts were halted, so it is not an option today."
    logo={{src: '/ecosystem-logos/permapod.png', alt: 'Permapod site icon'}}
    tags={[{tone: 'paused', text: 'Paused after an exploit'}, {tone: 'third', text: 'Not an option today'}]}
    notice={<>
      <p><b>Not an option today.</b> {incident ? <>DefiLlama lists an incident for Permapod on {day(incident.date)}{incident.classification ? <>, classified “{incident.classification}”</> : null} (read live).</> : p?.status === 'ok' ? <>DefiLlama lists no incident for Permapod right now (read live).</> : <>DefiLlama’s incident list is <Unavailable reason={llama.phase === 'unavailable' ? llama.reason : p?.status === 'unavailable' ? p.reason : 'UPSTREAM_DOWN'} short/> right now.</>}</p>
      <p>{PERMAPOD_STATUS.text} <span className="fine">({PERMAPOD_STATUS.source}, read {day(PERMAPOD_STATUS.readOn)})</span> <VerifiedLink provider="permapod" kind="tracker-note" className="text-link" mark="compact">DefiLlama’s tracker note</VerifiedLink></p>
    </>}
    facts={[
      {label: 'Best for', value: 'Nobody today. It is here so you know why it is not listed as a way to earn.'},
      {label: 'Who runs it', value: 'Permapod, through lending contracts on ZIGChain.'},
      {label: 'Who holds the funds', value: 'Its lending contracts hold deposits and collateral; they are halted.'},
      {label: 'Who can use it', value: 'Nobody can usefully use it while its markets are halted.'},
    ]}
    figures={<>
      <LiveFigure id="permapod-llama-tvl" label="Value locked in Permapod on ZIGChain" third now={now} figure={llamaTvl(llama, 'permapod')}/>
      <LiveFigure id="permapod-incident" label="DefiLlama’s incident record" third now={now}
        figure={shown(llama, d => { const x = d.protocols.permapod; return x.status === 'ok' ? x.incidents.length ? x.incidents.map(i => `${day(i.date)}${i.classification ? ` · ${i.classification}` : ''}`).join('; ') : 'None listed' : {unavailable: x.reason}; })}/>
    </>}
    columns={[
      {title: 'Fees', body: <p>Not relevant while the app is halted.</p>},
      {title: 'Lockups', body: <p>Not relevant while the app is halted.</p>},
      {title: 'Minimums', body: <p>Not relevant while the app is halted.</p>},
      {title: 'Risks', body: <ul className="earn-risks">
        <li>The exploit: no post-mortem was found, so what went wrong and what was lost is not known to ZIGoals.</li>
        <li>Lending in general: if your collateral falls in value, it can be sold (liquidated) to repay your loan. <VerifiedLink provider="permapod" kind="safety" className="text-link" mark="compact">Permapod’s safety page</VerifiedLink></li>
      </ul>},
    ]}
    stepsTitle="What you can do"
    steps={[
      {text: 'If you had funds there: follow Permapod’s own site and channels for what it says about the exploit and any recovery.'},
      {text: 'Read DefiLlama’s page for the incident it lists.'},
    ]}
    stepsTime="a few minutes of reading. You sign nothing."
    actions={<>
      <VerifiedLink provider="permapod" kind="site" className="secondary">Permapod’s site</VerifiedLink>
      <VerifiedLink provider="permapod" kind="defillama" className="secondary" mark="compact">On DefiLlama</VerifiedLink>
    </>}
  />;
}

export function ZignalySection({now}: {now: number}) {
  return <OptionSection id="zignaly" eyebrow="Zignaly · closing" title="Zignaly is closing: how to withdraw"
    lede="Zignaly is a copy-trading platform: traders invest your money for you and share the profit. It is closing, so nothing can be joined; if you still have money there, this is how to take it out before 1 December 2026."
    logo={{src: '/ecosystem-logos/zignaly.png', alt: 'Zignaly site icon'}}
    tags={[{tone: 'paused', text: 'Closing'}, {tone: 'third', text: 'Zignaly holds the funds'}]}
    notice={<>
      <p><b>The closing dates, as Zignaly’s notice states them</b> <span className="fine">({ZIGNALY_CLOSURE.source}, read {day(ZIGNALY_CLOSURE.readOn)})</span>:</p>
      <ol className="earn-dates">{ZIGNALY_CLOSURE.dates.map(d => <li key={d.date} data-date={d.date}><time dateTime={d.date}>{day(d.date)}</time> — {d.text}</li>)}</ol>
      <p>{ZIGNALY_CLOSURE.withdraw}</p>
    </>}
    facts={[
      {label: 'Best for', value: 'People who still have money on Zignaly. Nobody new: sign-ups stopped on 15 October 2026.'},
      {label: 'Who runs it', value: 'Zignaly, a company, off the chain.'},
      {label: 'Who holds the funds', value: 'Zignaly does: it is custodial. Your money is in your Zignaly account, not in your own wallet.'},
      {label: 'Who can use it', value: 'Existing users only, to withdraw. Zignaly checks identity for large withdrawals.'},
    ]}
    figures={<LiveFigure id="zignaly-figures" label="Live figures" now={now} figure={{kind: 'unavailable', reason: 'NOT_PUBLISHED'}} hint="Zignaly publishes no public figures ZIGoals can read."/>}
    columns={[
      {title: 'Fees', body: <p>Zignaly’s own fees apply until it closes; see its notice.</p>},
      {title: 'Lockups', body: <p>Private Credit needs a withdrawal request by {day('2026-11-01')} and takes about a month to settle; the rest can be withdrawn until {day('2026-12-01')}.</p>},
      {title: 'Minimums', body: <p>As Zignaly’s withdrawal screen shows them.</p>},
      {title: 'Risks', body: <ul className="earn-risks">
        <li>Deadline: after {day('2026-12-01')} at 23:59 UTC the app closes.</li>
        <li>Network: withdrawals are USDT on BNB Smart Chain (BEP20) only. Send them to an address on that network that your own wallet controls; the wrong network can lose them.</li>
        <li>Custody: until you withdraw, Zignaly holds the money, not you.</li>
      </ul>},
    ]}
    stepsTitle="How to withdraw"
    steps={[
      {text: 'Read Zignaly’s closure notice (a new tab) and check the dates above.'},
      {text: 'In Zignaly, if you have Private Credit, request its withdrawal by 1 November 2026.'},
      {text: 'Have a wallet address on BNB Smart Chain that you control. Copy it exactly.'},
      {text: 'In Zignaly, withdraw your balance as USDT on BNB Smart Chain (BEP20) to that address, by 1 December 2026 at 23:59 UTC.', sign: 'nothing in a wallet: you confirm the withdrawal in Zignaly’s own account screen.'},
      {text: 'Check the USDT arrived in your wallet, and keep a record of the withdrawal.'},
    ]}
    stepsTime="10 minutes to request; Zignaly’s own processing time after that."
    actions={<>
      <VerifiedLink provider="zignaly" kind="closure-notice" className="primary">Zignaly’s closure notice</VerifiedLink>
      <VerifiedLink provider="zignaly" kind="closure-collection" className="secondary" mark="compact">All closure articles</VerifiedLink>
    </>}
  />;
}

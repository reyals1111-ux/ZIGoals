'use client';
import type {LiveState} from '../../lib/earn/client';
import {decimal, tokenAmount} from '../../lib/earn/format';
import type {ValdoraData, VaultId, VaultRow, VaultsData} from '../../lib/earn/live/types';
import {NOBLE_USDC, VALDORA_VAULT_PAGE} from '../../lib/earn/options';
import {formatDate} from '../../lib/visual-format';
import {VerifiedLink} from '../links/verified-link';
import {GuideLink, type Guide} from './guide-panel';
import {IllustrationSlot} from './illustrations/slot';
import {LiveFigure, Unavailable, shown} from './live-figure';
import {OptionSection} from './option-section';
import {Risk} from './risk';
import {continueSentence} from './words';
import {WhatsThis} from './whats-this';

/**
 * Session AF chunk 2 (amendment 3, H84, H88): Valdora's three USDC vaults, each read live from its contract at one block
 * (assets, share price, paused, pending redemptions and the deposit asset), with the fact that matters most first: every
 * USDC vault on ZIGChain holds USDC on Noble (USDC.n), which Circle stopped minting on 13 October 2026 and pauses on
 * 12 January 2027 — said neutrally with Circle's notice and the date it was read. The yield the vault pages show has no
 * public source ZIGoals can check, so it is "unavailable", never copied. Information and a link: nothing is signed here.
 */
const day = (iso: string) => formatDate(`${iso}T12:00:00Z`, {timeZone: 'UTC'});
const steps = ['Read the vault page first: “Strategy Details”, “Withdrawal Mechanics” and “Risk Information”.', 'Press Connect Wallet and choose your wallet.', 'Open the Supply tab and type the USDC to supply. The vault takes USDC on Noble (USDC.n) only.', 'Press Supply and approve one deposit in your wallet: USDC goes to the vault, vault shares come back to you.', 'To leave: the Withdraw tab files a request; the vault pays it out later (the page says up to 60 days).'];
export const VAULT_GUIDES = {
  'stablecoin-yield': {id: 'vault-stablecoin-yield', app: 'Valdora', title: 'Supply USDC: Stablecoin Yield', provider: 'valdora', kind: 'vault-stablecoin-yield', open: 'Open Stablecoin Yield', option: 'valdora-vaults', steps},
  'private-credit': {id: 'vault-private-credit', app: 'Valdora', title: 'Supply USDC: Private Credit', provider: 'valdora', kind: 'vault-private-credit', open: 'Open Private Credit', option: 'valdora-vaults', steps},
  'core-income': {id: 'vault-core-income', app: 'Valdora', title: 'Supply USDC: Core Income', provider: 'valdora', kind: 'vault-core-income', open: 'Open Core Income', option: 'valdora-vaults', steps},
} as const satisfies Record<Exclude<VaultId, 'nawa-usdc'>, Guide<'valdora'>>;
const VALDORA_VAULTS = ['stablecoin-yield', 'private-credit', 'core-income'] as const;
const ASSET_WORDS = {'USDC.n': 'USDC on Noble (USDC.n)', 'USDC.inj': 'USDC from Injective (USDC.inj)', other: 'another asset'} as const;
type Ok = Extract<VaultRow, {status: 'ok'}>;
export function vaultHint(v: Ok) {
  return <>Share price {decimal(v.pricePerShare, 6)} · {v.paused ? 'paused right now' : 'not paused'} · {tokenAmount(v.pendingRedemptionUnits, v.decimals, v.asset === 'other' ? 'units' : v.asset, {compact: true})} waiting to be paid out · it holds {ASSET_WORDS[v.asset]}</>;
}
export function VaultsSection({vaults, valdora, now}: {vaults: LiveState<VaultsData>; valdora: LiveState<ValdoraData>; now: number}) {
  const data = vaults.phase === 'ok' ? vaults.answer.data : null;
  const rows = data ? VALDORA_VAULTS.map(id => data.vaults[id]) : [];
  const ok = rows.filter((v): v is Ok => v.status === 'ok');
  const allNoble = ok.length > 0 && ok.every(v => v.asset === 'USDC.n');
  const paused = ok.some(v => v.paused);
  const staker = valdora.phase === 'ok' ? valdora.answer.data.admin : null;
  const sameAdmin = staker && ok.length > 0 && ok.every(v => v.admin === staker.address);
  const unavailable = vaults.phase === 'unavailable' ? vaults.reason : 'UPSTREAM_DOWN';
  return <OptionSection id="valdora-vaults" eyebrow="Valdora · USDC vaults" title="Lend USDC through a vault"
    lede="Supply USDC to one of Valdora’s vaults; a curator lends it to businesses, and the vault’s shares go up or down with how they repay."
    logo={{src: '/ecosystem-logos/valdora.png', alt: 'Valdora site icon'}}
    tags={[paused ? {tone: 'paused', text: 'A vault is paused'} : {tone: 'live', text: 'Live on mainnet'}, {tone: 'third', text: 'A curator holds the money'}, {tone: 'beta', text: 'Holds USDC on Noble'}]}
    notice={<>
      <p><b>Every USDC vault on ZIGChain holds USDC on Noble (USDC.n).</b> {data ? allNoble ? <>Read live from each vault’s own record at block {vaults.phase === 'ok' ? vaults.answer.height : ''}.</> : <>Read live: not every vault holds it now — see each vault below.</> : <>The vaults’ deposit asset is <Unavailable reason={unavailable} short/> right now; on {day(NOBLE_USDC.readOn)} all of them held it.</>}</p>
      <p>{NOBLE_USDC.text} <span className="fine">({NOBLE_USDC.source}, read {day(NOBLE_USDC.readOn)})</span> <VerifiedLink provider="zig-finance" kind="circle-noble" className="text-link" mark="compact">Circle’s notice</VerifiedLink></p>
      <p className="fine">ZIGoals found no statement from Valdora about what this changes for deposits and withdrawals after 12 January 2027 (searched {day(NOBLE_USDC.readOn)}).</p>
    </>}
    facts={[
      {label: 'Best for', value: 'People who hold USDC, accept that a borrower may not repay, and can wait weeks to get their money back.'},
      {label: 'Who runs it', value: <>Valdora, through vault contracts on ZIGChain; {continueSentence(VALDORA_VAULT_PAGE.curated)}</>},
      {label: 'Who holds the funds', value: <>The vault contract issues your shares; the USDC itself is lent out by the curator, away from the chain. You hold the shares in your own wallet. <WhatsThis term="custody"/></>},
      {label: 'Who can use it', value: 'Valdora’s terms ask that you are allowed to use it where you live. The vault pages state no other rule; ZIGoals has not checked that for you.'},
    ]}
    figures={<>
      {VALDORA_VAULTS.map(id => <LiveFigure key={id} id={`vault-${id}`} label={<>{data?.vaults[id].status === 'ok' ? (data.vaults[id] as Ok).label : VAULT_GUIDES[id].title.replace('Supply USDC: ', '')}: USDC in the vault</>} now={now}
        figure={shown(vaults, d => { const v = d.vaults[id]; return v.status === 'ok' ? tokenAmount(v.aumUnits, v.decimals, v.asset === 'other' ? 'units' : v.asset, {compact: true}) : {unavailable: v.reason}; })}
        hint={data?.vaults[id].status === 'ok' ? vaultHint(data.vaults[id] as Ok) : undefined}/>)}
      <LiveFigure id="vaults-yield" label="Yearly yield" now={now} figure={{kind: 'unavailable', reason: 'NOT_PUBLISHED'}}
        hint="The vault pages show a yield of their own; no public source ZIGoals can check publishes it, so none is shown here."/>
    </>}
    figuresNote={<p className="fine">“USDC in the vault” is what each vault reports it manages (its own figure, read from the chain); most of it is lent out away from the chain, so it is not USDC sitting on ZIGChain.</p>}
    columns={[
      {title: 'Fees', body: <p>{VALDORA_VAULT_PAGE.fees} <span className="fine">({VALDORA_VAULT_PAGE.source}, read {day(VALDORA_VAULT_PAGE.readOn)})</span> Plus a small network fee in ZIG for each step you sign. <WhatsThis term="gas"/></p>},
      {title: 'Lockups', body: <p>{VALDORA_VAULT_PAGE.redemption} <span className="fine">(read {day(VALDORA_VAULT_PAGE.readOn)})</span> You cannot take USDC out at once.</p>},
      {title: 'Minimums', body: <p>None stated on the vault pages. The network fee is paid in ZIG, so you need a little ZIG too.</p>},
      // Session AF (L1c, N5): each risk with its source (plan section 5, row 4; RECHECK A): the vault page, or the vaults' own records on the chain.
      {title: 'Risks', body: <ul className="earn-risks">
        <Risk link={<VerifiedLink provider="valdora" kind="vault-private-credit" className="text-link" mark="compact">The vault page</VerifiedLink>}>Credit risk: a business that borrowed may pay late or not at all, and the shares lose value. {VALDORA_VAULT_PAGE.atRisk}</Risk>
        <Risk link={<VerifiedLink provider="valdora" kind="vault-private-credit" className="text-link" mark="compact">The vault page</VerifiedLink>}>Waiting: a withdrawal is a request paid out later, up to 60 days by the page’s own words, so the money is not there when you need it at once.</Risk>
        <Risk chain={`each vault’s own record on ZIGChain, which marks its money as managed away from the chain (read ${day(VALDORA_VAULT_PAGE.readOn)})`}>Custody: the money is lent out by the curator away from the chain; ZIGoals and the chain cannot see where it is.</Risk>
        <Risk chain="each vault’s own figures on ZIGChain, read live">What a vault reports managing, and its share price, are the vault’s own figures: the chain records them, but cannot check them.</Risk>
        <Risk link={<VerifiedLink provider="zig-finance" kind="circle-noble" className="text-link" mark="compact">Circle’s notice</VerifiedLink>}>The asset: USDC on Noble is being wound down by Circle (dates above), and Valdora has said nothing ZIGoals found about what that changes.</Risk>
        <Risk chain={vaults.phase === 'ok' ? <>each vault’s admin account on ZIGChain, read live at block {vaults.answer.height}</> : 'each vault’s admin account on ZIGChain'} link={<VerifiedLink provider="valdora" kind="security" className="text-link" mark="compact">Valdora’s security page</VerifiedLink>}>{data && staker ? sameAdmin ? <>Who can change the vaults: their admin is the same account as Valdora’s staking contract{staker.key === 'single-key' ? ', a single key' : ''} (read live at block {vaults.phase === 'ok' ? vaults.answer.height : ''}).</> : <>Who can change the vaults: each vault has an admin account, read live.</> : <>Who can change the vaults is <Unavailable reason={unavailable} short/> right now.</>}</Risk>
      </ul>},
    ]}
    steps={[
      {text: 'Open the vault’s page on Valdora (a new tab) and read its strategy, withdrawal and risk sections.'},
      {text: 'Connect your wallet with Valdora’s own Connect Wallet button.'},
      {text: 'Supply tab: type the USDC (on Noble) to supply.', sign: 'one deposit to the vault’s contract that sends your USDC and returns vault shares. Nothing else.'},
      {text: 'Your shares show the vault’s results through its share price.'},
      {text: 'To leave: Withdraw files a request; the USDC comes back when the vault pays it out.', sign: 'one withdrawal request.'},
    ]}
    stepsTime="about 5 minutes to supply; up to 60 days to get USDC back."
    illustration={<IllustrationSlot set="valdora-vault"/>}
    actions={<>
      <GuideLink guide={VAULT_GUIDES['stablecoin-yield']}/>
      <GuideLink guide={VAULT_GUIDES['private-credit']} className="secondary"/>
      <GuideLink guide={VAULT_GUIDES['core-income']} className="secondary"/>
      <VerifiedLink provider="valdora" kind="vaults" className="secondary" mark="full">All of Valdora’s vaults</VerifiedLink>
    </>}
  />;
}

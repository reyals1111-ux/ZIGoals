'use client';
import Link from 'next/link';
import {useEffect, useMemo, useRef, useSyncExternalStore, type ReactNode} from 'react';
import type {LiveState} from '../../lib/earn/client';
import {bps, duration} from '../../lib/earn/format';
import type {ChainData, OroswapData} from '../../lib/earn/live/types';
import {ZIG_ROUTES} from '../../lib/earn/options';
import {START_STEPS, STEP_WORDS, startHereModel, type StartStepId, type StartStepState} from '../../lib/earn/start-here';
import type {PathModel} from '../../lib/path/model';
import {formatDate} from '../../lib/visual-format';
import {VerifiedLink} from '../links/verified-link';
import {Path} from '../path/path';
import {entranceAllowed} from '../use-entrance';
import {HowRead} from './how-read';
import {Unavailable} from './live-figure';
import {WhatsThis} from './whats-this';
// Session AJ (owner decision D3): the Checklist's orbit look, from its own sheets (the path's orbit rules and the Habits
// page's section banners its orbits wear). Every rule there is keyed on the orbit look's own classes, so nothing else on
// Earn changes; the Academy keeps the default look.
import '../path/path-orbit.css';
import '../habits/habits-aa.css';

/**
 * Session AF chunk 2 (P1.7–P1.11): the Start-here path itself, its own chunk (loaded after the page's first paint): six dots
 * on the shared path engine, each opening its guide under it — what the step is, how to do it on the app's own page,
 * what you sign and how long it takes, whether ZIGoals has seen it done, and "mark as done" where it cannot see it.
 *
 * Session AJ (owner decision D3): the path wears the Checklist's orbit look (`variant="orbit"`): three orbits, each with
 * its planet and banner, glass nodes on one flowing neon line, a name tab on each node, START / NEXT on the next one, ZIGi
 * beside it, and the end of the path as its finale node. The same steps, states, names and guides. Its motion is the
 * Checklist's, one time per change: a step just done lights its node, a light travels along the line to the next node and
 * blooms there, an orbit just completed wakes its planet and sweeps its banner, and ZIGi cheers once. Reduced motion and
 * Motion Off show every final state at once. Inside the page the path never scrolls by itself (`follow={false}`). The
 * orbits keep their own names ("Get ready", not "Get ready Orbit"). As on the Checklist, only the end of the path stands
 * on it (the orbit look sets no chest between planets). On a phone, where the orbit look lays every node out at a fixed
 * place, the open guide stands just after the path and is brought into view, rather than over the nodes below it.
 */
export type StartLive = {chain: LiveState<ChainData>; oroswap: LiveState<OroswapData>};
type Props = {states: StartStepState[]; open: string | null; onOpen: (id: string | null) => void; onMark: (id: StartStepId, done: boolean) => void; live: StartLive; markError?: string};
const day = (iso: string) => formatDate(`${iso}T12:00:00Z`, {timeZone: 'UTC'});

function Seen({state, onMark, error}: {state: StartStepState; onMark: (done: boolean) => void; error?: string}) {
  return <div className="earn-start-seen" data-how={state.how ?? 'none'}>
    <p><b>{state.done ? state.how === 'seen' ? 'Done.' : 'Marked done.' : 'Not done yet.'}</b> {state.why}</p>
    {state.how === 'seen' ? null : state.how === 'marked'
      ? <button type="button" className="secondary" onClick={() => onMark(false)}>Not done yet</button>
      : <button type="button" className="secondary" onClick={() => onMark(true)}>Mark as done</button>}
    {error && <p role="alert" className="fine">{error}</p>}
  </div>;
}
function Steps({items}: {items: {text: ReactNode; sign?: ReactNode; how?: ReactNode}[]}) {
  return <ol className="earn-start-steps">{items.map((s, i) => <li key={i}><span className="earn-step-n" aria-hidden="true">{i + 1}</span><div><p>{s.text}</p>{s.sign && <p className="earn-step-sign"><b>What you sign:</b> {s.sign}</p>}{s.how && <HowRead>{s.how}</HowRead>}</div></li>)}</ol>;
}
function poolFee(oroswap: LiveState<OroswapData>, id: string | null): ReactNode {
  if (!id) return null;
  if (oroswap.phase !== 'ok') return <> OroSwap’s fee on that pool is <Unavailable reason={oroswap.phase === 'unavailable' ? oroswap.reason : 'UPSTREAM_DOWN'} short/> right now.</>;
  const pool = oroswap.answer.data.pools.find(p => p.id === id);
  return pool ? <> OroSwap’s fee on that pool, read live: {bps(pool.feeBps)} a swap (block {oroswap.answer.height}).</> : null;
}

export function StepGuide({id, live}: {id: StartStepId; live: StartLive}) {
  const unbonding = live.chain.phase === 'ok' ? duration(live.chain.answer.data.staking.unbondingSeconds) : null;
  switch (id) {
    case 'get-wallet': return <>
      <p>A wallet is an app that holds your keys: the secret that lets you, and only you, move your ZIG. ZIGoals never holds it. Keplr is a wallet that knows ZIGChain, for a browser and for phones.</p>
      <Steps items={[
        {text: <>Install Keplr from its own download page (a new tab): <VerifiedLink provider="zig-finance" kind="keplr-get" className="text-link" mark="compact">Get Keplr</VerifiedLink>. Check the address before you install anything.</>},
        {text: 'Create a new wallet and choose a password for this device.'},
        {text: <>Write your recovery phrase (12 or 24 words) <b>on paper</b>, in order, and keep it somewhere safe and offline. No photo, no screenshot, no cloud note, no chat.</>},
        {text: 'Keplr asks you to type a few words back: that proves the paper copy is right.'},
        {text: 'Then come back: on Staking, “Connect Keplr” adds ZIGChain to Keplr and connects. Or link the address read-only in your wallet menu.'},
      ]}/>
      <p className="earn-start-warn"><b>Your recovery phrase is your money.</b> Anyone who has the words can take everything, from anywhere. Keplr, ZIGoals and real support never ask for it. If you lose your device, the words bring your wallet back; if you lose the words and the device, nobody can. <WhatsThis term="seed-phrase"/></p>
      <p className="fine">About 10 minutes. You sign nothing in this step.</p>
    </>;
    case 'practice': return <>
      <p>ZIGChain has a practice network where test ZIG has no value. Staking there works exactly like the real thing, so a first mistake costs nothing. <WhatsThis term="practice-network"/></p>
      <Steps items={[
        {text: <>Get free test ZIG for your address from ZIGChain’s faucet (a new tab): <VerifiedLink provider="zig-finance" kind="faucet" className="text-link" mark="compact">ZIGChain faucet</VerifiedLink>.</>},
        {text: <>Open <Link className="text-link" href="/app/staking">Staking</Link>: it starts on the practice network. Press “Connect Keplr”.</>},
        {text: 'Choose a validator, enter an amount and keep a little test ZIG for the fee.'},
        {text: 'Press Review, read the review screen, then sign in Keplr.', sign: 'one delegation on the practice network (zig-test-2). Nothing of value moves.'},
        {text: 'The review screen shows when it is confirmed. Come back here: this dot lights by itself.'},
      ]}/>
      <p className="fine">About 10 minutes; the faucet can take a minute or two.</p>
      <p><Link className="primary" href="/app/staking">Practise on Staking</Link></p>
    </>;
    case 'add-money': return <>
      <p>To earn for real you need crypto in your own wallet. A regulated provider sells it to you for a card payment or a bank transfer and sends it straight to your address: ZIGoals never holds it.</p>
      <Steps items={[
        {text: <>Open <Link className="text-link" href="/app/wealth/add-money">Add money</Link> and choose what to buy and on which network.</>},
        {text: 'The provider checks who you are (the rules say so) and shows its own fees before you pay.'},
        {text: 'It sends the crypto to your own address. The next step brings it onto ZIGChain.'},
      ]}/>
      <p className="fine">From a few minutes to longer: identity checks and bank transfers take the provider’s own time. You sign nothing in ZIGoals.</p>
      <p><Link className="primary" href="/app/wealth/add-money">Add money</Link></p>
    </>;
    case 'get-zig': return <>
      <p>ZIG is what you stake, and every ZIGChain fee is paid in it. These are the ways onto ZIGChain that worked when ZIGoals checked ({day(ZIG_ROUTES.readOn)}, {ZIG_ROUTES.source}): <WhatsThis term="bridge"/></p>
      <ul className="earn-start-routes">{ZIG_ROUTES.routes.map(r => <li key={r.id} data-route={r.id}>
        <p><b>From {r.from}</b>: {r.how}</p>
        <p className="fine">{r.signatures === 1 ? 'One approval' : `${r.signatures} approvals`} · {r.time} (Skip Go’s estimate on {day(ZIG_ROUTES.readOn)}). {r.note}{poolFee(live.oroswap, r.pool)}</p>
      </li>)}</ul>
      <p className="earn-start-warn">{ZIG_ROUTES.fees} <WhatsThis term="gas"/></p>
      <p className="fine">{ZIG_ROUTES.thin} {ZIG_ROUTES.noble}</p>
      <p className="earn-option-actions"><VerifiedLink provider="zig-finance" kind="skip-go" className="secondary">Open Skip Go</VerifiedLink> <VerifiedLink provider="zig-finance" kind="hub-bridge" className="secondary">ZIGChain Hub bridge</VerifiedLink> <VerifiedLink provider="oroswap" kind="swap" className="secondary">Swap on OroSwap</VerifiedLink></p>
    </>;
    case 'first-stake': return <>
      <p>Your first stake on the real network: the same steps as your practice round, with real ZIG.</p>
      <Steps items={[
        {text: <>Open <Link className="text-link" href="/app/staking">Staking</Link> and switch the network to Real. ZIGoals asks you to confirm that once.</>},
        {text: <>Connect Keplr, choose a validator (<a className="text-link" href="#validators">the list on this page</a> shows commission, uptime and how much stake each holds) and enter an amount. Keep some ZIG for fees.</>},
        {text: 'Press Review, read the review screen, then sign in Keplr.', sign: 'one delegation on ZIGChain (zigchain-1) that moves ZIG from your balance into your stake.', how: <p>Keplr names this message <code>MsgDelegate</code> (ZIGChain’s staking module): one message, from your address to the validator you chose.</p>},
        {text: <>Rewards start right away. To leave later, your ZIG is locked for {unbonding ?? <Unavailable reason={live.chain.phase === 'unavailable' ? live.chain.reason : 'UPSTREAM_DOWN'} short/>} with no rewards meanwhile. <WhatsThis term="unbonding"/></>},
      ]}/>
      <p className="fine">About 5 minutes. Only you can sign; ZIGoals never sees your keys.</p>
      <p><Link className="primary" href="/app/staking">Stake on Staking</Link></p>
    </>;
    case 'explore': return <>
      <p>Once you know staking, the other ways to earn on ZIGChain build on it. Each is explained below with its risks, in plain words.</p>
      <ul className="earn-start-explore">
        <li><a className="text-link" href="#valdora">Liquid staking (stZIG)</a>: stake through Valdora and keep a token you can move. <WhatsThis term="liquid-staking"/></li>
        <li><a className="text-link" href="#oroswap">Liquidity pools</a>: put two tokens in a pool on OroSwap and share its swap fees, with impermanent loss as the risk. <WhatsThis term="pool"/></li>
        <li><a className="text-link" href="#governance">Governance</a>: your stake gives you a vote on ZIGChain’s proposals. <Link className="text-link" href="/app/governance">Open Governance</Link> <WhatsThis term="proposal"/></li>
      </ul>
      <p className="fine">The Academy below explains each in five minutes, with a short quiz.</p>
    </>;
  }
}
/** The orbit look's phone layout (components/path/path.tsx: below 641 px, the nodes stand at fixed places). */
const PHONE_QUERY = '(max-width: 640px)';
const subscribePhone = (change: () => void) => { const m = window.matchMedia?.(PHONE_QUERY); m?.addEventListener('change', change); return () => m?.removeEventListener('change', change); };
const usePhone = () => useSyncExternalStore(subscribePhone, () => !!window.matchMedia?.(PHONE_QUERY).matches, () => false);
/** Only the path's end stands on it: the orbit look sets no chest between planets (as the Checklist's path). */
const endOnly = (model: PathModel): PathModel => ({...model, milestones: model.milestones.filter(m => m.at === 'end')});

export default function StartHerePath({states, open, onOpen, onMark, live, markError}: Props) {
  const model = useMemo(() => endOnly(startHereModel(states)), [states]);
  const phone = usePhone(), guide = useRef<HTMLDivElement>(null);
  const panel = (stepId: string) => {
    const id = stepId as StartStepId, state = states.find(s => s.id === id);
    if (!state || !(START_STEPS as readonly string[]).includes(id)) return null;
    return <div className="earn-start-panel" data-start-panel={id} role="region" aria-label={`${STEP_WORDS[id].label}: how`}>
      <StepGuide id={id} live={live}/>
      <Seen state={state} onMark={done => onMark(id, done)} error={markError}/>
    </div>;
  };
  // (A phone: the guide just opened comes into view, under the page's own bars — its scroll padding.)
  useEffect(() => {
    if (phone && open) guide.current?.scrollIntoView({block: 'start', behavior: entranceAllowed() ? 'smooth' : 'auto'});
  }, [phone, open]);
  return <>
    <Path model={model} ariaLabel="Start here: how staking works, step by step" layout="snake" className="earn-start-path" variant="orbit" follow={false}
      bannerTitle={section => section.label} panelFor={open} onStep={step => onOpen(open === step.id ? null : step.id)} jumpLabel="Jump to your next step"
      renderPanel={phone ? undefined : step => panel(step.id)}/>
    {phone && open && <div ref={guide} className="earn-start-guide">{panel(open)}</div>}
  </>;
}

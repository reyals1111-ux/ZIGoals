'use client';
import Link from 'next/link';
import {useEffect, useId, useState, useSyncExternalStore, type FormEvent} from 'react';
import {forgetKey, holdKey, rememberKey, SHOWCASE_SCOPE} from '../../../lib/ai/keys';
import {currentAiScope} from '../../../lib/ai/scope';
import {localDate} from '../../../lib/local-date';
import {parseLoopback} from '../../../lib/nova/agent-bridge/loopback';
import {agentBase, agentCheckLine, brainAllowed, checkOwnAgent, OWN_AGENT_WORDS, type AgentCheck} from '../../../lib/nova/agent-bridge/own-agent';
import {byHand, type ToolCard} from '../../../lib/nova/agent-bridge/propose';
import {clearOwnAgent, confirmOwnAgentLocal, MAX_SERVERS, ownAgentOf, setOwnAgent, toolAsks, type AgentServer} from '../../../lib/nova/agent-bridge/record';
import {fromText, schemaLines, type ListedTool} from '../../../lib/nova/agent-bridge/schema';
import {NOVA_OUTBOX, outboxOf} from '../../../lib/nova/outbox/record';
import {NOVA_PHONE_QUERY} from '../../../lib/nova/phone-path';
import {privacyMode} from '../../../lib/nova/privacy-mode';
import {formatDateTime} from '../../../lib/visual-format';
import {useAiSettings} from '../../ai/use-ai-settings';
import {useDeviceRecord} from '../../ai/use-device-record';
import {ToolCardDialog} from './tool-card';
import {useAgentBridge, type AgentBridge, type LiveEntry} from './use-agent-bridge';
import './agent.css';

/**
 * Session AM-2 (owner's step 4c): "Your own agent and tools" — the panel under "Behind the intelligence" and in the setup
 * hub. Two things the person may connect, both on their own computer only (a loopback address):
 * - their own agent (Hermes Agent has its own guide; here: any OpenAI-compatible agent), checked live through /v1/models;
 * - tool servers (Model Context Protocol). NOVA lists the tools a server reports — each name, the server's own
 *   description as untrusted plain text, its input in plain words — with one switch per tool: Off (every tool, until the
 *   person switches it) or Ask every time. There is no "always allow".
 * A tool on "Ask every time" can be run by hand from here through the confirm card; a connected model may propose one
 * through the same card (components/nova/agent/tool-proposals.tsx). Nothing in this panel sends anything by itself.
 */
const subscribeNothing = () => () => undefined;
type Line = {ok: boolean; text: string} | null;
const Status = ({line}: {line: Line}) => <p className="na-status" role="status" aria-live="polite" data-ok={line ? String(line.ok) : undefined}>{line ? <span><b>{line.ok ? 'Done.' : 'Not yet.'}</b> {line.text}</span> : <span className="na-sr">Nothing checked yet.</span>}</p>;

export default function AgentPanel({guide = false}: {/** On the setup page: the guide's steps carry the explanations, so the panel is brief. */ guide?: boolean}) {
  const bridge = useAgentBridge(), id = useId(), [card, setCard] = useState<ToolCard | null>(null);
  const phone = useSyncExternalStore(subscribeNothing, () => !!window.matchMedia?.(NOVA_PHONE_QUERY).matches, () => false);
  const showcase = useSyncExternalStore(subscribeNothing, () => currentAiScope() === SHOWCASE_SCOPE, () => false);
  const asking = bridge.servers.reduce((n, s) => n + (s.ask?.length ?? 0), 0);
  return <section className="na-panel" aria-labelledby={`${id}-t`} data-agent-panel="" data-servers={bridge.servers.length} data-asking={asking}>
    <header className="na-section">
      <p className="na-eyebrow">On your own computer</p>
      <h3 id={`${id}-t`} className="na-title">Your own agent and tools</h3>
      {!guide && <p className="na-text">Connect an agent and tools that run on this computer, so NOVA can ask them to act outside ZIGoals — send a mail, search the web, manage a calendar — with their own accounts.</p>}
      <ul className="na-rule">
        <li>Only this computer: http://127.0.0.1, http://localhost or http://[::1]. No other address is accepted.</li>
        <li>Every tool starts Off. A tool you switch on asks every time: a card you approve. Nothing is sent by itself.</li>
        <li>NOVA and ZIGoals never see or store your mail passwords or tokens, and nothing goes through a ZIGoals server.</li>
      </ul>
      {phone && <p className="na-status" data-ok="false"><span>A phone cannot reach a computer’s own apps: its “localhost” is the phone itself. Open this on the computer that runs your agent and tools.</span></p>}
      {bridge.record.unreadable && <p className="na-status" data-ok="false"><span>The saved connections on this device could not be read. Nothing was changed; adding one starts a new list.</span></p>}
    </header>
    <OwnAgentBlock bridge={bridge} showcase={showcase}/>
    <section className="na-section" aria-labelledby={`${id}-s`}>
      <h4 id={`${id}-s`} className="na-h">Tool servers on this computer</h4>
      <p className="na-fine">A tool server speaks the Model Context Protocol (MCP) over Streamable HTTP. It signs in to your mail or calendar itself; NOVA only asks it, through a card.</p>
      {bridge.servers.length > 0 && <ul className="na-servers">{bridge.servers.map(server => <li key={server.id}><ServerCard server={server} entry={bridge.entries.get(server.id) ?? null} bridge={bridge} showcase={showcase} onCard={setCard}/></li>)}</ul>}
      {bridge.servers.length > 1 && asking > 0 && <div className="na-keys"><button type="button" className="na-key" data-quiet="" onClick={() => { try { bridge.everythingOff(); } catch { /* the switches stay */ } }}>All tools Off</button></div>}
      {bridge.servers.length < MAX_SERVERS ? <AddServerForm bridge={bridge} showcase={showcase}/> : <p className="na-fine">At most {MAX_SERVERS} tool servers can be connected. Remove one to add another.</p>}
    </section>
    <ToolHistory/>
    {card && <ToolCardDialog card={card} ctx={{mode: privacyMode(), healthOpen: false}} run={bridge.run} onClose={() => setCard(null)}/>}
  </section>;
}

/** The person's own OpenAI-compatible agent: its address, a live check through /v1/models, and (if they want) NOVA's brain. */
function OwnAgentBlock({bridge, showcase}: {bridge: AgentBridge; showcase: boolean}) {
  const settings = useAiSettings(), id = useId(), saved = ownAgentOf(bridge.record.data);
  const [address, setAddress] = useState(''), [key, setKey] = useState(''), [remember, setRemember] = useState(false), [busy, setBusy] = useState(false);
  const [check, setCheck] = useState<AgentCheck | null>(null), [line, setLine] = useState<Line>(null);
  useEffect(() => { if (saved?.address) setAddress(a => a || saved.address); }, [saved?.address]);
  const base = agentBase(address || saved?.address || ''), isBrain = base.ok && settings.data.enabled && settings.data.provider === 'local' && settings.data.baseUrl === base.base;
  const runCheck = async (event?: FormEvent) => {
    event?.preventDefault(); setBusy(true); setLine(null);
    try {
      const out = await checkOwnAgent(address, key.trim() || null);
      setCheck(out); setLine({ok: out.ok, text: agentCheckLine(out)});
      if (out.ok) { try { bridge.record.update(r => setOwnAgent(r, {address: out.base, model: out.model, at: new Date()})); } catch { /* the check stands; it is asked again next time */ } }
    } finally { setBusy(false); }
  };
  const makeBrain = async () => {
    if (!check?.ok) { setLine({ok: false, text: 'Check your agent first.'}); return; }
    const allowed = brainAllowed(privacyMode(), ownAgentOf(bridge.record.data)?.localConfirmed === true);
    if (!allowed.ok) { setLine({ok: false, text: allowed.message}); return; }
    try {
      // The brain's own key slot (`local`), kept the way the person asked: sealed only when ticked (never in the Showcase).
      const scope = currentAiScope(), secret = key.trim(), sealed = !!secret && remember && !showcase;
      await forgetKey(scope, 'local');
      if (secret) { if (sealed) await rememberKey(scope, 'local', secret); else holdKey(scope, 'local', secret); }
      settings.update(s => ({...s, enabled: true, mode: 'local', provider: 'local', model: check.model, localServer: 'openai-compatible', baseUrl: check.base, subscriptionApp: null, rememberKey: sealed, connectedOn: localDate()}));
      setKey(''); setLine({ok: true, text: `NOVA and ZIGi now answer with your agent (${check.model}). ${OWN_AGENT_WORDS.brain}`});
    } catch (cause) { setLine({ok: false, text: cause instanceof Error ? cause.message : 'The connection could not be saved on this device.'}); }
  };
  return <section className="na-section" aria-labelledby={`${id}-h`} data-own-agent="">
    <h4 id={`${id}-h`} className="na-h">Your own agent</h4>
    <p className="na-fine">{OWN_AGENT_WORDS.what} <Link href="/app/nova/hermes" prefetch={false} className="na-link">Using Hermes Agent? It has its own guide.</Link></p>
    <form className="na-form" onSubmit={e => void runCheck(e)}>
      <label className="na-field">Agent address on this computer<input type="text" inputMode="url" value={address} onChange={e => { setAddress(e.target.value); setCheck(null); }} autoComplete="off" autoCapitalize="off" spellCheck={false} placeholder="http://127.0.0.1:8000"/></label>
      <label className="na-field">Key, if your agent asks for one<input type="password" value={key} onChange={e => setKey(e.target.value)} autoComplete="off" autoCapitalize="off" spellCheck={false} placeholder="Leave empty if it needs none"/></label>
      <label className="na-check"><input type="checkbox" checked={remember && !showcase} disabled={showcase} onChange={e => setRemember(e.target.checked)}/><span>Remember the key on this device <span className="na-fine">{showcase ? '(the Showcase keeps keys for this tab only)' : '(sealed in this browser when you make the agent NOVA’s brain; otherwise forgotten on reload)'}</span></span></label>
      <div className="na-keys"><button type="submit" className="na-key" data-primary="" disabled={busy || !address.trim()}>{busy ? 'Checking…' : 'Check my agent'}</button></div>
    </form>
    <Status line={line}/>
    {saved && <>
      <label className="na-check"><input type="checkbox" checked={saved.localConfirmed === true} onChange={e => { try { bridge.record.update(r => confirmOwnAgentLocal(r, e.target.checked)); } catch { setLine({ok: false, text: 'This choice could not be saved on this device.'}); } }}/><span>{OWN_AGENT_WORDS.confirm}</span></label>
      <div className="na-keys">
        <button type="button" className="na-key" disabled={!!isBrain || !check?.ok} onClick={() => void makeBrain()}>{isBrain ? 'Your agent is NOVA’s brain' : 'Use my agent as NOVA’s brain'}</button>
        <button type="button" className="na-key" data-quiet="" onClick={() => { try { bridge.record.update(clearOwnAgent); setCheck(null); setAddress(''); setLine({ok: true, text: 'The agent’s address is forgotten here. NOVA’s brain setting is unchanged (NOVA → Brain setup).'}); } catch { setLine({ok: false, text: 'It could not be forgotten on this device.'}); } }}>Forget this agent</button>
      </div>
      {!check?.ok && !isBrain && <p className="na-fine">Check your agent in this visit to use it as NOVA’s brain.</p>}
    </>}
    <p className="na-fine">{OWN_AGENT_WORDS.acts}</p>
  </section>;
}

function AddServerForm({bridge, showcase}: {bridge: AgentBridge; showcase: boolean}) {
  const [address, setAddress] = useState(''), [label, setLabel] = useState(''), [token, setToken] = useState(''), [remember, setRemember] = useState(false), [busy, setBusy] = useState(false), [line, setLine] = useState<Line>(null);
  const read = address.trim() ? parseLoopback(address) : null;
  const submit = async (event: FormEvent) => {
    event.preventDefault(); setLine(null);
    const at = parseLoopback(address);
    if (!at.ok) { setLine({ok: false, text: at.message}); return; }
    setBusy(true);
    try {
      const out = await bridge.add({address, label, token, remember: remember && !showcase});
      setLine({ok: out.ok, text: out.ok ? `${out.line} Every tool is Off until you switch it on.` : `The server is saved, but not connected: ${out.line}`});
      setAddress(''); setLabel(''); setToken(''); setRemember(false);
    } catch (cause) { setLine({ok: false, text: cause instanceof Error ? cause.message : 'The server could not be added.'}); }
    finally { setBusy(false); }
  };
  return <form className="na-form" onSubmit={e => void submit(e)} data-add-server="">
    <label className="na-field">Server address on this computer<input type="text" inputMode="url" value={address} onChange={e => setAddress(e.target.value)} autoComplete="off" autoCapitalize="off" spellCheck={false} placeholder="http://127.0.0.1:8000/mcp" aria-invalid={read ? !read.ok : undefined}/></label>
    {read && !read.ok && <p className="na-status" data-ok="false"><span>{read.message}</span></p>}
    {read?.ok && read.note && <p className="na-fine">{read.note}</p>}
    <label className="na-field">A name for it (optional)<input type="text" value={label} onChange={e => setLabel(e.target.value)} maxLength={40} autoComplete="off" placeholder="My mail tools"/></label>
    <label className="na-field">Token, if the server asks for one<input type="password" value={token} onChange={e => setToken(e.target.value)} autoComplete="off" autoCapitalize="off" spellCheck={false} placeholder="Leave empty if it needs none"/></label>
    <label className="na-check"><input type="checkbox" checked={remember && !showcase} disabled={showcase} onChange={e => setRemember(e.target.checked)}/><span>Remember the token on this device <span className="na-fine">{showcase ? '(the Showcase keeps tokens for this tab only)' : '(sealed in this browser, as your model key is; otherwise kept for this visit only). Never synced, never in an export, sent only to that server.'}</span></span></label>
    <div className="na-keys"><button type="submit" className="na-key" data-primary="" disabled={busy || !address.trim()}>{busy ? 'Connecting…' : 'Connect and list tools'}</button></div>
    <Status line={line}/>
  </form>;
}

function ServerCard({server, entry, bridge, showcase, onCard}: {server: AgentServer; entry: LiveEntry | null; bridge: AgentBridge; showcase: boolean; onCard: (card: ToolCard) => void}) {
  const id = useId(), at = parseLoopback(server.address);
  const [busy, setBusy] = useState(false), [line, setLine] = useState<Line>(null), [removing, setRemoving] = useState(false), [tokenState, setTokenState] = useState<'none' | 'visit' | 'remembered'>('none');
  const [token, setToken] = useState(''), [remember, setRemember] = useState(false);
  const refreshToken = bridge.tokenState;
  useEffect(() => { let on = true; void refreshToken(server.id).then(s => { if (on) setTokenState(s); }); return () => { on = false; }; }, [refreshToken, server.id, entry]);
  const go = async () => { setBusy(true); setLine(null); try { const out = await bridge.connectServer(server.id); setLine({ok: out.ok, text: out.line}); } finally { setBusy(false); } };
  const saveToken = async () => { try { await bridge.setToken(server.id, token, remember && !showcase); setToken(''); setTokenState(await bridge.tokenState(server.id)); setLine({ok: true, text: token.trim() ? 'The token is kept as you asked. Connect again to use it.' : 'The token is forgotten on this device.'}); } catch { setLine({ok: false, text: 'The token could not be kept on this device.'}); } };
  const asking = server.ask?.length ?? 0;
  return <article className="na-server" aria-labelledby={`${id}-n`} data-server={server.id} data-connected={entry ? '' : undefined}>
    <header className="na-server-head">
      <h5 id={`${id}-n`} className="na-server-name">{server.label}</h5>
      <span className="na-pill" data-on={entry ? '' : undefined}>{entry ? `Connected · ${entry.tools.length} tool${entry.tools.length === 1 ? '' : 's'}` : 'Not connected in this visit'}</span>
    </header>
    <p className="na-address">{at.ok ? at.url : 'This address is no longer accepted'}</p>
    {entry?.session.server && <p className="na-fine">It calls itself “{entry.session.server}” <span>(its own words)</span>.</p>}
    <div className="na-keys">
      <button type="button" className="na-key" data-primary={entry ? undefined : ''} disabled={busy} onClick={() => void go()}>{busy ? 'Connecting…' : entry ? 'Connect again' : 'Connect and list tools'}</button>
      {entry && <button type="button" className="na-key" data-quiet="" onClick={() => { bridge.disconnect(server.id); setLine({ok: true, text: 'Disconnected for this visit. The address and the switches are kept.'}); }}>Disconnect</button>}
      {!removing ? <button type="button" className="na-key" data-quiet="" onClick={() => setRemoving(true)}>Remove</button>
        : <><button type="button" className="na-key" data-danger="" onClick={() => { void bridge.remove(server.id).catch(() => setLine({ok: false, text: 'It could not be removed on this device.'})); }}>Yes, remove it</button><button type="button" className="na-key" data-quiet="" onClick={() => setRemoving(false)}>Keep it</button></>}
    </div>
    {removing && <p className="na-fine">Removing forgets the address, the switches and any remembered token on this device. It changes nothing in the server itself.</p>}
    <Status line={line}/>
    <details className="na-details"><summary>Token: {tokenState === 'remembered' ? 'remembered on this device (sealed)' : tokenState === 'visit' ? 'kept for this visit only' : 'none'}</summary>
      <div className="na-details-body">
        <label className="na-field">New token<input type="password" value={token} onChange={e => setToken(e.target.value)} autoComplete="off" autoCapitalize="off" spellCheck={false} placeholder="Leave empty to forget the token"/></label>
        <label className="na-check"><input type="checkbox" checked={remember && !showcase} disabled={showcase} onChange={e => setRemember(e.target.checked)}/><span>Remember on this device <span className="na-fine">(sealed in this browser; otherwise for this visit only)</span></span></label>
        <div className="na-keys"><button type="button" className="na-key" onClick={() => void saveToken()}>{token.trim() ? 'Keep this token' : 'Forget the token'}</button></div>
        <p className="na-fine">The token is sent only to this server, as its Authorization header. It is never synced, never in an export and never shown again.</p>
      </div>
    </details>
    {entry ? entry.tools.length ? <>
      <p className="na-fine">{asking ? `${asking} of ${entry.tools.length} on “Ask every time”.` : 'Every tool is Off.'}{entry.skipped ? ` ${entry.skipped} could not be read and ${entry.skipped === 1 ? 'is' : 'are'} left out.` : ''}</p>
      <ul className="na-tools">{entry.tools.map(tool => <li key={tool.name}><ToolRow server={server} tool={tool} bridge={bridge} onCard={onCard}/></li>)}</ul>
    </> : <p className="na-fine">This server lists no tools.</p>
      : <p className="na-fine">{asking ? `${asking} tool${asking === 1 ? ' is' : 's are'} on “Ask every time” from before. They can be used again once the server is connected in this visit.` : 'Connect to see its tools. They all start Off.'}</p>}
  </article>;
}

function ToolRow({server, tool, bridge, onCard}: {server: AgentServer; tool: ListedTool; bridge: AgentBridge; onCard: (card: ToolCard) => void}) {
  const id = useId(), ask = toolAsks(server, tool.name), lines = schemaLines(tool.schema), [hand, setHand] = useState(false), [error, setError] = useState('');
  const flip = () => { setError(''); try { bridge.setAsk(server.id, tool.name, !ask); if (ask) setHand(false); } catch { setError('The switch could not be saved on this device.'); } };
  return <div className="na-tool" data-tool={tool.name} data-ask={ask ? '' : undefined}>
    <div className="na-tool-head">
      <span id={`${id}-n`} className="na-tool-name">{tool.name}</span>
      <button type="button" role="switch" aria-checked={ask} aria-labelledby={`${id}-n ${id}-s`} className="na-switch" onClick={flip}><span aria-hidden="true"/><span id={`${id}-s`}>{ask ? 'Ask every time' : 'Off'}</span></button>
    </div>
    {tool.description ? <figure className="na-quote"><figcaption className="na-quote-label">Described by the server · untrusted</figcaption><p className="na-quote-text">{tool.description}</p></figure> : <p className="na-fine">The server gave no description.</p>}
    {lines === null ? <p className="na-fine">Takes structured input NOVA cannot put in plain words; by hand it takes raw JSON.</p>
      : lines.length ? <dl className="na-fields" aria-label={`What ${tool.name} takes`}>{lines.map(l => <div key={l.name}><dt>{l.name}</dt><dd>{l.words}{l.required ? ' · needed' : ' · optional'}{l.description ? <span className="na-fine"> · the server says: {l.description}</span> : null}</dd></div>)}</dl>
      : <p className="na-fine">Takes no input.</p>}
    {ask && <div className="na-keys"><button type="button" className="na-key" aria-expanded={hand} onClick={() => setHand(h => !h)}>{hand ? 'Close the form' : 'Fill in by hand'}</button></div>}
    {ask && hand && <HandForm server={server} tool={tool} bridge={bridge} onCard={onCard}/>}
    {error && <p className="na-status" data-ok="false" role="alert"><span>{error}</span></p>}
  </div>;
}

/** The arguments typed by the person: one input per plain field, or raw JSON for a structured tool. It only makes the card; the card's button sends. */
function HandForm({server, tool, bridge, onCard}: {server: AgentServer; tool: ListedTool; bridge: AgentBridge; onCard: (card: ToolCard) => void}) {
  const form = tool.schema.simple && !tool.schema.unread, names = Object.keys(tool.schema.properties), required = new Set(tool.schema.required);
  const [values, setValues] = useState<Record<string, string>>({}), [json, setJson] = useState('{}'), [problem, setProblem] = useState('');
  const submit = (event: FormEvent) => {
    event.preventDefault(); setProblem('');
    let args: unknown;
    try {
      if (form) { const out: Record<string, unknown> = {}; for (const name of names) { const value = fromText(tool.schema.properties[name]!, values[name] ?? '', name); if (value !== undefined) out[name] = value; } args = out; }
      else args = JSON.parse(json.trim() || '{}') as unknown;
    } catch (cause) { setProblem(cause instanceof SyntaxError ? 'The arguments are not valid JSON.' : cause instanceof Error ? cause.message : 'The arguments could not be read.'); return; }
    const made = byHand(bridge.offered, {serverId: server.id, tool: tool.name, args}, {mode: privacyMode(), healthOpen: false});
    if (made.ok) onCard(made.card); else setProblem(made.dropped.message);
  };
  return <form className="na-form" onSubmit={submit} data-hand-form={tool.name}>
    {form ? names.map(name => { const field = tool.schema.properties[name]!;
      return <label key={name} className="na-field">{name}{required.has(name) ? ' (needed)' : ''}
        {field.enum ? <select value={values[name] ?? ''} onChange={e => setValues(v => ({...v, [name]: e.target.value}))}><option value="">—</option>{field.enum.map(v => <option key={String(v)} value={String(v)}>{String(v)}</option>)}</select>
          : field.type === 'boolean' ? <select value={values[name] ?? ''} onChange={e => setValues(v => ({...v, [name]: e.target.value}))}><option value="">—</option><option value="true">yes</option><option value="false">no</option></select>
          : <input type="text" inputMode={field.type === 'number' || field.type === 'integer' ? 'decimal' : undefined} value={values[name] ?? ''} onChange={e => setValues(v => ({...v, [name]: e.target.value}))} autoComplete="off" placeholder={field.type === 'array' ? 'Separate items with commas' : undefined}/>}
      </label>; })
      : <label className="na-field">Arguments as JSON<textarea value={json} onChange={e => setJson(e.target.value)} spellCheck={false} autoCapitalize="off"/></label>}
    <div className="na-keys"><button type="submit" className="na-key" data-primary="">Make the card</button></div>
    <p className="na-fine">Nothing is sent yet: the card shows exactly what would go, and waits for your press.</p>
    {problem && <p className="na-status" data-ok="false" role="alert"><span>{problem}</span></p>}
  </form>;
}

/** The last tool calls the person approved (the shared history record; the full list, with "Forget", is under NOVA's conversation). */
function ToolHistory() {
  const outbox = useDeviceRecord(NOVA_OUTBOX), id = useId();
  const calls = outbox.loaded && !outbox.unreadable ? outboxOf(outbox.data).filter(e => e.kind === 'tool').slice(0, 5) : [];
  return <section className="na-section" aria-labelledby={`${id}-h`}>
    <h4 id={`${id}-h`} className="na-h">Tool calls you approved</h4>
    {calls.length ? <ol className="na-history">{calls.map((e, i) => <li key={`${e.at}-${i}`}><span>{formatDateTime(e.at)}</span><span className="na-tool-name">{e.what}</span><span className="na-address">{e.target}</span><span>{e.ok ? 'worked' : 'did not work'}</span></li>)}</ol>
      : <p className="na-fine">None yet.</p>}
    <p className="na-fine">Kept on this device only: when, which server, which tool and whether it worked — never the arguments or the answer. The whole list, and “Forget this history”, are under NOVA’s conversation: “Sent out from this device”.</p>
  </section>;
}

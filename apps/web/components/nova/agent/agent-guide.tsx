'use client';
import Link from 'next/link';
import {useId, useState, useSyncExternalStore, type ReactNode} from 'react';
import {AGENT_GUIDE_ID, AGENT_GUIDE_LEDE, AGENT_GUIDE_SAFETY, AGENT_GUIDE_SHARES, AGENT_GUIDE_STEPS, AGENT_GUIDE_TITLE, agentSteps, allowSteps, CONNECT_LINES, liveAgentLine, liveServerLine, REMOVE_LINES, serverSteps, USE_LINES, type AgentGuideStepId} from '../../../lib/nova/agent-bridge/guide';
import {agentCheckLine, checkOwnAgent} from '../../../lib/nova/agent-bridge/own-agent';
import {askCount, ownAgentOf} from '../../../lib/nova/agent-bridge/record';
import {detectOs, OS_LABELS, type GuideStep, type Os} from '../../../lib/nova/setup-guide';
import AgentPanel from './agent-panel';
import {useAgentBridge} from './use-agent-bridge';
import './agent.css';

const subscribeNothing = () => () => undefined;
/** One command, alone in its block, with the terminal it runs in and a Copy key. */
function Command({command, shell}: {command: string; shell?: string}) {
  const [copied, setCopied] = useState<'yes' | 'no' | null>(null);
  const copy = () => { if (!navigator.clipboard) { setCopied('no'); return; } navigator.clipboard.writeText(command).then(() => setCopied('yes'), () => setCopied('no')); };
  return <div className="na-cmd" data-command="">
    {shell && <span className="na-cmd-shell">{shell}</span>}
    <pre tabIndex={0} aria-label={`Command${shell ? ` for ${shell}` : ''}`}><code>{command}</code></pre>
    <div className="na-keys"><button type="button" className="na-key" data-quiet="" onClick={copy}>{copied === 'yes' ? 'Copied' : 'Copy'}<span className="na-sr"> this command</span></button></div>
    <span className="na-sr" role="status">{copied === 'yes' ? 'Copied.' : copied === 'no' ? 'Copying was not allowed here: select the command and copy it yourself.' : ''}</span>
  </div>;
}
const Steps = ({steps}: {steps: readonly GuideStep[]}) => <ul className="na-step-list">{steps.map((s, i) => <li key={i}>{s.text}{s.command && <Command command={s.command} shell={s.shell}/>}</li>)}</ul>;
const Lines = ({lines}: {lines: readonly string[]}) => <ul className="na-rule">{lines.map(l => <li key={l}>{l}</li>)}</ul>;

/**
 * Session AM-2 (owner's step 4d): "Make NOVA your own agent" — the step-by-step path in the setup hub, for macOS, Windows
 * and Linux, with copyable commands and LIVE CHECKS: is an agent answering on its loopback port; is a tool server
 * answering "initialize"; how many tools were found. Each step says what it shares and with whom; the safety notes come
 * first; the last step is how to remove a connection. The panel that does the connecting stands under the steps
 * (components/nova/agent/agent-panel.tsx), on the same connections.
 */
export default function AgentGuide() {
  const bridge = useAgentBridge(), id = useId();
  const ua = useSyncExternalStore(subscribeNothing, () => navigator.userAgent, () => ''), origin = useSyncExternalStore(subscribeNothing, () => window.location.origin, () => 'https://alpha.zigoals.app');
  const [chosen, setChosen] = useState<Os | null>(null), os = chosen ?? detectOs(ua);
  const [agentLine, setAgentLine] = useState<{ok: boolean; text: string} | null>(null), [checking, setChecking] = useState<'agent' | 'servers' | null>(null), [serverLines, setServerLines] = useState<Record<string, {ok: boolean; text: string}>>({});
  const agent = ownAgentOf(bridge.record.data), asking = askCount(bridge.record.data);
  const checkAgent = async () => {
    if (!agent) return;
    setChecking('agent');
    try { const out = await checkOwnAgent(agent.address, null); setAgentLine({ok: out.ok, text: liveAgentLine(out.ok, agentCheckLine(out))}); } finally { setChecking(null); }
  };
  const checkServers = async () => {
    setChecking('servers');
    try { for (const server of bridge.servers) { const out = await bridge.connectServer(server.id); setServerLines(lines => ({...lines, [server.id]: {ok: out.ok, text: out.line}})); } } finally { setChecking(null); }
  };
  const body: Record<AgentGuideStepId, ReactNode> = {
    what: <>
      <p className="na-text">NOVA stays inside ZIGoals. To act outside it — send a mail, search the web, add to a calendar — it can ask programs that run on your own computer: your own agent, and “tool servers” that sign in to your accounts themselves. NOVA proposes; you approve each action on a card; the program does it with its own accounts.</p>
      <Lines lines={AGENT_GUIDE_SAFETY}/>
    </>,
    agent: <>
      <Steps steps={agentSteps(os)}/>
      <div className="na-keys"><Link className="na-key" href="/app/nova/hermes" prefetch={false}>Hermes Agent’s own guide</Link></div>
      <div className="na-section" data-live-check="agent">
        <p className="na-status" role="status" aria-live="polite" data-ok={agentLine ? String(agentLine.ok) : undefined}><span><b>Live check · your agent.</b> {agentLine ? agentLine.text : agent ? `Saved: ${agent.address}${agent.model ? ` · ${agent.model}` : ''}. Press the key to ask it now.` : 'No agent address yet: type it under “Your own agent” below and press “Check my agent”.'}</span></p>
        {agent && <div className="na-keys"><button type="button" className="na-key" disabled={checking !== null} onClick={() => void checkAgent()}>{checking === 'agent' ? 'Asking…' : 'Is my agent answering?'}</button></div>}
      </div>
    </>,
    server: <Steps steps={serverSteps(os)}/>,
    allow: <Steps steps={allowSteps(origin)}/>,
    connect: <>
      <Lines lines={CONNECT_LINES}/>
      <div className="na-section" data-live-check="servers">
        {bridge.servers.length === 0 ? <p className="na-status" role="status"><span><b>Live check · your tool servers.</b> None yet: add one under “Tool servers on this computer” below.</span></p>
          : <ul className="na-step-list" aria-live="polite">{bridge.servers.map(server => { const entry = bridge.entries.get(server.id), said = serverLines[server.id];
            return <li key={server.id}><p className="na-status" data-ok={entry ? 'true' : said ? String(said.ok) : undefined}><span><b>{server.label}.</b> {entry ? liveServerLine(entry.session.server, entry.session.protocol, entry.tools.length, entry.skipped) : said ? said.text : 'Not connected in this visit.'}</span></p></li>; })}</ul>}
        {bridge.servers.length > 0 && <div className="na-keys"><button type="button" className="na-key" disabled={checking !== null} onClick={() => void checkServers()}>{checking === 'servers' ? 'Asking…' : 'Is my tool server answering?'}</button></div>}
      </div>
    </>,
    switch: <>
      <p className="na-text">Under each connected server NOVA lists its tools: the name, the server’s own description (untrusted, shown as plain text) and what the tool takes, in plain words. Each has one switch: Off, or Ask every time.</p>
      <p className="na-status" role="status" data-ok={asking ? 'true' : undefined} data-live-check="tools"><span><b>Live check · your switches.</b> {bridge.entries.size ? `${[...bridge.entries.values()].reduce((n, e) => n + e.tools.length, 0)} tools found on ${bridge.entries.size} connected server${bridge.entries.size === 1 ? '' : 's'}; ` : ''}{asking} on “Ask every time”, the rest Off.</span></p>
    </>,
    use: <Lines lines={USE_LINES}/>,
    remove: <Lines lines={REMOVE_LINES}/>,
  };
  return <section className="na-panel na-guide" id={AGENT_GUIDE_ID} aria-labelledby={`${id}-t`} data-agent-guide="">
    <header className="na-section">
      <p className="na-eyebrow">A second path · after your ten planets, or any time</p>
      <h2 id={`${id}-t`} className="na-title">{AGENT_GUIDE_TITLE}</h2>
      <p className="na-text">{AGENT_GUIDE_LEDE}</p>
      <div className="na-keys" role="group" aria-label="Your computer">{(['mac', 'windows', 'linux'] as const).map(o => <button key={o} type="button" className="na-key" data-primary={o === os ? '' : undefined} aria-pressed={o === os} onClick={() => setChosen(o)}>{OS_LABELS[o]}</button>)}</div>
    </header>
    <ol className="na-steps">{AGENT_GUIDE_STEPS.map(step => <li key={step.id} className="na-step" data-step={step.id}>
      <h3 className="na-step-title">{step.title}</h3>
      {body[step.id]}
      <p className="na-shares"><b>What this shares:</b> {AGENT_GUIDE_SHARES[step.id]}</p>
    </li>)}</ol>
    <AgentPanel guide/>
  </section>;
}

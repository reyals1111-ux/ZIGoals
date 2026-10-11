'use client';
import {useCallback, useEffect, useId, useMemo, useRef, useState} from 'react';
import {ACCOUNT_CHANGE} from '../../lib/account-session';
import {attachesContext} from '../../lib/ai/context/pages';
import {Handles} from '../../lib/ai/handles';
import {AI_OPTIONS} from '../../lib/ai/store/records';
import {toolEnv} from '../../lib/ai/tools/env';
import {availableTools, TOOLS} from '../../lib/ai/tools/registry';
import {agentRunner, modelContext, offerTools, parseAgentActions, proposalAnswer, proposeTool, readTools, TAKEN_AWAY, type AgentCall} from '../../lib/ai/webmcp';
import {isShowcase} from '../../lib/showcase-storage';
import {ZigiAvatar} from '../zigi/zigi-avatar';
import {addAgentBatch, clearAgentBatches} from './agent-inbox';
import type {BrowserAgentsProps} from './browser-agents';
import {useAiContext} from './use-ai-context';
import {useAiSettings} from './use-ai-settings';
import {useDeviceRecord} from './use-device-record';
import '../zigi/knock.css';
import './agent-tools.css';

/**
 * ZIGoals' tools for browser AI agents (Session V Part 16, lib/ai/webmcp.ts), while the person's switch is on.
 * - Offered with the page's model context, never on Settings and only on a screen with nothing private on it: ZIGi's
 *   lookups the gates allow here (ZIGi set up, each area's switch, Health only through its gate), plus the proposal tool
 *   while ZIGi's button shows. They are taken away and offered again whenever the page, that list or the screen changes,
 *   and taken away for good when the switch goes off.
 * - Every lookup runs against the records and gates of its moment, with this tab's handles (one set per tab, so h1 is
 *   the same habit for every call and for the cards), and ZIGi shows the person at once what went back, word for word.
 * - Proposals become cards in ZIGi's panel, which opens; nothing is written until the person adds one.
 * Nothing here is stored: the notice and the handles live in this tab, and an account change clears them.
 */
type Shown = AgentCall & {id: number};
export default function AgentTools({visible, sensitive, phone, side, onPropose}: BrowserAgentsProps) {
  const settings = useAiSettings(), options = useDeviceRecord(AI_OPTIONS), context = useAiContext(settings.data, 'a browser AI agent', sensitive);
  const [calls, setCalls] = useState<Shown[]>([]), titleId = useId();
  const handles = useRef(new Handles()), counter = useRef(0), latest = useRef({context, sensitive, visible});
  useEffect(() => { latest.current = {context, sensitive, visible}; });
  // The lookups the gates allow here, by name; the tools are offered again only when this list, the page or the screen changes.
  const names = useMemo(() => {
    if (sensitive || !settings.loaded) return '';
    const sources = context.toolSources();
    return sources ? availableTools(toolEnv(sources, context.gates, 'provider')).map(t => t.name).join(',') : '';
  }, [context, sensitive, settings.loaded]);
  const show = useCallback((call: AgentCall) => setCalls(current => [...current, {...call, id: ++counter.current}].slice(-20)), []);
  const pathname = context.pathname;
  useEffect(() => {
    // Nothing at all on Settings (its account, sync and recovery controls are there) or on a private screen.
    const host = modelContext();
    if (!host || sensitive || !attachesContext(pathname)) return;
    const controller = new AbortController(), signal = controller.signal;
    const current = () => {
      const {context: now, sensitive: hidden} = latest.current; if (hidden) return null;
      const sources = now.toolSources();
      return sources ? toolEnv(sources, now.gates, 'provider', handles.current) : null;
    };
    const allowed = new Set(names ? names.split(',') : []);
    const tools = readTools(TOOLS.filter(t => allowed.has(t.name)), agentRunner(current, show, signal));
    if (visible) tools.push(proposeTool(actions => {
      if (signal.aborted) return TAKEN_AWAY;
      if (latest.current.sensitive || !latest.current.visible) return 'Nothing was proposed: ZIGi is not shown on this screen right now.';
      const parsed = parseAgentActions(actions, handles.current.list), answer = proposalAnswer(parsed);
      if (parsed.proposals.length) { addAgentBatch({proposals: parsed.proposals, rejected: parsed.rejected, handles: [...handles.current.list]}); onPropose(); }
      show({kind: 'proposal', count: parsed.proposals.length, text: answer});
      return answer;
    }));
    void offerTools(host, tools, signal);
    return () => controller.abort();
  }, [names, pathname, sensitive, visible, show, onPropose]);
  // Another account, a sign-out or a lock: the handles, the notice and any proposals waiting for the panel go.
  useEffect(() => {
    const reset = () => { handles.current = new Handles(); setCalls([]); clearAgentBatches(); };
    window.addEventListener(ACCOUNT_CHANGE, reset);
    return () => { window.removeEventListener(ACCOUNT_CHANGE, reset); clearAgentBatches(); };
  }, []);
  const turnOff = () => { try { options.update(current => ({...current, webmcp: false})); } catch { /* the switch in Settings still turns it off */ } };
  if (!calls.length || sensitive) return null;
  const reads = calls.filter((c): c is Shown & {kind: 'read'} => c.kind === 'read'), latestCall = calls[calls.length - 1]!;
  const line = (call: Shown) => call.kind === 'read' ? call.ok ? `Read: ${call.label}` : `Asked for ${call.label}: refused` : call.count ? `Proposed ${call.count === 1 ? 'one change' : `${call.count} changes`}: they are cards in ZIGi’s panel` : 'Proposed changes that could not become cards';
  const recent = calls.slice(-4), earlier = calls.length - recent.length;
  return <section className={`zigi-knock zigi-agent-notice${phone ? ' zigi-knock-phone' : ''}`} data-side={side} aria-labelledby={titleId}>
    <div className="zigi-knock-head">
      <ZigiAvatar state="reading-your-data" size={44} decorative/>
      <div className="zigi-knock-copy">
        {isShowcase() && <p className="zigi-knock-label">Showcase · fictional</p>}
        <h2 id={titleId}>A browser AI agent used ZIGoals&rsquo; tools</h2>
        <p>An AI agent in this browser, on this page. Whatever it read goes to the AI that runs it.</p>
      </div>
      <button type="button" className="zigi-knock-close" aria-label="Close the browser agent notice" onClick={() => setCalls([])}>×</button>
    </div>
    <p className="zigi-knock-live" role="status">{`A browser AI agent: ${line(latestCall)}.`}</p>
    <ul className="zigi-agent-calls">{earlier > 0 && <li>{earlier === 1 ? 'One earlier request' : `${earlier} earlier requests`}</li>}{recent.map(call => <li key={call.id}>{line(call)}</li>)}</ul>
    {reads.length > 0 && <details className="zigi-agent-details"><summary>What it got</summary>
      {reads.map(call => <div key={call.id} className="zigi-agent-result"><p>{call.label}</p><pre>{call.text}</pre></div>)}
    </details>}
    <div className="zigi-knock-actions">
      <button type="button" className="secondary" onClick={turnOff}>Turn off browser agents</button>
      <button type="button" className="quiet" onClick={() => setCalls([])}>Close</button>
    </div>
  </section>;
}

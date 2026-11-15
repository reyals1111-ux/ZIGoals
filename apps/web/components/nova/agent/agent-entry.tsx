'use client';
import Link from 'next/link';
import {lazy, Suspense, useState} from 'react';
import {askCount, NOVA_AGENT, ownAgentOf, serversOf} from '../../../lib/nova/agent-bridge/record';
import {LoadBoundary} from '../../load-boundary';
import {useDeviceRecord} from '../../ai/use-device-record';
import {NovaIcon} from '../icons';
import './agent.css';

const AgentPanel = lazy(() => import('./agent-panel'));
/**
 * Session AM-2 (step 4c): "Your own agent and tools" under "Behind the intelligence" — one line of what is connected
 * (from the device record alone: nothing is asked of any server), and the panel itself behind a disclosure, loaded as its
 * own chunk the first time it is opened.
 */
export function AgentEntry() {
  const record = useDeviceRecord(NOVA_AGENT), [opened, setOpened] = useState(false);
  const servers = serversOf(record.data).length, asking = askCount(record.data), agent = ownAgentOf(record.data);
  const line = !record.loaded ? 'Reading…' : record.unreadable ? 'The saved connections could not be read on this device.'
    : servers || agent ? `${agent ? 'Your agent is noted. ' : ''}${servers} tool server${servers === 1 ? '' : 's'} · ${asking} tool${asking === 1 ? '' : 's'} on “Ask every time”` : 'Nothing connected. Every tool starts Off, and every action is a card you approve.';
  return <div className="na-entry" data-agent-entry="">
    <p className="nova-row"><span className="nova-chip-dot" data-kind={servers || agent ? 'local' : 'off'} aria-hidden="true"/><span><strong>Your own agent and tools:</strong> {line}</span></p>
    <details className="nova-tech" onToggle={event => { if (event.currentTarget.open) setOpened(true); }}>
      <summary><span>Connect your own agent and tools</span><span className="nova-tech-chevron" aria-hidden="true"><NovaIcon name="down" size={18}/></span></summary>
      <div className="nova-tech-body">
        <p className="nova-fine">New to this? <Link href="/app/nova/setup#own-agent" prefetch={false}>Make NOVA your own agent</Link> walks through it step by step, with live checks.</p>
        {opened && <LoadBoundary label="Your own agent and tools"><Suspense fallback={<p className="nova-fine" role="status">Opening…</p>}><AgentPanel/></Suspense></LoadBoundary>}
      </div>
    </details>
  </div>;
}
export default AgentEntry;

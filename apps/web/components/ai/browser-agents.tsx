'use client';
import {Suspense, lazy} from 'react';
import {AI_OPTIONS} from '../../lib/ai/store/records';
import {useDeviceRecord} from './use-device-record';

/**
 * Browser AI agents (Session V Part 16): loaded by ZIGi's companion only in a browser that offers tools to AI agents
 * (WebMCP). This part only reads the person's switch, "Let browser AI agents use ZIGoals tools" (off by default); the
 * tools themselves, and the stores they read, load only once it is on, and go away the moment it is off.
 */
const AgentTools = lazy(() => import('./agent-tools'));
export type BrowserAgentsProps = {visible: boolean; sensitive: boolean; phone: boolean; side: 'right' | 'left'; onPropose: () => void};
export default function BrowserAgents(props: BrowserAgentsProps) {
  const options = useDeviceRecord(AI_OPTIONS);
  if (!options.loaded || options.data.webmcp !== true) return null;
  return <Suspense fallback={null}><AgentTools {...props}/></Suspense>;
}

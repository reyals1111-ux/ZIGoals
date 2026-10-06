'use client';
import {useState} from 'react';
import {AI_OPTIONS} from '../../lib/ai/store/records';
import {Switch} from './ai-switch';
import {useAiSettings} from './use-ai-settings';
import {useDeviceRecord} from './use-device-record';
import './agents-panel.css';

/**
 * Settings → "Browser AI agents" (Session V Part 16): the switch "Let browser AI agents use ZIGoals tools", off by
 * default, and what it allows, in full, before anything is turned on. The card shows only in a browser that offers tools
 * to AI agents (WebMCP); lib/ai/webmcp.ts has the rules.
 */
export default function AgentsPanel() {
  const options = useDeviceRecord(AI_OPTIONS), settings = useAiSettings(), [note, setNote] = useState('');
  const set = (on: boolean) => {
    try { options.update(current => ({...current, webmcp: on})); setNote(on ? 'On. An AI agent in this browser can use ZIGoals’ tools on the pages you open.' : 'Off. Browser AI agents can no longer use ZIGoals’ tools.'); }
    catch { setNote('This choice could not be saved on this device.'); }
  };
  return <div className="ai-agents">
    <p className="ai-note">With this on, an AI agent built into this browser can, on the page you have open:</p>
    <ul className="ai-agents-list">
      <li>look up your records the way ZIGi does: only the areas each page may share with your AI, Health only through its gate, never on Settings or a private screen{settings.loaded && !settings.data.enabled ? ' (until ZIGi is set up, it can look nothing up)' : ''};</li>
      <li>propose changes, which appear as cards in ZIGi&rsquo;s panel: nothing is written until you add one, and it can never move money, sync, export, delete or change settings.</li>
    </ul>
    <p className="ai-note">ZIGi shows each request at once, with exactly what the agent got and a button to turn this off. What an agent reads goes to the AI that runs it, under that agent&rsquo;s own terms.</p>
    {options.loaded && <Switch checked={options.data.webmcp === true} onChange={set} label="Let browser AI agents use ZIGoals tools" note="Off by default. Browser agents are new; turn this off at any time, here or from ZIGi’s notice."/>}
    {note && <p className="ai-note" role="status">{note}</p>}
  </div>;
}

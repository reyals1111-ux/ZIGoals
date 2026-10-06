'use client';
import {Suspense, lazy} from 'react';
import {ZigiKnock} from './knock';

/**
 * ZIGi's companion (Session V Parts 13 and 16): what runs beside the launcher only once it is needed. The launcher shell
 * loads this file when knocking is on, or in a browser that offers tools to AI agents (WebMCP), and never otherwise. The
 * knock shows due reminders; browser agents load their own chunk, which reads the person's switch first.
 */
const BrowserAgents = lazy(() => import('../ai/browser-agents'));
type Props = {knock: boolean; agents: boolean; away: boolean; visible: boolean; sensitive: boolean; phone: boolean; side: 'right' | 'left'; onPropose: () => void};
export default function ZigiCompanion({knock, agents, away, visible, sensitive, phone, side, onPropose}: Props) {
  return <>
    {knock && <ZigiKnock away={away} phone={phone} side={side}/>}
    {agents && <Suspense fallback={null}><BrowserAgents visible={visible} sensitive={sensitive} phone={phone} side={side} onPropose={onPropose}/></Suspense>}
  </>;
}

'use client';
import Link from 'next/link';
import {askZigi} from '../../../ai/ask';
import {currentChatStore} from '../../../../lib/ai/scope';
import {checkFirstChat} from '../../../../lib/nova/setup-checks';
import {useAiSettings} from '../../../ai/use-ai-settings';
import {CheckRow} from '../check-row';
import type {SetupState} from '../use-setup';

const QUESTIONS = ['What does my day look like?', 'Which habits are still open today?', 'How are my goals going this week?'];
/**
 * Planet 4: a first, guided conversation that shows NOVA knows the person's day, within the areas chosen in planet 5. It
 * opens in ZIGi's chat (NOVA and ZIGi share one history), or on NOVA itself; nothing is sent until the person presses Send,
 * and with no model connected the answer is made on this device.
 */
export default function FirstChatStep({setup}: {setup: SetupState}) {
  const s = useAiSettings().data, share = (['today', 'goals', 'habits', 'wealth'] as const).filter(k => s.pageShare[k]);
  return <>
    <p>Ask NOVA about your day. It answers from your own records{share.length ? `: ${share.map(k => k[0]!.toUpperCase() + k.slice(1)).join(', ')}` : ''}{s.pageShare.health && s.includeHealth ? ', and Health' : ', without Health'} (change this in planet 5). {s.enabled ? 'Your model answers.' : 'With no model connected yet, NOVA answers on this device.'}</p>
    <div className="ai-card-actions" role="group" aria-label="Ask a first question">{QUESTIONS.map(q => <button key={q} type="button" className="secondary" onClick={() => askZigi(q)}>{q}</button>)}</div>
    <p className="fine">The question opens in the chat with ZIGi’s button; press Send there. NOVA and ZIGi share one history. Or ask on <Link className="text-link" href="/app/nova">NOVA</Link>.</p>
    <CheckRow id="first-chat" setup={setup} run={async () => checkFirstChat(await currentChatStore().list(), new Date())} label="Check my conversation"/>
  </>;
}

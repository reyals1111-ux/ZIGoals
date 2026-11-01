'use client';
import Link from 'next/link';
import {useRouter} from 'next/navigation';
import {sendToNova} from '../../../../lib/nova/bridge';
import {currentChatStore} from '../../../../lib/ai/scope';
import {checkFirstChat} from '../../../../lib/nova/setup-checks';
import {useAiSettings} from '../../../ai/use-ai-settings';
import {CheckRow} from '../check-row';
import type {SetupState} from '../use-setup';

const QUESTIONS = ['What does my day look like?', 'Which habits are still open today?', 'How are my goals going this week?'];
/**
 * Planet 4: a first, guided conversation that shows NOVA knows the person's day, within the areas chosen in planet 5.
 * Session AK P4 (FIRST_RUN_REVIEW FR-10): a question tapped here is asked on NOVA itself, in NOVA's conversation (the person
 * came to build NOVA; ZIGi shares the history), never in ZIGi's panel. With no model connected the answer is made on this device.
 */
export default function FirstChatStep({setup}: {setup: SetupState}) {
  const router = useRouter(), s = useAiSettings().data, share = (['today', 'goals', 'habits', 'wealth'] as const).filter(k => s.pageShare[k]);
  return <>
    <p>Ask NOVA about your day. It answers from your own records{share.length ? `: ${share.map(k => k[0]!.toUpperCase() + k.slice(1)).join(', ')}` : ''}{s.pageShare.health && s.includeHealth ? ', and Health' : ', without Health'} (change this in planet 5). {s.enabled ? 'Your model answers.' : 'With no model connected yet, NOVA answers on this device.'}</p>
    <div className="ai-card-actions" role="group" aria-label="Ask a first question">{QUESTIONS.map(q => <button key={q} type="button" className="secondary" onClick={() => { if (sendToNova(q)) router.push('/app/nova'); }}>{q}</button>)}</div>
    <p className="fine">A question opens <Link className="text-link" href="/app/nova">NOVA</Link> and is asked there. NOVA and ZIGi share one history.</p>
    <CheckRow id="first-chat" setup={setup} run={async () => checkFirstChat(await currentChatStore().list(), new Date())} label="Check my conversation"/>
  </>;
}

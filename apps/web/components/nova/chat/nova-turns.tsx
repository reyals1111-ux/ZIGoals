'use client';
import {useMemo, useState} from 'react';
import {parseReply} from '../../../lib/ai/actions/parse';
import {copyText} from '../../../lib/ai/chat-window';
import type {ChatTurn} from '../../../lib/ai/chats';
import {usageLine} from '../../../lib/ai/context/budget';
import {AREA_LABELS} from '../../../lib/ai/context/pages';
import {turnMarkdown} from '../../../lib/ai/continue';
import {LOCAL_LABEL} from '../../../lib/ai/local-answers/words';
import {ON_DEVICE_LABEL} from '../../../lib/ai/on-device';
import {PROVIDERS} from '../../../lib/ai/providers';
import {parseBlocks, plainText} from '../../../lib/ai/safe-render';
import type {DelegatedTurn} from '../../../lib/nova/bridge';
import {DataViz} from '../../ai/data-viz';
import {ProposalList} from '../../ai/proposal-list';
import {ReplyIcon, ReplyMore} from '../../ai/reply-actions';
import {SafeText} from '../../ai/safe-text';
import {FeedbackButtons, LongText, SourceLine, TurnKind, TurnTime} from '../../ai/turn-extras';
import type {AutoAccept} from '../../ai/use-auto-accept';
import type {ChatSession} from '../../ai/use-chat-session';
import type {useReadAloud} from '../../ai/use-voice';
import type {useProposals} from '../../ai/use-proposals';
import {ZigiAvatar} from '../../zigi/zigi-avatar';
import {AgentGlyph, PersonaFigure, type NovaPersona} from './nova-figure';

/**
 * One turn in NOVA's chat (Session AK, owner follow-up 2 N1). The same pieces as ZIGi's panel: the reply rendered from the
 * parsed tree (never HTML), proposals as confirm cards with Undo (components/ai/proposal-list.tsx, unchanged), who answered
 * in one short line, copy, read aloud, retry and the person's own note. A page task NOVA handed to ZIGi reads as a short
 * exchange in two voices: NOVA hands it over, ZIGi (its own figure, unchanged) answers from that page, NOVA closes the loop.
 */
export type TurnCommon = {session: ChatSession; runner: ReturnType<typeof useProposals>; autoAccept: AutoAccept; persona: NovaPersona; providerName: string;
  reader: ReturnType<typeof useReadAloud>; onNavigate: () => void; onAsk: (question: string) => void; connected: boolean};
export function NovaUserTurn({turn, mark, persona, onEdit}: {turn: ChatTurn; mark?: DelegatedTurn; persona: NovaPersona; onEdit?: () => void}) {
  return <>
    <article className="nova-turn nova-turn-user" aria-label="You">
      <div className="nova-turn-body"><p className="nova-turn-who" aria-hidden="true">You</p><LongText text={turn.text}/></div>
    </article>
    {onEdit && <p className="nova-turn-edit"><ReplyIcon glyph="edit" label="Edit your last message" tip="Edit" onClick={onEdit}/></p>}
    {mark?.role === 'task' && (mark.agent === 'hermes'
      ? <div className="nova-voice nova-voice-nova" role="note" aria-label={`${persona.name} hands this to your Hermes Agent`}>
        <PersonaFigure persona={persona} size={24}/>
        <p><strong>{persona.name}</strong> asked your Hermes Agent, with the {AREA_LABELS[mark.area]} page’s records under your same privacy mode. Hermes changes nothing in ZIGoals: anything it suggests comes back as a card for you.</p>
      </div>
      : <div className="nova-voice nova-voice-nova" role="note" aria-label={`${persona.name} hands this to ZIGi`}>
        <PersonaFigure persona={persona} size={24}/>
        <p><strong>{persona.name}</strong> handed this to ZIGi on the {AREA_LABELS[mark.area]} page. ZIGi answers here, from that page’s records, under your same privacy settings.</p>
      </div>)}
  </>;
}
/** The words that close a page task in NOVA's voice: made here from what came back, never sent to a model. */
export function closingLine(area: DelegatedTurn['area'], cards: number, agent: DelegatedTurn['agent'] = 'zigi'): string {
  const who = agent === 'hermes' ? 'Your Hermes Agent reported back' : `ZIGi reported back from ${AREA_LABELS[area]}`;
  return cards ? `${who}. ${cards === 1 ? 'Its change is a card' : `Its ${cards} changes are cards`}: nothing is saved until you add ${cards === 1 ? 'it' : 'them'}.` : `${who}.`;
}
export function NovaReplyTurn({turn, asked, mark, isLast, earlier, busy, common, onRetry}: {turn: ChatTurn; asked: string; mark?: DelegatedTurn; isLast: boolean; earlier: boolean; busy: boolean; common: TurnCommon; onRetry: () => void}) {
  const {session, runner, autoAccept, persona, providerName, reader, onNavigate, onAsk, connected} = common;
  const [copied, setCopied] = useState(false);
  const parsed = session.parsed.get(turn.id) ?? parseReply(turn.text), local = turn.source === 'local' || turn.source === 'on-device';
  const hermes = mark?.role === 'reply' && mark.agent === 'hermes', zigi = mark?.role === 'reply' && !hermes;
  const info = local ? session.localFor(turn.id) : undefined, reply = info?.reply, question = info?.question ?? asked;
  const calls = useMemo(() => (turn.tools ?? []).map(c => ({tool: c.tool, args: c.args ?? {}, label: c.label})), [turn.tools]);
  // An answer made on this device names a habit by its exact title, so the person's habits are its handles (as in ZIGi's panel).
  const localHandles = useMemo(() => runner.stores.habits.habits.map((h, i) => ({handle: `h${i + 1}`, kind: 'habit' as const, id: h.id, label: h.title})), [runner.stores.habits.habits]);
  const providerLabel = (turn.provider && turn.provider !== 'local' ? PROVIDERS[turn.provider].name : providerName).replace(/^your /, '');
  const full = turn.source === 'on-device' ? ON_DEVICE_LABEL : local ? LOCAL_LABEL : hermes ? `Answer from your Hermes Agent${turn.model ? ` (${turn.model})` : ''}, on your own computer, not from ZIGoals` : `Answer from your AI (${providerLabel}), not from ZIGoals`;
  const short = turn.source === 'on-device' ? 'Chrome’s on-device model' : local ? 'On-device answers · no AI used' : hermes ? 'From your Hermes Agent' : `From your AI · ${providerLabel}`;
  const who = hermes ? 'Hermes · your agent' : zigi ? `ZIGi · ${AREA_LABELS[mark!.area]} page` : persona.name;
  const usage = usageLine(turn.usage ?? null);
  const copy = () => { copyText(`${plainText(parseBlocks(parsed.text))}\n\n${full}`).then(() => { setCopied(true); window.setTimeout(() => setCopied(false), 1500); }).catch(() => undefined); };
  const chips = isLast && !busy && reply ? reply.kind === 'choices' || (reply.kind === 'refusal' && reply.choices) ? (reply.kind === 'choices' ? reply.choices : reply.choices ?? []).map(c => ({label: c.label, run: () => session.choose(question, c)}))
    : reply.kind === 'examples' ? reply.examples.map(e => ({label: e, run: () => onAsk(e)})) : [] : [];
  return <>
    <article className={`nova-turn nova-turn-assistant${zigi ? ' nova-turn-zigi' : ''}${hermes ? ' nova-turn-hermes' : ''}${local ? ' nova-turn-local' : ''}`} aria-label={`${who}: ${local ? 'answer made on this device' : 'reply'}`}>
      <span className="nova-turn-figure">{hermes ? <AgentGlyph size={28}/> : zigi ? <ZigiAvatar state="idle" size={28} decorative/> : <PersonaFigure persona={persona} size={28}/>}</span>
      <div className="nova-turn-body">
        <p className="nova-turn-who" aria-hidden="true">{who}</p>
        {(parsed.text || parsed.proposals.length > 0) && <TurnKind cards={parsed.proposals.length > 0}/>}
        {parsed.text && <SafeText className={local ? 'ai-local-answer' : undefined} text={parsed.text}/>}
        {!local && turn.tools && turn.tools.length > 0 && <p className="nova-looked"><span>{zigi ? 'ZIGi looked at:' : 'Looked at:'}</span> {turn.tools.map((t, i) => <span key={i} className="ai-source-chip">{t.label}</span>)}</p>}
        <DataViz results={local ? info?.results : session.lookupsFor(turn.id)?.map(l => l.result)}/>
        {(parsed.proposals.length > 0 || parsed.rejected.length > 0) && <ProposalList proposals={parsed.proposals} rejected={parsed.rejected} handles={local ? localHandles : session.handlesFor(turn.id)} runner={runner} onNavigate={onNavigate} autoAccept={autoAccept} claimAuto={() => session.claimFresh(turn.id)} earlier={earlier} replyId={turn.id} bundle={parsed.bundle}/>}
        {!isLast && reply?.kind === 'examples' && reply.examples.length > 0 && <ul className="ai-local-examples" aria-label="Questions answered on this device">{reply.examples.map(e => <li key={e}>{e}</li>)}</ul>}
        {chips.length > 0 && <div className="ai-chips" role="group" aria-label={reply?.kind === 'examples' ? 'Questions answered on this device' : 'Which one?'}>{chips.map(c => <button key={c.label} type="button" className="ai-chip" title={c.label} onClick={c.run}>{c.label}</button>)}</div>}
        <SourceLine short={short} full={full}/>
        {turn.records && turn.records.length > 0 && <p className="ai-turn-records" title="Which records went with your question; never their values">Records sent: {turn.records.join(' · ')}</p>}
        <div className={`ai-reply-row${isLast ? ' ai-reply-row-latest' : ''}`}>
          <TurnTime at={turn.at}/>
          {turn.stopped && <span className="ai-turn-stopped" title={turn.stopped}>{turn.stopped}</span>}
          <span className="ai-reply-icons">
            <ReplyIcon glyph={copied ? 'copied' : 'copy'} label={copied ? 'Copied' : 'Copy'} onClick={copy}/>
            {reader.supported && parsed.text && (reader.speaking ? <ReplyIcon glyph="stop" label="Stop reading" onClick={reader.stop}/> : <ReplyIcon glyph="speak" label="Read aloud" onClick={() => reader.speak(plainText(parseBlocks(parsed.text)))}/>)}
            {isLast && !local && !busy && <ReplyIcon glyph="regenerate" label="Retry" tip="Retry: ask the same question again" onClick={onRetry}/>}
            <FeedbackButtons value={turn.feedback} onChange={value => session.setFeedback(turn.id, value)}/>
            <ReplyMore info={usage ? <span className="ai-turn-usage">{usage}</span> : undefined} items={[
              {key: 'markdown', label: 'Copy as Markdown', done: 'Copied as Markdown', keepOpen: true, onSelect: () => { void copyText(turnMarkdown({...turn, text: parsed.text}, full)).catch(() => undefined); }},
              // An answer made on this device, with an AI connected: the same question to the person's AI with those records (shown first in ZIGi's panel; here sent on the person's choice).
              ...(connected && local && calls.length > 0 && question && !busy ? [{key: 'more', label: 'Ask my AI for more', title: 'Your question and these records go to your AI', onSelect: () => void session.askMore(question, calls, {area: 'today'})}] : []),
            ]}/>
          </span>
        </div>
      </div>
    </article>
    {(zigi || hermes) && <div className="nova-voice nova-voice-nova nova-voice-close" role="note" aria-label={`${persona.name}, after ${hermes ? 'your Hermes Agent’s' : 'ZIGi’s'} answer`}>
      <PersonaFigure persona={persona} size={24}/>
      <p><strong>{persona.name}</strong> · {closingLine(mark!.area, parsed.proposals.length, mark!.agent)}</p>
    </div>}
  </>;
}

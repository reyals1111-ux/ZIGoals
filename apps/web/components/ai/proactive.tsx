'use client';
import {useEffect, useMemo, useState, type ReactNode} from 'react';
import {wealthView} from '../../lib/ai/context/pages';
import {BRIEF_LABEL, briefForAi, morningBrief, SAY_IT_NICER, type Brief} from '../../lib/ai/proactive/brief';
import {chipsFor, type Chip, type ChipView} from '../../lib/ai/proactive/chips';
import {dismissedOn, dismissFor} from '../../lib/ai/proactive/dismiss';
import {INSIGHT_RULES, PATTERN_NOT_PROOF, sampleLine, usesHealth, zigiInsights} from '../../lib/ai/proactive/insights';
import {localReview, REFLECT_ASK, reviewForAi} from '../../lib/ai/proactive/review';
import {ZIGI, zigiPrefs} from '../../lib/ai/store/records';
import {ZIGI_KEY, ZIGI_STORE_EVENT} from '../../lib/ai/store/keys';
import {toolEnv, type ToolEnv} from '../../lib/ai/tools/env';
import {getAppStorage} from '../../lib/showcase-storage';
import {useHabitHealthLinks} from '../habits/use-habit-health-links';
import type {useAiContext} from './use-ai-context';
import type {ChatSession} from './use-chat-session';
import {useDeviceRecord} from './use-device-record';
import {zigiSignals} from '../zigi/bus';
import {AI_OPTIONS} from '../../lib/ai/store/records';
import {languageModel, onDeviceAvailability, onDeviceSession} from '../../lib/ai/on-device';
import {ON_DEVICE_FAILED, ON_DEVICE_NOT_READY, SAY_NICER_SYSTEM, shortReply} from '../../lib/ai/on-device-chat';

/**
 * ZIGi's proactive side (Session V Part 9), all computed on this device: the morning brief in the greeting, suggestion
 * chips from the person's records, the guided weekly review and the Insights view. Nothing is written on view (a chip
 * or the brief hidden for the day is the only write, in `zigoals:zigi:v1`), nothing is sent unless the person clicks a
 * button that says so, and each of those shows what it sends first. With an AI connected the records are read
 * under the gates that apply to sending; with none, under the local ones (Health still needs its gate).
 */
type Context = ReturnType<typeof useAiContext>;
export type ProactiveView = 'insights' | 'review';
function useEnv(context: Context, purpose: 'provider' | 'local'): ToolEnv | null {
  // The records and the gates, not the context object (a new one on every render): the brief, chips, review and
  // insights are made again only when the records or the gates change, not on every frame of a streaming reply.
  const {toolSources, gates} = context;
  return useMemo(() => { const sources = toolSources(); return sources ? toolEnv(sources, gates, purpose) : null; }, [toolSources, gates, purpose]);
}
/** The exact text a one-click AI request carries, shown before it is sent. */
function AiSees({label, instruction, data}: {label: string; instruction: string; data: string}) {
  // Its own name per button, so it never reads like the chat's own "What your AI sees" beside it.
  return <details className="ai-sends"><summary>{label}</summary><p className="ai-note">Your request: {instruction}</p><pre>{data}</pre></details>;
}
export function BriefBlock({context, connected, session}: {context: Context; connected: boolean; session: ChatSession}) {
  const zigi = useDeviceRecord(ZIGI), options = useDeviceRecord(AI_OPTIONS), local = useEnv(context, connected ? 'provider' : 'local');
  const brief = useMemo(() => local ? morningBrief(local) : null, [local]);
  if (!zigi.loaded || zigiPrefs(zigi.data).greeting === 'quiet' || !brief) return null;
  // Session V Part 15: with no AI connected, Chrome's on-device model can reword it, when the person turned it on.
  const onDevice = !connected && options.data.onDevice === true && languageModel() !== null;
  return <BriefLines brief={brief} footer={connected ? <SayItNicer brief={brief} session={session}/> : onDevice ? <SayItNicerOnDevice brief={brief}/> : null}/>;
}
/**
 * "Say it nicer" with Chrome's on-device model (Session V Part 15), from the person's click: the brief's lines (made on
 * this device under the local gates) go to the model inside Chrome on this computer; nothing is sent anywhere.
 */
function SayItNicerOnDevice({brief}: {brief: Brief}) {
  const [text, setText] = useState<string | null>(null), [busy, setBusy] = useState(false), [note, setNote] = useState('');
  const run = async () => {
    setBusy(true); setNote(''); zigiSignals.emit('model_loading');
    try {
      // Never Chrome's download from here: only Settings starts it, from its own button.
      if (await onDeviceAvailability() !== 'available') { setNote(ON_DEVICE_NOT_READY); return; }
      const model = await onDeviceSession({system: SAY_NICER_SYSTEM});
      try { const reply = shortReply(await model.prompt(briefForAi(brief))); if (reply) setText(reply); else setNote(ON_DEVICE_FAILED); } finally { model.destroy(); }
    } catch { setNote(ON_DEVICE_FAILED); }
    finally { setBusy(false); zigiSignals.emit('model_ready'); }
  };
  return <div className="ai-brief-ai">
    {text ? <><p className="ai-brief-nicer">{text}</p><p className="ai-note">Reworded by Chrome&rsquo;s on-device model from the lines above, on this computer.</p></>
      : <button type="button" className="text-link" disabled={busy} onClick={() => void run()}>{busy ? 'Rewording…' : 'Say it nicer · on this computer'}</button>}
    {note && <p className="ai-note" role="status">{note}</p>}
  </div>;
}
export function BriefLines({brief, footer}: {brief: Brief; footer?: ReactNode}) {
  return <section className="ai-brief" aria-label="Your morning brief">
    <p className="ai-brief-title">Your day, from your records</p>
    <ul className="ai-brief-lines">{brief.lines.map(line => <li key={line}>{line}</li>)}</ul>
    <p className="ai-note ai-brief-label">{BRIEF_LABEL}</p>
    {footer}
  </section>;
}
function SayItNicer({brief, session}: {brief: Brief; session: ChatSession}) {
  const data = briefForAi(brief);
  return <div className="ai-brief-ai"><button type="button" className="text-link" onClick={() => void session.send(SAY_IT_NICER, {withContext: false, extra: {text: data, handles: []}})}>Say it nicer</button><AiSees label="What “Say it nicer” sends" instruction={SAY_IT_NICER} data={data}/></div>;
}
export function ProactiveChips({context, connected, onChip, onView}: {context: Context; connected: boolean; onChip: (text: string) => void; onView: (view: ProactiveView) => void}) {
  const zigi = useDeviceRecord(ZIGI), env = useEnv(context, connected ? 'provider' : 'local');
  const view: ChipView = context.area === 'wealth' ? wealthView(context.pathname) : null;
  const day = env?.habitDay ?? new Date().toISOString().slice(0, 10);
  const [message, setMessage] = useState('');
  const chips = useMemo(() => chipsFor({area: context.area, view, env, day, dismissed: dismissedOn(zigi.data, day)}), [context.area, view, env, day, zigi.data]);
  const run = (chip: Chip) => { if (chip.action === 'ask') onChip(chip.text); else onView(chip.action); };
  const hide = (chip: Chip) => {
    try { dismissFor(getAppStorage(), day, chip.id); window.dispatchEvent(new CustomEvent(ZIGI_STORE_EVENT, {detail: ZIGI_KEY})); setMessage('Hidden for today.'); }
    catch { setMessage('This could not be hidden on this device.'); }
  };
  return <div className="ai-chips ai-proactive-chips" role="group" aria-label="Suggestions">
    {chips.map(chip => chip.id.startsWith('starter:') ? <button key={chip.id} type="button" className="ai-chip" onClick={() => run(chip)}>{chip.text}</button>
      : <span key={chip.id} className="ai-chip-pair"><button type="button" className="ai-chip ai-chip-data" onClick={() => run(chip)}>{chip.text}</button><button type="button" className="ai-chip-hide" onClick={() => hide(chip)} aria-label={`Hide for today: ${chip.text}`} title="Hide for today">×</button></span>)}
    {message && <span className="ai-sr-only" role="status">{message}</span>}
  </div>;
}
export function ProactiveEntries({onView}: {onView: (view: ProactiveView) => void}) {
  return <div className="ai-proactive-entries"><button type="button" className="secondary" onClick={() => onView('review')}>Your week</button><button type="button" className="secondary" onClick={() => onView('insights')}>Patterns</button></div>;
}
function ViewFrame({title, onBack, children}: {title: string; onBack: () => void; children: ReactNode}) {
  return <section className="ai-proactive-view" aria-label={title}>
    <header className="ai-proactive-head"><h3>{title}</h3><button type="button" className="text-link" onClick={onBack}>Back to the chat</button></header>
    {children}
  </section>;
}
export function ReviewView({context, connected, session, onBack}: {context: Context; connected: boolean; session: ChatSession; onBack: () => void}) {
  const local = useEnv(context, 'local'), outbound = useEnv(context, 'provider');
  const review = useMemo(() => local ? localReview(local) : null, [local]);
  const data = useMemo(() => connected && outbound ? reviewForAi(outbound) : null, [connected, outbound]);
  // Session V Part 12: ZIGi looks encouraging while the person looks back at their week.
  const shown = review !== null;
  useEffect(() => { if (shown) zigiSignals.emit('week_opened'); }, [shown]);
  return <ViewFrame title="Your week with ZIGi" onBack={onBack}>
    {!review ? <p className="ai-note">The weekly review is not available on this device yet; it starts on Today.</p> : <>
      <p className="ai-note">Your review week, {review.from} to {review.to}, read on this device. Counts, not grades: a skipped day is part of a plan.</p>
      <ul className="ai-review-lines">
        <li>{review.checkIns} habit check-ins{review.busiestDay ? `; the busiest day was ${review.busiestDay}` : ''}.</li>
        <li>{review.contributions} goal contributions recorded.</li>
        <li>{review.quietDays.length ? `Days with a habit planned and no check-in: ${review.quietDays.length} (${review.quietDays.join(', ')}).` : 'Every day with a habit planned had a check-in.'}</li>
        {review.lastIntention && <li>Your intention last week: {review.lastIntention}</li>}
      </ul>
      {review.habits.length > 0 && <table className="ai-review-table"><thead><tr><th scope="col">Habit</th><th scope="col">Done</th><th scope="col">Planned</th><th scope="col">Skipped</th></tr></thead>
        <tbody>{review.habits.map(h => <tr key={h.title}><th scope="row">{h.title}</th><td>{h.done}</td><td>{h.scheduled}</td><td>{h.skipped}</td></tr>)}</tbody></table>}
      {review.health ? review.health.length > 0 && <ul className="ai-review-lines">{review.health.map(line => <li key={line}>{line}</li>)}</ul> : <p className="ai-note">Health is not part of this review: it isn&rsquo;t shared with ZIGi.</p>}
      <p className="ai-note">You write the review yourself on Today; ZIGi only proposes this week&rsquo;s intention as a card, and only when you ask.</p>
      {connected && data && <div className="ai-brief-ai"><button type="button" className="secondary" onClick={() => { void session.send(REFLECT_ASK, {withContext: false, extra: {text: data, handles: []}}); onBack(); }}>Ask my AI for a reflection</button><AiSees label="What the reflection request sends" instruction={REFLECT_ASK} data={data}/></div>}
    </>}
  </ViewFrame>;
}
export function InsightsView({context, connected, session, onBack}: {context: Context; connected: boolean; session: ChatSession; onBack: () => void}) {
  const local = useEnv(context, 'local'), links = useHabitHealthLinks();
  const cards = useMemo(() => local ? zigiInsights(local, links.loaded && !links.unreadable ? links.data : undefined) : [], [local, links.loaded, links.unreadable, links.data]);
  const ask = (sentence: string, sample: string) => `## A pattern ZIGi found in my records (counts made on this device)\n${sentence}\n${sample}\n${PATTERN_NOT_PROOF}`;
  const question = 'Help me understand this pattern in my own records. It is a pattern, not proof of a cause: give no medical or financial advice.';
  return <ViewFrame title="Patterns in your records" onBack={onBack}>
    <p className="ai-note">{INSIGHT_RULES} {PATTERN_NOT_PROOF}</p>
    {!cards.length ? <p className="ai-note">No pattern has enough days on both sides yet. Keep recording as you do; nothing here changes what you log.</p>
      : <ul className="ai-insights">{cards.map(card => {
        const sample = sampleLine(card), outbound = connected && (!usesHealth(card) || context.gates.health);
        return <li key={card.id} className="ai-insight"><p className="ai-insight-sentence">{card.sentence}</p><p className="ai-note">{sample}</p>
          {outbound && <div className="ai-brief-ai"><button type="button" className="text-link" onClick={() => { void session.send(question, {withContext: false, extra: {text: ask(card.sentence, sample), handles: []}}); onBack(); }}>Ask my AI about this pattern</button><AiSees label="What this question sends" instruction={question} data={ask(card.sentence, sample)}/></div>}
        </li>;
      })}</ul>}
  </ViewFrame>;
}

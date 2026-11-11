'use client';
import {useCallback, useEffect, useRef} from 'react';
import type {HudPreset} from '../../../lib/nova/layout';
import type {AskDevice, MakeRequest} from '../../../lib/nova/stage/record';
import type {ToolSources} from '../../../lib/ai/tools/env';
import {readDeviceRecord} from '../../../lib/device-record';
import type {EngineLook} from '../../../lib/nova/summon/engine-look';
import {lineData, stageLines, type LineData, type LineWeather} from '../../../lib/nova/summon/lines';
import {asksOf, NOVA_STAGE} from '../../../lib/nova/stage/record';
import {mergeSummons, replyWidgets, stageCalls, stageOwns, summonFor, summonForTools, unsafeWords, type StageCommand, type SummonContext, type SummonLang, type SummonPlan} from '../../../lib/nova/summon/summon';
import {answerWords, commandAskWords, commandWords, lineWords, ONE_TAP, stageAnswerText} from '../../../lib/nova/summon/words';
import {getAppStorage, isShowcase, showcaseDay} from '../../../lib/showcase-storage';
import {formatDate, formatTime} from '../../../lib/visual-format';
import {weatherAnswer, WEATHER_OFF_WORDS} from '../../../lib/nova/world/ask';
import {NOVA_WORLD, placeOf, readingOf, worldOn} from '../../../lib/nova/world/record';
import {SHOWCASE_PLACE, showcaseReading} from '../../../lib/nova/world/showcase';
import {WORKOUTS} from '../../../lib/workouts/schema';
import type {ChatSession} from '../../ai/use-chat-session';
import type {StageAsk, StageGates} from './use-stage';

/**
 * Session AM (ADR-038 D4–D7, A4): the summon step inside NOVA's chat engine. Every request still goes through ZIGi's one
 * engine on NOVA's surface (the safety guard first, then on-device answers, then the person's model); this hook adds only
 * *which widgets* a request makes, and tells the stage:
 * - a stage command ("clear the stage", "pin the weather") or a plain "show me …" is answered on the stage itself, on the
 *   device, at once (`direct`): NOVA says what is on the stage and the widgets are made;
 * - any other question is answered by the engine; when its reply arrives, the question's own widgets and the lookups the
 *   reply used (the on-device answer's calls, or the tools the person's model ran) are made (`resolve`).
 * A message the safety guard answers makes nothing (lib/nova/summon/summon.ts checks it first).
 *
 * The engine comes first (the lead's rule, after the browser specs): the stage answers by itself only for a stage command
 * and for a widget request the on-device engine has no answer of its own for; whatever the engine says itself (an answer
 * from records, a card to confirm, "Opening …", a note, a permissions answer) stays its reply, word for word, and a widget
 * is made beside it only when it belongs to that reply (lib/nova/summon/summon.ts `stageOwns`, `replyWidgets`).
 *
 * Design review AM-D2, AM-D3, AM-D12: what the stage says is each made widget's own one-line figure summary
 * (lib/nova/summon/lines.ts), written from the widget's selector under the widget's own switch (`bridge.gateOpen`): a
 * closed switch gives the locked sentence, never a figure. The records are those the chat engine already read for this
 * moment (`sources`), and the few that are not there are read here with the widgets' own reader.
 */
export type StageAnswer = {id: string; question: string; text: string; by: 'device' | 'model'; decision: boolean;
  /** The widgets this answer speaks for (design review AM-D30): once none of them is on the stage, the answer is stale. */
  widgets?: readonly string[]};
export type StageBridge = {
  device: AskDevice;
  available: (id: string) => boolean;
  make: (requests: readonly MakeRequest[], ask?: StageAsk) => boolean;
  command: (command: Exclude<StageCommand, {kind: 'arrangement'}>) => boolean;
  arrangement: (preset: HudPreset) => void;
  noteAsk: (ask: StageAsk, widgets?: readonly MakeRequest[]) => void;
  setGates: (gates: StageGates | null) => void;
  /** The newest reply, for the stage's own line under the star (null: nothing to show). */
  answer: (answer: StageAnswer | null) => void;
  /** Something in the conversation needs the person (a failure, a size or spend question): the stage opens it. */
  attention: () => void;
  /** Whether a widget's switch is open right now (unknown reads as closed). */
  gateOpen: (id: string) => boolean;
};
type Turn = ChatSession['chat']['turns'][number];
/** The weather as the Weather and Sun widgets read it (components/nova/widgets/use-weather.ts): the Showcase's example, or this device's record. Nothing is fetched. */
function weatherNow(): LineWeather | null {
  try {
    if (isShowcase()) return {kind: 'live', place: SHOWCASE_PLACE.name, reading: showcaseReading(showcaseDay() ?? '2026-11-11'), example: true};
    const read = readDeviceRecord(getAppStorage(), NOVA_WORLD);
    if (read.unreadable) return null;
    if (!worldOn(read.data)) return {kind: 'off'};
    const place = placeOf(read.data), reading = readingOf(read.data);
    if (!place) return {kind: 'no-place'};
    return reading ? {kind: 'live', place: place.name, reading, example: false} : {kind: 'asking', place: place.name};
  } catch { return null; }
}
/** The records a line needs that the chat engine's sources do not hold, read as their widgets read them. */
function deviceExtras(): Pick<LineData, 'workouts' | 'weather' | 'asks'> {
  const record = <T,>(read: () => T | null): T | null => { try { return read(); } catch { return null; } };
  return {
    workouts: record(() => { const r = readDeviceRecord(getAppStorage(), WORKOUTS); return r.unreadable ? null : r.data; }),
    weather: weatherNow(),
    asks: record(() => { const r = readDeviceRecord(getAppStorage(), NOVA_STAGE); return r.unreadable ? null : [...asksOf(r.data)].sort((a, b) => Date.parse(b.at) - Date.parse(a.at)); }),
  };
}
export function useSummoner({bridge, session, say, goals, lookupsFor, sources, extras, engine}: {
  bridge: StageBridge | undefined; session: ChatSession; say: (shown: string, text: string) => void;
  /** The records NOVA's chat engine read for this moment (null on a private screen or before they are read): the lines' figures. */
  sources?: () => ToolSources | null;
  /** NOVA's own state for its lines: what answers now, and what NOVA may see. */
  extras?: () => Pick<LineData, 'brain' | 'sees'>;
  /** What the on-device engine would answer to these words (lib/nova/summon/engine-look.ts). Absent: the stage answers a plain "show me …" itself, as before. */
  engine?: (text: string) => EngineLook;
  /** The lookups a model's reply ran, with their results (this session only): a refused call is never applied (security review AM-S6). */
  lookupsFor?: ChatSession['lookupsFor'];
  /** The person's goals on this device (ids and names), so "am I on track for Japan" finds its goal. */
  goals: () => SummonContext['goals'];
}) {
  const said = useRef<{text: string; widgets: string[]} | null>(null);
  const pending = useRef<{question: string; plan: SummonPlan} | null>(null), seen = useRef<{chat: string; ids: Set<string>} | null>(null), kept = useRef(session.kept);
  useEffect(() => { kept.current = session.kept; }, [session.kept]);
  const context = useCallback((): SummonContext => ({goals: goals(), ...(bridge ? {available: bridge.available, gateOpen: bridge.gateOpen} : {})}), [bridge, goals]);
  const chatNow = useRef(session.chat.id); chatNow.current = session.chat.id;
  /** Each widget's one line, from the records of this moment, under the widget's own switch. */
  const linesFor = useCallback((widgets: SummonPlan['widgets'], lang: SummonLang): Record<string, string> => {
    if (!bridge || !widgets.length) return {};
    try { return stageLines(widgets, lineData(sources?.() ?? null, bridge.gateOpen, {...deviceExtras(), ...(extras?.() ?? {})}), lang, new Date()); } catch { return {}; }
  }, [bridge, sources, extras]);
  /** Before the engine: true when the stage answered the words itself (a command, or a widget request the engine has no answer for). */
  const direct = useCallback((text: string): boolean => {
    if (!bridge) return false;
    // Words the engine refuses or answers with the guard (a secret, a card number, a guarded topic) are the engine's alone:
    // nothing is made, nothing is kept as a request, and the words are not held here.
    if (unsafeWords(text)) { pending.current = null; bridge.attention(); return false; }
    const plan = summonFor(text, context()), ask: StageAsk = {text, by: 'device', device: bridge.device, kept: kept.current, chat: chatNow.current};
    pending.current = null;
    if (plan.command && bridge.device === 'phone') { say(text, plan.lang === 'nl' ? 'Dat is voor NOVA op een computer: op een telefoon is er geen podium, hier praat je met NOVA.' : 'That is for NOVA on a computer: a phone has no stage, here you talk with NOVA.'); return true; }
    if (plan.command) {
      let done = true;
      if (plan.command.kind === 'arrangement') bridge.arrangement(plan.command.preset); else done = bridge.command(plan.command);
      // Security review AM-S5 (second pass): a command is kept in the stage's own words, never the person's free text.
      bridge.noteAsk({...ask, text: commandAskWords(plan.command)}, 'id' in plan.command ? [{id: plan.command.id}] : []);
      say(text, commandWords(plan.command, plan.lang, done));
      return true;
    }
    // The engine comes first: the stage answers by itself only when the on-device engine has no answer of its own for these
    // words (or, with a model connected, for a plain "show me …", as before). Without the engine's look: as before.
    let look: EngineLook = {kind: plan.direct ? 'fallback' : 'other', calls: []};
    if (plan.widgets.length && engine) { try { look = engine(text); } catch { look = {kind: 'other', calls: []}; } }
    // The stage's own one-tap requests ("Agenda", "What's next") make their widget where the engine would open a page or
    // read out a brief; the engine's answers from records still come first (the widget is then made beside them).
    const owns = stageOwns(plan, look.kind, look.kind === 'other' && ONE_TAP.some(tap => tap.ask === text.trim()));
    // A phone has no stage (NOVA is a chat agent there): a command for the stage says so, the weather and the time are
    // answered in words, a widget request is answered with its widgets' short lines (design review AM-D26), and every other
    // request goes to the engine, which answers in words; the request is kept with the widgets it would make, for the computer (D19).
    if (bridge.device === 'phone') {
      const only = plan.widgets.length === 1 ? plan.widgets[0]!.id : null;
      if (owns && (only === 'weather' || only === 'sun')) {
        bridge.make(plan.widgets, ask);
        // Security review AM-S4: the Showcase asks no service, on a phone either.
        if (isShowcase()) { say(text, plan.lang === 'nl' ? 'In de Showcase wordt geen weerdienst gevraagd. Op een computer toont de weerwidget voorbeeldwaarden, als voorbeeld gelabeld.' : 'In the Showcase no weather service is asked. On a computer its weather widget shows example values, labelled as an example.'); return true; }
        void weatherAnswer(getAppStorage(), new Date(), plan.lang).then(words => say(text, words)).catch(() => say(text, WEATHER_OFF_WORDS[plan.lang]));
        return true;
      }
      if (owns && only === 'time') { bridge.make(plan.widgets, ask); const clock = new Date(); say(text, plan.lang === 'nl' ? `Het is ${formatTime(clock)}, ${formatDate(clock, {weekday: true})}.` : `It is ${formatTime(clock)}, ${formatDate(clock, {weekday: true})}.`); return true; }
      // AM-D26: the short lines instead of the long record list, when the stage owns the answer, or for a plain "show me …"
      // whose on-device answer would only read out the same records (never in place of a card, a navigation or a note).
      const dump = plan.direct && look.kind === 'records' && replyWidgets(plan, {kind: 'answer', calls: look.calls, card: false}, context()).length > 0;
      const short = owns || dump ? lineWords(plan.widgets, linesFor(plan.widgets, plan.lang), plan.lang) : '';
      if (short) { bridge.make(plan.widgets, ask); say(text, short); return true; }
      pending.current = {question: text, plan};
      return false;
    }
    if (owns) {
      const lines = linesFor(plan.widgets, plan.lang);
      bridge.make(plan.widgets, {...ask, lines});
      said.current = {text: answerWords(plan.widgets, lines, plan.lang), widgets: plan.widgets.map(w => w.id)};
      say(text, said.current.text);
      return true;
    }
    pending.current = {question: text, plan};
    // Words the stage has no widget for are a conversation: it opens at once, as it always did (A1), so a long or a careful
    // answer is read whole there and a model's reply is seen as it is written. A request with a widget is answered under the star.
    if (!plan.widgets.length) bridge.attention();
    return false;
  }, [bridge, context, say, engine, linesFor]);
  /** A question that reaches the engine by another way (a welcome chip, "ask this instead"): its widgets wait for the reply too. */
  const note = useCallback((text: string) => { if (!bridge) return; if (unsafeWords(text)) { pending.current = null; return; } if (pending.current?.question !== text) pending.current = {question: text, plan: summonFor(text, context())}; }, [bridge, context]);

  // When a reply arrives: make what the question and the reply's lookups ask for, and hand the reply to the stage's line.
  const turns = session.chat.turns, chatId = session.chat.id, status = session.status, localFor = session.localFor, parsed = session.parsed;
  useEffect(() => {
    if (!bridge) return;
    // The turns that were already there when this conversation opened are history, not new replies.
    if (seen.current?.chat !== chatId) { seen.current = {chat: chatId, ids: new Set(turns.map(t => t.id))}; return; }
    if (status !== 'idle') return;
    const known = seen.current.ids, fresh = turns.filter(t => !known.has(t.id));
    if (!fresh.length) return;
    for (const t of fresh) known.add(t.id);
    const reply = [...fresh].reverse().find((t: Turn) => t.role === 'assistant'), asked = [...fresh].reverse().find((t: Turn) => t.role === 'user');
    if (!reply) return;
    const local = localFor(reply.id), by = reply.source === 'local' || reply.source === 'on-device' ? 'device' as const : 'model' as const;
    const wait = pending.current; pending.current = null;
    const question = asked?.text ?? wait?.question ?? '';
    const p = parsed.get(reply.id), decision = !!(p && p.proposals.length) || local?.reply.kind === 'choices';
    const lang: SummonLang = wait?.plan.lang ?? 'en';
    let made: SummonPlan['widgets'] = [], lines: Record<string, string> = {};
    if (wait && wait.question === question) {
      // The on-device answer's own lookups; for a model's reply only the lookups that ran and succeeded (AM-S6): a call the
      // registry refused (a closed switch, bad arguments, no stage) is never turned into a widget or a command.
      const ran = by === 'model' ? (lookupsFor?.(reply.id) ?? []).filter(l => l.result.ok).map(l => ({tool: l.result.tool, args: l.args})) : null;
      const calls = ran ?? (local?.reply && 'calls' in local.reply ? local.reply.calls : []).map(c => ({tool: c.tool, args: c.args ?? null}));
      // A4: what the person's model asked the stage for explicitly comes first; then the question's own widgets and the lookups'.
      const asked = by === 'model' ? stageCalls(calls, context()) : {show: [], commands: []};
      // The device's own engine (never a model's words): a widget is made only when it belongs to the reply (`replyWidgets`:
      // the records it read; nothing beside a card, a navigation, a refusal or a note). A model's reply: as before.
      const widgets = reply.source === 'local' && local
        ? replyWidgets(wait.plan, {kind: local.reply.kind, calls, card: decision}, context())
        : mergeSummons(asked.show, mergeSummons(wait.plan.widgets, summonForTools(calls, context())));
      const ask: StageAsk = {text: question, by, device: bridge.device, kept: kept.current, chat: chatId};
      lines = linesFor(widgets, lang);
      if (widgets.length) { if (bridge.make(widgets, {...ask, lines})) made = widgets; } else bridge.noteAsk(ask);
      for (const command of asked.commands) bridge.command(command);
    }
    // The card under the star (design review AM-D12): the made widgets' short lines; else the reply cut at a sentence end.
    // The conversation keeps the reply whole. A card to confirm or a question back is the reply's own words.
    // AM-D3: the engine's general fallback beside a made widget is never the stage's answer; the widgets' lines are.
    const own = said.current?.text === reply.text ? said.current : null; said.current = null;
    const text = own ? own.text : stageAnswerText({made, lines, lang, reply: p?.text ?? reply.text, decision, fallback: local?.reply.kind === 'examples'});
    const speaks = own ? own.widgets : made.map(w => w.id);
    bridge.answer({id: reply.id, question, text, by, decision, ...(speaks.length ? {widgets: speaks} : {})});
  }, [bridge, turns, chatId, status, localFor, lookupsFor, parsed, context, linesFor]);
  return {direct, note};
}

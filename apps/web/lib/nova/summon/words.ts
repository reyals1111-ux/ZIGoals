import {looksHealth} from '../../ai/memory';
import {HUD_PRESET_LABEL} from '../layout';
import {RANGE_WORDS, type MakeRequest, type WidgetRange} from '../stage/record';
import {widgetSpec} from '../widgets/catalog';
import type {StageCommand, SummonLang} from './summon';

/**
 * Session AM (ADR-038 D6, D7): what NOVA says on the stage itself when a request is a plain "show me …" or a stage
 * command — the on-device answer, in the request's language. Design review AM-D2: a made widget is answered with its own
 * one-line figure summary (`answerWords`; the line is written in lib/nova/summon/lines.ts from the widget's selector, under
 * its switch); only a widget without a line is named ("On the stage: …"). Every line is one calm sentence.
 */
export const STAGE_LABEL = 'On the stage · made on this device, no AI used';
const NL_TITLES: Readonly<Record<string, string>> = {
  weight: 'Gewicht', sleep: 'Slaap', water: 'Water', steps: 'Stappen', workouts: 'Workouts', 'health-hud': 'Gezondheid', 'habits-hud': 'Gewoontes', 'habit-week': 'Gewoontes deze week',
  budgets: 'Budgetten', spending: 'Uitgaven', bills: 'Komende rekeningen', money: 'Volgende rekening en bijdrage', 'net-worth': 'Gevolgd vermogen', markets: 'Markten', 'wealth-hud': 'Vermogen in beeld',
  'goals-hud': 'Doelen', 'goal-pace': 'Tempo van je doel', 'goal-focus': 'Doel', 'agenda-clock': 'Agenda', tasks: 'Taken', orbit: 'Checklist', focus: 'Focus', journal: 'Dagboek', notes: 'Notities',
  briefs: 'Briefings', next: 'De volgende drie', sun: 'Zon', weather: 'Weer', time: 'Tijd', 'nova-sees': 'Wat NOVA kan zien', 'nova-brain': 'NOVA’s brein', requests: 'Je vragen', 'now-playing': 'Speelt nu', glance: 'Je dag',
};
const NL_RANGE: Readonly<Record<WidgetRange, string>> = {week: 'de afgelopen 7 dagen', month: 'de afgelopen 30 dagen', quarter: 'de afgelopen 90 dagen', year: 'de afgelopen 12 maanden'};
export const widgetTitle = (id: string, lang: SummonLang = 'en'): string => (lang === 'nl' ? NL_TITLES[id] : undefined) ?? widgetSpec(id)?.title ?? 'The widget';
/** A widget's range in words. Spending's month is this calendar month (lib/nova/cards/spending.ts, design review AM-D13), so it is named so. */
const rangeName = (id: string, range: WidgetRange, lang: SummonLang) => id === 'spending' && range === 'month' ? (lang === 'nl' ? 'deze maand' : 'this month') : lang === 'nl' ? NL_RANGE[range] : RANGE_WORDS[range];
const named = (w: MakeRequest, lang: SummonLang) => `${widgetTitle(w.id, lang)}${w.params?.range ? ` · ${rangeName(w.id, w.params.range, lang)}` : ''}`;
const list = (items: readonly string[], lang: SummonLang) => items.length <= 1 ? items[0] ?? '' : `${items.slice(0, -1).join(', ')} ${lang === 'nl' ? 'en' : 'and'} ${items.at(-1)}`;

/** "On the stage: Weight · the last 30 days and Sleep." The fallback when a widget has no line of its own (see `answerWords`). */
export function madeWords(widgets: readonly MakeRequest[], lang: SummonLang): string {
  if (!widgets.length) return '';
  return lang === 'nl' ? `Op het podium: ${list(widgets.map(w => named(w, lang)), lang)}.` : `On the stage: ${list(widgets.map(w => named(w, lang)), lang)}.`;
}
/**
 * Security review AM-S5 (D34 revised): a request about Health is kept in the history by its widgets' names, never by the
 * person's words — the stage record (which travels under the account's consent) then holds nothing that describes
 * health, and nothing is left behind by a Health deletion. "About Health" is the engine's own rule for health-like words
 * (lib/ai/memory.ts `looksHealth`, as for a remembered note, Q16) or a widget that reads under the Health gate.
 */
export function keptAskWords(text: string, widgets: readonly MakeRequest[]): string {
  if (!looksHealth(text) && !widgets.some(w => widgetSpec(w.id)?.gate === 'health')) return text;
  return widgets.length ? `Health: ${list(widgets.map(w => named(w, 'en')), 'en')}` : 'A request about Health';
}
/** How many widgets' lines one answer holds: the card under the star stays short (design review AM-D12). */
export const MAX_ANSWER_LINES = 2;
/** A line under its widget's name, unless the line names it itself ("Weather is off…", "Tracked wealth $…"). */
function titled(w: MakeRequest, line: string, lang: SummonLang): string {
  const title = named(w, lang), first = widgetTitle(w.id, lang).split(/\s+/)[0]!.toLowerCase();
  return line.toLowerCase().startsWith(first) ? line : `${title}: ${line}`;
}
/**
 * Session AM (design review AM-D2, AM-D12): what NOVA says when a request makes widgets — each widget's own one-line
 * figure summary (lib/nova/summon/lines.ts, written from the widget's selector under its switch), the same words for the
 * line under the star, the conversation and the announcement: "Habits this week: 4 of 7 habits done today; longest streak
 * 27 days." Only the first two widgets speak; a widget without a line is named with the others. With no line at all it is
 * "On the stage: …", as before.
 */
export function answerWords(widgets: readonly MakeRequest[], lines: Readonly<Record<string, string>>, lang: SummonLang): string {
  const spoken = widgets.filter(w => lines[w.id]).slice(0, MAX_ANSWER_LINES);
  if (!spoken.length) return madeWords(widgets, lang);
  const silent = widgets.filter(w => !lines[w.id]);
  return [...spoken.map(w => titled(w, lines[w.id]!, lang)), ...(silent.length ? [madeWords(silent, lang)] : [])].join(' ');
}
/** The lines alone, for a phone (no stage there): '' unless every widget of the request has one. */
export function lineWords(widgets: readonly MakeRequest[], lines: Readonly<Record<string, string>>, lang: SummonLang): string {
  return widgets.length && widgets.every(w => lines[w.id]) ? widgets.slice(0, MAX_ANSWER_LINES).map(w => titled(w, lines[w.id]!, lang)).join(' ') : '';
}
/**
 * The card under the star when no widget was made: the reply's first sentences, cut at a sentence end (never mid-word,
 * never a list), two at most and about 220 characters; the whole reply is in the conversation.
 */
export function sentenceCut(text: string, sentences = 2, max = 220): string {
  const flat = text.replace(/```[\s\S]*?```/g, ' ').split('\n').map(l => l.trim()).filter(l => l && !/^(?:[•*\-–]|\d+[.)])\s/.test(l)).join(' ').replace(/\s+/g, ' ').trim();
  const source = flat || text.replace(/\s+/g, ' ').trim();
  const parts = source.match(/[^.!?…]+(?:[.!?…]+(?=\s|$)|$)/g)?.map(x => x.trim()).filter(Boolean) ?? [];
  let out = '';
  for (const part of parts.slice(0, sentences)) { if (out && out.length + 1 + part.length > max) break; out = out ? `${out} ${part}` : part; }
  if (out.length <= max) return out;
  const cut = out.slice(0, max - 1), at = cut.lastIndexOf(' ');
  return `${(at > 40 ? cut.slice(0, at) : cut).replace(/[,;:\s]+$/, '')}…`;
}
/**
 * The card under the star for a reply (design review AM-D3, AM-D12). When the reply made widgets: their short lines —
 * always so beside the engine's general fallback (the stage owns that answer: the fallback's words are never the
 * stage's), and whenever a made widget has a line. A card to confirm or a question back keeps the reply's own words.
 * Otherwise the reply, cut at a sentence end; the conversation keeps it whole.
 */
export function stageAnswerText({made, lines, lang, reply, decision, fallback}: {made: readonly MakeRequest[]; lines: Readonly<Record<string, string>>; lang: SummonLang; reply: string; decision: boolean; fallback: boolean}): string {
  if (made.length && !decision && (fallback || made.some(w => lines[w.id]))) return answerWords(made, lines, lang);
  return sentenceCut(reply);
}
/**
 * The live region's line when widgets are made (art direction §8). Session AM (design review AM-D2): it carries the
 * figure too, in the widget's own line — "Weight · the last 30 days is on the stage: 81.4 kg, down 1.2 kg since 12 Oct.
 * 3 widgets on the stage." Without a line it names the widgets, as before.
 */
export function announceMade(widgets: readonly MakeRequest[], total: number, lines: Readonly<Record<string, string>> = {}): string {
  if (!widgets.length) return '';
  const count = `${total} ${total === 1 ? 'widget' : 'widgets'} on the stage.`, spoken = widgets.filter(w => lines[w.id]).slice(0, MAX_ANSWER_LINES);
  if (widgets.length === 1 && spoken.length === 1) return `${named(widgets[0]!, 'en')} is on the stage: ${lines[widgets[0]!.id]} ${count}`;
  const names = list(widgets.map(w => named(w, 'en')), 'en');
  return `Added: ${names}. ${spoken.map(w => `${titled(w, lines[w.id]!, 'en')} `).join('')}${count}`;
}
/**
 * Security review AM-S5 (second pass): a stage command is kept in the history in the stage's own words, never the
 * person's free text ("sluit gewicht, ik woog 82,4" is kept as "Close: Weight", and through `keptAskWords` with its
 * widget as "Health: Weight"): the command's kind and the widget's catalogue title, in English, and nothing else.
 */
export function commandAskWords(command: StageCommand): string {
  const cap = (word: string) => word.charAt(0).toUpperCase() + word.slice(1);
  switch (command.kind) {
    case 'clear': return 'Clear the stage';
    case 'arrangement': return `Arrangement: ${cap(HUD_PRESET_LABEL[command.preset])}`;
    default: return `${cap(command.kind)}: ${widgetTitle(command.id)}`;
  }
}
/** What NOVA says after a stage command; `done` false: there was nothing to do. */
export function commandWords(command: StageCommand, lang: SummonLang, done: boolean): string {
  const title = 'id' in command ? widgetTitle(command.id, lang) : '';
  if (lang === 'nl') {
    switch (command.kind) {
      case 'clear': return done ? 'Het podium is leeg. Wat je hebt vastgezet, blijft staan.' : 'Het podium was al leeg.';
      case 'close': return done ? `${title} is gesloten.` : `${title} stond niet op het podium.`;
      case 'hide': return done ? `${title} staat in het dok. Tik erop om het terug te halen.` : `${title} stond niet op het podium.`;
      case 'pin': return done ? `${title} is vastgezet en blijft op het podium.` : `${title} was al vastgezet.`;
      case 'unpin': return done ? `${title} is losgemaakt.` : `${title} was niet vastgezet.`;
      case 'arrangement': return `De opstelling ${HUD_PRESET_LABEL[command.preset]} staat op het podium.`;
    }
  }
  switch (command.kind) {
    case 'clear': return done ? 'The stage is clear. What you pinned stays.' : 'The stage was already clear.';
    case 'close': return done ? `${title} is closed.` : `${title} was not on the stage.`;
    case 'hide': return done ? `${title} is in the dock. Tap it to bring it back.` : `${title} was not on the stage.`;
    case 'pin': return done ? `${title} is pinned and stays on the stage.` : `${title} was already pinned.`;
    case 'unpin': return done ? `${title} is unpinned.` : `${title} was not pinned.`;
    case 'arrangement': return `The ${HUD_PRESET_LABEL[command.preset]} arrangement is on the stage.`;
  }
}
/** The one-tap requests above the command bar (art direction §3), in the person's own words; the page keeps those whose widget can show. */
export const ONE_TAP: readonly {id: string; label: string; ask: string; widget: string}[] = [
  {id: 'day', label: 'My day', ask: 'Show my day', widget: 'glance'},
  {id: 'next', label: 'What’s next', ask: 'What’s next?', widget: 'next'},
  {id: 'habits', label: 'Habits this week', ask: 'Show my habits this week', widget: 'habit-week'},
  {id: 'weight', label: 'Weight this month', ask: 'What’s my weight progress this month?', widget: 'weight'},
  {id: 'goals', label: 'Goals', ask: 'How are my goals?', widget: 'goals-hud'},
  {id: 'money', label: 'Tracked wealth', ask: 'Show my tracked wealth', widget: 'net-worth'},
  {id: 'agenda', label: 'Agenda', ask: 'Show my agenda', widget: 'agenda-clock'},
  {id: 'weather', label: 'Weather', ask: 'What’s the weather?', widget: 'weather'},
];

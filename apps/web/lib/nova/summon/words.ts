import {HUD_PRESET_LABEL} from '../layout';
import {RANGE_WORDS, type MakeRequest, type WidgetRange} from '../stage/record';
import {widgetSpec} from '../widgets/catalog';
import type {StageCommand, SummonLang} from './summon';

/**
 * Session AM (ADR-038 D6, D7): what NOVA says on the stage itself when a request is a plain "show me …" or a stage
 * command — the on-device answer, in the request's language, naming what is on the stage. No figure is said here: the
 * widget shows the figures, with their source and time. Every line is one calm sentence.
 */
export const STAGE_LABEL = 'On the stage · made on this device, no AI used';
const NL_TITLES: Readonly<Record<string, string>> = {
  weight: 'Gewicht', sleep: 'Slaap', water: 'Water', steps: 'Stappen', workouts: 'Workouts', 'health-hud': 'Gezondheid', 'habits-hud': 'Gewoontes', 'habit-week': 'Gewoontes deze week',
  budgets: 'Budgetten', spending: 'Uitgaven', bills: 'Komende rekeningen', money: 'Volgende rekening en bijdrage', 'net-worth': 'Vermogen', markets: 'Markten', 'wealth-hud': 'Vermogen in beeld',
  'goals-hud': 'Doelen', 'goal-pace': 'Tempo van je doel', 'goal-focus': 'Doel', 'agenda-clock': 'Agenda', tasks: 'Taken', orbit: 'Checklist', focus: 'Focus', journal: 'Dagboek', notes: 'Notities',
  briefs: 'Briefings', next: 'De volgende drie', sun: 'Zon', weather: 'Weer', time: 'Tijd', 'nova-sees': 'Wat NOVA kan zien', 'nova-brain': 'NOVA’s brein', requests: 'Je vragen', 'now-playing': 'Speelt nu', glance: 'Je dag',
};
const NL_RANGE: Readonly<Record<WidgetRange, string>> = {week: 'de afgelopen 7 dagen', month: 'de afgelopen 30 dagen', quarter: 'de afgelopen 90 dagen', year: 'de afgelopen 12 maanden'};
export const widgetTitle = (id: string, lang: SummonLang = 'en'): string => (lang === 'nl' ? NL_TITLES[id] : undefined) ?? widgetSpec(id)?.title ?? 'The widget';
const named = (w: MakeRequest, lang: SummonLang) => `${widgetTitle(w.id, lang)}${w.params?.range ? ` · ${lang === 'nl' ? NL_RANGE[w.params.range] : RANGE_WORDS[w.params.range]}` : ''}`;
const list = (items: readonly string[], lang: SummonLang) => items.length <= 1 ? items[0] ?? '' : `${items.slice(0, -1).join(', ')} ${lang === 'nl' ? 'en' : 'and'} ${items.at(-1)}`;

/** "On the stage: Weight · the last 30 days and Sleep." */
export function madeWords(widgets: readonly MakeRequest[], lang: SummonLang): string {
  if (!widgets.length) return '';
  return lang === 'nl' ? `Op het podium: ${list(widgets.map(w => named(w, lang)), lang)}.` : `On the stage: ${list(widgets.map(w => named(w, lang)), lang)}.`;
}
/** The live region's line when widgets are made (art direction §8): the names only; each widget reads its own figures. */
export function announceMade(widgets: readonly MakeRequest[], total: number): string {
  if (!widgets.length) return '';
  const names = list(widgets.map(w => named(w, 'en')), 'en');
  return `Added: ${names}. ${total} ${total === 1 ? 'widget' : 'widgets'} on the stage.`;
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
  {id: 'money', label: 'Net worth', ask: 'Show my net worth', widget: 'net-worth'},
  {id: 'agenda', label: 'Agenda', ask: 'Show my agenda', widget: 'agenda-clock'},
  {id: 'weather', label: 'Weather', ask: 'What’s the weather?', widget: 'weather'},
];

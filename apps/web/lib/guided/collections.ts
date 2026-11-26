import {GUIDES} from '../meditation/guides';
import {STRETCHES, stretchMinutes} from '../calm/stretches';
import {HABIT_GROUP_LABEL, habitTemplate} from '../templates/habits';
import {ROUTINE_TEMPLATES, type RoutineTemplate} from '../routines/templates';
import {PROGRAMME_CARE, programById, type GuidedAction} from './programs';
import {SLEEP_LESSONS, type SleepLesson} from './sleep-lessons';
import type {CollectionId} from './collection-titles';

/**
 * Session AW (content; owner decision 1d, ADR-046; LEDGER #82, Calm's Lifestyle hub, its written collections): what the
 * app already has, grouped by theme in Guided journeys: the written programmes and journeys, the ten written meditation
 * guides (lib/meditation/guides.ts), the Move gently stretches (lib/calm/stretches.ts), the habit ideas, the routine
 * templates and the places in Health. Each collection is a short written intro and a list of links; "Sleep better" also
 * holds the seven short lessons (lib/guided/sleep-lessons.ts). Nothing here is recommended to anyone or stored: the
 * person reads, follows a link, or does nothing. Every item is looked up from its own source when this module loads, so a
 * renamed or removed item fails the build and the tests, not the page. Pure data.
 */
export type CollectionItemKind = 'programme' | 'journey' | 'guide' | 'stretch' | 'habit' | 'routine' | 'place';
export type CollectionItem = {
  id: string; kind: CollectionItemKind; title: string; note: string;
  /** Where it is done. A programme or journey has none: it is on this page (`onPage`, its program id). */
  action?: GuidedAction; onPage?: string;
  /** A written guide's or stretch's steps, readable in place (and with Read aloud). */
  text?: readonly string[];
};
export type GuidedCollection = {id: CollectionId; title: string; intro: string; care?: string; items: readonly CollectionItem[]; lessons?: readonly SleepLesson[]};

/** The word shown above each item, saying what kind it is. */
export const ITEM_KIND_LABEL: Readonly<Record<CollectionItemKind, string>> = {
  programme: 'Written programme', journey: 'Journey', guide: 'Written practice', stretch: 'Stretch', habit: 'Habit idea', routine: 'Routine', place: 'In the app',
};

const link = (href: GuidedAction['href'], label: string): GuidedAction => ({kind: 'link', href, label});
const MEDITATION = link('/app/health?view=meditation', 'Open Meditation');

function program(id: string, kind: 'programme' | 'journey'): CollectionItem {
  const p = programById(id);
  if (!p || (kind === 'programme') !== !!p.days) throw Error(`Collections: the ${kind} "${id}" is missing from lib/guided/programs.ts.`);
  return {id: `${kind}-${id}`, kind, title: p.title, note: p.summary, onPage: p.id};
}
function guide(id: string): CollectionItem {
  const g = GUIDES.find(x => x.id === id);
  if (!g) throw Error(`Collections: the meditation guide "${id}" is missing from lib/meditation/guides.ts.`);
  return {id: `guide-${id}`, kind: 'guide', title: `${g.en.title}, ${g.minutes} minutes`, note: 'Read it here, then sit with the timer in Health → Meditation → Begin.', action: MEDITATION, text: g.en.steps};
}
function stretch(id: string): CollectionItem {
  const s = STRETCHES.find(x => x.id === id);
  if (!s) throw Error(`Collections: the stretch "${id}" is missing from lib/calm/stretches.ts.`);
  return {id: `stretch-${id}`, kind: 'stretch', title: `${s.en}, about ${stretchMinutes(s)} minutes`,
    note: `In Health → Meditation, open “Move gently” and choose “${s.en}” to go through it with a timer. Never stretch into pain.`,
    action: link('/app/health?view=meditation', 'Open Meditation (Move gently)'), text: s.steps.map(x => `${x.en.name}: ${x.en.cue}`)};
}
function habit(id: string, note: string): CollectionItem {
  const t = habitTemplate(id);
  if (!t) throw Error(`Collections: the habit idea "${id}" is missing from lib/templates/habits.ts.`);
  return {id: `habit-${id}`, kind: 'habit', title: t.title, note: `${note} In the new-habit form, choose “Start from an idea”, then ${HABIT_GROUP_LABEL[t.group]}.`, action: link('/app/habits?add=habit', 'Open the new-habit form')};
}
function routine(id: RoutineTemplate['id']): CollectionItem {
  const t = ROUTINE_TEMPLATES.find(r => r.id === id);
  if (!t) throw Error(`Collections: the routine template "${id}" is missing from lib/routines/templates.ts.`);
  return {id: `routine-${id}`, kind: 'routine', title: t.title, note: `${t.blurb} You can change or remove any step.`, action: link('/app/habits#routines', 'Open Routines')};
}
const place = (id: string, title: string, note: string, action: GuidedAction): CollectionItem => ({id: `place-${id}`, kind: 'place', title, note, action});

export const COLLECTIONS: readonly GuidedCollection[] = [
  {id: 'sleep-better', title: 'Sleep better', care: `${PROGRAMME_CARE} If sleep stays hard, talk to a doctor.`,
    intro: 'Small, steady changes around the evening and the morning. Read the seven short lessons at your own pace, try the week-long sleep reset, or choose one quiet practice for tonight.',
    lessons: SLEEP_LESSONS,
    items: [
      program('sleep-reset', 'programme'),
      place('sleep-log', 'Your sleep log', 'Log last night as it was: bedtime and wake-up time are enough. Every night you log is there to look back on.', link('/app/health?view=sleep', 'Open Sleep')),
      routine('evening'),
      habit('same-wake-time', 'The same wake-up time, weekends too, is a steady anchor.'),
      habit('wind-down', 'Thirty quiet minutes before bed, without screens.'),
      guide('evening'), guide('body-scan'), guide('long-out'),
      stretch('evening-unwind'),
    ]},
  {id: 'calm-down', title: 'Calm down', care: `${PROGRAMME_CARE} If worry or low mood stays with you, talk to a doctor.`,
    intro: 'A few minutes to slow down: a longer out-breath, a short written practice, a few words on paper. Any one of them is enough for today.',
    items: [
      guide('arrive'), guide('long-out'), guide('breath-count'), guide('sounds'), guide('hands'),
      place('grounding', 'Five, four, three, two, one: a grounding exercise', 'In Health → Meditation: five things you see, four you can touch, three you hear, two you smell, one you taste.', MEDITATION),
      habit('breathing-break', 'A minute of slow breathing, twice a day.'),
      program('calm-mind', 'journey'),
      program('meditation-start', 'programme'),
    ]},
  {id: 'move-gently', title: 'Move gently', care: PROGRAMME_CARE,
    intro: 'Gentle movement at your own pace: a few minutes of stretching, a slow walk, or a plan that builds a little each week. Never into pain, and fewer is fine on any day.',
    items: [
      stretch('wake-up'), stretch('desk-break'), stretch('neck-shoulders'), stretch('hips-back'), stretch('evening-unwind'),
      guide('walking'),
      program('walking-start', 'journey'),
      program('strength-start', 'programme'),
      program('run-5k', 'programme'),
    ]},
  {id: 'start-a-habit', title: 'Start a habit',
    intro: 'One small habit, made easy and kept: choose it, pair it with a moment that happens anyway, and come back to it after a missed day.',
    items: [
      program('habit-start', 'programme'),
      place('ideas', 'Start from an idea', 'The new-habit form lists ready ideas by theme, from water and reading to sleep and money. Each one is a starting point you can change.', link('/app/habits?add=habit', 'Open the new-habit form')),
      routine('morning'),
      habit('daylight', 'A few minutes outside, any time of day.'),
      habit('three-good-things', 'Small things count.'),
      program('reading-start', 'journey'),
      place('reminders', 'A gentle reminder', 'A reminder at the moment you chose, if it helps. You can change or turn it off any time.', link('/app/settings/reminders', 'Open Reminders')),
    ]},
];

export const collectionById = (id: string): GuidedCollection | undefined => COLLECTIONS.find(c => c.id === id);
/** The words Read aloud reads for a written guide or stretch: its title, then its steps. */
export const itemWords = (item: CollectionItem): string => [`${item.title}.`, ...(item.text ?? [])].join(' ');

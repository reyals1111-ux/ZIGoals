import type {BuiltInArea} from '../goal-extras/store';
import {GOAL_LIBRARY, type LibraryTemplate} from './goal-library';
import {HABIT_GROUP_LABEL, HABIT_TEMPLATES, type HabitTemplate} from './habits';
import {LIBRARY_HABITS} from './library-habits';
/** Every habit idea a person can pick (the starters and the library's), as the Habit ideas panel offers them. */
export const ALL_HABIT_TEMPLATES: readonly HabitTemplate[] = [...HABIT_TEMPLATES, ...LIBRARY_HABITS];
import {LIBRARY_GOAL_AREA} from './library-goals';

/**
 * Backlog #15 (AL-COMPETITOR-GAP-118): the curated template library, one static catalogue of every goal template
 * (GOAL_LIBRARY, `LibraryTemplate`) and every habit idea (HABIT_TEMPLATES, `HabitTemplate`), grouped by area. It holds
 * no data of its own and stores nothing: an entry is the existing template, and choosing one goes through the existing
 * paths (a goal fills the goal wizard as its ideas do, or opens `/app/goals/new?template=…`; a habit is added by Habit
 * ideas through `habitTemplateInputOf`). The added entries are in ./library-goals.ts and ./library-habits.ts.
 */
export const CATALOGUE_AREA_IDS = ['health', 'fitness', 'sleep', 'food', 'mind', 'money', 'learning', 'work', 'home', 'people', 'creativity', 'chess', 'fun'] as const;
export type CatalogueArea = typeof CATALOGUE_AREA_IDS[number];
// Every habit group is a library area, with the same label (Habit ideas' chips and the guided steps name them).
const LABEL: Record<CatalogueArea, string> = {...HABIT_GROUP_LABEL, fun: 'Fun & travel'};
export const CATALOGUE_AREAS: readonly {id: CatalogueArea; label: string}[] = CATALOGUE_AREA_IDS.map(id => ({id, label: LABEL[id]}));
export const catalogueAreaLabel = (id: CatalogueArea) => LABEL[id];

/** A goal template's library area: its own (added goals), a closer fit for some first-edition ones, else its life area's. */
const FROM_LIFE_AREA: Record<BuiltInArea, CatalogueArea> = {health: 'health', mind: 'mind', wealth: 'money', relationships: 'people', career: 'work', learning: 'learning', fun: 'fun'};
const FIRST_EDITION_AREA: Readonly<Record<string, CatalogueArea>> = {
  'run-10k': 'fitness', 'steps-8000': 'fitness', 'strength-12w': 'fitness', 'mobility-30': 'fitness', 'sleep-7h': 'sleep',
  'no-sugar-30': 'food', 'cook-30-recipes': 'food', 'deep-work': 'work', 'chess-rating': 'chess',
  'learn-instrument': 'creativity', 'creative-project': 'creativity', 'photo-a-day': 'creativity',
};
export const catalogueAreaOfGoal = (t: LibraryTemplate): CatalogueArea => LIBRARY_GOAL_AREA[t.id] ?? FIRST_EDITION_AREA[t.id] ?? FROM_LIFE_AREA[t.area];

export type CatalogueEntry =
  | {kind: 'goal'; id: `goal:${string}`; area: CatalogueArea; title: string; summary: string; goal: LibraryTemplate}
  | {kind: 'habit'; id: `habit:${string}`; area: CatalogueArea; title: string; summary: string; habit: HabitTemplate};

const byArea = (a: CatalogueEntry, b: CatalogueEntry) => CATALOGUE_AREA_IDS.indexOf(a.area) - CATALOGUE_AREA_IDS.indexOf(b.area);
/** The whole library, by area (goals before habits within an area, each in its own list's order). */
export const TEMPLATE_CATALOGUE: readonly CatalogueEntry[] = [
  ...GOAL_LIBRARY.map((goal): CatalogueEntry => ({kind: 'goal', id: `goal:${goal.id}`, area: catalogueAreaOfGoal(goal), title: goal.title, summary: goal.summary, goal})),
  ...ALL_HABIT_TEMPLATES.map((habit): CatalogueEntry => ({kind: 'habit', id: `habit:${habit.id}`, area: habit.group, title: habit.title, summary: habit.note, habit})),
].map((e, i) => ({e, i})).sort((a, b) => byArea(a.e, b.e) || a.i - b.i).map(x => x.e);

const fold = (s: string) => s.toLocaleLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '');
const wordsOf = (e: CatalogueEntry) => fold([e.title, e.summary, LABEL[e.area], ...(e.kind === 'goal' ? [...(e.goal.keywords ?? []), ...(e.goal.milestones ?? [])] : [e.habit.category])].join(' '));

/** Search by words in the title, summary, area, keywords and steps; every word must match (case and accents ignored). */
export function searchCatalogue(query: string, filter: {kind?: CatalogueEntry['kind']; area?: CatalogueArea | null} = {}): CatalogueEntry[] {
  const words = fold(query).split(/\s+/).filter(Boolean);
  return TEMPLATE_CATALOGUE.filter(e => (!filter.kind || e.kind === filter.kind) && (!filter.area || e.area === filter.area) && words.every(w => wordsOf(e).includes(w)));
}
/** The areas that hold entries of a kind, in the library's order (the chips a picker shows). */
export const catalogueAreasFor = (kind: CatalogueEntry['kind']) => CATALOGUE_AREAS.filter(a => TEMPLATE_CATALOGUE.some(e => e.kind === kind && e.area === a.id));

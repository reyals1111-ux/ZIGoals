/**
 * Session AL (DV-083a, DV-176, DV-179, DV-183; P-DV-38): the goal creator's idea buttons are the template library's own
 * entries, so one idea has one name, one set of steps and one kind wherever it appears. The button's title is the goal's
 * name ("Holiday fund" creates "Holiday fund"). An idea without a library entry keeps its own words.
 */
import {GOAL_IDEAS, type GoalIdea} from '../templates/goals';
import {templateById, type LibraryTemplate} from '../templates/goal-library';

export type WizardIdea = Omit<GoalIdea, 'type' | 'milestones'> & {type: 'VALUE' | 'PROJECT' | 'QUANTITY'; milestones?: readonly string[]; count?: {unit: string; target: number}};

/** The library entry an idea stands for, where the ids differ. */
const LIBRARY_ID: Record<string, string> = {holiday: 'holiday-fund', 'read-20-books': 'read-12'};

/**
 * A library template as a goal-creator idea (its name, kind, steps or count, and summary). Backlog #15: the creator's
 * library search fills the form through this too. An average or weight template has its own form, so it is no idea here.
 */
export function wizardIdeaOf(t: LibraryTemplate, base: Pick<GoalIdea, 'id' | 'category'>): WizardIdea | null {
 if (t.kind === 'average' || t.kind === 'health-weight') return null;
 const type = t.kind === 'value' ? 'VALUE' : t.kind === 'count' ? 'QUANTITY' : 'PROJECT';
 return {id: base.id, category: base.category, label: t.title, name: t.title, type, milestones: type === 'PROJECT' ? t.milestones : undefined, count: t.count, note: t.summary};
}

export const WIZARD_IDEAS: readonly WizardIdea[] = GOAL_IDEAS.map(idea => {
 const t = templateById(LIBRARY_ID[idea.id] ?? idea.id), filled = t && wizardIdeaOf(t, idea);
 return filled ? {...idea, ...filled} : idea;
});

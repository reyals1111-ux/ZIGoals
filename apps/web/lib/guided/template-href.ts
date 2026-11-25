import type {LibraryTemplate} from '../templates/goal-library';

/**
 * Where a goal template opens: the same rule as the template library's own `templateHref` (components/goals). Its own
 * small module (Session AW, programmes) so the goal library's search does not load the written programmes with it;
 * lib/guided/programs.ts re-exports it.
 */
export function goalTemplateHref(t: LibraryTemplate): `/app/${string}` {
  return t.kind === 'average' ? `/app/goals/average/new?template=${t.id}` : t.kind === 'health-weight' ? '/app/goals?health-goal=weight#goals-health' : `/app/goals/new?template=${t.id}`;
}

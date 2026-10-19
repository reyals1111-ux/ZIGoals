import * as z from 'zod';
import {cardHelp} from '../context/card-help';
import {checklistToday} from '../proactive/brief-sources';
import {planLines} from '../store/plans';
import {ok, provenance, text} from './format';
import {NO_ARGS, type ToolDefinition} from './types';

/**
 * Session AF (L4): three read-only tools beside `earn_rates`. `page_view` (P8.7): the page the person is looking at as
 * card ids and titles, never a value (nothing on Settings or a private screen; Health cards only with the gate).
 * `checklist_today` (P8.6): today's dots on the Checklist path, counts and names (Health dots only with the gate).
 * `zigi_plans` (P8.4): the plans ZIGi proposed as bundles and what became of each step, titles only. None writes or
 * fetches anything.
 */
export const pageView: ToolDefinition<{card?: string}> = {
  name: 'page_view', title: 'This page', area: 'today',
  description: 'What the person is looking at: the page and its cards\' titles and ids, which are in view, and the card they asked about, with a plain-words line for ZIGoals\' own cards. Titles only: no card\'s values.',
  parameters: {type: 'object', properties: {card: {type: 'string', description: 'One card\'s id from this page (optional).'}}},
  args: z.object({card: z.string().trim().min(1).max(80).optional()}),
  label: args => args.card ? `This page · ${text(args.card, 40)}` : 'This page',
  run(args, env, label) {
    const view = env.pageView;
    if (!view) return ok('page_view', label, provenance(env, 'screen, as titles only', null, null, null), {page: 'not shared: Settings, a private screen, or no page open', cards: []});
    const pick = args.card ? view.cards.filter(c => c.id === args.card) : view.cards;
    return ok('page_view', label, provenance(env, 'screen, as titles only', view.page, null, null), {page: view.page, route: view.route, focused: view.focused,
      cards: pick.slice(0, env.limits.rows).map(c => ({id: c.id, title: text(c.label, 60), inView: c.inView, ...(cardHelp(c.id, 'en') ? {about: cardHelp(c.id, 'en')} : {})})),
      ...(view.healthHidden ? {health: `${view.healthHidden} Health cards not shared with ZIGi`} : {}), values: 'never included: read them with the area\'s own tools'});
  },
};
export const checklistTodayTool: ToolDefinition<Record<string, never>> = {
  name: 'checklist_today', title: 'Checklist', area: 'habits',
  description: 'Today\'s dots on the person\'s Checklist path: how many are done, which are still open, by their names (Health dots only when Health is shared).',
  parameters: {type: 'object', properties: {}},
  args: NO_ARGS,
  label: () => 'Checklist · today',
  run(_args, env, label) {
    const list = checklistToday(env);
    return ok('checklist_today', label, provenance(env, 'Checklist', null, list ? {from: list.date, to: list.date, label: 'today'} : null, null),
      list ? {date: list.date, total: list.total, done: list.done, open: list.open.slice(0, env.limits.rows).map(name => text(name, 60)), ...(list.healthHidden ? {health: `${list.healthHidden} Health dots not shared with ZIGi`} : {})} : {note: 'No Checklist path on this device yet.'});
  },
};
export const zigiPlansTool: ToolDefinition<Record<string, never>> = {
  name: 'zigi_plans', title: 'ZIGi\'s plans', area: 'today',
  description: 'The plans ZIGi proposed as one bundle ("set me up for a 10k") and what the person did with each step: added, opened, skipped, undone or not decided yet. Titles and step names only.',
  parameters: {type: 'object', properties: {}},
  args: NO_ARGS,
  label: () => 'ZIGi\'s plans',
  run(_args, env, label) {
    const plans = (env.plans?.plans ?? []).slice(0, 5).map(planLines).map(p => ({title: text(p.title, 80), done: p.done, steps: p.steps.slice(0, 12).map(s => ({step: text(s.label, 120), outcome: s.outcome}))}));
    return ok('zigi_plans', label, provenance(env, 'plans with ZIGi', null, null, null), plans.length ? {plans} : {plans: [], note: 'No plan from ZIGi is kept on this device.'});
  },
};
export const AF_TOOLS = [pageView, checklistTodayTool, zigiPlansTool] as const;

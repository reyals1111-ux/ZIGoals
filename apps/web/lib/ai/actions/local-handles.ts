import type {Handle} from '../handles';
import type {Stores} from './plan';

/**
 * Session AL fourth pass (lane L7-4b; Denver Z-008, Z-009, N-009, N-010, N-051, DV-079): the handles a card made on this
 * device resolves against. ZIGi's and NOVA's no-model cards name a record by its exact title; the habits were there, the
 * goals were not, so "Log 50 dollars to Holiday" and "Add a milestone to Holiday" said "a goal that is not in this page's
 * context" on Goals itself. Open goals of the Goals page's own record are named too (a closed one is reopened on its page).
 */
export function localReplyHandles(stores: Pick<Stores, 'habits' | 'platform'>): Handle[] {
  const habits = stores.habits.habits.map((h, i): Handle => ({handle: `h${i + 1}`, kind: 'habit', id: h.id, label: h.title}));
  const goals = stores.platform.goals.filter(g => g.status !== 'closed').map((g, i): Handle => ({handle: `g${i + 1}`, kind: 'goal', id: `private:${g.id}`, label: g.name}));
  return [...habits, ...goals];
}

/**
 * Session AL fourth pass (lane L7-4b; Lisbon #363/364, LA-044; Moscow ZP-11, NP-09, MO-057): a food card ZIGi or NOVA made
 * on this device, with no AI connected, carries no estimate at all, so it is never badged "AI estimate": its values read as
 * unknown until the person fills them in. A card with figures (an AI's) is left exactly as planned.
 */
export function onDeviceCard<T extends {ok: boolean}>(result: T): T {
  const r = result as unknown as {ok: true; plan: {card: {kind: string; title: string; lines: string[]; estimate: boolean}}};
  if (!result.ok || r.plan.card.kind !== 'log-food' || !r.plan.card.estimate) return result;
  const lines = r.plan.card.lines;
  if (!lines.some(l => /^AI estimate per serving: kcal unknown, protein unknown, carbs unknown, fat unknown\b/.test(l))) return result;
  const card = {...r.plan.card, title: 'Log a food', estimate: false,
    lines: lines.map(l => /^AI estimate per serving:/.test(l) ? 'Its values are unknown (never 0) until you fill them in under Foods & recipes' : l.replace(/ \(an AI estimate you can edit in Foods & recipes\)/, ' (you can edit it in Foods & recipes)')).filter(l => !/^Added to Foods & recipes as "AI estimate"/.test(l))};
  return {...result, plan: {...r.plan, card}} as unknown as T;
}

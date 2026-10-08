/**
 * Session X-Local Phase 2, fix round 8 (ADR-017 S74): a correction of a card that was only proposed.
 *
 * Seen on every model in the panel (gemma4, qwen3.8, qwen3.6 on both hosts): the person corrects a card from the
 * previous reply that nobody has accepted yet ("Make it 15 minutes, not 10"), and the model answers with an edit-habit
 * or edit-goal card for a record that does not exist (an invented handle, h7), which the planner refuses, or with an
 * edit-goal that rewrites the notes of the goal whose note was only proposed. The protocol sentence (send the corrected
 * card again, "revise": true) is not enough on its own. This device-side rewrite of the reply, before it is parsed for
 * the cards, turns such an edit into what the person asked for:
 * - an edit-habit or edit-goal whose target names no record of the context, right after a reply that proposed a
 *   create-habit or create-goal: that proposal again with the changed fields, "revise": true (the earlier card is replaced);
 * - the same edit when a record with the proposed title now exists (the person accepted the card after all): the edit
 *   kept, its target that record's handle;
 * - an edit-goal that changes only the notes of the goal whose note the previous reply proposed: that add-goal-note
 *   again with the new note, "revise": true.
 * Nothing else changes: an edit of a record the context lists stays an edit, a reply with no edit, or one after a reply
 * that proposed nothing of the kind, comes back byte for byte, and other blocks of the same reply stay as they are.
 * Pure and deterministic, so every model gets it alike; the app and the harness apply it in the same place as the day cue.
 */
import type {Handle} from '../handles';
import {FENCE, parseReply, repairJson} from './parse';
import {handleAmong} from './plan';
import {type Action, KIND_ALIASES} from './schema';

type Item = Record<string, unknown>;
type Of<K extends Action['kind']> = Extract<Action, {kind: K}>;

const kindOf = (item: Item): string => { const raw = typeof item.kind === 'string' ? item.kind.trim().toLowerCase().replace(/\s+/g, '-') : ''; return KIND_ALIASES[raw] ?? raw; };
const named = (value: unknown): string => typeof value === 'string' ? value : '';
/** The fields an edit carries besides its kind and its target. */
const changes = (item: Item, target: string): Item => { const out: Item = {}; for (const [k, v] of Object.entries(item)) if (k !== 'kind' && k !== target && k !== 'revise' && v !== undefined) out[k] = v; return out; };
const sameGoal = (handles: readonly Handle[], a: string, b: string): boolean => {
  const ra = handleAmong(handles, 'goal', a), rb = handleAmong(handles, 'goal', b);
  return ra && rb ? ra.handle === rb.handle : a.trim().toLowerCase() === b.trim().toLowerCase();
};

export function reviseEdits(reply: string, previous: string | null | undefined, handles: readonly Handle[]): string {
  if (!previous || !/\b(?:edit|update|change|rename)[-_ ]?(?:habit|goal)\b/i.test(reply)) return reply;
  const before = parseReply(previous).proposals;
  const last = <K extends Action['kind']>(kind: K): Of<K> | undefined => before.filter(p => p.kind === kind).at(-1) as Of<K> | undefined;
  const habit = last('create-habit'), goal = last('create-goal'), note = last('add-goal-note');
  if (!habit && !goal && !note) return reply;
  let revise = false;
  const rewrite = (item: Item): Item => {
    const kind = kindOf(item);
    if (kind === 'edit-habit' && habit) {
      if (handleAmong(handles, 'habit', named(item.habit))) return item;
      const accepted = handleAmong(handles, 'habit', habit.title);
      if (accepted) return {...item, kind, habit: accepted.handle};
      revise = true;
      return {...habit, ...changes(item, 'habit'), kind: 'create-habit'};
    }
    if (kind === 'edit-goal') {
      const target = named(item.goal), fields = changes(item, 'goal'), keys = Object.keys(fields);
      if (note && keys.length === 1 && typeof fields.notes === 'string' && sameGoal(handles, note.goal, target)) { revise = true; return {kind: 'add-goal-note', goal: note.goal, note: fields.notes}; }
      if (!goal || handleAmong(handles, 'goal', target)) return item;
      const accepted = handleAmong(handles, 'goal', goal.name);
      if (accepted) return {...item, kind, goal: accepted.handle};
      revise = true;
      const next: Item = {...goal, ...fields, kind: 'create-goal'};
      if (fields.targetDate === null) delete next.targetDate;
      return next;
    }
    return item;
  };
  return reply.replace(FENCE, (whole: string, fence: string, body: string) => {
    const raw = repairJson(body);
    if (raw === null || raw === undefined || typeof raw !== 'object') return whole;
    const items = Array.isArray(raw) ? raw : [raw];
    let touched = false;
    const out = items.map(item => { if (!item || typeof item !== 'object' || Array.isArray(item)) return item; const next = rewrite(item as Item); if (next !== item) touched = true; return next; });
    if (!touched) return whole;
    if (revise && out[0] && typeof out[0] === 'object') out[0] = {revise: true, ...(out[0] as Item)};
    return `${fence}zigoals-action\n${JSON.stringify(out.length === 1 ? out[0] : out)}\n${fence}`;
  });
}

'use client';
import {useCallback, useEffect, useMemo, useState} from 'react';
import {batchable, UNDO_WINDOW_MS} from '../../lib/ai/actions/batch';
import type {Rejected} from '../../lib/ai/actions/parse';
import type {Plan, PlanResult, Stores} from '../../lib/ai/actions/plan';
import type {Action} from '../../lib/ai/actions/schema';
import type {Handle} from '../../lib/ai/context/types';
import {ProposalCard, type ProposalStatus} from './proposal-card';
import type {ProposalRunner} from './use-proposals';
import {NOT_AN_ENTRY} from '../../lib/ai/actions/parse';
import {zigiSignals} from '../zigi/bus';
import {streakMilestone} from '../../lib/ai/actions/milestone';
import './ai.css';

/**
 * The proposals of one reply (ADR-012, Part 5). Each is planned on the device against the current records; the person
 * adds, edits or dismisses them one by one, or adds all of them at once. Whatever was added together shares one Undo for
 * ten seconds; the undo is the inverse operation through the normal save path and is refused calmly if a record changed.
 * Proposals ZIGi made outside the whitelist are reported in plain words, never shown as cards.
 */
export type ProposalItem = {id: string; action: Action; result: PlanResult; status: ProposalStatus; error: string | null; after: Stores | null};
type UndoGroup = {ids: string[]; until: number};
const planOf = (item: ProposalItem): Plan | null => item.result.ok ? item.result.plan : null;
/** Session V Part 12 / X-Local Part 4 (D5): a check-in that took a streak onto a milestone makes ZIGi proud; any other accepted card is a small success. */
const proud = (plan: Plan, before: Stores['habits'], after: Stores['habits']) => { try { return streakMilestone(plan, before, after) !== null; } catch { return false; } };
/** Session V Part 7: the habits this reply creates get their ids now, so a reminder card of the same reply can name them. */
const replyRefs = (proposals: readonly Action[]) => new Map(proposals.flatMap(a => a.kind === 'create-habit' && a.ref ? [[a.ref, {id: crypto.randomUUID(), title: a.title}] as const] : []));
/**
 * `replaced` (Session X-Local Part 5a): a later reply carried "revise": true, so whatever is still pending here is marked
 * "Replaced" and can no longer be added; what was already added, undone or dismissed keeps its state.
 */
export function ProposalList({proposals, rejected, handles, runner, onNavigate, onChange, fromPhoto = false, replaced = false}: {proposals: readonly Action[]; rejected: readonly Rejected[]; handles: readonly Handle[]; runner: ProposalRunner; onNavigate?: () => void; onChange?: (summary: string) => void; fromPhoto?: boolean; replaced?: boolean}) {
  const [refs] = useState(() => replyRefs(proposals));
  const [items, setItems] = useState<ProposalItem[]>(() => proposals.map((action, i) => ({id: `p${i + 1}`, action, result: runner.plan(action, handles, refs), status: 'proposed', error: null, after: null})));
  const [undoGroup, setUndoGroup] = useState<UndoGroup | null>(null), [note, setNote] = useState(''), [now, setNow] = useState(() => Date.now());
  const live = undoGroup !== null && undoGroup.until > now;
  useEffect(() => {
    if (!live) return;
    const timer = window.setInterval(() => setNow(Date.now()), 500);
    return () => window.clearInterval(timer);
  }, [live]);
  const patch = useCallback((id: string, change: Partial<ProposalItem>) => setItems(current => current.map(item => item.id === id ? {...item, ...change} : item)), []);
  useEffect(() => { if (replaced) setItems(current => current.some(item => item.status === 'proposed') ? current.map(item => item.status === 'proposed' ? {...item, status: 'replaced'} : item) : current); }, [replaced]);
  const announce = useCallback((text: string) => { setNote(text); onChange?.(text); }, [onChange]);
  const add = useCallback(async (item: ProposalItem) => {
    const plan = planOf(item); if (!plan) return;
    if (plan.target === 'form') { const stashed = runner.openForm(plan); patch(item.id, {status: 'opened', error: stashed ? null : 'The values could not be handed over; type them into the form.'}); announce(plan.balance ? 'The account\'s balance form is opening in Wealth.' : 'The add-asset form is opening in Wealth.'); onNavigate?.(); return; }
    patch(item.id, {status: 'busy', error: null});
    const before = runner.stores.habits;
    try { const after = await runner.apply(plan); patch(item.id, {status: 'added', after}); setUndoGroup({ids: [item.id], until: Date.now() + UNDO_WINDOW_MS}); zigiSignals.emitValidated(proud(plan, before, after.habits) ? 'streak_milestone' : 'card_accepted'); announce(`Added: ${plan.card.title}. Undo is available for ten seconds.`); }
    catch (error) { patch(item.id, {status: 'proposed', error: error instanceof Error ? error.message : 'This could not be written.'}); }
  }, [announce, onNavigate, patch, runner]);
  const addAll = useCallback(async () => {
    const pending = items.filter(item => item.status === 'proposed' && planOf(item) && planOf(item)!.target !== 'form');
    const plans = batchable(pending.map(item => planOf(item)!));
    for (const item of pending) patch(item.id, {status: 'busy', error: null});
    const before = runner.stores.habits;
    const {after, error} = await runner.applyAll(plans);
    const done = pending.slice(0, after.length), failed = pending[after.length];
    setItems(current => current.map(item => { const i = done.findIndex(d => d.id === item.id); if (i >= 0) return {...item, status: 'added', after: after[i]!}; if (failed && item.id === failed.id) return {...item, status: 'proposed', error}; if (pending.some(p => p.id === item.id)) return {...item, status: 'proposed'}; return item; }));
    if (done.length) { setUndoGroup({ids: done.map(d => d.id), until: Date.now() + UNDO_WINDOW_MS}); zigiSignals.emitValidated(after.some((stores, i) => proud(plans[i]!, i ? after[i - 1]!.habits : before, stores.habits)) ? 'streak_milestone' : 'card_accepted'); }
    announce(done.length ? `Added ${done.length} of ${pending.length}. Undo is available for ten seconds.` : error ?? 'Nothing was added.');
  }, [announce, items, patch, runner]);
  const undo = useCallback(async () => {
    if (!undoGroup) return;
    const group = items.filter(item => undoGroup.ids.includes(item.id) && item.status === 'added' && item.after && planOf(item));
    setUndoGroup(null);
    const refused = await runner.undo(group.map(item => planOf(item)!), group.map(item => item.after!));
    if (refused) { announce(refused); return; }
    setItems(current => current.map(item => group.some(g => g.id === item.id) ? {...item, status: 'undone'} : item));
    announce(group.length === 1 ? 'Undone.' : `Undone: ${group.length} additions.`);
  }, [announce, items, runner, undoGroup]);
  const edit = useCallback((item: ProposalItem, action: Action) => patch(item.id, {action, result: runner.plan(action, handles, refs), error: null}), [handles, patch, refs, runner]);
  const pendingBatch = useMemo(() => items.filter(item => item.status === 'proposed' && planOf(item) && planOf(item)!.target !== 'form'), [items]);
  const secondsLeft = undoGroup ? Math.max(0, Math.ceil((undoGroup.until - now) / 1000)) : 0;
  if (!items.length && !rejected.length) return null;
  return <div className="ai-proposals" data-testid="ai-proposals">
    {!runner.ready && items.length > 0 && <p className="ai-card-note" role="status">Your records are still loading; adding becomes available in a moment.</p>}
    {fromPhoto && items.length > 0 && <p className="ai-card-note ai-card-photo">Estimated by your AI from a photo. Check every amount; unknown nutrients stay unknown.</p>}
    {items.map(item => <ProposalCard key={item.id} action={item.action} plan={planOf(item)} refusal={item.result.ok ? null : item.result.message} status={item.status} error={item.error} fromPhoto={fromPhoto}
      onAdd={() => { if (runner.ready) void add(item); }} onDismiss={() => patch(item.id, {status: 'dismissed'})} onEdit={action => edit(item, action)}/>)}
    {pendingBatch.length > 1 && <div className="ai-proposals-batch"><button type="button" className="primary" disabled={!runner.ready} onClick={() => void addAll()}>Add all {pendingBatch.length}</button><span className="ai-card-note">One Undo covers everything added together.</span></div>}
    {live && <div className="ai-proposals-undo"><button type="button" className="secondary" onClick={() => void undo()}>{undoGroup!.ids.length === 1 ? 'Undo' : `Undo these ${undoGroup!.ids.length}`} · {secondsLeft} s</button></div>}
    {rejected.length > 0 && <details className="ai-proposals-rejected"><summary>{rejected.length === 1 ? NOT_AN_ENTRY : `${NOT_AN_ENTRY} (${rejected.length} suggestions)`}</summary><p>ZIGoals only accepts the proposals listed in its protocol; anything else stays text.</p><ul>{rejected.map((r, i) => <li key={i}>{r.reason}</li>)}</ul></details>}
    <p className="ai-proposals-live" role="status" aria-live="polite">{note}</p>
  </div>;
}

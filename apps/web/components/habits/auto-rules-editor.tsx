'use client';
import {useId, useState, type FormEvent} from 'react';
import {isHealthSource, ruleSentence} from '../../lib/auto-rules/engine';
import {THRESHOLD_LABEL, draftForSource, draftOfRule, emptyAutoRuleDraft, ruleFromDraft, type AutoRuleDraft} from '../../lib/auto-rules/draft';
import {AUTO_SOURCES, type AutoRule, type AutoSource} from '../../lib/auto-rules/schema';
import {plainErrorMessage} from '../../lib/plain-error';
import './auto-rules.css';

const SOURCE_OPTIONS: Record<AutoSource, string> = {steps: 'Steps', sleep: 'Sleep', water: 'Water', 'active-minutes': 'Active minutes', workout: 'A workout', contribution: 'A contribution to a goal'};
const WORKOUT_TYPES = ['strength', 'cardio', 'mobility', 'sport', 'other'] as const;
type Named = {id: string; title: string};
/**
 * Session AK (5.6): "When steps ≥ 8,000 → Walk is done". Each rule is one plain sentence with Pause and Remove; the form
 * below writes a new one (or edits one) and shows its sentence before it is saved. Storage is the caller's
 * (`onSave`/`onRemove` write `zigoals:auto-rules:v1` through lib/auto-rules/engine.ts's mutators); a refusal is shown here.
 */
export function AutoRulesEditor({rules, habits, goals = [], onSave, onRemove, onPause}: {
  rules: readonly AutoRule[]; habits: readonly Named[]; goals?: readonly {id: string; name: string}[];
  onSave: (rule: AutoRule) => void | Promise<void>; onRemove: (ruleId: string) => void | Promise<void>; onPause?: (rule: AutoRule, paused: boolean) => void | Promise<void>;
}) {
  const id = useId();
  const [draft, setDraft] = useState<AutoRuleDraft>(() => emptyAutoRuleDraft(habits[0]?.id ?? ''));
  const [editing, setEditing] = useState<AutoRule | null>(null);
  const [error, setError] = useState(''), [status, setStatus] = useState(''), [busy, setBusy] = useState(false);
  const habitTitle = (habitId: string) => habits.find(h => h.id === habitId)?.title ?? 'This habit';
  const goalName = (goalId?: string) => goals.find(g => g.id === goalId)?.name ?? 'the goal';
  let preview = '';
  try { const r = ruleFromDraft(draft); preview = ruleSentence(r, habitTitle(r.habitId), goalName(r.goalId)); } catch { preview = ''; }
  async function act(work: () => void | Promise<void>, done: string) {
    setBusy(true); setError(''); setStatus('');
    try { await work(); setStatus(done); } catch (cause) { setError(plainErrorMessage(cause, 'This rule was not saved.')); } finally { setBusy(false); }
  }
  function save(event: FormEvent) {
    event.preventDefault();
    let rule: AutoRule;
    try { rule = ruleFromDraft(draft, new Date(), editing ?? undefined); } catch (cause) { setError(plainErrorMessage(cause, 'Check the rule.')); return; }
    void act(async () => { await onSave(editing?.paused ? {...rule, paused: true} : rule); setEditing(null); setDraft(emptyAutoRuleDraft(draft.habitId)); }, editing ? 'Rule updated.' : 'Rule added.');
  }
  const set = (patch: Partial<AutoRuleDraft>) => { setDraft(d => ({...d, ...patch})); setError(''); };
  if (!habits.length) return <section className="auto-rules" aria-labelledby={`${id}-title`}><h3 id={`${id}-title`}>Done automatically</h3><p className="auto-rules-empty">Add a habit first; then a rule can tick it off for you, for example “When steps ≥ 8,000 → Walk is done”.</p></section>;
  return <section className="auto-rules" aria-labelledby={`${id}-title`}>
    <h3 id={`${id}-title`}>Done automatically</h3>
    <p className="auto-rules-fine">A rule ticks a habit off from what you already record on this device. A day you completed stays as it is, and every automatic tick can be undone.</p>
    {rules.length ? <ul className="auto-rules-list">{rules.map(rule => <li key={rule.id} data-paused={rule.paused ? 'true' : undefined}>
      <span className="auto-rules-sentence">{ruleSentence(rule, habitTitle(rule.habitId), goalName(rule.goalId))}{rule.paused ? <span className="auto-rules-paused"> · paused</span> : null}</span>
      <span className="auto-rules-actions">
        <button type="button" className="quiet" disabled={busy} onClick={() => { setEditing(rule); setDraft(draftOfRule(rule)); setError(''); }} aria-label={`Edit the rule for ${habitTitle(rule.habitId)}`}>Edit</button>
        {onPause && <button type="button" className="quiet" disabled={busy} aria-pressed={!!rule.paused} onClick={() => void act(() => onPause(rule, !rule.paused), rule.paused ? 'Rule on again.' : 'Rule paused.')}>{rule.paused ? 'Resume' : 'Pause'}</button>}
        <button type="button" className="quiet" disabled={busy} onClick={() => void act(() => onRemove(rule.id), 'Rule removed. Days it already ticked stay as they are.')} aria-label={`Remove the rule for ${habitTitle(rule.habitId)}`}>Remove</button>
      </span>
    </li>)}</ul> : <p className="auto-rules-empty">No rules yet. Try “When steps ≥ 8,000 → Walk is done”.</p>}
    <form className="auto-rules-form" onSubmit={save} aria-describedby={`${id}-preview`} noValidate>
      <fieldset><legend>{editing ? 'Edit the rule' : 'Add a rule'}</legend>
        <label>When<select value={draft.source} onChange={e => set(draftForSource(draft, e.target.value as AutoSource))}>{AUTO_SOURCES.map(s => <option key={s} value={s}>{SOURCE_OPTIONS[s]}</option>)}</select></label>
        <label>Rule<select value={draft.comparator} onChange={e => set({comparator: e.target.value as AutoRuleDraft['comparator']})}>
          <option value="at-least">reaches at least</option>
          <option value="recorded">is recorded</option>
        </select></label>
        {draft.comparator === 'at-least' && <label>Number ({THRESHOLD_LABEL[draft.source]})<input inputMode="decimal" value={draft.threshold} onChange={e => set({threshold: e.target.value})} aria-invalid={!!error || undefined}/></label>}
        {draft.source === 'workout' && <label>Kind of workout<select value={draft.workoutType} onChange={e => set({workoutType: e.target.value as AutoRuleDraft['workoutType']})}><option value="">Any workout</option>{WORKOUT_TYPES.map(t => <option key={t} value={t}>{t[0]!.toUpperCase() + t.slice(1)}</option>)}</select></label>}
        {draft.source === 'contribution' && <label>Goal<select value={draft.goalId} onChange={e => set({goalId: e.target.value})}><option value="">Choose a goal</option>{goals.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}</select></label>}
        <label>Then this habit is done<select value={draft.habitId} onChange={e => set({habitId: e.target.value})}>{habits.map(h => <option key={h.id} value={h.id}>{h.title}</option>)}</select></label>
      </fieldset>
      <p id={`${id}-preview`} className="auto-rules-preview" aria-live="polite">{preview || 'Finish the rule to see it as a sentence.'}</p>
      {isHealthSource(draft.source) && <p className="auto-rules-fine">Read from your Health journal on this device. A day with nothing recorded never counts as zero.</p>}
      <div className="actions"><button type="submit" className="primary" disabled={busy}>{editing ? 'Save rule' : 'Add rule'}</button>{editing && <button type="button" className="quiet" disabled={busy} onClick={() => { setEditing(null); setDraft(emptyAutoRuleDraft(draft.habitId)); setError(''); }}>Cancel</button>}</div>
      {error && <p role="alert" className="auto-rules-error">{error}</p>}
      {status && <p role="status" className="auto-rules-status">{status}</p>}
    </form>
  </section>;
}
/** The line under a ticked habit: "auto · from steps · 8,800 steps", with its Undo. */
export function AutoTickBadge({label, onUndo, habitTitle}: {label: string; onUndo?: () => void; habitTitle: string}) {
  return <p className="auto-rules-badge" role="status"><span>{label}</span>{onUndo && <button type="button" className="quiet" onClick={onUndo} aria-label={`Undo the automatic tick of ${habitTitle}`}>Undo</button>}</p>;
}
export default AutoRulesEditor;

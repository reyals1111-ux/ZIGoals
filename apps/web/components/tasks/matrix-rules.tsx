'use client';
import {useState, useSyncExternalStore} from 'react';
import {DEFAULT_RULES, MATRIX_RULES_KEY, MAX_SAVED_MATRICES, readRules, readSaved, sameRules, type MatrixRules, type SavedMatrix} from '../../lib/tasks/matrix';
import type {Tasks} from '../../lib/tasks/schema';

/**
 * Session AV (owner follow-up 1, F-MATRIX-RULES; TickTick's own quadrant rules): the priority matrix's lines chosen by
 * the person — how many days ahead counts as urgent, and which priorities count as important — kept on this device as
 * a display choice (never synced, never exported; registered in AH_DISPLAY_KEYS). Part of the When views' chunk.
 * Session AV lane 2 (tasks, LEDGER #14, q1 Minor; TickTick's quadrant filters and several matrices): labels that make a
 * task important or urgent, one project only, and named matrices saved beside the lines in use (`saved`, the same
 * display record; at most 10), each chosen in one step.
 */
const EVENT = 'zigoals-matrix-rules';
type State = {rules: MatrixRules; saved: SavedMatrix[]};
const EMPTY: State = {rules: DEFAULT_RULES, saved: []};
let cache: {raw: string | null; state: State} = {raw: null, state: EMPTY};
function snapshot(): State {
  let raw: string | null = null;
  try { raw = localStorage.getItem(MATRIX_RULES_KEY); } catch { /* the defaults */ }
  if (raw !== cache.raw) { let parsed: unknown = null; try { parsed = raw ? JSON.parse(raw) : null; } catch { parsed = null; } cache = {raw, state: {rules: readRules(parsed), saved: readSaved(parsed)}}; }
  return cache.state;
}
const subscribe = (fn: () => void) => { window.addEventListener('storage', fn); window.addEventListener(EVENT, fn); return () => { window.removeEventListener('storage', fn); window.removeEventListener(EVENT, fn); }; };
const useMatrixState = () => useSyncExternalStore(subscribe, snapshot, () => EMPTY);
export const useMatrixRules = () => useMatrixState().rules;
function save(rules: MatrixRules, saved: SavedMatrix[] = snapshot().saved) {
  try { if (sameRules(rules, DEFAULT_RULES) && !saved.length) localStorage.removeItem(MATRIX_RULES_KEY); else localStorage.setItem(MATRIX_RULES_KEY, JSON.stringify({...rules, ...(saved.length ? {saved} : {})})); } catch { return; }
  window.dispatchEvent(new Event(EVENT));
}
const labelList = (text: string) => [...new Set(text.split(/[\s,]+/).map(l => l.replace(/^@/, '')).filter(l => /^[\p{L}\p{N}_-]{1,40}$/u.test(l)))].slice(0, 10);
export function MatrixRulesFold({rules, record}: {rules: MatrixRules; record?: Tasks}) {
  const {saved} = useMatrixState(), own = !sameRules(rules, DEFAULT_RULES), current = saved.find(m => sameRules(m.rules, rules));
  const [important, setImportant] = useState((rules.importantLabels ?? []).map(l => `@${l}`).join(' ')), [urgent, setUrgent] = useState((rules.urgentLabels ?? []).map(l => `@${l}`).join(' ')), [name, setName] = useState('');
  const projects = (record?.projects ?? []).filter(p => !p.archived);
  const choose = (id: string) => { const m = saved.find(x => x.id === id), next = m ? m.rules : DEFAULT_RULES; setImportant((next.importantLabels ?? []).map(l => `@${l}`).join(' ')); setUrgent((next.urgentLabels ?? []).map(l => `@${l}`).join(' ')); save(next); };
  const withLabels = (patch: Partial<MatrixRules>): MatrixRules => { const next = {...rules, ...patch}; if (!next.importantLabels?.length) delete next.importantLabels; if (!next.urgentLabels?.length) delete next.urgentLabels; if (!next.project) delete next.project; return next; };
  return <details className="tasks-matrix-rules">
    <summary>Your own lines{current ? ` · ${current.name}` : own ? ' · in use' : ''}</summary>
    {saved.length > 0 && <label className="field"><span>Matrix</span><select value={current?.id ?? ''} onChange={e => choose(e.target.value)}><option value="">{current || !own ? 'The usual lines' : 'The lines below (not saved)'}</option>{saved.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}</select></label>}
    <div className="tasks-matrix-rules-fields">
      <label className="field"><span>Urgent when due within</span><select value={rules.urgentDays} onChange={e => save({...rules, urgentDays: Number(e.target.value)})}>{[0, 1, 2, 3, 4, 5, 6, 7].map(d => <option key={d} value={d}>{d === 0 ? 'today only' : `${d} ${d === 1 ? 'day' : 'days'}`}</option>)}</select></label>
      <label className="field"><span>Important when priority is</span><select value={rules.importantUpTo} onChange={e => save({...rules, importantUpTo: Number(e.target.value) as MatrixRules['importantUpTo']})}><option value={1}>P1 only</option><option value={2}>P1 or P2</option><option value={3}>P1 to P3</option></select></label>
      <label className="field"><span>Also important with the label</span><input value={important} maxLength={200} placeholder="@work" onChange={e => setImportant(e.target.value)} onBlur={() => save(withLabels({importantLabels: labelList(important)}))} /></label>
      <label className="field"><span>Also urgent with the label</span><input value={urgent} maxLength={200} placeholder="@today" onChange={e => setUrgent(e.target.value)} onBlur={() => save(withLabels({urgentLabels: labelList(urgent)}))} /></label>
      {projects.length > 0 && <label className="field"><span>Tasks from</span><select value={rules.project ?? ''} onChange={e => save(withLabels({project: e.target.value || undefined}))}><option value="">Every project</option>{projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label>}
    </div>
    {own && !current && saved.length < MAX_SAVED_MATRICES && <form className="tasks-inline-form" noValidate onSubmit={e => { e.preventDefault(); if (!name.trim()) return; save(rules, [...saved, {id: `matrix_${crypto.randomUUID().slice(0, 12)}`, name: name.trim().slice(0, 40), rules}]); setName(''); }}>
      <label className="field"><span>Save these lines as</span><input value={name} maxLength={40} placeholder="Work week" onChange={e => setName(e.target.value)} /></label>
      <button type="submit" className="secondary" disabled={!name.trim()}>Save matrix</button></form>}
    {current && <p><button type="button" className="text-link" onClick={() => save(rules, saved.filter(m => m.id !== current.id))}>Remove the saved matrix “{current.name}”</button></p>}
    <p className="fine">Kept on this device. {own ? <button type="button" className="text-link" onClick={() => { setImportant(''); setUrgent(''); save(DEFAULT_RULES); }}>Back to the usual lines</button> : 'The usual lines are within 2 days and P1 or P2.'}</p>
  </details>;
}

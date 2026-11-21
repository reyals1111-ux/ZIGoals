'use client';
import {useSyncExternalStore} from 'react';
import {DEFAULT_RULES, MATRIX_RULES_KEY, readRules, type MatrixRules} from '../../lib/tasks/matrix';

/**
 * Session AV (owner follow-up 1, F-MATRIX-RULES; TickTick's own quadrant rules): the priority matrix's lines chosen by
 * the person — how many days ahead counts as urgent, and which priorities count as important — kept on this device as
 * a display choice (never synced, never exported; registered in AH_DISPLAY_KEYS). Part of the When views' chunk.
 */
const EVENT = 'zigoals-matrix-rules';
let cache: {raw: string | null; rules: MatrixRules} = {raw: null, rules: DEFAULT_RULES};
function snapshot(): MatrixRules {
  let raw: string | null = null;
  try { raw = localStorage.getItem(MATRIX_RULES_KEY); } catch { /* the defaults */ }
  if (raw !== cache.raw) { let parsed: unknown = null; try { parsed = raw ? JSON.parse(raw) : null; } catch { parsed = null; } cache = {raw, rules: readRules(parsed)}; }
  return cache.rules;
}
const subscribe = (fn: () => void) => { window.addEventListener('storage', fn); window.addEventListener(EVENT, fn); return () => { window.removeEventListener('storage', fn); window.removeEventListener(EVENT, fn); }; };
export const useMatrixRules = () => useSyncExternalStore(subscribe, snapshot, () => DEFAULT_RULES);
function save(rules: MatrixRules) {
  try { if (rules.urgentDays === DEFAULT_RULES.urgentDays && rules.importantUpTo === DEFAULT_RULES.importantUpTo) localStorage.removeItem(MATRIX_RULES_KEY); else localStorage.setItem(MATRIX_RULES_KEY, JSON.stringify(rules)); } catch { return; }
  window.dispatchEvent(new Event(EVENT));
}
export function MatrixRulesFold({rules}: {rules: MatrixRules}) {
  const own = rules.urgentDays !== DEFAULT_RULES.urgentDays || rules.importantUpTo !== DEFAULT_RULES.importantUpTo;
  return <details className="tasks-matrix-rules">
    <summary>Your own lines{own ? ' · in use' : ''}</summary>
    <div className="tasks-matrix-rules-fields">
      <label className="field"><span>Urgent when due within</span><select value={rules.urgentDays} onChange={e => save({...rules, urgentDays: Number(e.target.value)})}>{[0, 1, 2, 3, 4, 5, 6, 7].map(d => <option key={d} value={d}>{d === 0 ? 'today only' : `${d} ${d === 1 ? 'day' : 'days'}`}</option>)}</select></label>
      <label className="field"><span>Important when priority is</span><select value={rules.importantUpTo} onChange={e => save({...rules, importantUpTo: Number(e.target.value) as MatrixRules['importantUpTo']})}><option value={1}>P1 only</option><option value={2}>P1 or P2</option><option value={3}>P1 to P3</option></select></label>
    </div>
    <p className="fine">Kept on this device. {own ? <button type="button" className="text-link" onClick={() => save(DEFAULT_RULES)}>Back to the usual lines</button> : 'The usual lines are within 2 days and P1 or P2.'}</p>
  </details>;
}

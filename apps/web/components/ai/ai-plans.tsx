'use client';
import {useState} from 'react';
import {forgetAllPlans, forgetPlan, planLines, ZIGI_PLANS} from '../../lib/ai/store/plans';
import {ZIGI_STORE_EVENT} from '../../lib/ai/store/keys';
import {getAppStorage, isShowcase} from '../../lib/showcase-storage';
import {formatDate} from '../../lib/visual-format';
import {useDeviceRecord} from './use-device-record';

/**
 * Settings → ZIGi · What ZIGi knows → "ZIGi's plans" (Session AF, L4, P8.4): each plan ZIGi proposed as one bundle and
 * what became of each step (added, opened, skipped, undone, not decided yet). Titles and step names only, on this device
 * only, never synced, in Export everything. Forget one, or forget all; the steps already added stay where they were added.
 */
export default function AiPlans() {
  const record = useDeviceRecord(ZIGI_PLANS), [note, setNote] = useState(''), [confirm, setConfirm] = useState(false);
  const plans = record.data.plans ?? [];
  const forgetOne = (id: string, title: string) => { try { forgetPlan(getAppStorage(), id); window.dispatchEvent(new CustomEvent(ZIGI_STORE_EVENT, {detail: ZIGI_PLANS.key})); setNote(`Forgot the plan “${title}”; what you added stays.`); } catch { setNote('It could not be forgotten on this device.'); } };
  const forgetAll = () => { try { forgetAllPlans(getAppStorage()); window.dispatchEvent(new CustomEvent(ZIGI_STORE_EVENT, {detail: ZIGI_PLANS.key})); setNote('All plans were forgotten on this device; what you added stays.'); } catch { setNote('They could not be forgotten on this device.'); } setConfirm(false); };
  if (!record.loaded) return <p className="ai-note" role="status">Reading your plans…</p>;
  return <div className="ai-pack-body ai-plans">
    {isShowcase() && <p className="ai-note">Showcase (fictional): plans here stay in this tab.</p>}
    {record.unreadable && <p role="alert">The plans on this device could not be read. They have not been changed.</p>}
    {plans.length === 0 ? <p className="ai-note">No plan yet. Ask ZIGi to set you up for something (&ldquo;set me up for a 10k&rdquo;, &ldquo;plan my week&rdquo;): it proposes one plan as cards you add one by one, and the plan is kept here once you act on a step.</p>
      : <ul className="ai-memory-list" aria-label="ZIGi's plans">{plans.map(p => { const lines = planLines(p); return <li key={p.id} className="ai-memory-note">
        <p className="ai-memory-text"><strong>{lines.title}</strong></p>
        <p className="ai-memory-meta">{lines.steps.length} {lines.steps.length === 1 ? 'step' : 'steps'} · {lines.done ? 'every step decided' : 'some steps not decided yet'} · {formatDate(p.updatedAt)}</p>
        <ul className="ai-plan-steps">{lines.steps.map((s, i) => <li key={i}>{s.label} — {s.outcome}</li>)}</ul>
        <div className="ai-card-actions"><button type="button" className="text-link" aria-label={`Forget the plan "${lines.title}"`} onClick={() => forgetOne(p.id, lines.title)}>Forget</button></div>
      </li>; })}</ul>}
    {plans.length > 0 && (!confirm ? <div className="ai-card-actions"><button type="button" className="text-link" onClick={() => setConfirm(true)}>Forget all plans</button></div>
      : <div className="ai-confirm" role="group" aria-label="Forget all plans"><p>All {plans.length} plans go from this device; what you added stays.</p><div className="ai-card-actions"><button type="button" className="primary" onClick={forgetAll}>Forget all {plans.length}</button><button type="button" className="text-link" onClick={() => setConfirm(false)}>Keep them</button></div></div>)}
    {note && <p role="status" className="ai-note">{note}</p>}
  </div>;
}

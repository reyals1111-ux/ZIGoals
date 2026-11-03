'use client';
import {Suspense, lazy, useId, useState} from 'react';
import {LoadBoundary} from '../../load-boundary';
import './panels.css';

/**
 * NOVA's panels (Session AK, owner follow-up 2 N2): Memory, Permissions, Activity, Workflows, Cost and Models in one glass
 * panel the dashboard opens (lane NA mounts it lazily; this file loads each panel only when its tab is chosen). Plain
 * buttons with `aria-pressed` for the tabs (as Activity's filters), each at least 44 px; nothing animates.
 */
export const NOVA_PANELS = [
  {id: 'memory', label: 'Memory'},
  {id: 'permissions', label: 'Permissions'},
  {id: 'activity', label: 'Activity'},
  {id: 'workflows', label: 'Workflows'},
  {id: 'cost', label: 'Cost'},
  {id: 'models', label: 'Models'},
] as const;
export type NovaPanelId = (typeof NOVA_PANELS)[number]['id'];
/** The mount contract with the dashboard (lane NA): `/app/nova#nova-<panel>` opens the panels on that panel (Help, the setup guide and the specs link there). */
export const panelHash = (id: NovaPanelId) => `#nova-${id}`;
export function panelFromHash(hash: string): NovaPanelId | null { const id = hash.replace(/^#nova-/, ''); return hash.startsWith('#nova-') && NOVA_PANELS.some(p => p.id === id) ? id as NovaPanelId : null; }
const PANELS = {
  memory: lazy(() => import('./memory-panel')),
  permissions: lazy(() => import('./permissions-panel')),
  activity: lazy(() => import('./activity-panel')),
  workflows: lazy(() => import('../workflows/workflows-panel')),
  cost: lazy(() => import('./cost-panel')),
  models: lazy(() => import('./models-panel')),
} as const;
export function NovaPanels({initial = 'memory', onClose}: {initial?: NovaPanelId; onClose?: () => void}) {
  const [open, setOpen] = useState<NovaPanelId>(initial), id = useId(), Panel = PANELS[open], label = NOVA_PANELS.find(p => p.id === open)!.label;
  return <section className="panel nova-panels" aria-labelledby={`${id}-title`}>
    <div className="nova-panel-head">
      <h2 id={`${id}-title`} className="nova-panels-title">{label}</h2>
      {onClose && <button type="button" className="text-link" onClick={onClose}>Close</button>}
    </div>
    <nav className="tab-row view-tabs nova-panel-tabs" aria-label="NOVA panels">
      {NOVA_PANELS.map(p => <button key={p.id} type="button" aria-pressed={open === p.id} aria-controls={`${id}-body`} onClick={() => setOpen(p.id)}>{p.label}</button>)}
    </nav>
    <div id={`${id}-body`} className="nova-panel-body">
      <LoadBoundary quiet><Suspense fallback={<p className="ai-note" role="status">Opening {label}…</p>}><Panel/></Suspense></LoadBoundary>
    </div>
  </section>;
}
export default NovaPanels;

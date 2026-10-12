'use client';
import './goals.css';

export type GoalsView = 'cards' | 'board' | 'tree';

/** Cards, a vision board or a tree: three ways to see the same goals. */
export function GoalsViewSwitch({view, onChange}: {view: GoalsView; onChange: (v: GoalsView) => void}) {
  const pick = (v: GoalsView) => { onChange(v); try { const url = new URL(window.location.href); if (v === 'cards') url.searchParams.delete('view'); else url.searchParams.set('view', v); window.history.replaceState(window.history.state, '', url); } catch { /* the view still changes */ } };
  return <div className="goals-view-switch" role="group" aria-label="Show goals as">
    {([['cards', 'Cards'], ['board', 'Vision board'], ['tree', 'Tree']] as const).map(([v, label]) => <button key={v} type="button" aria-pressed={view === v} onClick={() => pick(v)}>{label}</button>)}
  </div>;
}

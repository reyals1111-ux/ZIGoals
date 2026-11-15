'use client';
import Link from 'next/link';
import {useId, useState} from 'react';
import type {LibraryTemplate} from '../../lib/templates/goal-library';
import {catalogueAreaLabel, catalogueAreasFor, searchCatalogue, type CatalogueArea} from '../../lib/templates/library';
import {goalTemplateHref} from '../../lib/guided/programs';
import './library-search.css';

const PAGE = 12;
const KIND: Record<LibraryTemplate['kind'], string> = {value: 'Savings goal', project: 'Project', count: 'Count goal', average: 'Keep an average', 'health-weight': 'Health goal'};

/**
 * Backlog #15 (AL-COMPETITOR-GAP-118): the template library, searchable from the goal creator's ideas. A text filter and
 * area chips narrow the library's goals; choosing one fills the form exactly as an idea button does (`onPick`, through
 * lib/goals/wizard-ideas.ts `wizardIdeaOf`). An average or weight template has its own form, so it is a link there.
 * Nothing is saved until the creator's own Save. Closed until asked for, so the creator opens as it did.
 */
export function GoalLibrarySearch({onPick}: {onPick: (t: LibraryTemplate) => void}) {
  const [open, setOpen] = useState(false), [query, setQuery] = useState(''), [area, setArea] = useState<CatalogueArea | null>(null), [shown, setShown] = useState(PAGE);
  const id = useId(), total = searchCatalogue('', {kind: 'goal'}).length;
  const results = open ? searchCatalogue(query, {kind: 'goal', area}) : [];
  const chooseArea = (next: CatalogueArea | null) => { setArea(next); setShown(PAGE); };
  return <div className="library-search goal-library-search">
    <button type="button" className="secondary library-search-toggle" aria-expanded={open} aria-controls={`${id}-panel`} onClick={() => setOpen(o => !o)}>{open ? 'Hide the template search' : `Search all ${total} goal templates`}</button>
    {open && <div id={`${id}-panel`} className="library-search-panel">
      <label className="library-search-field"><span>Search goal templates</span>
        <input type="search" value={query} autoComplete="off" placeholder="Run, savings, sleep, chess…" onChange={e => { setQuery(e.target.value); setShown(PAGE); }}
          onKeyDown={e => { /* Escape clears the search first; the creator's own Escape (leave) waits until it is empty */ if (e.key === 'Escape' && query) { e.preventDefault(); setQuery(''); } }} />
      </label>
      <div className="library-chips" role="group" aria-label="Template areas">
        <button type="button" aria-pressed={area === null} onClick={() => chooseArea(null)}>All areas</button>
        {catalogueAreasFor('goal').map(a => <button key={a.id} type="button" aria-pressed={area === a.id} onClick={() => chooseArea(area === a.id ? null : a.id)}>{a.label}</button>)}
      </div>
      <p className="library-count" aria-live="polite">{results.length} {results.length === 1 ? 'template' : 'templates'}{area ? ` in ${catalogueAreaLabel(area)}` : ''}</p>
      {results.length ? <ul className="library-results">{results.slice(0, shown).map(e => {
        if (e.kind !== 'goal') return null;
        const t = e.goal, own = t.kind === 'average' || t.kind === 'health-weight', meta = `${catalogueAreaLabel(e.area)} · ${KIND[t.kind]}`;
        return <li key={e.id}>{own
          ? <Link className="library-result" href={goalTemplateHref(t)}><strong>{t.title} ↗</strong><small>{t.summary}</small><span className="library-result-meta">{meta} · opens its own form</span></Link>
          : <button type="button" className="library-result" aria-label={`Fill in the form with: ${t.title}`} aria-describedby={`${id}-${t.id}`} onClick={() => onPick(t)}><strong>{t.title}</strong><small id={`${id}-${t.id}`}>{t.summary}</small><span className="library-result-meta">{meta}</span></button>}</li>;
      })}</ul> : <p className="library-count">No template matches{query.trim() ? ` “${query.trim()}”` : ''}{area ? ` in ${catalogueAreaLabel(area)}` : ''}. Try another word{area ? ', or All areas' : ''}.</p>}
      {results.length > shown && <button type="button" className="quiet library-more" onClick={() => setShown(n => n + PAGE)}>Show {Math.min(PAGE, results.length - shown)} more</button>}
    </div>}
  </div>;
}

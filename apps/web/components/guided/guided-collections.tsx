'use client';
import {lazy, Suspense, useEffect, useState} from 'react';
import {COLLECTION_IDS, COLLECTION_LINES, COLLECTION_TITLES, type CollectionId} from '../../lib/guided/collection-titles';
import {LoadBoundary} from '../load-boundary';

// Session AW (content): a collection's text loads when its fold first opens, in its own chunk.
const CollectionBody = lazy(() => import('./collection-body'));

/**
 * Session AW (content; owner decision 1d, ADR-046; LEDGER #82, #278): "Collections" on Guided journeys, below the
 * programmes and journeys: four themed folds ("Sleep better", "Calm down", "Move gently", "Start a habit"), each a short
 * written intro and links to what the app already has; "Sleep better" also holds seven short lessons on sleeping better.
 * No card on a first screen and nothing stored: a fold stays open once opened, and `?collection=<id>` opens the page at
 * one (scrolled to and focused). `goToProgram` moves to a programme or journey on this page.
 */
export function GuidedCollections({goToProgram}: {goToProgram: (programId: string) => void}) {
  const [open, setOpen] = useState<ReadonlySet<CollectionId>>(() => new Set());
  const [opened, setOpened] = useState<ReadonlySet<CollectionId>>(() => new Set());
  useEffect(() => {
    let id: string | null = null;
    try { id = new URLSearchParams(location.search).get('collection'); } catch { id = null; }
    if (!id || !(COLLECTION_IDS as string[]).includes(id)) return;
    const asked = id as CollectionId;
    queueMicrotask(() => { setOpen(s => new Set(s).add(asked)); setOpened(s => new Set(s).add(asked)); });
    requestAnimationFrame(() => { const el = document.getElementById(`guided-collection-${asked}-summary`); el?.scrollIntoView({block: 'start'}); el?.focus({preventScroll: true}); });
  }, []);
  const toggle = (id: CollectionId, isOpen: boolean) => {
    setOpen(s => { if (s.has(id) === isOpen) return s; const n = new Set(s); if (isOpen) n.add(id); else n.delete(id); return n; });
    if (isOpen) setOpened(s => s.has(id) ? s : new Set(s).add(id));
  };
  return <section className="guided-section guided-collections" aria-labelledby="guided-collections-title">
    <h2 id="guided-collections-title">Collections</h2>
    <p className="guided-collections-lede">What the app already has, grouped by theme: written lessons and practices, and the programmes and places that go with them. Open one to read; nothing starts by itself.</p>
    <ul className="guided-collection-list">{COLLECTION_IDS.map(id => <li key={id} id={`guided-collection-${id}`}>
      <details className="panel guided-collection" open={open.has(id) || undefined} onToggle={e => toggle(id, (e.currentTarget as HTMLDetailsElement).open)}>
        <summary id={`guided-collection-${id}-summary`}><span className="guided-day-head"><span className="guided-day-title">{COLLECTION_TITLES[id]}</span>
          <span className="guided-day-count">{COLLECTION_LINES[id]}</span></span></summary>
        {opened.has(id) && <LoadBoundary quiet><Suspense fallback={<p className="fine guided-collection-body">Opening…</p>}><CollectionBody id={id} goToProgram={goToProgram} /></Suspense></LoadBoundary>}
      </details>
    </li>)}</ul>
  </section>;
}

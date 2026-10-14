'use client';
/* Full reload is intentional: dispose all normal/scoped store hooks when changing data profiles. */
/* eslint-disable @next/next/no-location-assign-relative-destination */
import {useEffect, useRef, useState} from 'react';
import {exitShowcase, resetShowcase, showcaseDay} from '../../lib/showcase';
import {useShowcase} from '../showcase-controls';
import './shell-ab.css';

/**
 * Session AB-Design (owner request 8, ADR-024 D7): the tiny "Showcase" chip that stays in the status row while the
 * Showcase is on, so fictional records never look real. Tap: what the Showcase is, "Exit Showcase" and "Load again"
 * (the same actions Settings offers). The landmark keeps its name "Showcase data" (the shared loadShowcase helper and
 * the phone's Status sheet read it). The wording is AB-Cloud's agreed persona-#5 wording once it lands (handoff item 2).
 */
export function ShowcaseChip() {
  const active = useShowcase(), [open, setOpen] = useState(false), [busy, setBusy] = useState(false), root = useRef<HTMLElement>(null);
  useEffect(() => { if (!open) return; const close = (e: PointerEvent) => { if (!root.current?.contains(e.target as Node)) setOpen(false); }; document.addEventListener('pointerdown', close); return () => document.removeEventListener('pointerdown', close); }, [open]);
  if (!active) return null;
  return <aside ref={root} className="showcase-chip" aria-label="Showcase data" onKeyDown={e => { if (e.key === 'Escape' && open) { e.preventDefault(); setOpen(false); } }}>
    <button type="button" className="showcase-chip-button" aria-expanded={open} aria-haspopup="dialog" onClick={() => setOpen(v => !v)}><span className="showcase-chip-dot" aria-hidden="true"/>Showcase</button>
    {open && <div className="showcase-chip-panel" role="dialog" aria-label="About the Showcase">
      <p><strong>Showcase data</strong> Fictional records for {showcaseDay()}. Exit returns to your own data; Load again resets the Showcase.</p>
      <div className="showcase-chip-actions">
        <button type="button" className="secondary" disabled={busy} onClick={() => { setBusy(true); resetShowcase().then(() => window.location.assign('/app'), () => setBusy(false)); }}>Load again</button>
        <button type="button" className="primary" onClick={() => { exitShowcase(); window.location.assign('/app'); }}>Exit Showcase</button>
      </div>
    </div>}
  </aside>;
}

'use client';
/* Full reload is intentional: dispose all normal/scoped store hooks when changing data profiles. */
/* eslint-disable @next/next/no-location-assign-relative-destination */
import {useEffect, useRef, useState} from 'react';
import {exitShowcase, resetShowcase} from '../../lib/showcase';
import {SHOWCASE_CHIP, SHOWCASE_SHEET} from '../../lib/showcase-copy';
import {useShowcase} from '../showcase-controls';
import './shell-ab.css';

/**
 * Session AB-Design (owner request 8, ADR-024 D7): the tiny "Showcase" chip that stays in the status row while the
 * Showcase is on, so fictional records never look real. Tap: what the Showcase is, "Exit Showcase" and "Load again"
 * (the same actions Settings offers). The landmark keeps its name "Showcase data" (the shared loadShowcase helper and
 * the phone's Status sheet read it). The words are AB-Cloud's (lib/showcase-copy.ts, ADR-023 C24; wired at the second merger,
 * Phase 2 Part 12): the chip reads SHOWCASE_CHIP (its "· fictional" half on wider screens; the button's name stays
 * "Showcase"), the sheet SHOWCASE_SHEET.
 */
export function ShowcaseChip() {
  const active = useShowcase(), [open, setOpen] = useState(false), [busy, setBusy] = useState(false), root = useRef<HTMLElement>(null);
  useEffect(() => { if (!open) return; const close = (e: PointerEvent) => { if (!root.current?.contains(e.target as Node)) setOpen(false); }; document.addEventListener('pointerdown', close); return () => document.removeEventListener('pointerdown', close); }, [open]);
  if (!active) return null;
  return <aside ref={root} className="showcase-chip" aria-label="Showcase data" onKeyDown={e => { if (e.key === 'Escape' && open) { e.preventDefault(); setOpen(false); } }}>
    <button type="button" className="showcase-chip-button" aria-expanded={open} aria-haspopup="dialog" onClick={() => setOpen(v => !v)}><span className="showcase-chip-dot" aria-hidden="true"/>{SHOWCASE_CHIP.split(' · ')[0]}<span className="showcase-chip-more" aria-hidden="true"> · {SHOWCASE_CHIP.split(' · ').slice(1).join(' · ')}</span></button>
    {open && <div className="showcase-chip-panel" role="dialog" aria-label="About the Showcase">
      <p><strong>Showcase data</strong> {SHOWCASE_SHEET}</p>
      <div className="showcase-chip-actions">
        <button type="button" className="secondary" disabled={busy} onClick={() => { setBusy(true); resetShowcase().then(() => window.location.assign('/app'), () => setBusy(false)); }}>Load again</button>
        <button type="button" className="primary" onClick={() => { exitShowcase(); window.location.assign('/app'); }}>Exit Showcase</button>
      </div>
    </div>}
  </aside>;
}

'use client';
import Link from 'next/link';
import {RovingGroup} from '../ui/roving-group';
import {PRESETS, type DashboardPreset} from '../../lib/dashboard-settings';

/** A new device's first action on Today (its own small chunk since Session AC: Today's page weight). */
/**
 * `hasRecords` (Session AL, TK-148, N-TK-21): once something is recorded, the chooser is an offer, not a first step: it
 * sits after the data (today-dashboard.tsx) and says plainly that keeping the current layout hides it for good.
 */
export default function MakeToday({chosen, onChoose, onContinue, hasRecords = false}: {chosen?: string; onChoose: (preset: DashboardPreset) => void; onContinue: () => void; hasRecords?: boolean}) {
  if (hasRecords) return <section className="dashboard-welcome panel" aria-labelledby="make-today-title"><h2 id="make-today-title">Make Today yours.</h2><p>Your records are already on Today. Pick a layout to show what matters most, or keep this one; either way this card goes away.</p><RovingGroup className="dashboard-preset-choices" selector="button">{PRESETS.map(p => <button className="secondary" key={p.id} aria-pressed={chosen === p.id} onClick={() => onChoose(p.id)}><strong>{p.label}</strong><span>{p.description}</span></button>)}</RovingGroup><button className="text-link" onClick={onContinue}>Keep this layout and hide this</button></section>;
  return <section className="dashboard-welcome panel"><h2>Make Today yours.</h2><p>Start with your interests. Your records stay as they are, and no wallet or account is required.</p><RovingGroup className="dashboard-preset-choices" selector="button">{PRESETS.map(p => <button className="secondary" key={p.id} aria-pressed={chosen === p.id} onClick={() => onChoose(p.id)}><strong>{p.label}</strong><span>{p.description}</span></button>)}</RovingGroup><button className="text-link" onClick={onContinue}>Keep Balanced and continue</button><p className="fine">Saved locally. Explore account, backup and encrypted-sync options in <Link href="/app/settings">Settings</Link>.</p></section>;
}

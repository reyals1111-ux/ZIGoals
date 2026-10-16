'use client';
import Link from 'next/link';
import {PRESETS, type DashboardPreset} from '../../lib/dashboard-settings';

/** A new device's first action on Today (its own small chunk since Session AC: Today's page weight). */
export default function MakeToday({chosen, onChoose, onContinue}: {chosen?: string; onChoose: (preset: DashboardPreset) => void; onContinue: () => void}) {
  return <section className="dashboard-welcome panel"><h2>Make Today yours.</h2><p>Start with your interests. Your records stay as they are, and no wallet or account is required.</p><div className="dashboard-preset-choices">{PRESETS.map(p => <button className="secondary" key={p.id} aria-pressed={chosen === p.id} onClick={() => onChoose(p.id)}><strong>{p.label}</strong><span>{p.description}</span></button>)}</div><button className="text-link" onClick={onContinue}>Keep Balanced and continue</button><p className="fine">Saved locally. Explore account, backup and encrypted-sync options in <Link href="/app/settings">Settings</Link>.</p></section>;
}

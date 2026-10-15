'use client';
import Link from 'next/link';
import {useUiPrefs} from '../../lib/ui-prefs/use-ui-prefs';
import './shell-ab.css';

/**
 * Session AB-Design (owner request 8, ADR-024 D7): the one compact first-visit notice at the top of every page, in place
 * of the Alpha box, the Showcase bar, the storage line and the mode strip. One line with every key fact, "More" to
 * Help's full explanation, and × to close it for good on this device (zigoals:ui-prefs:v1). The same facts stay on
 * Settings (About this alpha, Your data) and in Help's "About this Alpha" (Session AC: the footer's line left), so
 * closing the notice hides nothing the Alpha must say.
 */
export function AlphaNotice({label, sentence, mode}: {label: string; sentence: string; mode: 'local' | 'keplr'}) {
  // Rendered on the server too (no layout jump, and readable without scripts); it leaves once the device says it was closed.
  const prefs = useUiPrefs();
  if (prefs.loaded && !prefs.unreadable && prefs.data.dismissed?.alphaNotice) return null;
  const facts = mode === 'local' ? 'Your records stay in this browser and are not a backup.' : 'Connection only · financial actions unavailable · your records stay in this browser.';
  return <aside className="alpha-notice" aria-label="Alpha notice">
    <span className="alpha-notice-dot" aria-hidden="true"/>
    <p><strong>{label}</strong> <span>{sentence} {facts}</span> <Link className="text-link" href="/app/help#help-z-about" prefetch={false}>More</Link></p>
    <button type="button" className="alpha-notice-close" aria-label="Close this notice" onClick={() => { try { prefs.update(p => ({...p, dismissed: {...(p.dismissed ?? {}), alphaNotice: true}})); } catch { /* storage refused: the notice stays */ } }}>×</button>
  </aside>;
}

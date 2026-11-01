'use client';
import Link from 'next/link';
import {useUiPrefs} from '../../lib/ui-prefs/use-ui-prefs';
import {FINANCIAL_EXECUTION_ALLOWED} from '../../lib/app-environment';
import './shell-ab.css';

/**
 * Session AB-Design (owner request 8, ADR-024 D7): the one compact first-visit notice at the top of every page, in place
 * of the Alpha box, the Showcase bar, the storage line and the mode strip. One line with every key fact, "More" to
 * Help's full explanation, and × to close it for good on this device (zigoals:ui-prefs:v1). The same facts stay on
 * Settings (About this alpha, Your data) and in Help's "About this Alpha" (Session AC: the footer's line left), so
 * closing the notice hides nothing the Alpha must say.
 */
/** Session AC (owner item 8): what the Alpha must say even when the page's own facts block cannot show (no scripts, or a
 * private read that stalls and keeps the page hidden), in Settings' words. */
export const ALPHA_ESSENTIALS = `${FINANCIAL_EXECUTION_ALLOWED ? '' : 'Contract execution is disabled on this Alpha. '}Independent project · Unaudited alpha · Idle strategy only. Never share secrets, private backups or wallet details.`;
/**
 * Session AK P2 (RELEASE_REVIEW_2 R2-7; ADR-036 Q31; `TIER 3 (public-safety labels)`): on a device that never chose the
 * chain (`behindMore`) the line is the consumer one, "Your records stay in this browser and are not a backup."; the
 * staking sentence sits behind More (Help → About this Alpha quotes it word for word; Settings' facts block carries it),
 * as on the phone. Without scripts or while a read stalls (no Help, no Settings), it shows with the essentials. The
 * owner's hosted check reads it where it now lives (scripts/lib/hosted-alpha-stages.mjs, stage 2).
 */
export function AlphaNotice({label, sentence, mode, stalled = false, behindMore = false}: {label: string; sentence: string; mode: 'local' | 'keplr'; stalled?: boolean; behindMore?: boolean}) {
  // Rendered on the server too (no layout jump, and readable without scripts); it leaves once the device says it was closed.
  const prefs = useUiPrefs();
  if (prefs.loaded && !prefs.unreadable && prefs.data.dismissed?.alphaNotice) return null;
  const essentials = <>{behindMore && <p className="alpha-notice-sentence">{sentence}</p>}<p className="alpha-notice-essentials">{ALPHA_ESSENTIALS}</p></>;
  const facts = mode === 'local' ? 'Your records stay in this browser and are not a backup.' : 'Connection only · financial actions unavailable · your records stay in this browser.';
  return <aside className="alpha-notice" aria-label="Alpha notice">
    <span className="alpha-notice-dot" aria-hidden="true"/>
    <p><strong>{label}</strong> <span>{behindMore ? facts : `${sentence} ${facts}`}</span> <Link className="text-link" href="/app/help#help-z-about" prefetch={false}>More</Link></p>
    {/* Without scripts the page stays hidden (its stores are never read), and a stalled read keeps it hidden: the notice then
        carries the essentials itself. Once the page shows, they are in Settings' facts block and Help, as before. */}
    {stalled ? essentials : <noscript>{essentials}</noscript>}
    <button type="button" className="alpha-notice-close" aria-label="Close this notice" onClick={() => { try { prefs.update(p => ({...p, dismissed: {...(p.dismissed ?? {}), alphaNotice: true}})); } catch { /* storage refused: the notice stays */ } }}>×</button>
  </aside>;
}

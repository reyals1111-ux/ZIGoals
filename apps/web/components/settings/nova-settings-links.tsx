import Link from 'next/link';
import './nova-settings-links.css';

/**
 * Session AK G2 (RELEASE_REVIEW_2 R2-4): NOVA's place in Settings → Your assistant, beside ZIGi's settings. NOVA is ZIGi's
 * full-screen command center on the same engine (ADR-036 Q28: one history and memory, the same privacy mode), so the
 * connection, keys, voice and privacy mode in ZIGi's settings serve both; NOVA's own choices (its scopes, memory, cost cap
 * and brain) stay in NOVA, and these links open them.
 * The addresses are NOVA's mount contract (`/app/nova#nova-<panel>`, components/nova/panels/nova-panels.tsx; the setup
 * page at /app/nova/setup), written out so Settings loads nothing of NOVA's.
 */
const LINKS: [href: string, label: string, note: string][] = [
  ['/app/nova/setup', 'Brain setup', 'Which AI answers in NOVA; on this device until you choose'],
  ['/app/nova#nova-permissions', 'What NOVA can see', 'Area by area; Health, Notes and the Journal start off'],
  ['/app/nova#nova-memory', 'Memory', 'What NOVA remembers, and forgetting it'],
  ['/app/nova#nova-cost', 'Cost', 'A daily cap for your own AI'],
];
export function NovaSettingsLinks() {
  return <section className="panel nova-settings-links" id="nova-settings" aria-labelledby="nova-settings-title">
    <p className="eyebrow">NOVA</p>
    <h2 id="nova-settings-title">NOVA, ZIGi&rsquo;s command center</h2>
    <p>The same assistant on a full screen: your day, your four areas and your notes in one place. Its own choices live in NOVA.</p>
    <ul className="nova-settings-list">
      {LINKS.map(([href, label, note]) => <li key={href}><Link className="nova-settings-link" prefetch={false} href={href}><strong>{label}</strong><small>{note}</small></Link></li>)}
    </ul>
  </section>;
}

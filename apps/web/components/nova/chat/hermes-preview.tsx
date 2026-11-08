'use client';
import {useMemo} from 'react';
import {noteTexts} from '../../../lib/ai/privacy-mode';
import {localModelStillConfirmed, NOVA_HERMES} from '../../../lib/nova/hermes-record';
import {previewFor, type PrivacyMode} from '../../../lib/nova/privacy-mode';
import {knownNamesFrom} from '../../../lib/nova/redact';
import {useDeviceRecord} from '../../ai/use-device-record';

/**
 * Session AL Part 14 (lane P14-B; security review Z1A-4, its second fix line): before "Ask my Hermes", exactly what would
 * go to the person's Hermes Agent: their words and the chosen page's records, as the engine would send them now (redacted
 * in Strict or Guarded while Hermes is not confirmed to run a local model; as they are otherwise). The same preview rule
 * as NOVA's "about to send" (lib/nova/privacy-mode.ts `previewFor`), with Hermes named, since Hermes may use its own cloud
 * model and tools whatever the mode says. Nothing is sent from here.
 */
export function hermesPreviewLine(decision: 'send' | 'redact' | 'refuse', area: string): string {
  return decision === 'redact'
    ? `Ask my Hermes sends this to your Hermes Agent, with ${area}’s records, private details taken out (your privacy mode, until you confirm Hermes runs a local model).`
    : `Ask my Hermes sends this to your Hermes Agent on this computer, with ${area}’s records, as shown. Hermes keeps what it gets and may use its own model and tools.`;
}
export default function HermesPreview({message, context, mode, area}: {message: string; context: string; mode: PrivacyMode | null; area: string}) {
  const hermes = useDeviceRecord(NOVA_HERMES);
  const names = useMemo(() => knownNamesFrom(noteTexts()), []);
  const unconfirmed = hermes.unreadable || !localModelStillConfirmed(hermes.data, hermes.data.baseUrl); // SA-1: "Ask my Hermes" goes to the saved gateway
  const preview = useMemo(() => previewFor({message, context, mode, provider: 'local', hermesUnconfirmed: unconfirmed, knownNames: names, assistant: 'NOVA'}), [message, context, mode, unconfirmed, names]);
  const decision = preview.decision === 'redact' ? 'redact' : 'send';
  return <div className="nova-guide-send nova-hermes-preview" data-decision={decision} aria-live="polite">
    <p className="nova-guide-send-line"><b>{hermesPreviewLine(decision, area)}</b>{preview.summary && <> Taken out or rounded: {preview.summary}.</>}</p>
    {preview.message && <pre className="nova-guide-send-text" tabIndex={0} aria-label="Exactly what would go to your Hermes">{preview.message}</pre>}
    {preview.context ? <details className="ai-context-preview"><summary>With it, {area}’s records ({preview.context.length.toLocaleString('en-US')} characters)</summary><pre tabIndex={0}>{preview.context}</pre></details>
      : <p className="ai-note">No records from {area} go with it (NOVA → Permissions or ZIGi’s sharing keeps them here).</p>}
  </div>;
}

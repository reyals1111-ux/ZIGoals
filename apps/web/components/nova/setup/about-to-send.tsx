'use client';
import {useMemo} from 'react';
import {noteTexts} from '../../../lib/ai/privacy-mode';
import type {ProviderId} from '../../../lib/ai/providers';
import {isHermesBase, localModelStillConfirmed, NOVA_HERMES} from '../../../lib/nova/hermes-record';
import {previewFor, type PrivacyMode} from '../../../lib/nova/privacy-mode';
import {knownNamesFrom} from '../../../lib/nova/redact';
import {useDeviceRecord} from '../../ai/use-device-record';

/**
 * "NOVA is about to send this to <provider>" (N3 step 2, N9): the person's words and the context exactly as the engine
 * would send them now — redacted when the engine's hook redacts (a cloud in Guarded; an unconfirmed Hermes in Strict or
 * Guarded), refused in Strict for a cloud, as they are otherwise. Like the engine, it redacts the names the person's own
 * notes give (unless `knownNames` is passed) and recognises their Hermes by its saved address (`baseUrl`). With
 * `hideWhenSent`, it shows only when something changes (redacted or refused): NOVA's composer mounts it that way.
 * Nothing is sent.
 */
export function AboutToSend({message, context = '', mode, provider, model = null, baseUrl = null, hosted = false, hermesUnconfirmed, knownNames, assistant = 'NOVA', contextLabel = 'With it, the context', hideWhenSent = false}: {message: string; context?: string; mode: PrivacyMode | null; provider: ProviderId | null | undefined; model?: string | null; baseUrl?: string | null; hosted?: boolean; hermesUnconfirmed?: boolean; knownNames?: readonly string[]; assistant?: string; contextLabel?: string; hideWhenSent?: boolean}) {
  const hermes = useDeviceRecord(NOVA_HERMES);
  const names = useMemo(() => knownNames ?? knownNamesFrom(noteTexts()), [knownNames]);
  const unconfirmed = hermesUnconfirmed ?? (provider === 'local' && !hosted && !!baseUrl && isHermesBase(baseUrl, hermes.data) && (hermes.unreadable || !localModelStillConfirmed(hermes.data, baseUrl))); // SA-1: as the engine, for this address
  const preview = useMemo(() => previewFor({message, context, mode, provider, model, hosted, hermesUnconfirmed: unconfirmed, knownNames: names, assistant}), [message, context, mode, provider, model, hosted, unconfirmed, names, assistant]);
  if (hideWhenSent && preview.decision === 'send') return null;
  return <div className="nova-guide-send" data-decision={preview.decision} aria-live="polite">
    <p className="nova-guide-send-line"><b>{preview.line}</b>{preview.summary && <> Taken out or rounded: {preview.summary}.</>}</p>
    {preview.message && <pre className="nova-guide-send-text" tabIndex={0} aria-label="Exactly what would be sent">{preview.message}</pre>}
    {preview.context && <details className="ai-context-preview"><summary>{contextLabel} ({preview.context.length.toLocaleString('en-US')} characters)</summary><pre tabIndex={0}>{preview.context}</pre></details>}
  </div>;
}

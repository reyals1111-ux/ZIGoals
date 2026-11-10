'use client';
import {useMemo} from 'react';
import {CARE_LABEL, CARE_NOTES, detectRisk} from '../../lib/ai/safety';
import {guardMessage} from '../../lib/ai/safety-guard';
import './care-note.css';

/**
 * Careful mode's supportive note (Session V Part 11, docs/product/ZIGI_VOICE_AND_SAFETY.md): under a message whose words
 * touch self-harm, an eating disorder, very low intake, very fast weight loss or a long fast. Made on this device from
 * the message itself, every time it is shown; nothing about it is stored or sent.
 * Session AL (lane L7): a message the safety guard answers (an emergency, distress, a secret, an injection) shows the
 * guard's own words instead. In a chat (`inChat`) the guard's reply is already the next turn, so nothing repeats here;
 * on the subscription bridge (no reply in the app) the guard's words show under the question. NOVA shows the same note.
 */
export function CareNote({text, inChat = false}: {text: string; inChat?: boolean}) {
  const guard = useMemo(() => guardMessage(text), [text]);
  const topic = useMemo(() => guard ? null : detectRisk(text), [guard, text]);
  if (guard) {
    if (inChat || guard.topic === 'injection') return null;
    return <aside className="ai-care-note" role="note" aria-label={CARE_LABEL}>
      <p className="ai-care-label">{CARE_LABEL}</p>
      {guard.text.split('\n').map((line, i) => <p key={i}>{line}</p>)}
    </aside>;
  }
  if (!topic) return null;
  return <aside className="ai-care-note" role="note" aria-label={CARE_LABEL}>
    <p className="ai-care-label">{CARE_LABEL}</p>
    <p>{CARE_NOTES[topic]}</p>
  </aside>;
}

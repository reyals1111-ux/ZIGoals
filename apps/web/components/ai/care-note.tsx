'use client';
import {useMemo} from 'react';
import {CARE_LABEL, CARE_NOTES, detectRisk} from '../../lib/ai/safety';
import './care-note.css';

/**
 * Careful mode's supportive note (Session V Part 11, docs/product/ZIGI_VOICE_AND_SAFETY.md): under a message whose words
 * touch self-harm, an eating disorder, very low intake, very fast weight loss or a long fast. Made on this device from
 * the message itself, every time it is shown; nothing about it is stored or sent.
 */
export function CareNote({text}: {text: string}) {
  const topic = useMemo(() => detectRisk(text), [text]);
  if (!topic) return null;
  return <aside className="ai-care-note" role="note" aria-label={CARE_LABEL}>
    <p className="ai-care-label">{CARE_LABEL}</p>
    <p>{CARE_NOTES[topic]}</p>
  </aside>;
}

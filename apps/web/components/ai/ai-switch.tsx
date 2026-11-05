'use client';
import {useId, type ReactNode} from 'react';
import './ai-switch.css';

/**
 * One on/off row of ZIGi's settings (moved out of ai-settings.tsx in Session V Part 8 so the notes panel shares it).
 * Session V Part 16: the note is the switch's description, so a screen reader or a browser agent hears what it does.
 * Session AL third pass (Denver DV-072b, P-DV-98): "On"/"Off" read as verbs on a plain button; a small track and knob now
 * show it is a switch and its state (the word stays beside it, so the state never rests on colour or position alone).
 */
export function Switch({checked, onChange, label, disabled, note}: {checked: boolean; onChange: (next: boolean) => void; label: string; disabled?: boolean; note?: ReactNode}) {
  const noteId = useId();
  return <div className="ai-switch-row"><button type="button" role="switch" aria-checked={checked} aria-label={label} aria-describedby={note ? noteId : undefined} className={checked ? 'primary' : 'secondary'} disabled={disabled} onClick={() => onChange(!checked)}><span className="ai-switch-track" aria-hidden="true"><span className="ai-switch-knob"/></span>{checked ? 'On' : 'Off'}</button><span className="ai-switch-copy"><strong>{label}</strong>{note && <small id={noteId}>{note}</small>}</span></div>;
}

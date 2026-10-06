'use client';
import type {ReactNode} from 'react';

/** One on/off row of ZIGi's settings (moved out of ai-settings.tsx in Session V Part 8 so the notes panel shares it). */
export function Switch({checked, onChange, label, disabled, note}: {checked: boolean; onChange: (next: boolean) => void; label: string; disabled?: boolean; note?: ReactNode}) {
  return <div className="ai-switch-row"><button type="button" role="switch" aria-checked={checked} aria-label={label} className={checked ? 'primary' : 'secondary'} disabled={disabled} onClick={() => onChange(!checked)}>{checked ? 'On' : 'Off'}</button><span className="ai-switch-copy"><strong>{label}</strong>{note && <small>{note}</small>}</span></div>;
}

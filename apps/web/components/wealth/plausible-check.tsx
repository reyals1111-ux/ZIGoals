'use client';
import {useCallback, useId, useRef, useState} from 'react';
import {plausibleConfirm} from '../../lib/wealth-plausibility';
import './plausible-check.css';

/**
 * Session AL (P-TK-49: TK-039, N-TK-12, W6): the "check this?" step for an amount that is possible but unusual (see
 * lib/wealth-plausibility.ts). The first save shows the note under the field; "Keep this amount" (a second submit of the
 * same form) saves it. Never a refusal, never an alert: a status the field points at.
 */
export function usePlausibleCheck() {
  const id = `${useId()}plausible`, confirm = useRef(plausibleConfirm()), [warning, setWarning] = useState<string | null>(null);
  /** True when the form may save now; false shows `message` and waits for a second submit of the same amount. */
  const ask = useCallback((key: string, message: string | null) => {
    const ok = confirm.current.check(key, message);
    setWarning(ok ? null : message);
    return ok;
  }, []);
  const clear = useCallback(() => { confirm.current.reset(); setWarning(null); }, []);
  return {id, warning, ask, clear, describedBy: warning ? id : undefined};
}
export function PlausibleCheck({id, warning, className}: {id: string; warning: string | null; className?: string}) {
  if (!warning) return null;
  return <div id={id} className={`plausible-check${className ? ` ${className}` : ''}`} role="status">
    <p>{warning}</p>
    <button type="submit" className="secondary">Keep this amount</button>
  </div>;
}

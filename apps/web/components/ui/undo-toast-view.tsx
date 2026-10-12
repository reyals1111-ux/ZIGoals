'use client';
import {useCallback, useEffect, useRef, useState} from 'react';
import {hideToast, showToast, type Shown} from './undo-toast';

/** The shown toast with its timer and Undo (loaded with the first toast). */
export default function ToastView({toast}: {toast: Shown}) {
  const [busy, setBusy] = useState(false), [held, setHeld] = useState(false);
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => {
    window.clearTimeout(timer.current);
    if (!toast || held || busy) return;
    const id = toast.id;
    timer.current = window.setTimeout(() => hideToast(id), 8000);
    return () => window.clearTimeout(timer.current);
  }, [toast, held, busy]);
  const undo = useCallback(async () => {
    if (!toast?.undo) return;
    setBusy(true);
    try {
      await toast.undo();
      showToast({message: toast.undone ?? 'Undone.'});
    } catch (e) {
      showToast({message: e instanceof Error && e.message ? `Could not undo: ${e.message}` : 'Could not undo this change.'});
    } finally {
      setBusy(false);
    }
  }, [toast]);
  return <div className="aa-toast" onPointerEnter={() => setHeld(true)} onPointerLeave={() => setHeld(false)} onFocus={() => setHeld(true)} onBlur={() => setHeld(false)}>
      <span>{toast.message}</span>
      {toast.undo && <button type="button" className="aa-toast-undo" disabled={busy} onClick={() => void undo()}>Undo</button>}
      <button type="button" className="aa-toast-close" aria-label="Close message" onClick={() => hideToast(toast.id)}>×</button>
    </div>;
}

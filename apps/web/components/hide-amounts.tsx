'use client';
import {useEffect, useSyncExternalStore} from 'react';
import './hide-amounts.css';

/**
 * Session AH (WE19): hide amounts for screenshots. One device-only switch (never synced, never exported) that blurs your own
 * money figures and value charts on every app page until you switch it back. Market prices stay visible: they are not yours.
 * It changes what is shown only; nothing is stored differently, and screen readers still read the figures to you.
 */
export const HIDE_AMOUNTS_KEY = 'zigoals:hide-amounts';
const EVENT = 'zigoals-hide-amounts';
function subscribe(callback: () => void) { window.addEventListener('storage', callback); window.addEventListener(EVENT, callback); return () => { window.removeEventListener('storage', callback); window.removeEventListener(EVENT, callback); }; }
function snapshot() { try { return localStorage.getItem(HIDE_AMOUNTS_KEY) === 'on'; } catch { return false; } }
export function useHideAmounts() { return useSyncExternalStore(subscribe, snapshot, () => false); }
function mirror(on: boolean) { if (on) document.documentElement.dataset.hideAmounts = 'on'; else delete document.documentElement.dataset.hideAmounts; }

/** Mirrors the switch onto <html> on every app route. */
export function HideAmountsSync() { const on = useHideAmounts(); useEffect(() => mirror(on), [on]); return null; }

export function HideAmountsToggle({className = 'quiet'}: {className?: string}) {
  const on = useHideAmounts();
  const flip = () => { try { if (on) localStorage.removeItem(HIDE_AMOUNTS_KEY); else localStorage.setItem(HIDE_AMOUNTS_KEY, 'on'); } catch { mirror(!on); return; } window.dispatchEvent(new Event(EVENT)); };
  return <button type="button" className={`hide-amounts-toggle ${className}`} aria-pressed={on} onClick={flip} title="Blur your amounts for a screenshot. Only on this device.">{on ? 'Show amounts' : 'Hide amounts'}</button>;
}

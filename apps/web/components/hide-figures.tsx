'use client';
import {useEffect, useSyncExternalStore} from 'react';
import './hide-figures.css';

/**
 * Session AV (owner follow-up 1, F-HIDE-FIGURES; Bearable's "hide triggering data"): one device-only switch (never
 * synced, never exported; a display key like "Hide amounts") that hides calorie and weight figures in Health — the
 * calorie ring's numbers, the nutrient lines, meal targets, the weight figures and history — until it is switched back.
 * Session AV (q3 #36): also Health's top tiles, the Weight view's cards, Insights' per-meal calories and Today's Health
 * ring, module and coach line (each marked `data-body-figure`).
 * Words such as "logged" stay, so the diary still reads. Hidden figures leave the accessibility tree too (no number is
 * read aloud). Nothing is stored differently.
 */
export const HIDE_FIGURES_KEY = 'zigoals:hide-body-figures';
const EVENT = 'zigoals-hide-body-figures';
function subscribe(callback: () => void) { window.addEventListener('storage', callback); window.addEventListener(EVENT, callback); return () => { window.removeEventListener('storage', callback); window.removeEventListener(EVENT, callback); }; }
function snapshot() { try { return localStorage.getItem(HIDE_FIGURES_KEY) === 'on'; } catch { return false; } }
export function useHideFigures() { return useSyncExternalStore(subscribe, snapshot, () => false); }
function mirror(on: boolean) { if (on) document.documentElement.dataset.hideFigures = 'on'; else delete document.documentElement.dataset.hideFigures; }
/** Mirrors the switch onto <html> on every app route. */
export function HideFiguresSync() { const on = useHideFigures(); useEffect(() => mirror(on), [on]); return null; }
export function HideFiguresToggle() {
  const on = useHideFigures();
  const flip = () => { try { if (on) localStorage.removeItem(HIDE_FIGURES_KEY); else localStorage.setItem(HIDE_FIGURES_KEY, 'on'); } catch { mirror(!on); return; } window.dispatchEvent(new Event(EVENT)); };
  return <div className="hide-figures-row"><button type="button" className="secondary hide-figures-toggle" aria-pressed={on} onClick={flip}>{on ? 'Show calories and weight' : 'Hide calories and weight'}</button>
    <p className="fine">{on ? 'Calorie and weight figures are hidden in Health and on Today on this device; what you log is kept as before.' : 'Hide the calorie and weight figures in Health and on Today on this device, if seeing them does not help you. Logging stays the same.'}</p></div>;
}

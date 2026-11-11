'use client';
import {useEffect, useState} from 'react';
import {REST_AFTER_MS} from '../../../lib/nova/core/governor';

/**
 * Session AM (ADR-038 D11; art direction §9): whether NOVA is at rest — the window lost the focus, or a minute passed
 * without a key, a tap or a request. At rest the scripted loops stop (the sky's drift and the motes draw one still frame;
 * the star drops to its resting pace by its own count), so an always-on NOVA beside other work costs next to nothing.
 * Activity is read from key presses, taps and focus only, never from pointer movement. The value changes only when rest
 * begins or ends (one timer, no per-second work).
 */
export function useResting(): boolean {
  const [resting, setResting] = useState(false);
  useEffect(() => {
    let timer = 0, focused = true;
    const rest = () => setResting(true);
    const active = () => { window.clearTimeout(timer); if (focused) { setResting(false); timer = window.setTimeout(rest, REST_AFTER_MS); } };
    const focus = () => { focused = true; active(); }, blur = () => { focused = false; window.clearTimeout(timer); rest(); };
    window.addEventListener('keydown', active, {passive: true}); window.addEventListener('pointerdown', active, {passive: true});
    window.addEventListener('focus', focus); window.addEventListener('blur', blur);
    timer = window.setTimeout(rest, REST_AFTER_MS);
    return () => { window.clearTimeout(timer); window.removeEventListener('keydown', active); window.removeEventListener('pointerdown', active); window.removeEventListener('focus', focus); window.removeEventListener('blur', blur); };
  }, []);
  return resting;
}

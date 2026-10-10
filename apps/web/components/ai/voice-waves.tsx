'use client';
import {useEffect, useRef} from 'react';
import type {VoiceEngine} from './voice-engine';

/**
 * ZIGi's listening waves (Session Z-Cloud Part 3, ADR-019): three nebula rings (cyan → blue → purple → pink) flowing out
 * from the microphone, the launcher or ZIGi's figure while the engine listens, their size and strength following the
 * microphone's live level. Transforms and opacity only; the level is written straight to a CSS variable, never through a
 * React render. Motion Off and reduced motion: a still glow and a level bar, nothing pulsing (panel-z.css). Decorative:
 * the state is announced by the composer's own live region.
 */
export function VoiceWaves({engine, className = ''}: {engine: VoiceEngine | null; className?: string}) {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const el = ref.current; if (!el || !engine) return;
    return engine.subscribe(s => {
      const on = s.state === 'listening';
      if (el.dataset.on !== String(on)) el.dataset.on = String(on);
      el.style.setProperty('--zigi-level', on ? s.level.toFixed(3) : '0');
    });
  }, [engine]);
  return <span ref={ref} className={`zigi-waves ${className}`.trim()} data-on="false" aria-hidden="true"><i/><i/><i/><b className="zigi-level-bar"/></span>;
}

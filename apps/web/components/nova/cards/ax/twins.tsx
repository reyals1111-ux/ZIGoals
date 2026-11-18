'use client';
import type {CSSProperties} from 'react';

/**
 * Session AS (ADR-042 Part 2, family: twins): one period beside another — two bars on one scale, this period lit and the
 * one before it dimmer, each with its own words, and the difference said in words under them (never colour alone; never a
 * judgement). A side with nothing recorded is an unlit dashed bar, not a zero.
 * Arrives: the two bars grow from the left, the earlier one first. Alive: the lit bar's cap glints.
 */
export type Twin = {label: string; text: string; value: number | null};
export function AxTwins({now, before, delta}: {now: Twin; before: Twin; delta: string | null}) {
  const max = Math.max(now.value ?? 0, before.value ?? 0, 1e-9), width = (t: Twin) => ({'--ax-w': `${t.value === null ? 100 : Math.max(3, Math.round(t.value / max * 100))}%`} as CSSProperties);
  return <div className="ax-twins" aria-hidden="true">
    {[before, now].map((t, i) => <div className="ax-twin" key={i} data-side={i === 1 ? 'now' : 'before'} data-none={t.value === null ? '' : undefined}>
      <span className="ax-twin-label">{t.label}</span><span className="ax-twin-text">{t.text}</span>
      <span className="ax-twin-track"><i style={width(t)}/></span>
    </div>)}
    {delta ? <p className="ax-twin-delta">{delta}</p> : null}
  </div>;
}

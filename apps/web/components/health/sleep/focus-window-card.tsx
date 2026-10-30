'use client';
import Link from 'next/link';
import {useUiPrefs} from '../../../lib/ui-prefs/use-ui-prefs';
import {clockFromMidnight} from '../../../lib/sleep/engine';
import {focusWhy, focusWindow} from '../../../lib/sleep/focus-window';
import type {Sleep} from '../../../lib/sleep/schema';
import {formatClock} from '../../../lib/visual-format';

/**
 * Session AJ (item 28): "Your best focus window today" on Today (a For-you card, ADR-035 P8), from the night that ended
 * today; with its Why?, a link to Focus Sessions and an off switch (zigoals:ui-prefs:v1 `focusWindow: false`; back on in
 * Health → Sleep). An estimate, not advice; nothing written on view.
 */
const clock = (m: number) => formatClock(clockFromMidnight(m));
export function FocusWindowCard({sleep, today}: {sleep: Sleep; today: string}) {
  const prefs = useUiPrefs(), w = focusWindow(sleep, today);
  if (!prefs.loaded || prefs.data.focusWindow === false || !w) return null;
  const off = () => { try { void prefs.update(r => ({...r, focusWindow: false})); } catch { /* stays on */ } };
  return <article className="panel focus-window-card" aria-labelledby="focus-window-title">
    <p className="eyebrow">FROM YOUR SLEEP · AN ESTIMATE</p>
    <h3 id="focus-window-title">Your best focus window today: {clock(w.from)}–{clock(w.to)}</h3>
    <details><summary>Why?</summary><p className="fine">{focusWhy(w, clock)}</p></details>
    <div className="ai-card-actions"><Link className="secondary" href="/app/journey#focus">Start a focus session</Link><button type="button" className="text-link" onClick={off}>Turn off</button></div>
  </article>;
}
/** Health → Sleep: the switch that brings the card back (or turns it off). */
export function FocusWindowSetting() {
  const prefs = useUiPrefs();
  if (!prefs.loaded) return null;
  const on = prefs.data.focusWindow !== false;
  return <label className="check-row"><input type="checkbox" checked={on} onChange={e => { const value = e.target.checked; try { void prefs.update(r => ({...r, focusWindow: value})); } catch { /* unchanged */ } }}/> Show my best focus window on Today (an estimate from my sleep)</label>;
}

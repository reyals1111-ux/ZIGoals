'use client';
import {useId, type ReactNode} from 'react';
import {formatDate} from '../../../lib/visual-format';

/**
 * Session AF chunk 2 (P1.18): the parts every "what you'll see" illustration is drawn with, in ZIGoals' nebula style: a
 * dark glass window with a cyan → violet → magenta rim, the app's layout as plain blocks, its buttons and labels as the
 * person will read them, and a gold numbered mark on the one control to press in that step. Redrawn from the Part 0
 * reference captures (docs/earn/ILLUSTRATIONS.md): layout, buttons and labels only — no logos, no figures, no text beyond
 * labels. Inline SVG (one screen well under 6 KB), still: nothing here animates.
 */
export const W = 320, H = 210;
export type ScreenSpec = {caption: ReactNode; label: string; draw: ReactNode; host?: string};
/** One screen: the window, its address bar (the site's host as text), and what `children` draws inside (0,0 = under the bar). */
export function Screen({host, label, children}: {host: string; label: string; children: ReactNode}) {
  const id = `il${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  return <svg className="earn-illustration-svg" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={label} focusable="false">
    <defs>
      <linearGradient id={`${id}r`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#63e7ff"/><stop offset=".5" stopColor="#826cff"/><stop offset="1" stopColor="#c664ff"/></linearGradient>
      <radialGradient id={`${id}g`} cx=".25" cy="0" r="1.1"><stop offset="0" stopColor="#1b2a52"/><stop offset=".7" stopColor="#0b1428"/></radialGradient>
    </defs>
    <rect x="1" y="1" width={W - 2} height={H - 2} rx="14" fill={`url(#${id}g)`} stroke={`url(#${id}r)`} strokeWidth="1.5"/>
    <circle cx="16" cy="14" r="3" fill="#ff8fb1" opacity=".7"/><circle cx="26" cy="14" r="3" fill="#ffd27a" opacity=".7"/><circle cx="36" cy="14" r="3" fill="#86f0d6" opacity=".7"/>
    <rect x="50" y="7" width="150" height="14" rx="7" fill="#0f1a33" stroke="#7fc8ff33"/>
    <text x="58" y="17.5" className="il-host">{host}</text>
    <g transform="translate(0 28)">{children}</g>
  </svg>;
}
/** A plain block of the page (a card, a field, a panel). */
export const Box = ({x, y, w, h, tone = 'card'}: {x: number; y: number; w: number; h: number; tone?: 'card' | 'field' | 'dim'}) =>
  <rect x={x} y={y} width={w} height={h} rx={tone === 'field' ? 7 : 10} className={`il-box il-${tone}`}/>;
/** A label as the page writes it. */
export const T = ({x, y, children, size = 9, tone = 'text', anchor = 'start'}: {x: number; y: number; children: ReactNode; size?: number; tone?: 'text' | 'muted' | 'strong' | 'gold'; anchor?: 'start' | 'middle' | 'end'}) =>
  <text x={x} y={y} fontSize={size} textAnchor={anchor} className={`il-t il-${tone}`}>{children}</text>;
/** A button or a chip; `hot` is the one to press in this step. */
export function Btn({x, y, w, h = 18, label, hot = false, pill = false}: {x: number; y: number; w: number; h?: number; label: string; hot?: boolean; pill?: boolean}) {
  return <g className={hot ? 'il-btn il-hot' : 'il-btn'}>
    <rect x={x} y={y} width={w} height={h} rx={pill ? h / 2 : 6}/>
    <text x={x + w / 2} y={y + h / 2 + 3.2} fontSize={h > 16 ? 8.5 : 7.5} textAnchor="middle">{label}</text>
  </g>;
}
/** The gold numbered mark beside the control of this step. */
export const Mark = ({x, y, n}: {x: number; y: number; n: number}) =>
  <g className="il-mark"><circle cx={x} cy={y} r="8"/><text x={x} y={y + 3.2} fontSize="9" textAnchor="middle">{n}</text></g>;
/** A row of a table or a list: a line of muted blocks standing for text ZIGoals does not redraw. */
export const Lines = ({x, y, widths, gap = 9}: {x: number; y: number; widths: number[]; gap?: number}) =>
  <g className="il-lines">{widths.map((w, i) => <rect key={i} x={x} y={y + i * gap} width={w} height="4" rx="2"/>)}</g>;

/** The set of screens for one app, numbered, each with its step in words below. */
export function Illustration({app, host, screens, readOn = '2026-10-18'}: {app: string; host: string; screens: ScreenSpec[]; readOn?: string}) {
  return <div className="earn-illustration" data-illustration={host}>
    <ol className="earn-illustration-screens">
      {screens.map((s, i) => <li key={i}>
        <Screen host={s.host ?? host} label={`${app}, step ${i + 1}: ${s.label}`}>{s.draw}</Screen>
        <p><span className="earn-step-n" aria-hidden="true">{i + 1}</span> {s.caption}</p>
      </li>)}
    </ol>
    <p className="fine earn-illustration-note">Redrawn by ZIGoals from {app}’s own page as it looked on {formatDate(`${readOn}T12:00:00Z`, {timeZone: 'UTC'})} (layout, buttons and labels; no figures). The real page may have changed since.</p>
  </div>;
}

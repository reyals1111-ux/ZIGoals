import type {CSSProperties} from 'react';
import type {PlacedMilestone} from '../../lib/path/model';
import {PathZigi} from './path-zigi';

/**
 * A reward chest on the path (P7.7): closed and dim until reached; reached, its lid stands open with a gold glow and its
 * reward line ("Badge: First orbit · +15 XP", shown only when the caller passes a reward, i.e. with the game layer on).
 * The lid opens once at the moment it is reached (`data-just`); reduced motion and Motion Off show it open, still.
 *
 * Session AF (L3b), the Checklist's orbit look (`onPath`): the chest stands on the path itself, half way between its two
 * dots, and the day's end is a trophy planet in the middle of the path, dim until every dot is lit, then gold and
 * glowing with ZIGi celebrating beside it. `inline` (round 3: a learning path's density): the chest takes no row of its own —
 * it rides its planet's node, on the line just below it, with no name on the path (its name and state stay for screen
 * readers).
 */
export type ChestOnPath = {offset: number; trophy: boolean; zigi: string | null; inline?: boolean; fit?: string};
export function PathChest({milestone, just, side, uid, onPath}: {milestone: PlacedMilestone; just: boolean; side: 'left' | 'right'; uid: string; onPath?: ChestOnPath}) {
  const gold = `path-chest-gold-${uid}-${milestone.id.replace(/[^a-zA-Z0-9]/g, '')}`;
  const reward = [milestone.reward?.badge ? `Badge: ${milestone.reward.badge}` : null, milestone.reward?.xp ? `+${milestone.reward.xp} XP` : null].filter(Boolean).join(' · ');
  const text = onPath ? milestone.label : milestone.reached ? milestone.reachedLabel ?? milestone.label : milestone.label;
  const Root = onPath?.inline ? 'div' : 'li';
  return <Root className="path-chest" data-reached={milestone.reached || undefined} data-just={just ? '' : undefined} data-side={side} data-milestone={milestone.id} data-on-path={onPath ? '' : undefined} data-trophy={onPath?.trophy || undefined} data-inline={onPath?.inline || undefined} style={onPath && !onPath.inline ? {'--offset': onPath.offset} as CSSProperties : undefined}>
    <span className="path-chest-art" aria-hidden="true">
      {onPath?.trophy ? <TrophyPlanet gold={gold}/> : <svg viewBox="0 0 64 56" focusable="false">
        <defs><linearGradient id={gold} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#ffe6a8"/><stop offset=".55" stopColor="#ffd27a"/><stop offset="1" stopColor="#f0a24b"/></linearGradient></defs>
        <rect className="path-chest-body" x="8" y="24" width="48" height="28" rx="6" fill={`url(#${gold})`}/>
        <path className="path-chest-band" d="M8 33h48"/>
        <rect className="path-chest-clasp" x="28" y="29" width="8" height="9" rx="2"/>
        <g className="path-chest-lid"><path d="M8 25c0-11 9-17 24-17s24 6 24 17z" fill={`url(#${gold})`}/></g>
        <g className="path-chest-shine"><circle cx="32" cy="18" r="3"/><path d="M32 4v6M20 9l3 4M44 9l-3 4"/></g>
      </svg>}
      <span className="path-chest-sparks"><i/><i/><i/><i/><i/><i/></span>
    </span>
    <span className={onPath?.inline ? 'path-chest-text sr-only' : 'path-chest-text'}><strong>{text}</strong>{milestone.reached && reward ? <small>{reward}</small> : null}<span className="sr-only">{milestone.reached ? ' (reached)' : ' (not reached yet)'}</span></span>
    {onPath?.zigi && <PathZigi state={onPath.zigi} side="right" alive fit={onPath.fit}/>}
  </Root>;
}

/** The day's trophy planet: a gold world with a ring and a cup on it (decorative; the text beside it names it). */
function TrophyPlanet({gold}: {gold: string}) {
  return <svg className="path-trophy" viewBox="0 0 120 120" focusable="false">
    <defs>
      <radialGradient id={gold} cx=".36" cy=".3" r=".75"><stop offset="0" stopColor="#fff4d1"/><stop offset=".35" stopColor="#ffd27a"/><stop offset=".78" stopColor="#f0a24b"/><stop offset="1" stopColor="#b8681f"/></radialGradient>
    </defs>
    <ellipse className="path-trophy-ring-back" cx="60" cy="64" rx="56" ry="15"/>
    <circle className="path-trophy-world" cx="60" cy="60" r="40" fill={`url(#${gold})`}/>
    <path className="path-trophy-cup" d="M46 42h28v8c0 9-6 15-14 15s-14-6-14-15zM46 46h-6c0 7 3 11 8 12M74 46h6c0 7-3 11-8 12M60 65v8M50 79h20M53 73h14v6H53z"/>
    <path className="path-trophy-ring-front" d="M4 64c0 8 25 15 56 15s56-7 56-15"/>
    <g className="path-trophy-rays"><path d="M60 4v10M18 18l7 7M102 18l-7 7M8 52h9M103 52h9"/></g>
  </svg>;
}

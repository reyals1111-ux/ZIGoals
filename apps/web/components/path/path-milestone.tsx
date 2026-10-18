import type {PlacedMilestone} from '../../lib/path/model';

/**
 * A reward chest on the path (P7.7): closed and dim until reached; reached, its lid stands open with a gold glow and its
 * reward line ("Badge: First orbit · +15 XP", shown only when the caller passes a reward, i.e. with the game layer on).
 * The lid opens once at the moment it is reached (`data-just`); reduced motion and Motion Off show it open, still.
 */
export function PathChest({milestone, just, side, uid}: {milestone: PlacedMilestone; just: boolean; side: 'left' | 'right'; uid: string}) {
  const gold = `path-chest-gold-${uid}-${milestone.id.replace(/[^a-zA-Z0-9]/g, '')}`;
  const reward = [milestone.reward?.badge ? `Badge: ${milestone.reward.badge}` : null, milestone.reward?.xp ? `+${milestone.reward.xp} XP` : null].filter(Boolean).join(' · ');
  const text = milestone.reached ? milestone.reachedLabel ?? milestone.label : milestone.label;
  return <li className="path-chest" data-reached={milestone.reached || undefined} data-just={just ? '' : undefined} data-side={side} data-milestone={milestone.id}>
    <span className="path-chest-art" aria-hidden="true">
      <svg viewBox="0 0 64 56" focusable="false">
        <defs><linearGradient id={gold} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#ffe6a8"/><stop offset=".55" stopColor="#ffd27a"/><stop offset="1" stopColor="#f0a24b"/></linearGradient></defs>
        <rect className="path-chest-body" x="8" y="24" width="48" height="28" rx="6" fill={`url(#${gold})`}/>
        <path className="path-chest-band" d="M8 33h48"/>
        <rect className="path-chest-clasp" x="28" y="29" width="8" height="9" rx="2"/>
        <g className="path-chest-lid"><path d="M8 25c0-11 9-17 24-17s24 6 24 17z" fill={`url(#${gold})`}/></g>
        <g className="path-chest-shine"><circle cx="32" cy="18" r="3"/><path d="M32 4v6M20 9l3 4M44 9l-3 4"/></g>
      </svg>
      <span className="path-chest-sparks"><i/><i/><i/><i/><i/><i/></span>
    </span>
    <span className="path-chest-text"><strong>{text}</strong>{milestone.reached && reward ? <small>{reward}</small> : null}<span className="sr-only">{milestone.reached ? ' (reached)' : ' (not reached yet)'}</span></span>
  </li>;
}

import type {Orbit} from '../../../lib/health-rings/rings';

const R = 44, C = 2 * Math.PI * R;
/**
 * One goal as a planet on its own orbit: the travelled part of the orbit in the pillar colour, the planet where it is now
 * (Session AP; shared with Today's "Your orbits" card since Session AR 6b). Drawn only; its words are beside it. An orbit
 * whose value is not known yet has no travelled part and its planet waits at the start, outlined (`data-known="false"`).
 */
export function OrbitFigure({o}: {o: Orbit}) {
  const share = o.known ? o.share : 0;
  const a = share * 2 * Math.PI - Math.PI / 2, x = 60 + R * Math.cos(a), y = 60 + R * Math.sin(a);
  return <svg viewBox="0 0 120 120" aria-hidden="true" focusable="false" data-known={o.known ? undefined : 'false'}>
    <circle className="ap-orbit-sun" cx="60" cy="60" r="14"/>
    <circle className="ap-orbit-track" cx="60" cy="60" r={R}/>
    {share > 0 && <circle className="ap-orbit-arc" cx="60" cy="60" r={R} strokeDasharray={`${share * C} ${C}`} transform="rotate(-90 60 60)"/>}
    <circle className="ap-orbit-planet" cx={x} cy={y} r="8"/>
  </svg>;
}

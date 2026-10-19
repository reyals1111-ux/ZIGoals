/**
 * Session AF (L2b, Part 6, ADR-028 H55; P6.3): "your money is working toward this goal", drawn: the Goal as a planet, the
 * stake as a moon on its ring, the ring filled to the share already covered, and the rewards as small sparks that drift
 * into the ring once when the card appears (one-time motion, never a loop; still under reduced motion and Motion Off).
 * Decorative: every figure it shows is also in the text beside it.
 */
export function VaultOrbit({share, rewards}: {share: number | null; rewards: boolean}) {
  const filled = share === null ? 0 : Math.max(0, Math.min(100, share));
  const r = 44, c = 2 * Math.PI * r, angle = (filled / 100) * 2 * Math.PI - Math.PI / 2;
  const moon = {x: 60 + r * Math.cos(angle), y: 60 + r * Math.sin(angle)};
  return <svg className="vault-orbit" viewBox="0 0 120 120" width="120" height="120" aria-hidden="true" focusable="false">
    <circle cx="60" cy="60" r={r} className="vault-orbit-ring"/>
    <circle cx="60" cy="60" r={r} className="vault-orbit-fill" strokeDasharray={`${(filled / 100) * c} ${c}`} transform="rotate(-90 60 60)"/>
    <circle cx="60" cy="60" r="22" className="vault-orbit-planet"/>
    <circle cx={moon.x} cy={moon.y} r="7" className="vault-orbit-moon"/>
    {rewards && <g className="vault-orbit-sparks">{[0, 1, 2].map(i => <circle key={i} cx={moon.x} cy={moon.y} r="2" style={{animationDelay: `${i * 160}ms`}}/>)}</g>}
  </svg>;
}

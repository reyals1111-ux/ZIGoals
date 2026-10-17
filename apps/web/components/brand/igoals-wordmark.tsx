/**
 * Session AD (Part 1, ADR-026 F8): the owner's full wordmark — the origami "Z" and the letters "IGoals" in one textured
 * paper image — as a transparent raster. AVIF, then WebP, then a PNG for anything older; 1x/2x/3x of its displayed width
 * (360 px on a computer), lazy and decoded off the main thread, with its size reserved so nothing moves when it arrives.
 * The source stays at docs/igoals-wordmark-owner.jpg; the steps that made these files are in ADR-026 F8. One name: "ZIGoals".
 */
const SRC = '/brand/wordmark/igoals-wordmark';
const SIZES = '(max-width: 359px) 210px, (max-width: 767px) 248px, (max-width: 1100px) 310px, 360px';
const set = (ext: string) => [360, 720, 1080].map(w => `${SRC}-${w}.${ext} ${w}w`).join(', ');

export function IGoalsWordmark({className = ''}: {className?: string}) {
  return <picture className={`igoals-wordmark ${className}`.trim()}>
    <source type="image/avif" srcSet={set('avif')} sizes={SIZES}/>
    <source type="image/webp" srcSet={set('webp')} sizes={SIZES}/>
    <img src={`${SRC}-720.png`} width={360} height={112} alt="ZIGoals" loading="lazy" decoding="async"/>
  </picture>;
}

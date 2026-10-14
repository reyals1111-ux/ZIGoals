import './logo-wordmark.css';

/**
 * Session AB-Design Phase 2 (the owner's wordmark notes): "ZIGoals" with the origami Z/G logo as its "Z" — "[logo]IGoals".
 * The logo is 1.1× the letters' cap height, on their baseline and centred on their optical middle, with a small clear gap
 * before the "I"; the letters continue the logo's own colours (cyan-blue → violet → magenta, no white start). The logo is
 * drawn crisp: dedicated lossless files at 1x/2x/3x of its displayed width (exported from the transparent master
 * `incoming/zigoals-logo-z-transparent.png`, 525×597: `sips --resampleWidth 64|128|192` → `cwebp -lossless -exact`), never
 * upscaled, with no filter, opacity or blend on it — its glow is a separate soft layer behind it. One name: "ZIGoals".
 */
export function LogoWordmark({className = '', size = 'large'}: {className?: string; size?: 'large' | 'medium'}) {
  return <p className={`logo-wordmark logo-wordmark-${size} ${className}`.trim()} role="img" aria-label="ZIGoals">
    <span className="logo-wordmark-z">
      {/* eslint-disable-next-line @next/next/no-img-element -- a fixed-size brand raster with its own 1x/2x/3x files */}
      <img src="/brand/wordmark/zigoals-z-64.webp" srcSet="/brand/wordmark/zigoals-z-64.webp 64w, /brand/wordmark/zigoals-z-128.webp 128w, /brand/wordmark/zigoals-z-192.webp 192w" sizes="(max-width: 359px) 32px, (max-width: 767px) 37px, 63px" width={64} height={72} alt="" decoding="async"/>
    </span>
    <span className="logo-wordmark-letters" aria-hidden="true">IGoals</span>
  </p>;
}

import Image from "next/image";
/** Replace /public/icon.svg once to update the shared mark and static favicon. */
export function BrandMark({ size = 36 }: { size?: number }) {
  return <Image className="brand-mark" src="/icon.svg" alt="" aria-hidden="true" width={size} height={size} unoptimized />;
}
export function Wordmark() {
  return <span className="brand-wordmark">ZI<span>Goals</span></span>;
}
/** Glowing nebula Z: transparent, tightly cropped WebP at 1x/2x/3x. Decorative; the enclosing link names the brand. */
export function LogoMark() {
  // eslint-disable-next-line @next/next/no-img-element
  return <img className="brand-logo" src="/brand/zigoals-z-64.webp" srcSet="/brand/zigoals-z-64.webp 57w, /brand/zigoals-z-128.webp 114w, /brand/zigoals-z-192.webp 171w" sizes="(max-width: 900px) 40px, 57px" width={57} height={64} alt="" decoding="async" />;
}

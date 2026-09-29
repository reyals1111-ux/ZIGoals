import Image from "next/image";
/** Replace /public/icon.svg once to update the shared mark and static favicon. */
export function BrandMark({ size = 36 }: { size?: number }) {
  return <Image className="brand-mark" src="/icon.svg" alt="" aria-hidden="true" width={size} height={size} unoptimized />;
}
export function Wordmark() {
  return <span className="brand-wordmark">ZI<span>Goals</span></span>;
}
/** Nebula Z logo: transparent WebP at 1x/2x/3x of the 141px desktop size; the mobile header shows it at 40px. */
export function LogoMark() {
  // eslint-disable-next-line @next/next/no-img-element
  return <img className="brand-logo" src="/brand/zigoals-logo-160.webp" srcSet="/brand/zigoals-logo-160.webp 141w, /brand/zigoals-logo-320.webp 281w, /brand/zigoals-logo-480.webp 422w" sizes="(max-width: 900px) 40px, 141px" width={141} height={160} alt="ZIGoals" decoding="async" />;
}

import Image from "next/image";
/** Replace /public/icon.svg once to update the shared mark and static favicon. */
export function BrandMark({ size = 36 }: { size?: number }) {
  return <Image className="brand-mark" src="/icon.svg" alt="" aria-hidden="true" width={size} height={size} unoptimized />;
}
export function Wordmark() {
  return <span className="brand-wordmark">ZI<span>Goals</span></span>;
}

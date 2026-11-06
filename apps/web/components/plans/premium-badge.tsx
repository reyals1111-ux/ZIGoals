import Link from 'next/link';
import {PLANS_HREF, entitlement} from '../../lib/entitlements';
import './premium-badge.css';

/**
 * Session AL Part 12 (owner decision O2): "Premium · free during the Alpha", a link to the Plans page (placeholder
 * prices, nothing charged). Use it wherever ZIGi · Your Personal AI Companion or NOVA's premium features are labelled.
 */
export function PremiumBadge({className = '', short = false}: {className?: string; short?: boolean}) {
  const label = entitlement('your-ai').label;
  // CI4 (zigi-face-z): `short` says "Premium" where room is scarce (ZIGi's status line); the full words are its name and tip.
  return short
    ? <Link className={`premium-badge ${className}`.trim()} href={PLANS_HREF} prefetch={false} aria-label={label} title={label}>Premium</Link>
    : <Link className={`premium-badge ${className}`.trim()} href={PLANS_HREF} prefetch={false}>{label}</Link>;
}
export default PremiumBadge;

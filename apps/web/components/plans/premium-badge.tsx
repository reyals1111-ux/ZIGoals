import Link from 'next/link';
import {PLANS_HREF, entitlement} from '../../lib/entitlements';
import './premium-badge.css';

/**
 * Session AL Part 12 (owner decision O2): "Premium · free during the Alpha", a link to the Plans page (placeholder
 * prices, nothing charged). Use it wherever ZIGi · Your Personal AI Companion or NOVA's premium features are labelled.
 */
export function PremiumBadge({className = ''}: {className?: string}) {
  return <Link className={`premium-badge ${className}`.trim()} href={PLANS_HREF} prefetch={false}>{entitlement('your-ai').label}</Link>;
}
export default PremiumBadge;

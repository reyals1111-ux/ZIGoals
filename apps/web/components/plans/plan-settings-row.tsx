import Link from 'next/link';
import {PLANS_HREF, PLAN_PLACEHOLDER_LINE} from '../../lib/entitlements';
import './premium-badge.css';

/**
 * Session AL Part 12 (owner decision O2): Settings' "Plan" row. During the Alpha everything is free; the link opens the
 * Plans page with the placeholder one-time prices. Nothing is bought here.
 */
export function PlanSettingsRow({className = ''}: {className?: string}) {
  return <div className={`plan-settings-row ${className}`.trim()} id="plan">
    <Link className="text-link plan-settings-link" href={PLANS_HREF} prefetch={false}><strong>Plan</strong>&nbsp;— Alpha: everything free<span aria-hidden="true">&nbsp;→</span></Link>
    <p className="plan-settings-note">{PLAN_PLACEHOLDER_LINE}</p>
  </div>;
}
export default PlanSettingsRow;

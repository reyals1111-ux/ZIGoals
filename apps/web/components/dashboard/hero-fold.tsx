'use client';
import './hero-fold.css';
/**
 * Session AB-Design (owner request 7): the very small nebula chevron in the hero's top-right corner (ZIGi's fold arrow)
 * that hides or shows Today's welcome header and planet; remembered on this device (zigoals:ui-prefs:v1).
 */
export function HeroFold({collapsed, onToggle}: {collapsed: boolean; onToggle: () => void}) {
  return <button type="button" className="hero-fold" data-collapsed={collapsed || undefined} aria-expanded={!collapsed} aria-label={collapsed ? 'Show the welcome header' : 'Hide the welcome header'} title={collapsed ? 'Show the welcome header' : 'Hide the welcome header'} onClick={onToggle}>
    <svg viewBox="0 0 22 12" width="22" height="12" aria-hidden="true" focusable="false"><defs><linearGradient id="hero-fold-nebula" x1="0" x2="1" y1="0" y2="0"><stop offset="0" stopColor="var(--brand-cyan, #63e7ff)"/><stop offset=".5" stopColor="var(--brand-violet, #826cff)"/><stop offset="1" stopColor="var(--brand-magenta, #c664ff)"/></linearGradient></defs><path d="M3 3l8 6 8-6" fill="none" stroke="url(#hero-fold-nebula)" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
  </button>;
}

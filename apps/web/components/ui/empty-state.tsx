import type {ReactNode} from 'react';
import {ZigiFigure} from '../zigi/zigi-figure';

/**
 * Session AB-Design (owner request 29): one empty state for the whole app — ZIGi, a title, one line and one action —
 * on the `.aa-empty` card the AA pages already used. `zigi` is the figure's state (peek by default). Phase 2, Part 3: used by
 * every page-level empty state; `level` keeps a page's heading outline (h2 where the card stood at h2), `as` its landmark.
 */
export function EmptyState({title, children, action, zigi = 'peek', className = '', level = 3, as = 'div', label}: {title: ReactNode; children?: ReactNode; action?: ReactNode; zigi?: string; className?: string; level?: 2 | 3; as?: 'div' | 'section'; label?: string}) {
  const Root = as, Title = level === 2 ? 'h2' : 'h3';
  return <Root className={`aa-empty empty-state ${className}`.trim()} aria-label={label}>
    <div className="empty-state-figure" aria-hidden="true"><ZigiFigure state={zigi}/></div>
    <div className="empty-state-copy"><Title>{title}</Title>{children && <p>{children}</p>}{action && <div className="empty-state-action">{action}</div>}</div>
  </Root>;
}

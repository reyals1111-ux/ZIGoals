import type {ReactNode} from 'react';
import {ZigiFigure} from '../zigi/zigi-figure';

/**
 * Session AB-Design (owner request 29): one empty state for the whole app — ZIGi, a title, one line and one action —
 * on the `.aa-empty` card the AA pages already used. `zigi` is the figure's state (peek by default).
 */
export function EmptyState({title, children, action, zigi = 'peek', className = ''}: {title: ReactNode; children?: ReactNode; action?: ReactNode; zigi?: string; className?: string}) {
  return <div className={`aa-empty empty-state ${className}`.trim()}>
    <div className="empty-state-figure" aria-hidden="true"><ZigiFigure state={zigi}/></div>
    <div className="empty-state-copy"><h3>{title}</h3>{children && <p>{children}</p>}{action && <div className="empty-state-action">{action}</div>}</div>
  </div>;
}

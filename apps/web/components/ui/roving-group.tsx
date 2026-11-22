'use client';
import type {ReactNode} from 'react';
import {useRovingFocus} from './use-roving-focus';

/**
 * Session AO (D-028): a <div> whose repeated controls (matched by `selector`) are one Tab stop, for a list rendered where a
 * hook cannot be called (a switch in Today's dashboard). The arrows move between them; see use-roving-focus.ts.
 */
// Session AP (D-028): `contents` makes the wrapper no box at all, so a list keeps its layout exactly (grids, flex rows).
// Session AV lane 2 (P-1): `role` and `label` let the group itself be the list's box, so child-combinator rules
// (`.life-rings > .life-ring`) match its items and no extra wrapper sits between them.
export function RovingGroup({className, selector, columns, contents, role, label, children}: {className?: string; selector: string; columns?: number; contents?: boolean; role?: 'group'; label?: string; children: ReactNode}) {
  const ref = useRovingFocus<HTMLDivElement>(selector, {columns});
  return <div ref={ref} className={className} role={role} aria-label={label} style={contents ? {display: 'contents'} : undefined}>{children}</div>;
}

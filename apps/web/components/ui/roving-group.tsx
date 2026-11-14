'use client';
import type {ReactNode} from 'react';
import {useRovingFocus} from './use-roving-focus';

/**
 * Session AO (D-028): a <div> whose repeated controls (matched by `selector`) are one Tab stop, for a list rendered where a
 * hook cannot be called (a switch in Today's dashboard). The arrows move between them; see use-roving-focus.ts.
 */
// Session AP (D-028): `contents` makes the wrapper no box at all, so a list keeps its layout exactly (grids, flex rows).
export function RovingGroup({className, selector, columns, contents, children}: {className?: string; selector: string; columns?: number; contents?: boolean; children: ReactNode}) {
  const ref = useRovingFocus<HTMLDivElement>(selector, {columns});
  return <div ref={ref} className={className} style={contents ? {display: 'contents'} : undefined}>{children}</div>;
}

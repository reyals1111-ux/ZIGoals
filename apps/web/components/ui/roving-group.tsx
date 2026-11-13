'use client';
import type {ReactNode} from 'react';
import {useRovingFocus} from './use-roving-focus';

/**
 * Session AO (D-028): a <div> whose repeated controls (matched by `selector`) are one Tab stop, for a list rendered where a
 * hook cannot be called (a switch in Today's dashboard). The arrows move between them; see use-roving-focus.ts.
 */
export function RovingGroup({className, selector, columns, children}: {className?: string; selector: string; columns?: number; children: ReactNode}) {
  const ref = useRovingFocus<HTMLDivElement>(selector, {columns});
  return <div ref={ref} className={className}>{children}</div>;
}

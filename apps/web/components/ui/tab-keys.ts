import type {KeyboardEvent} from 'react';
import {nextTabIndex} from '../../lib/a11y/tab-key';

/**
 * Session AK P6 (keyboard, the ARIA tabs pattern): the keys of a tab list. Left and right arrows move to the previous and
 * next tab (wrapping), Home and End to the first and last; the tab moved to is chosen and focused, as a click would. Put it
 * on the element with role="tablist"; `ids` are its tabs in the order they stand.
 */
export function tabKeys<T extends string>(ids: readonly T[], current: T, select: (id: T) => void) {
  return (event: KeyboardEvent<HTMLElement>) => {
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    const to = nextTabIndex(event.key, ids.indexOf(current), ids.length);
    if (to === null) return;
    event.preventDefault();
    select(ids[to]!);
    event.currentTarget.querySelectorAll<HTMLElement>('[role="tab"]')[to]?.focus();
  };
}

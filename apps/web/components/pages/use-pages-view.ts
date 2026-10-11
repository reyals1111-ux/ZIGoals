'use client';
import {useSyncExternalStore} from 'react';
import {pagesViewSnapshot, serverPagesView, subscribePagesView} from '../../lib/pages/view-store';
import type {PagesView} from '../../lib/pages/schema';

/** The pages and buttons that show (Session W Part 2): the defaults on the server, the person's own from the first client render. */
export function usePagesView(): PagesView {
  return useSyncExternalStore(subscribePagesView, pagesViewSnapshot, serverPagesView);
}

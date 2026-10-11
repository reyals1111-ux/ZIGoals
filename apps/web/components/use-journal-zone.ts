'use client';
import {useSyncExternalStore} from 'react';
import {journalZoneSnapshot, serverJournalZone, subscribeJournalTimeZone, type JournalZoneState} from '../lib/journal-zone';

/**
 * The journal zone in a component (Session W Part 17): re-renders when the shell sets it or the person changes it. On the
 * server and while a part of the page hydrates it is the server's state (no zone, not ready), so the first client render
 * matches the server HTML even when that part hydrates after the shell has set the zone.
 */
export function useJournalZone(): JournalZoneState {
  return useSyncExternalStore(subscribeJournalTimeZone, journalZoneSnapshot, serverJournalZone);
}

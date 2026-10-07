'use client';
import {useSyncExternalStore} from 'react';
import {journalTimeZone, journalZoneReady, journalZoneVersion, subscribeJournalTimeZone} from '../lib/journal-zone';

/** The journal zone in a component (Session W Part 17): re-renders when the shell sets it or the person changes it. */
export function useJournalZone(): {zone: string | null; ready: boolean} {
  useSyncExternalStore(subscribeJournalTimeZone, journalZoneVersion, () => 0);
  return {zone: journalTimeZone(), ready: journalZoneReady()};
}

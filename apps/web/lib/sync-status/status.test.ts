import {describe, expect, it} from 'vitest';
import {syncStatus, type SyncStatusInput} from './status';

// Session AK F0 (8.9): the sync line's words and tone, state by state.
const base: SyncStatusInput = {ready: true, selectionError: false, showcase: false, selected: true, locked: false, opened: true, error: false, online: true, busy: false, last: '', changed: false};
describe('syncStatus', () => {
  it('keeps the shell\'s words for every earlier state (specs and Help quote them)', () => {
    expect(syncStatus({...base, ready: false}).text).toBe('Checking storage…');
    expect(syncStatus({...base, selected: false})).toEqual({tone: 'local', text: 'This device only · account sync is off'});
    expect(syncStatus({...base, showcase: true})).toEqual({tone: 'showcase', text: 'Showcase · fictional records'});
    expect(syncStatus({...base, locked: true}).text).toBe('Account locked · unlock in Settings');
    expect(syncStatus({...base, opened: false}).text).toBe('Account locked · unlock in Settings');
    expect(syncStatus({...base, error: true})).toEqual({tone: 'attention', text: 'Sync needs attention · changes kept on this device'});
    expect(syncStatus({...base, online: false}).text).toBe('Offline · account sync will retry when connected');
    expect(syncStatus({...base, busy: true}).text).toBe('Syncing encrypted account records…');
    expect(syncStatus({...base, last: '12:34'})).toEqual({tone: 'synced', text: 'Last sync acknowledgement: 12:34'});
    expect(syncStatus(base).text).toBe('Account unlocked · awaiting sync acknowledgement');
    expect(syncStatus({...base, ready: true, selectionError: true}).text).toBe('Account selection needs attention · records remain locked');
  });
  it('says when changes wait for the next sync, and stops once it is acknowledged', () => {
    expect(syncStatus({...base, last: '12:34', changed: true})).toEqual({tone: 'waiting', text: 'Changes saved on this device · waiting to sync · Last sync acknowledgement: 12:34'});
    expect(syncStatus({...base, changed: true})).toEqual({tone: 'waiting', text: 'Changes saved on this device · awaiting sync acknowledgement'});
    expect(syncStatus({...base, online: false, changed: true}).text).toBe('Offline · changes kept on this device, sync will retry when connected');
  });
  it('the order of what matters: an account problem before sync, an error before offline, offline before syncing', () => {
    expect(syncStatus({...base, selectionError: true, showcase: true}).tone).toBe('attention');
    expect(syncStatus({...base, error: true, online: false}).tone).toBe('attention');
    expect(syncStatus({...base, online: false, busy: true}).tone).toBe('offline');
    // The Showcase never shows the person's own sync state.
    expect(syncStatus({...base, showcase: true, error: true}).text).toBe('Showcase · fictional records');
  });
});

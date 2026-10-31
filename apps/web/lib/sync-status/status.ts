/**
 * Session AK F0 (brief 8.9, a visible sync status): the one line that says where the person's records stand — on this
 * device only, locked, syncing, synced (with the last acknowledgement's time), changes waiting to sync, offline, or
 * needing attention — and a calm tone for its dot. The words are the shell's earlier ones (components/workspace-status.tsx;
 * specs and Help quote them); new is "waiting to sync": a change saved on this device after the last acknowledgement,
 * cleared by the next one. Never an account id, an error's own text or a count the app cannot know. Pure.
 */
export type SyncTone = 'checking' | 'local' | 'showcase' | 'locked' | 'syncing' | 'synced' | 'waiting' | 'offline' | 'attention';
export type SyncStatusInput = {
  ready: boolean; selectionError: boolean; showcase: boolean; selected: boolean; locked: boolean;
  opened: boolean; error: boolean; online: boolean; busy: boolean; last: string;
  /** A change was saved on this device since the last sync acknowledgement (or since the page opened, before any). */
  changed: boolean;
};
export function syncStatus(s: SyncStatusInput): {tone: SyncTone; text: string} {
  if (!s.ready) return {tone: 'checking', text: 'Checking storage…'};
  if (s.selectionError) return {tone: 'attention', text: 'Account selection needs attention · records remain locked'};
  if (s.showcase) return {tone: 'showcase', text: 'Showcase · fictional records'};
  if (!s.selected) return {tone: 'local', text: 'This device only · account sync is off'};
  if (s.locked || !s.opened) return {tone: 'locked', text: 'Account locked · unlock in Settings'};
  if (s.error) return {tone: 'attention', text: 'Sync needs attention · changes kept on this device'};
  if (!s.online) return {tone: 'offline', text: s.changed ? 'Offline · changes kept on this device, sync will retry when connected' : 'Offline · account sync will retry when connected'};
  if (s.busy) return {tone: 'syncing', text: 'Syncing encrypted account records…'};
  if (s.last) return s.changed ? {tone: 'waiting', text: `Changes saved on this device · waiting to sync · Last sync acknowledgement: ${s.last}`} : {tone: 'synced', text: `Last sync acknowledgement: ${s.last}`};
  return {tone: s.changed ? 'waiting' : 'syncing', text: s.changed ? 'Changes saved on this device · awaiting sync acknowledgement' : 'Account unlocked · awaiting sync acknowledgement'};
}

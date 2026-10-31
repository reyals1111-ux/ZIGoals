// @vitest-environment jsdom
import {act, createElement} from 'react';
import {createRoot, type Root} from 'react-dom/client';
import {afterEach, expect, test, vi} from 'vitest';
import {WorkspaceStatus} from '../../components/workspace-status';
import {activateAccount, clearAccountSession, unlockAccount} from '../account-session';

// Session AK F0 (8.9): "waiting to sync" follows the sync runs, and the line carries a tone for its dot.
const {status} = vi.hoisted(() => ({status: {opened: false, busy: false, message: '', error: '', last: '', account: null as string | null}}));
vi.mock('../../components/vault-sync-controls', () => ({useVaultStatus: () => status}));
(globalThis as unknown as {IS_REACT_ACT_ENVIRONMENT: boolean}).IS_REACT_ACT_ENVIRONMENT = true;
let root: Root | undefined;
afterEach(async () => { await act(async () => root?.unmount()); root = undefined; clearAccountSession(); Object.assign(status, {opened: false, busy: false, message: '', error: '', last: '', account: null}); });
test('a change waits for the next sync run; a change made during a run waits for the one after', async () => {
  const element = document.createElement('div'); root = createRoot(element);
  const render = () => act(async () => root!.render(createElement(WorkspaceStatus)));
  const line = () => element.querySelector('[role="status"]')!;
  const account = '10000000-0000-4000-8000-000000000002';
  await act(async () => activateAccount(account)); await act(async () => unlockAccount());
  Object.assign(status, {opened: true, account, last: '09:00'}); await render();
  expect(line().textContent).toBe('Last sync acknowledgement: 09:00'); expect(line().getAttribute('data-sync-tone')).toBe('synced');
  await act(async () => window.dispatchEvent(new Event('zigoals:private-change')));
  expect(line().textContent).toBe('Changes saved on this device · waiting to sync · Last sync acknowledgement: 09:00'); expect(line().getAttribute('data-sync-tone')).toBe('waiting');
  Object.assign(status, {busy: true}); await render();
  expect(line().getAttribute('data-sync-tone')).toBe('syncing');
  Object.assign(status, {busy: false, last: '09:01'}); await render();
  expect(line().textContent).toBe('Last sync acknowledgement: 09:01');
  // A change while the run is going is not in it.
  Object.assign(status, {busy: true}); await render();
  await act(async () => window.dispatchEvent(new Event('zigoals:private-change')));
  Object.assign(status, {busy: false, last: '09:02'}); await render();
  expect(line().getAttribute('data-sync-tone')).toBe('waiting');
  // A run that ends in an error keeps the change waiting, and says so.
  Object.assign(status, {busy: true}); await render(); Object.assign(status, {busy: false, error: 'x'}); await render();
  expect(line().textContent).toBe('Sync needs attention · changes kept on this device'); expect(line().getAttribute('data-sync-tone')).toBe('attention');
  expect(element.textContent).not.toContain(account);
});

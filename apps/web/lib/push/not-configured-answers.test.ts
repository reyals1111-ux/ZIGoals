// @vitest-environment jsdom
import {act, createElement} from 'react';
import {createRoot, type Root} from 'react-dom/client';
import {afterEach, describe, expect, it, vi} from 'vitest';
import {getCloudflareContext} from '@opennextjs/cloudflare';
import {GET as pushGet, POST as pushPost} from '../../app/api/push/route';
import {GET as accountGet} from '../../app/api/private-account/route';
import {pushAvailability} from './client';
import {AccountAccess} from '../../components/account-access';
import {activateAccount, clearAccountSession, getAccountScope, isAccountLocked, unlockAccount} from '../account-session';

// Session AL (BN-019, P-BN-36, P-PR-67, P-LS-35, P-MO-85; TIER 3 API): on an installation without push or accounts, the two
// reads every Settings load makes answer 200 {configured:false} instead of a 503 the console printed in red. Readers fail
// closed: push is unavailable, the account panel says "not configured" and locks a selected account; POST keeps its 503.
vi.mock('@opennextjs/cloudflare', () => ({getCloudflareContext: vi.fn()}));
(globalThis as unknown as {IS_REACT_ACT_ENVIRONMENT: boolean}).IS_REACT_ACT_ENVIRONMENT = true;
let root: Root | undefined;
afterEach(async () => { if (root) await act(async () => root?.unmount()); root = undefined; document.body.replaceChildren(); clearAccountSession(); localStorage.clear(); vi.unstubAllGlobals(); });
const noBindings = () => vi.mocked(getCloudflareContext).mockResolvedValue({env: {}} as never);

describe('the routes, not configured', () => {
  it('GET /api/push answers 200 configured:false with the same words and headers', async () => {
    noBindings();
    const res = await pushGet(new Request('https://app.example/api/push'));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({error: 'PUSH_UNAVAILABLE', message: 'Reminders while ZIGoals is closed are not available in this build.', configured: false});
    expect(res.headers.get('cache-control')).toBe('no-store');
    expect(res.headers.get('x-content-type-options')).toBe('nosniff');
  });
  it('POST /api/push still answers 503', async () => {
    noBindings();
    const res = await pushPost(new Request('https://app.example/api/push', {method: 'POST', headers: {origin: 'https://app.example', 'content-type': 'application/json'}, body: '{}'}));
    expect(res.status).toBe(503);
  });
  it('GET /api/private-account?action=status answers 200 configured:false, signedIn:false; other reads keep the 503', async () => {
    noBindings();
    const res = await accountGet(new Request('https://app.example/api/private-account?action=status'));
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({error: 'HOSTED_CONFIGURATION_REQUIRED', configured: false, signedIn: false});
    expect(res.headers.get('cache-control')).toBe('no-store');
    const plain = await accountGet(new Request('https://app.example/api/private-account'));
    expect(plain.status).toBe(503);
  });
});

describe('the readers fail closed', () => {
  it('push availability reads configured:false as unavailable', async () => {
    expect(await pushAvailability(async () => Response.json({error: 'PUSH_UNAVAILABLE', configured: false}))).toEqual({available: false});
  });
  it('the account panel says not configured, selects nothing and locks a selected account', async () => {
    activateAccount('10000000-0000-4000-8000-000000000001'); unlockAccount();
    vi.stubGlobal('fetch', async () => Response.json({error: 'HOSTED_CONFIGURATION_REQUIRED', message: 'Email and encrypted sync have not been configured. Local records remain available.', configured: false, signedIn: false}));
    const element = document.createElement('div'); document.body.append(element); root = createRoot(element);
    await act(async () => root!.render(createElement(AccountAccess, {})));
    expect(element.textContent).toContain('not configured on this installation');
    expect(isAccountLocked()).toBe(true);
    clearAccountSession();
    expect(getAccountScope()).toBeNull();
  });
});

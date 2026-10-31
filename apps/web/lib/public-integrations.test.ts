import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {expect, test} from 'vitest';
// @ts-expect-error -- the repository's secret scan is a plain .mjs module without types
import {scanFiles} from '../../../scripts/lib/secret-scan.mjs';
import {PUBLIC_INTEGRATIONS, publicIntegrationsSchema, pushDeviceConfigured, walletConnectConfigured} from './public-integrations';

// Session AF (L2b, ADR-028 H22, H90): the one public-identifiers file.
const FILE = 'apps/web/config/public-integrations.json';
const read = (file: string) => readFileSync(join(__dirname, '..', '..', '..', file), 'utf8');

test('every value empty by default except the app name; strict; WalletConnect is off without the project ID', () => {
  expect(JSON.parse(read(FILE))).toEqual({schemaVersion: 1, reownProjectId: null, rampHostApiKey: null, rampHostAppName: 'ZIGoals', banxaPartnerRef: null, pushDeviceEnabled: false, pushVapidPublicKey: null});
  expect(PUBLIC_INTEGRATIONS.reownProjectId).toBeNull();
  expect(walletConnectConfigured()).toBe(false);
  expect(walletConnectConfigured({...PUBLIC_INTEGRATIONS, reownProjectId: '0123456789abcdef0123456789abcdef'})).toBe(true);
});
test('the schema accepts public identifiers only and refuses unknown keys, secrets\' shapes and URLs', () => {
  const base = {schemaVersion: 1, reownProjectId: null, rampHostApiKey: null, rampHostAppName: 'ZIGoals', banxaPartnerRef: null, pushDeviceEnabled: false, pushVapidPublicKey: null};
  expect(publicIntegrationsSchema.safeParse({...base, reownProjectId: '0123456789abcdef0123456789abcdef', rampHostApiKey: 'abcdEFGH_1234-xyz', banxaPartnerRef: 'zigoals'}).success).toBe(true);
  for (const bad of [{...base, extra: 'x'}, {...base, schemaVersion: 2}, {...base, reownProjectId: 'not-hex'}, {...base, rampHostApiKey: 'has space'}, {...base, rampHostApiKey: 'https://evil.example'}, {...base, banxaPartnerRef: 'Upper.Case'}, {...base, banxaPartnerRef: 'a.banxa.com'}])
    expect(publicIntegrationsSchema.safeParse(bad).success, JSON.stringify(bad)).toBe(false);
});
test('the repository\'s secret scan passes on the file', () => {
  expect(scanFiles([FILE], read, [])).toEqual({hits: [], allowed: 0, stale: []});
});

// Session AK Part 2 (ADR-036 Q3): device notifications are off in the committed file; the switch needs the public key.
test('device notifications: off by default, the switch needs a VAPID public key of the right shape', () => {
  expect(pushDeviceConfigured()).toBe(false);
  const base = {...PUBLIC_INTEGRATIONS}, key = 'B'.repeat(87);
  expect(pushDeviceConfigured({...base, pushDeviceEnabled: true, pushVapidPublicKey: key})).toBe(true);
  expect(publicIntegrationsSchema.safeParse({...base, pushDeviceEnabled: true, pushVapidPublicKey: null}).success).toBe(false);
  expect(publicIntegrationsSchema.safeParse({...base, pushVapidPublicKey: 'short'}).success).toBe(false);
  expect(publicIntegrationsSchema.safeParse({...base, pushDeviceEnabled: 'yes'}).success).toBe(false);
});

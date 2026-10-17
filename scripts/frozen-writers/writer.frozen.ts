// Session AD item 12 (ADR-026, FIX_PLAN B7, owner amendment 3): the encrypted strings an OLDER build writes, for the
// encoder-history proof. scripts/frozen-writers.mjs copies this file into a throwaway worktree of each release as
// apps/web/lib/frozen-writer.test.ts and runs it there with FROZEN_OUT set, so every value below comes from that release's
// own encoder (lib/vault/crypto.ts and lib/vault/backup.ts as they were). Only API present in every release #32–#42 is
// used. All data is fictional; the vaults exist only in this fixture. The current build then reads every value back
// (apps/web/lib/vault/encoder-history.test.ts).
import {writeFileSync} from 'node:fs';
import {test} from 'vitest';
import {createDeviceKey, createVault, deviceCommitment, manifestDigest, sealRecord, unlockVaultForDevice} from './vault/crypto';
import {encryptBackup} from './vault/backup';

const ACCOUNT = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const OBJECT = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
// Values whose JSON lengths leave every remainder modulo 3, so the ciphertexts end with 0, 2 and 4 spare bits.
const VALUES: unknown[] = ['', 'x', 'xy', 'xyz', {goal: 'See the sea', saved: '1250.00'}, {habits: [{id: 'walk', done: ['2026-10-01']}]}, 'Ω≈ç√∫ — unicode', 'z'.repeat(200)];
const DOMAINS = ['finance', 'habits', 'health', 'settings'] as const;

test('write this release\'s encrypted strings', async () => {
  const out = process.env.FROZEN_OUT;
  if (!out) return;
  const vaults = [];
  for (const epoch of [1, 2]) {
    const vault = await createVault(undefined, epoch);
    const records = [];
    for (const [i, value] of VALUES.entries()) {
      const context = {vault: vault.manifest.vault, domain: DOMAINS[i % DOMAINS.length]!, object: OBJECT(i + 1), revision: i + 1, epoch};
      records.push({context, value, envelope: await sealRecord(vault.key, context, value)});
    }
    const digest = await manifestDigest(vault.manifest);
    const device = await unlockVaultForDevice(vault.manifest, vault.recovery, ACCOUNT, await createDeviceKey());
    vaults.push({recovery: vault.recovery, manifest: vault.manifest, records, device: {account: ACCOUNT, manifestDigest: digest, sealed: device.sealed, commitment: await deviceCommitment(vault.key, ACCOUNT, digest)}});
  }
  const backup = await encryptBackup({finance: JSON.stringify({version: 1, goals: [{id: 1, title: 'Fixture goal'}]}), habits: JSON.stringify({version: 2, habits: []}), settings: '{"theme":"dark"}'});
  writeFileSync(out, JSON.stringify({commit: process.env.FROZEN_COMMIT ?? 'unknown', vaults, backup}));
});

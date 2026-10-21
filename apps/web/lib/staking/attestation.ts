import * as z from 'zod';
import {ATTESTATION_CHAIN_ID, ATTESTATION_MEMO} from '../app-environment';

/**
 * Session AF chunk 3 (lane L2a; ADR-028 D4, H48): practice badges on-chain — opt-in, off by default, on ZIGChain Testnet
 * only. A badge is a 1 azig send from the person's address to itself whose memo holds ONLY one of two codes:
 * - a salted commitment `zigoals:att:v1:c:<64 hex>` = SHA-256 of a domain tag, 32 random bytes (the salt) and the person's
 *   own note; the salt and the note stay on this device (the staking journal's entry), so nobody can read or guess the
 *   note from the chain, and the person can prove it later by showing both;
 * - an opaque badge id `zigoals:att:v1:b:<32 hex>` = 16 random bytes, which this device maps to the person's note.
 * Never a goal name or any personal text, and never a plain hash of one (a plain hash of a short text is guessable: every
 * commitment here is salted). The memo format, the chain id, the self-send and the exact amount are enforced again by
 * assertNativeStakingAllowed (lib/app-environment.ts) at the quote, the signature and the broadcast. Public forever: the
 * address, the time and the memo; the review screen says so before the Sign press.
 */
export {ATTESTATION_CHAIN_ID, ATTESTATION_MEMO};
export const ATTESTATION_KINDS = ['commitment', 'badge'] as const;
export type AttestationKind = typeof ATTESTATION_KINDS[number];
export const MAX_NOTE = 120;
const DOMAIN = 'zigoals-attestation-v1';
const hex = (bytes: Uint8Array) => Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
async function sha256(text: string): Promise<string> { return hex(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text)))); }
/** The note as kept: trimmed, one line, 1–120 characters. */
export function cleanNote(note: unknown): string {
  const text = typeof note === 'string' ? note.replace(/[\u0000-\u001F\u007F‪-‮⁦-⁩]/g, ' ').replace(/\s+/g, ' ').trim() : '';
  if (!text || text.length > MAX_NOTE) throw Error(`Write what this badge is for, in at most ${MAX_NOTE} characters. It stays on this device.`);
  return text;
}
export type Attestation = {kind: AttestationKind; memo: string; note: string; salt?: string};
/** A new commitment or badge id for the note; the randomness is the browser's (crypto.getRandomValues). */
export async function makeAttestation(kind: AttestationKind, note: string, random: (bytes: Uint8Array) => Uint8Array = b => crypto.getRandomValues(b)): Promise<Attestation> {
  const clean = cleanNote(note);
  if (kind === 'badge') return {kind, note: clean, memo: `zigoals:att:v1:b:${hex(random(new Uint8Array(16)))}`};
  if (kind !== 'commitment') throw Error('Choose a commitment or a badge.');
  const salt = hex(random(new Uint8Array(32)));
  return {kind, note: clean, salt, memo: `zigoals:att:v1:c:${await sha256(`${DOMAIN}\n${salt}\n${clean}`)}`};
}
/** Whether a commitment memo is the one this note and salt make (the proof the person can show later). */
export async function commitmentMatches(memo: string, salt: string, note: string): Promise<boolean> {
  if (!/^[0-9a-f]{64}$/.test(salt) || !ATTESTATION_MEMO.test(memo) || !memo.startsWith('zigoals:att:v1:c:')) return false;
  return memo === `zigoals:att:v1:c:${await sha256(`${DOMAIN}\n${salt}\n${cleanNote(note)}`)}`;
}
/** The answer of GET /api/chain/attestations?network=zig-test-2&address=… (lib/server/chain-attestations.ts). */
export const ATTESTATION_SOURCE = 'https://zigchain-testnet-api.polkachu.com';
export const attestationsWireSchema = z.object({
  version: z.literal(1),
  status: z.enum(['ok', 'unavailable']),
  reason: z.string().max(300).optional(),
  network: z.literal(ATTESTATION_CHAIN_ID),
  source: z.literal(ATTESTATION_SOURCE),
  observedAt: z.iso.datetime({offset: true}).optional(),
  items: z.array(z.object({hash: z.string().regex(/^[0-9A-F]{64}$/), height: z.string().regex(/^[1-9]\d{0,19}$/), at: z.iso.datetime({offset: true}), memo: z.string().regex(ATTESTATION_MEMO)}).strict()).max(50),
}).strict().superRefine((wire, context) => {
  if (wire.status === 'ok' && (!wire.observedAt || wire.reason !== undefined)) context.addIssue({code: 'custom', message: 'An ok answer carries observedAt and no reason.'});
  if (wire.status === 'unavailable' && (!wire.reason || wire.items.length)) context.addIssue({code: 'custom', message: 'An unavailable answer carries a reason and no items.'});
});
export type AttestationsWire = z.infer<typeof attestationsWireSchema>;

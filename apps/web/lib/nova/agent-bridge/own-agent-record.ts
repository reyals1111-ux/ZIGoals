import {readDeviceRecord} from '../../device-record';
import {canonicalLocalBase} from '../hermes-record';
import {NOVA_AGENT, type NovaAgentRecord} from './record';

/**
 * Session AM-2 (security review of step 4c, open risk a): the engine's own, per-request answer to "is this request going
 * to the person's own agent, and have they confirmed that it answers with a model on this computer?" — the same question
 * the engine already asks about Hermes (lib/ai/privacy-mode.ts `guardRequest`, lib/nova/hermes-record.ts). An agent may
 * pass what it is sent on to a cloud model, so until the person confirms, Strict and Guarded redact what goes to it;
 * the panel's own check at the moment of connecting is no longer the only one.
 *
 * The address is compared in one spelling (`canonicalLocalBase`: localhost, 127.0.0.1 and [::1] are this computer; the
 * wire's /v1 and a trailing slash do not matter), for THIS request's address: another address inherits nothing, and a
 * new address in the record starts unconfirmed (./record.ts `setOwnAgent`). Small on purpose: the engine imports it.
 */
export function ownAgentIsUnconfirmed(record: NovaAgentRecord, baseUrl: string | null | undefined): boolean {
  const agent = record.agent, asked = canonicalLocalBase(baseUrl);
  if (!agent || !asked || canonicalLocalBase(agent.address) !== asked) return false;
  return agent.localConfirmed !== true;
}
/** The same, read from the device at this moment; a record that cannot be read names no agent. */
export function ownAgentUnconfirmed(storage: Pick<Storage, 'getItem'>, baseUrl: string | null | undefined): boolean {
  if (!baseUrl) return false;
  try { const read = readDeviceRecord(storage, NOVA_AGENT); return !read.unreadable && ownAgentIsUnconfirmed(read.data, baseUrl); } catch { return false; }
}

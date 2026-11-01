import {readDeviceRecord, updateDeviceRecord} from '../device-record';
import {getAppStorage} from '../showcase-storage';
import {NOVA_SETUP, novaSetupSchema, type NovaSetup} from './setup';

/**
 * Security review Z1A-7 (lane ZF): Ollama's cloud models run on ollama.com although they are reached through the local
 * server. Their names usually end in "cloud", but a renamed copy (`ollama cp gpt-oss:120b-cloud mymodel`) does not. Every
 * listing of an Ollama server (ZIGi's settings, NOVA's scan, the setup checks) reads Ollama's own `remote_host` flag; the
 * names so marked are kept in `zigoals:nova-setup:v1` → `cloudModels`, and the engine's privacy hook treats them as a cloud.
 */
export const MAX_CLOUD_MODELS = 100;
/** The record with these names marked as cloud and those the same server now lists as local unmarked; the same object when nothing changes. */
export function withCloudModels(record: NovaSetup, cloud: readonly string[], local: readonly string[] = []): NovaSetup {
  const was = record.cloudModels ?? [], drop = new Set(local.filter(n => !cloud.includes(n)));
  const next = [...new Set([...cloud.filter(n => n && n.length <= 200), ...was])].filter(n => !drop.has(n)).slice(0, MAX_CLOUD_MODELS);
  if (next.length === was.length && next.every(n => was.includes(n))) return record;
  return novaSetupSchema.parse({...record, version: 1, cloudModels: next});
}
/** Whether this model name was listed by Ollama as one of its cloud models on this device. */
export const isKnownCloudModel = (record: Pick<NovaSetup, 'cloudModels'>, model: string | null | undefined): boolean => !!model && (record.cloudModels ?? []).includes(model.trim());
/**
 * Keeps what a listing found, in this account's storage. Never over a record this build cannot read (that record still
 * reads as Strict, and writing would lose the person's mode). A storage that cannot be written leaves the names-only rule.
 */
export function rememberOllamaCloud(cloud: readonly string[], local: readonly string[] = [], storage: Pick<Storage, 'getItem' | 'setItem'> | null = null): boolean {
  try {
    const store = storage ?? getAppStorage(), read = readDeviceRecord(store, NOVA_SETUP);
    if (read.unreadable) return false;
    const next = withCloudModels(read.data, cloud, local);
    if (next === read.data) return false;
    updateDeviceRecord(store, NOVA_SETUP, () => next);
    return true;
  } catch { return false; }
}

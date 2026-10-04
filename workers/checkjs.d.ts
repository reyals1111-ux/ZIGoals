// Types for the JSDoc in the .mjs Workers, which tsconfig.workers.json checks with checkJs.
// Durable Object records are schemaless JSON that each Worker validates where it reads them, so a stored
// value reads as `any`. The storage API itself (keys, options, transactions, alarms) is still checked.
/* eslint-disable @typescript-eslint/no-explicit-any -- stored records are schemaless JSON, validated where read */
interface RecordTransaction {
  get(key: string): Promise<any>;
  get(keys: string[]): Promise<Map<string, any>>;
  put(key: string, value: unknown): Promise<void>;
  put(entries: Record<string, unknown>): Promise<void>;
  delete(key: string): Promise<boolean>;
  delete(keys: string[]): Promise<number>;
  list(options?: DurableObjectListOptions): Promise<Map<string, any>>;
  getAlarm(): Promise<number | null>;
  setAlarm(scheduledTime: number | Date): Promise<void>;
  deleteAlarm(): Promise<void>;
}
interface RecordStorage extends RecordTransaction {
  transaction<T>(closure: (txn: RecordTransaction) => Promise<T>): Promise<T>;
}
/** The part of DurableObjectState the .mjs Workers use. */
interface RecordState { readonly storage: RecordStorage; }

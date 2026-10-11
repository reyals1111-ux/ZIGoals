import {useSyncExternalStore} from 'react';
import type {Rejected} from '../../lib/ai/actions/parse';
import type {Action} from '../../lib/ai/actions/schema';
import type {Handle} from '../../lib/ai/handles';

/**
 * Proposals from a browser AI agent (Session V Part 16), waiting in this tab for ZIGi's panel, where they show as the
 * same cards a reply from the person's AI gets. Kept in memory only, never stored: gone on a reload, an account change or
 * when the person turns browser agents off; at most the last three batches. Shared by the agent's chunk, which adds them,
 * and the chat's, which shows them.
 */
export type AgentBatch = {id: string; at: string; proposals: Action[]; rejected: Rejected[]; handles: Handle[]};
const NONE: readonly AgentBatch[] = [];
let batches: readonly AgentBatch[] = NONE;
const listeners = new Set<() => void>();
const emit = () => { for (const listener of listeners) listener(); };
export function addAgentBatch(batch: Omit<AgentBatch, 'id' | 'at'>, now = new Date()): void {
  batches = [...batches, {...batch, id: crypto.randomUUID(), at: now.toISOString()}].slice(-3); emit();
}
export function dismissAgentBatch(id: string): void { batches = batches.filter(b => b.id !== id); emit(); }
export function clearAgentBatches(): void { if (batches.length) { batches = NONE; emit(); } }
const subscribe = (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; };
export const useAgentBatches = (): readonly AgentBatch[] => useSyncExternalStore(subscribe, () => batches, () => NONE);

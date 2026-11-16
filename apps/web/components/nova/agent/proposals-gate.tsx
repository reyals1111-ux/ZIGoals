'use client';
import {lazy, Suspense, useSyncExternalStore} from 'react';
import {LoadBoundary} from '../../load-boundary';
import type {ChatSession} from '../../ai/use-chat-session';
import {EMPTY_LIVE, liveSnapshot, subscribeLive} from './live-store';

const ToolProposals = lazy(() => import('./tool-proposals'));
/**
 * Session AM-2 (step 4c): NOVA's conversation mounts this. It loads the tool-card logic (its own chunk) only once a tool
 * server is connected in this visit — without one no tool is offered to a model, so there is nothing to propose and the
 * conversation carries none of it.
 */
export function ToolProposalsGate(props: {session: ChatSession; connected: boolean; healthOpen: boolean; /** Opens the conversation when it is folded away (a dropped proposal is said there). */ onAttention?: () => void; /** Whether a message of this visit held pasted, dropped or handed-in words. */ wasPasted?: (text: string) => boolean}) {
  const live = useSyncExternalStore(subscribeLive, liveSnapshot, () => EMPTY_LIVE);
  if (!live.size) return null;
  return <LoadBoundary quiet><Suspense fallback={null}><ToolProposals {...props}/></Suspense></LoadBoundary>;
}

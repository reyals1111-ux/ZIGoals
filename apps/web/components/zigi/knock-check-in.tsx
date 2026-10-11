'use client';
import {useMemo} from 'react';
import {actionSchema, type Action} from '../../lib/ai/actions/schema';
import type {Handle} from '../../lib/ai/handles';
import {ProposalList} from '../ai/proposal-list';
import {useProposals} from '../ai/use-proposals';

/**
 * "Do it now" on a habit's knock (Session V Part 13): the same check-in card the chat shows, planned on this device
 * against the current records; nothing is written until the person adds it, and Undo works for ten seconds.
 */
export default function KnockCheckIn({habitId, title, onNavigate}: {habitId: string; title: string; onNavigate: () => void}) {
  const runner = useProposals();
  const proposals = useMemo<Action[]>(() => [actionSchema.parse({kind: 'check-in', habit: 'h1'})], []);
  const handles = useMemo<Handle[]>(() => [{handle: 'h1', kind: 'habit', id: habitId, label: title}], [habitId, title]);
  if (!runner.ready) return <p className="ai-note" role="status">Loading…</p>;
  return <ProposalList proposals={proposals} rejected={[]} handles={handles} runner={runner} onNavigate={onNavigate}/>;
}

'use client';
import {useEffect, useRef} from 'react';
import {dismissAgentBatch, useAgentBatches} from './agent-inbox';
import {ZigiAvatar} from '../zigi/zigi-avatar';
import {ProposalList} from './proposal-list';
import type {ProposalRunner} from './use-proposals';

/**
 * A browser AI agent's proposals in ZIGi's panel (Session V Part 16): each batch as the usual cards (checked against the
 * current records, then added, edited or dismissed by the person, with Undo), under a line that says where they came
 * from. Nothing is written until the person adds a card. The newest batch scrolls into view.
 */
export function AgentProposals({runner, onNavigate}: {runner: ProposalRunner; onNavigate: () => void}) {
  const batches = useAgentBatches(), last = useRef<HTMLElement>(null), newest = batches.at(-1)?.id;
  useEffect(() => { if (newest) last.current?.scrollIntoView({block: 'nearest'}); }, [newest]);
  if (!batches.length) return null;
  return <>{batches.map(batch => {
    const time = new Date(batch.at).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'});
    return <article key={batch.id} ref={batch.id === newest ? last : undefined} className="ai-turn ai-turn-assistant ai-agent-batch" aria-label={`Proposed by a browser AI agent at ${time}`}>
      <ZigiAvatar state="presenting" size={28} decorative/>
      <div className="ai-turn-body">
        <p className="ai-turn-label">Proposed by a browser AI agent · {time}</p>
        <p className="ai-note">An AI agent in this browser proposed {batch.proposals.length === 1 ? 'this change' : 'these changes'}. Nothing is written until you add a card.</p>
        {/* Each card is checked against the records when it first shows, so the panel waits for them (it may have just opened). */}
        {runner.ready ? <ProposalList proposals={batch.proposals} rejected={batch.rejected} handles={batch.handles} runner={runner} onNavigate={onNavigate}/>
          : <p className="ai-card-note" role="status">Your records are still loading; the cards show in a moment.</p>}
        <div className="ai-card-actions"><button type="button" className="text-link" onClick={() => dismissAgentBatch(batch.id)}>Dismiss these proposals</button></div>
      </div>
    </article>;
  })}</>;
}

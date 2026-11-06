'use client';
import {useMemo} from 'react';
import {parseReply} from '../../../lib/ai/actions/parse';
import {ProposalList} from '../../ai/proposal-list';
import {useProposals} from '../../ai/use-proposals';

/**
 * A workflow's cards (Session AK, owner follow-up 2 N6): ZIGi's own proposal cards through the one confirm engine — each
 * checked against the records when it shows, added only on the person's Add, with Undo, and noted in Actions by ZIGi
 * (Activity). Loaded only when a run has cards; the records' hooks load with it.
 * Session AL (DV-071): the Undo is the app's toast (showUndo), shown inside NOVA's sheet; it takes the added record back.
 */
export default function WorkflowCards({text, label}: {text: string; label: string}) {
  const runner = useProposals(), parsed = useMemo(() => parseReply(text), [text]);
  if (!runner.ready) return <p className="ai-card-note" role="status">Your records are still loading; the cards show in a moment.</p>;
  return <div className="nova-wf-cards" aria-label={label}>
    <ProposalList proposals={parsed.proposals} rejected={parsed.rejected} handles={[]} runner={runner} undoToast/>
  </div>;
}

'use client';
import {useId, useState, type FormEvent} from 'react';
import {readVote, type Read} from '../../lib/governance/client';
import {CHOICE_WORDS} from '../../lib/governance/plain-words';
import {voterAccountOf} from '../../lib/governance/voter';
import type {GovNetwork, VoteWire} from '../../lib/governance/wire';

/**
 * Session AL fourth pass (C-BN-12): "How did a validator vote?" on a proposal in its voting period. The person pastes a
 * validator's address (or any ZIG address); ZIGoals reads that account's vote through its read-only relay, the same read
 * as "your vote". Only while voting is open: the chain removes votes once it counts them. Nothing is signed or kept.
 */
export function ValidatorVote({proposalId, network}: {proposalId: string; network: GovNetwork}) {
  const id = useId(), [text, setText] = useState(''), [problem, setProblem] = useState(''), [busy, setBusy] = useState(false);
  const [answer, setAnswer] = useState<{read: Read<VoteWire>; validator: boolean} | null>(null);
  async function submit(event: FormEvent) {
    event.preventDefault();
    const who = voterAccountOf(text);
    if ('problem' in who) { setProblem(who.problem); setAnswer(null); return; }
    setProblem(''); setBusy(true);
    try { setAnswer({read: await readVote(network, proposalId, who.account), validator: who.validator}); } finally { setBusy(false); }
  }
  const vote = answer?.read.phase === 'ok' ? answer.read.wire.vote : null;
  return <details className="governance-validator-vote">
    <summary>How did a validator vote?</summary>
    <form onSubmit={submit} noValidate>
      <label className="field" htmlFor={`${id}-who`}>A validator’s address (zigvaloper1…) or a ZIG address (zig1…)
        <input id={`${id}-who`} value={text} onChange={e => setText(e.target.value)} maxLength={90} autoComplete="off" spellCheck={false} aria-invalid={problem ? true : undefined} aria-describedby={problem ? `${id}-problem` : undefined}/></label>
      {problem && <p id={`${id}-problem`} className="field-error" role="alert">{problem}</p>}
      <button type="submit" className="secondary" disabled={busy}>{busy ? 'Reading…' : 'Read its vote'}</button>
    </form>
    {answer && <p role="status" className="fine">{answer.read.phase === 'unavailable' ? `Its vote could not be read just now: ${answer.read.reason}`
      : vote ? `${answer.validator ? 'This validator' : 'This address'} voted ${vote.options.map(o => CHOICE_WORDS[o.option].label).join(', ')} (read at block ${answer.read.wire.height}). A delegator who does not vote counts with its validator’s vote.`
      : `${answer.validator ? 'This validator has' : 'This address has'} not voted on this proposal yet (read at block ${answer.read.phase === 'ok' ? answer.read.wire.height : ''}).`}</p>}
    <p className="fine">Read only, while voting is open: the chain removes the votes once it counts them. The address goes to ZIGoals’ read-only relay, as for your own vote.</p>
  </details>;
}
export default ValidatorVote;

'use client';
import {useEffect, useRef} from 'react';
import {CELEBRATIONS} from '../../lib/celebrations';
import {useDeviceRecord} from '../ai/use-device-record';
import {zigiSignals} from '../zigi/bus';
import {NebulaFlow} from '../nebula-flow';
import {CompletionMoment} from '../motion/completion-moment';
import {localDate} from '../../lib/local-date';
import './goal-finished.css';
import {useGoalExtras} from '../goals/use-goal-extras';
import {congratsOf} from '../../lib/goals/congrats';

/**
 * Session AH (GO7; M-047, M-082): reaching a Goal is said, once per Goal on this device: a calm card at the top of the
 * Goal with what was reached, a short glow that rests under reduced motion and Motion Off, and one validated fact for
 * ZIGi. "Thanks" puts it away (kept in the device's celebrations record, as milestones are).
 */
export function GoalFinished({goalId, name}: {goalId: string; name: string}) {
  const notes = useDeviceRecord(CELEBRATIONS), key = `goal-done:${goalId}`, said = useRef(false);
  // Session AL third pass (GAP-121): the message the person wrote for this day, when there is one.
  const extras = useGoalExtras(), congrats = extras.loaded && !extras.unreadable ? congratsOf(extras.data, `private:${goalId}`) : '';
  const fresh = notes.loaded && !notes.unreadable && !notes.data.seen[key];
  useEffect(() => { if (fresh && !said.current) { said.current = true; try { zigiSignals.emitValidated('goal_milestone_reached'); } catch { /* decoration */ } } }, [fresh]);
  if (!fresh) return null;
  return <section className="panel goal-finished" role="status" aria-label={`Goal reached: ${name}`}>
    <p className="eyebrow">Goal reached</p>
    <h2><NebulaFlow identity={`goal-finished:${goalId}`}>You did it: {name}.</NebulaFlow></h2>
    {congrats && <blockquote className="goal-finished-congrats"><p>{congrats}</p><footer className="fine">Your message to yourself</footer></blockquote>}
    <p>Every recorded step counted. Its history stays here; close it when you are ready, or set a new target.</p>
    <button type="button" className="secondary" onClick={() => { try { notes.update(n => ({...n, seen: {...n.seen, [key]: localDate()}})); } catch { /* shown again next time */ } }}>Thanks</button>
    <CompletionMoment identity={key}/>{/* Session AK M1: the completion moment, once when the card first shows */}
  </section>;
}

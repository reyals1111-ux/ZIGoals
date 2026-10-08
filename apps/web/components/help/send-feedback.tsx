'use client';
import {useId, useState} from 'react';
import {APP_VERSION_LABEL, DETAILS_MAX, FEEDBACK_ADDRESS, SECURITY_ADDRESS, deviceDetails, feedbackHref, readFeedbackEnvironment} from '../../lib/feedback';
import {MOTION_PREFERENCE_KEY} from '../use-entrance';
import './send-feedback.css';

const motionOff = () => { try { return localStorage.getItem(MOTION_PREFERENCE_KEY) === 'off'; } catch { return false; } };

/**
 * "Send feedback" (Session X Part 11), in Help and in Settings → Help & diagnostics: an email the person writes in their
 * own mail app. Device details join it only when the box is ticked; they are shown in full first and can be edited or
 * deleted. Nothing is sent, stored or requested here.
 */
export function SendFeedback() {
  const [add, setAdd] = useState(false), [details, setDetails] = useState<string | null>(null), id = useId();
  const toggle = (on: boolean) => { setAdd(on); if (on && details === null) setDetails(deviceDetails(readFeedbackEnvironment(motionOff()))); };
  return <div className="send-feedback">
    <p>Something confusing, broken or missing? We&rsquo;d love to hear it.</p>
    <label className="send-feedback-add"><input type="checkbox" checked={add} onChange={event => toggle(event.target.checked)} aria-controls={add ? `${id}-details` : undefined}/><span>Add details about this device to the email</span></label>
    {add && <div className="send-feedback-details">
      <label htmlFor={`${id}-details`}>Device details: edit or delete anything before you send</label>
      <textarea id={`${id}-details`} value={details ?? ''} onChange={event => setDetails(event.target.value)} rows={6} maxLength={DETAILS_MAX} spellCheck={false} autoComplete="off"/>
    </div>}
    <p><a className="primary send-feedback-mail" href={feedbackHref(APP_VERSION_LABEL, add ? details : null)}>Email feedback to {FEEDBACK_ADDRESS}</a></p>
    <p className="fine">Your mail app opens with the email; nothing is sent until you send it there. ZIGoals adds the app version and, only if you ticked the box, the details above: no account or device id and none of your records. Please leave out codes, your recovery secret, and personal money or health details. Found a security problem? Write privately to <a className="text-link" href={`mailto:${SECURITY_ADDRESS}`}>{SECURITY_ADDRESS}</a>.</p>
  </div>;
}

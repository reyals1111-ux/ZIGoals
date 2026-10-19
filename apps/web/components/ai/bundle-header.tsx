'use client';
import type {BundleMeta} from '../../lib/ai/actions/parse';
import {shortName} from '../../lib/ai/proactive/calm';

/**
 * Session AF (L4, P8.4): the head of one plan ZIGi proposed as a bundle ("Your 10k plan · 6 steps"). Each step below it is
 * an ordinary card with its own Add, Edit and Dismiss; "Add all" is the list's own batch button (forms and pre-fills are
 * never in it); "Skip the rest" dismisses the steps not decided yet. Nothing is written until a step is added.
 */
export function BundleHeader({bundle, pending, onSkipRest}: {bundle: BundleMeta; pending: number; onSkipRest: () => void}) {
  const title = /plan\b/i.test(bundle.title) ? bundle.title : `${bundle.title}: your plan`;
  return <header className="ai-bundle-head" aria-label={`Plan: ${bundle.title}`}>
    <p className="eyebrow">ZIGI · A PLAN FOR YOU</p>
    <h4 className="ai-bundle-title">{shortName(title, 70)} · {bundle.count} {bundle.count === 1 ? 'step' : 'steps'}</h4>
    <p className="ai-card-note">Add the steps you want; nothing is written until you add one.{bundle.steps > bundle.count ? ` ${bundle.steps - bundle.count} more ${bundle.steps - bundle.count === 1 ? 'step waits' : 'steps wait'} for the next reply.` : ''}</p>
    {pending > 0 && <button type="button" className="text-link ai-bundle-skip" onClick={onSkipRest}>Skip the rest ({pending})</button>}
  </header>;
}

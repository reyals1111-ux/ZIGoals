'use client';
import {createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode} from 'react';
import type {VerifiedKind, VerifiedProvider} from '@zigoals/ecosystem-registry/verified-links';
import type {EARN_OPTIONS} from '../../lib/ai/tools/earn';
import {askZigi, launcherShown} from '../ai/ask';
import {VerifiedLink} from '../links/verified-link';

/**
 * Session AF (L1, ADR-028 H5, H34): guide mode. "Open <app>" opens the app's own page in a new tab (a verified link, never
 * a frame, never window.open) and this compact panel stays in ZIGoals with the steps, so the person can follow along
 * between the two tabs. On a computer it sits at the bottom right; on a phone it is a bottom sheet over the tab bar. It
 * is not a dialog: nothing behind it is blocked, Escape closes it and focus returns to the link that opened it. Nothing
 * is stored; it closes with the tab.
 *
 * Session AF (L1c, P1.19): "Ask ZIGi about this" opens ZIGi's chat on the guide's way to earn, the way the app's other
 * "Ask ZIGi" affordances do (components/ai/ask.ts): a starting question naming the guide in the composer and the Earn
 * coach's figures for that option (`earn_rates`) as a removable chip. Nothing is sent until the person presses Send, no
 * amount is filled in, and nothing is signed; it shows only while the ZIGi launcher does.
 */
export type EarnCoachOption = (typeof EARN_OPTIONS)[number];
export type Guide<P extends VerifiedProvider = VerifiedProvider> = {id: string; app: string; title: string; steps: readonly string[]; provider: P; kind: VerifiedKind<P>; open: string;
  /** Session AF (L1c, P1.19): the way to earn this guide belongs to, for "Ask ZIGi about this" (the Earn coach's option). */
  option?: EarnCoachOption};
/** The question "Ask ZIGi about this" starts with: the guide named, no amount, nothing to sign. */
export const guideQuestion = (guide: Guide) => `Explain this guide, “${guide.title}” on ${guide.app}, in plain words: what each step does and what the risks are.`;
type Ctx = {active: Guide | null; start: (guide: Guide, from: HTMLElement | null) => void};
const GuideContext = createContext<Ctx>({active: null, start: () => {}});
export function GuideProvider({children}: {children: ReactNode}) {
  const [active, setActive] = useState<Guide | null>(null);
  const opener = useRef<HTMLElement | null>(null);
  const start = useCallback((guide: Guide, from: HTMLElement | null) => { opener.current = from; setActive(guide); }, []);
  const close = useCallback(() => { setActive(null); const back = opener.current; if (back?.isConnected) back.focus({preventScroll: true}); }, []);
  const value = useMemo(() => ({active, start}), [active, start]);
  return <GuideContext.Provider value={value}>{children}{active && <GuidePanel key={active.id} guide={active} onClose={close}/>}</GuideContext.Provider>;
}
/** The "Open <app>" link of an option: opens the site in a new tab and the guide here. */
export function GuideLink({guide, className = 'primary'}: {guide: Guide; className?: string}) {
  const {start} = useContext(GuideContext);
  return <VerifiedLink provider={guide.provider as 'valdora'} kind={guide.kind as 'stake'} className={`earn-guide-link ${className}`} onOpen={event => start(guide, event.currentTarget)}>{guide.open}</VerifiedLink>;
}
function GuidePanel({guide, onClose}: {guide: Guide; onClose: () => void}) {
  const [step, setStep] = useState(0), ref = useRef<HTMLElement>(null);
  useEffect(() => {
    // Session AF (L1c): Escape inside an open dialog (ZIGi's chat, opened from here) belongs to that dialog; the guide stays.
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape' && !(e.target instanceof Element && e.target.closest('dialog'))) onClose(); };
    document.addEventListener('keydown', key);
    return () => document.removeEventListener('keydown', key);
  }, [onClose]);
  const last = guide.steps.length - 1, zigi = !!guide.option && launcherShown();
  const ask = () => { if (guide.option) askZigi(guideQuestion(guide), {tool: 'earn_rates', args: {option: guide.option}, label: `Earn figures · ${guide.title}`}); };
  return <section ref={ref} className="earn-guide-panel" role="region" aria-label={`Guide: ${guide.title}`} data-guide={guide.id}>
    <span className="earn-guide-grabber" aria-hidden="true"/>
    <header className="earn-guide-head">
      <div><p className="eyebrow">Guide mode · {guide.app} is open in a new tab</p><h2>{guide.title}</h2></div>
      <button type="button" className="secondary icon-button" aria-label="Close the guide" onClick={onClose}>×</button>
    </header>
    <ol className="earn-guide-steps">
      {guide.steps.map((s, i) => <li key={i} aria-current={i === step ? 'step' : undefined} data-done={i < step || undefined}><button type="button" onClick={() => setStep(i)}><span className="earn-guide-n">{i + 1}</span><span>{s}</span></button></li>)}
    </ol>
    <div className="earn-guide-actions">
      <button type="button" className="secondary" disabled={step === 0} onClick={() => setStep(s => Math.max(0, s - 1))}>Back</button>
      <p className="fine" aria-live="polite">Step {step + 1} of {guide.steps.length}</p>
      {step < last ? <button type="button" className="primary" onClick={() => setStep(s => Math.min(last, s + 1))}>Next step</button> : <button type="button" className="primary" onClick={onClose}>Done</button>}
    </div>
    {zigi && <p className="earn-guide-ask"><button type="button" className="secondary" onClick={ask}>Ask ZIGi about this</button> <span className="fine">Opens ZIGi with this guide named. Nothing is sent until you press Send.</span></p>}
    <p className="fine earn-guide-note">You sign only in your own wallet, on {guide.app}&apos;s page. ZIGoals never sees your keys. <VerifiedLink provider={guide.provider as 'valdora'} kind={guide.kind as 'stake'} className="text-link" mark="compact">Open {guide.app} again</VerifiedLink></p>
  </section>;
}

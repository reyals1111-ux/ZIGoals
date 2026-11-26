"use client";
/* Opening Showcase reloads the page on purpose, as in Settings: every store hook must switch data profiles. */
/* eslint-disable @next/next/no-location-assign-relative-destination */
import "./onboarding.css";
import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { loadShowcase } from "../../lib/showcase";
import { markOnboardingSeen } from "../../lib/onboarding";

/**
 * Session AW Part 3 (simplicity c): beside the setup, one tap to the daily thing each kind of person comes for (the friends'
 * personas: Sanne's habit, Tom's spending, Lina's meal, Max's workout, Jules's journal), so the first daily action is two or
 * three taps from a first visit, setup or not. The links open each page's own form; nothing is written until the person
 * saves there. Inside the welcome's own card (no new card); every link a 44 px target.
 */
export const QUICK_STARTS: readonly [label: string, href: string][] = [
  ["Add a habit", "/app/habits?add=habit"],
  ["Log spending", "/app/wealth#log-spending"],
  ["Log a meal", "/app/health?add=entry"],
  ["Start a workout", "/app/health?view=workouts"],
  ["Write in the Journal", "/app/journal#journal-write"],
];
function QuickStarts({ id }: { id: string }) {
  return <div className="onboarding-quick" role="group" aria-labelledby={`${id}-quick`}>
    <p id={`${id}-quick`}>Or start with one thing you do every day:</p>
    <ul>{QUICK_STARTS.map(([label, href]) => <li key={href}><Link className="text-link" href={href}>{label}</Link></li>)}</ul>
  </div>;
}

/**
 * Today's welcome for a brand-new device (Session E). Shown only when TodayDashboard finds no records, no account and
 * no Showcase; "Skip setup" and "Explore the demo" write only the device-only seen flag.
 */
export function WelcomeCard({ demoAvailable, onDismiss }: { demoAvailable: boolean; onDismiss: () => void }) {
  const id = useId(), card = useRef<HTMLElement>(null);
  // Session AK P4 (FIRST_RUN_REVIEW FR-16): on a phone the PROTECTED hero fills the first screen and this card starts below
  // it, so a slim bar above the tab bar offers the setup until the card itself is in view or the bar is closed (phones only,
  // by CSS; no new motion). The hero is unchanged.
  const [inView, setInView] = useState(false), [barClosed, setBarClosed] = useState(false);
  useEffect(() => {
    const el = card.current; if (!el || typeof IntersectionObserver === "undefined") return;
    const seen = new IntersectionObserver(entries => { if (entries.some(e => e.isIntersecting)) { setInView(true); seen.disconnect(); } }, { threshold: 0.6 });
    seen.observe(el); return () => seen.disconnect();
  }, []);
  return <><section ref={card} className="onboarding-welcome panel" aria-labelledby={`${id}-title`}>
    <p className="eyebrow">Welcome to ZIGoals</p>
    <h2 id={`${id}-title`}>Set up your first goal and habit in about a minute.</h2>
    <p>No wallet or account needed. What you add stays in this browser.</p>
    <div className="onboarding-actions">
      <Link className="primary" href="/app/welcome">Start setup</Link>
      <button type="button" className="secondary" disabled={!demoAvailable} onClick={() => { markOnboardingSeen(window.localStorage); void loadShowcase().then(() => window.location.assign("/app"), () => undefined); }}>Explore the demo</button>
      <button type="button" className="text-link" onClick={() => { markOnboardingSeen(window.localStorage); onDismiss(); }}>{/* Session AL fifth pass (N-NB-01): "Skip …" as every setup step says it (was "Not now") */}Skip setup</button>
    </div>
    <QuickStarts id={id}/>
  </section>
  {!inView && !barClosed && <div className="welcome-phone-bar" role="region" aria-label="Set up ZIGoals">
    <Link className="welcome-phone-start" href="/app/welcome">Set up in a minute · Start <span aria-hidden="true">›</span></Link>
    <button type="button" className="welcome-phone-close" aria-label="Hide this bar" onClick={() => setBarClosed(true)}>×</button>
  </div>}</>;
}

/**
 * Session AL (P-NB-08; NB-002, NB-033): after "Skip setup" (was "Not now"), an empty device (nothing recorded, no setup made) still has one
 * clear way into the setup on Today. It goes once the first record or the setup exists; the welcome card shows only once.
 */
export function FirstRunEntry({ demoAvailable }: { demoAvailable: boolean }) {
  const id = useId();
  return <section className="onboarding-welcome onboarding-entry panel" aria-labelledby={`${id}-title`}>
    <p className="eyebrow">Your first minute</p>
    <h2 id={`${id}-title`}>Set up ZIGoals in about a minute.</h2>
    <p>Pick what matters to you; ZIGoals adds a first habit or goal and arranges Today. Nothing is sent anywhere.</p>
    <div className="onboarding-actions">
      <Link className="primary" href="/app/welcome">Start setup</Link>
      {demoAvailable && <button type="button" className="secondary" onClick={() => { markOnboardingSeen(window.localStorage); void loadShowcase().then(() => window.location.assign("/app"), () => undefined); }}>Explore the demo</button>}
    </div>
    <QuickStarts id={id}/>
  </section>;
}

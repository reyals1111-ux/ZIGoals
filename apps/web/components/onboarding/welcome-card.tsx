"use client";
/* Opening Showcase reloads the page on purpose, as in Settings: every store hook must switch data profiles. */
/* eslint-disable @next/next/no-location-assign-relative-destination */
import "./onboarding.css";
import Link from "next/link";
import { useId } from "react";
import { loadShowcase } from "../../lib/showcase";
import { markOnboardingSeen } from "../../lib/onboarding";

/**
 * Today's welcome for a brand-new device (Session E). Shown only when TodayDashboard finds no records, no account and
 * no Showcase; "Not now" and "Explore the demo" write only the device-only seen flag.
 */
export function WelcomeCard({ demoAvailable, onDismiss }: { demoAvailable: boolean; onDismiss: () => void }) {
  const id = useId();
  return <section className="onboarding-welcome panel" aria-labelledby={`${id}-title`}>
    <p className="eyebrow">Welcome to ZIGoals</p>
    <h2 id={`${id}-title`}>Set up your first goal and habit in about a minute.</h2>
    <p>No wallet or account needed. What you add stays in this browser.</p>
    <div className="onboarding-actions">
      <Link className="primary" href="/app/welcome">Start setup</Link>
      <button type="button" className="secondary" disabled={!demoAvailable} onClick={() => { markOnboardingSeen(window.localStorage); loadShowcase(); window.location.assign("/app"); }}>Explore the demo</button>
      <button type="button" className="text-link" onClick={() => { markOnboardingSeen(window.localStorage); onDismiss(); }}>Not now</button>
    </div>
  </section>;
}

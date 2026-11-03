"use client";
import "./onboarding.css";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef } from "react";
import { useDeviceRecord } from "../ai/use-device-record";
import { useHabits } from "../habits/use-habits";
import { usePlatform } from "../platform/use-platform";
import { habitDay } from "../../lib/habits";
import { LANDING_NOTE, ONBOARDING_SETUP, setupLanding, setupLandingLine } from "../../lib/onboarding-setup";

/**
 * Session AK P4 (docs/review/session-ak/FIRST_RUN_REVIEW.md, FR-4): after "Finish setup", Today says "You're set" in the
 * welcome card's own place: the new goal and today's habits in one line, and the next step. Right after the welcome it takes
 * the focus (a tab-only note the welcome leaves). It closes with ×, or by itself once one of the setup's habits is ticked;
 * it shows for a day at most (the setup's Undo window). The PROTECTED hero above it is unchanged.
 */
export function SetupLanding() {
  const id = useId(), heading = useRef<HTMLHeadingElement>(null), router = useRouter();
  const setup = useDeviceRecord(ONBOARDING_SETUP), habits = useHabits(), platform = usePlatform();
  const ready = setup.loaded && !setup.unreadable && habits.loaded && !habits.error && platform.loaded;
  const mine = ready ? habits.data.habits.filter(h => setup.data.habitIds.includes(h.id)) : [];
  const due = mine.filter(h => habitDay(h, habits.today, habits.today).scheduled);
  const landing = ready ? setupLanding(setup.data, new Date(), {
    goalName: setup.data.goalId ? platform.data.goals.find(g => g.id === setup.data.goalId)?.name : undefined,
    habitsToday: due.length,
    tickedToday: mine.some(h => (habitDay(h, habits.today, habits.today).count ?? 0) > 0),
  }) : null;
  useEffect(() => {
    if (!landing) return;
    let note: string | null = null;
    try { note = window.sessionStorage.getItem(LANDING_NOTE); if (note) window.sessionStorage.removeItem(LANDING_NOTE); } catch { /* no focus move */ }
    if (note) heading.current?.focus();
  }, [landing]);
  if (!landing) return null;
  const close = () => { try { setup.update(r => ({ ...r, landingClosed: true })); } catch { /* it leaves after the day anyway */ } };
  const toHabits = () => {
    const card = document.querySelector<HTMLElement>(".habits-today, .habit-time-card");
    if (!card) { router.push("/app/habits"); return; }
    card.scrollIntoView({ block: "start" });
    card.querySelector<HTMLElement>(".habit-today-list button, button.primary, button")?.focus({ preventScroll: true });
  };
  return <section className="onboarding-welcome setup-landing panel" aria-labelledby={`${id}-title`}>
    <p className="eyebrow">Setup finished</p>
    <h2 id={`${id}-title`} ref={heading} tabIndex={-1}>You’re set.</h2>
    <p>{setupLandingLine(landing)}</p>
    <div className="onboarding-actions">
      {landing.habits > 0 ? <button type="button" className="primary" onClick={toHabits}>Tick your first habit ↓</button>
        : <Link className="primary" href={`/app/goals/tracked/${setup.data.goalId}`}>Open your goal</Link>}
    </div>
    <button type="button" className="setup-landing-close" aria-label="Close “You’re set”" onClick={close}>×</button>
  </section>;
}

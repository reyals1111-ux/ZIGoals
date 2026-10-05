"use client";
import { useEffect } from "react";
import { documentAllowsCamera, healthNavigation } from "../lib/health-navigation";
import { isAccountLocked } from "../lib/account-session";
/**
 * Session U Part 3: every same-tab click into Health from another app page becomes a full page load, so Health's
 * document gets its own camera permission (lib/health-navigation.ts says when and why). One capture listener covers
 * every link, including the ones built from data (navigation, Quick add, Today widgets, reminders, the activity feed).
 */
export function HealthDocumentLinks() {
  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented) return;
      const anchor = event.target instanceof Element ? event.target.closest("a[href]") : null;
      if (!(anchor instanceof HTMLAnchorElement)) return;
      let accountOpen: boolean;
      try { accountOpen = !isAccountLocked(); } catch { accountOpen = false; }
      const decision = healthNavigation({
        href: anchor.href, origin: window.location.origin, cameraAllowed: documentAllowsCamera(document), accountOpen,
        button: event.button, modified: event.metaKey || event.ctrlKey || event.shiftKey || event.altKey,
        target: anchor.target, download: anchor.hasAttribute("download"),
      });
      if (decision !== "document") return;
      event.preventDefault();
      event.stopPropagation();
      window.location.assign(anchor.href);
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);
  return null;
}

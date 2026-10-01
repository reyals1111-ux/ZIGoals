"use client";
import { useEffect } from "react";

/**
 * Keeps sticky sheet actions above the on-screen keyboard. iOS Safari shrinks only the visual viewport when the keyboard
 * opens, so fixed and sticky elements would sit behind it; this exposes the covered height as --keyboard-inset and the
 * visible height as --visual-height on <html>, and marks data-keyboard while a keyboard is open. Phones only.
 */
export function useVisualViewportInsets(active: boolean) {
  useEffect(() => {
    const viewport = window.visualViewport, root = document.documentElement;
    if (!active || !viewport) return;
    let frame = 0;
    const update = () => {
      frame = 0;
      const inset = Math.max(0, Math.round(window.innerHeight - viewport.height - viewport.offsetTop));
      root.style.setProperty("--keyboard-inset", `${inset}px`);
      root.style.setProperty("--visual-height", `${Math.round(viewport.height)}px`);
      if (inset > 80) root.dataset.keyboard = "open"; else delete root.dataset.keyboard;
    };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(update); };
    update();
    viewport.addEventListener("resize", schedule);
    viewport.addEventListener("scroll", schedule);
    return () => {
      cancelAnimationFrame(frame);
      viewport.removeEventListener("resize", schedule);
      viewport.removeEventListener("scroll", schedule);
      root.style.removeProperty("--keyboard-inset");
      root.style.removeProperty("--visual-height");
      if (!root.getAttribute("style")) root.removeAttribute("style");
      delete root.dataset.keyboard;
    };
  }, [active]);
}

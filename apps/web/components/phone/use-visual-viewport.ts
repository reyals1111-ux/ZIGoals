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
      // Session AA-Local Gate A (ADR-022 B44): a keyboard is open only while a text field has focus. Chrome's mobile emulation
      // can report a layout viewport taller than the visual one for a moment on load (the same inset a keyboard makes), and
      // that moment hid the ZIGi launcher for the rest of the page; a real keyboard always comes with a focused field.
      if (inset > 80 && textFieldFocused()) root.dataset.keyboard = "open"; else delete root.dataset.keyboard;
    };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(update); };
    update();
    viewport.addEventListener("resize", schedule);
    viewport.addEventListener("scroll", schedule);
    document.addEventListener("focusin", schedule);
    document.addEventListener("focusout", schedule);
    return () => {
      cancelAnimationFrame(frame);
      viewport.removeEventListener("resize", schedule);
      viewport.removeEventListener("scroll", schedule);
      document.removeEventListener("focusin", schedule);
      document.removeEventListener("focusout", schedule);
      root.style.removeProperty("--keyboard-inset");
      root.style.removeProperty("--visual-height");
      if (!root.getAttribute("style")) root.removeAttribute("style");
      delete root.dataset.keyboard;
    };
  }, [active]);
}
/** A focused element that opens a keyboard: a text-like input, a textarea, a select, or an editable region. */
function textFieldFocused(): boolean {
  const el = document.activeElement as HTMLElement | null;
  if (!el) return false;
  if (el.isContentEditable) return true;
  const tag = el.tagName;
  if (tag === "TEXTAREA" || tag === "SELECT") return true;
  if (tag !== "INPUT") return false;
  const type = (el as HTMLInputElement).type;
  return !["button", "checkbox", "radio", "range", "submit", "reset", "file", "color", "image", "hidden"].includes(type);
}

"use client";
import { useEffect } from "react";
import { entranceAllowed } from "../use-entrance";

/**
 * Drag-to-dismiss on a phone sheet's grabber (Session G, Part 4). Only a drag that starts on the grabber strip at the
 * top of an open sheet counts; the sheet's content, its buttons and its scrolling are untouched. Past a threshold (or a
 * quick flick) the sheet closes the way Escape closes it: a cancelable "cancel" event, then close() unless a handler kept
 * it open, so a sheet that guards its close (the transaction review while busy) still does. Under reduced motion or
 * Motion Off the sheet does not follow the finger; a completed drag still closes it, without animation.
 */
const SHEETS = "dialog[open]:is(.quick-add-dialog, .dashboard-dialog, .wealth-sheet, .dialog, .phone-sheet, .phone-form-sheet)";
/** Every sheet's grabber sits 8 px below its top edge (phone-sheets.css, and .phone-grabber in More); this strip is the handle. */
const GRAB_HEIGHT = 32, GRAB_HALF_WIDTH = 64;

export function grabbedSheet(target: EventTarget | null, x: number, y: number): HTMLDialogElement | null {
  if (!(target instanceof Element)) return null;
  const sheet = target.closest<HTMLDialogElement>(SHEETS);
  if (!sheet || sheet.scrollTop > 0 || target.closest("button, a, input, select, textarea, label, summary, [role='button']")) return null;
  const box = sheet.getBoundingClientRect();
  return y >= box.top && y <= box.top + GRAB_HEIGHT && Math.abs(x - (box.left + box.width / 2)) <= GRAB_HALF_WIDTH ? sheet : null;
}

/** Closes a sheet as Escape does. */
export function dismissSheet(sheet: HTMLDialogElement) {
  if (sheet.dispatchEvent(new Event("cancel", { cancelable: true })) && sheet.open) sheet.close();
}

export function dismissDistance(sheetHeight: number) { return Math.min(120, sheetHeight * .25); }

export function useSheetDrag(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;
    let drag: { sheet: HTMLDialogElement; id: number; y0: number; t0: number; dy: number; follow: boolean } | null = null;
    const settle = (sheet: HTMLDialogElement, animate: boolean) => {
      delete sheet.dataset.dragging;
      if (!animate) { sheet.style.removeProperty("transition"); sheet.style.removeProperty("transform"); return; }
      sheet.style.transition = "transform 200ms cubic-bezier(.22, 1, .36, 1)"; sheet.style.transform = "translateY(0)";
      window.setTimeout(() => { if (!sheet.dataset.dragging) { sheet.style.removeProperty("transition"); sheet.style.removeProperty("transform"); } }, 220);
    };
    const down = (event: PointerEvent) => {
      if (drag || !event.isPrimary || event.button !== 0) return;
      const sheet = grabbedSheet(event.target, event.clientX, event.clientY);
      if (!sheet) return;
      event.preventDefault();
      drag = { sheet, id: event.pointerId, y0: event.clientY, t0: event.timeStamp, dy: 0, follow: entranceAllowed() };
      sheet.dataset.dragging = "";
      if (drag.follow) sheet.style.transition = "none";
    };
    const move = (event: PointerEvent) => {
      if (!drag || event.pointerId !== drag.id) return;
      event.preventDefault();
      drag.dy = Math.max(0, event.clientY - drag.y0);
      if (drag.follow) drag.sheet.style.transform = `translateY(${drag.dy}px)`;
    };
    const up = (event: PointerEvent) => {
      if (!drag || event.pointerId !== drag.id) return;
      const { sheet, dy, t0, follow } = drag; drag = null;
      // A drag is not also a tap on the sheet (Quick add closes on a tap outside its content).
      if (dy > 4) { const swallow = (click: MouseEvent) => { click.stopPropagation(); click.preventDefault(); }; document.addEventListener("click", swallow, { capture: true, once: true }); window.setTimeout(() => document.removeEventListener("click", swallow, true), 0); }
      const flick = dy > 24 && dy / Math.max(1, event.timeStamp - t0) > .6;
      if (dy > dismissDistance(sheet.getBoundingClientRect().height) || flick) {
        settle(sheet, false);
        dismissSheet(sheet);
        return;
      }
      settle(sheet, follow && dy > 0);
    };
    const cancel = (event: PointerEvent) => { if (drag && event.pointerId === drag.id) { const { sheet, follow, dy } = drag; drag = null; settle(sheet, follow && dy > 0); } };
    // A touch that starts on the grabber must not become a scroll of the sheet or the page (which would cancel the drag).
    const touch = (event: TouchEvent) => { const point = event.touches[0]; if (point && grabbedSheet(event.target, point.clientX, point.clientY)) event.preventDefault(); };
    document.addEventListener("pointerdown", down, true);
    document.addEventListener("pointermove", move, true);
    document.addEventListener("pointerup", up, true);
    document.addEventListener("pointercancel", cancel, true);
    document.addEventListener("touchstart", touch, { capture: true, passive: false });
    return () => {
      document.removeEventListener("pointerdown", down, true);
      document.removeEventListener("pointermove", move, true);
      document.removeEventListener("pointerup", up, true);
      document.removeEventListener("pointercancel", cancel, true);
      document.removeEventListener("touchstart", touch, true);
    };
  }, [enabled]);
}

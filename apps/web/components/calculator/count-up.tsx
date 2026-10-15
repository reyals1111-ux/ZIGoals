'use client';
import {useEffect, useRef, useState} from 'react';
import {entranceAllowed} from '../use-entrance';

/**
 * Session AB-Design (owner request 34): a money figure that counts up once when it first appears. The text is the
 * formatted amount; only its digits move, so grouping and the currency sign stay where the locale put them. Static
 * (the final text at once) under reduced motion, Motion Off, and on every later change of the figure.
 */
export function CountUp({text, duration = 900}: {text: string; duration?: number}) {
  const [shown, setShown] = useState(text);
  const first = useRef(true), frame = useRef(0);
  useEffect(() => {
    if (!first.current || !entranceAllowed()) { setShown(text); first.current = false; return; }
    first.current = false;
    const digits = text.replace(/\D/g, '');
    if (!digits) { setShown(text); return; }
    const target = Number(digits), start = performance.now();
    const paint = (now: number) => {
      const t = Math.min(1, (now - start) / duration), eased = 1 - Math.pow(1 - t, 3);
      const value = String(Math.round(target * eased)).padStart(digits.length, '0');
      let i = 0; setShown(text.replace(/\d/g, () => value[i++] ?? '0'));
      if (t < 1) frame.current = requestAnimationFrame(paint); else setShown(text);
    };
    frame.current = requestAnimationFrame(paint);
    return () => cancelAnimationFrame(frame.current);
  }, [text, duration]);
  // While the digits move they are decoration and the final text is read from a visually hidden span; once still, the
  // text alone is in the DOM (a span may not carry aria-label; tests read the figure as plain text).
  if (shown === text) return <span className="count-up">{text}</span>;
  return <span className="count-up"><span aria-hidden="true">{shown}</span><span className="sr-only">{text}</span></span>;
}

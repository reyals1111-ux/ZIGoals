'use client';
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { isNavActive } from "./app-nav";
import { entranceAllowed } from "./use-entrance";

/**
 * The owner's fold marks (public/brand/marks, 720 px wide, -2x 1440 px) and, since Session K, their words cut out on
 * their own (public/brand/words). In the sidebar the figure stays the mark image, at the same size and place as before,
 * with its baked-in words hidden by a clip in the fully transparent gap between figure and words (navigation.css); the
 * words show larger on the planet below. `words` is their display size in CSS px: 1.6 times their size inside the
 * 160 px mark, and the word files are exactly that size (1x) and twice it (-2x).
 */
export const PAGE_MARKS = [
  { href: "/app", name: "today-swan", width: 720, height: 666, words: { width: 188, height: 49 } },
  { href: "/app/goals", name: "goals-lotus", width: 720, height: 686, words: { width: 89, height: 31 } },
  { href: "/app/habits", name: "habits-butterfly", width: 720, height: 687, words: { width: 99, height: 31 } },
  { href: "/app/health", name: "health-heart", width: 720, height: 675, words: { width: 100, height: 31 } },
  { href: "/app/wealth", name: "wealth-bull", width: 720, height: 753, words: { width: 152, height: 33 } },
] as const;
type Mark = (typeof PAGE_MARKS)[number];
type MarkName = Mark["name"];
/** Every mark renders this wide in the sidebar; the box is as tall as the tallest (the bull), so the planet below never moves. */
export const MARK_WIDTH = 160;
export const MARK_BOX_HEIGHT = Math.ceil(Math.max(...PAGE_MARKS.map(m => MARK_WIDTH * m.height / m.width)));
/** A 1×1 transparent GIF: the <img> fallback where the sidebar planet is hidden (tablet header, phones), so nothing downloads there. */
const NOTHING = "data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==";
const FADE_MS = 220;

/** The page's own mark; every other page (Markets, Staking, Portfolio, Ecosystem, Activity, Settings) shows Today's swan. */
export function pageMarkFor(path: string): Mark {
  return PAGE_MARKS.find(mark => isNavActive(path, mark.href)) ?? PAGE_MARKS[0];
}

function MarkLayer({ name, phase }: { name: MarkName; phase?: "in" | "out" }) {
  const mark = PAGE_MARKS.find(m => m.name === name) ?? PAGE_MARKS[0];
  const height = Math.round(MARK_WIDTH * mark.height / mark.width), figure = `/brand/marks/${mark.name}`, words = `/brand/words/${mark.name}`;
  // Decorative: the page title names the page. The images only download where the desktop sidebar shows its planet. They
  // decode with the page (no async decoding): a mark half-way into view otherwise paints a frame later, unpredictably.
  return <span className="sidebar-mark-layer" data-mark={mark.name} data-phase={phase}>
    <picture className="sidebar-mark-figure">
      <source media="(min-width: 901px)" srcSet={`${figure}.webp 1x, ${figure}-2x.webp 2x`} width={MARK_WIDTH} height={height} />
      <img src={NOTHING} width={MARK_WIDTH} height={height} alt="" aria-hidden="true" />
    </picture>
    <picture className="sidebar-mark-words">
      <source media="(min-width: 901px)" srcSet={`${words}.webp 1x, ${words}-2x.webp 2x`} width={mark.words.width} height={mark.words.height} />
      <img src={NOTHING} width={mark.words.width} height={mark.words.height} alt="" aria-hidden="true" />
    </picture>
  </span>;
}

/**
 * Sidebar page mark (Session I; Session K): above the planet Today shows the swan, Goals the lotus, Habits the butterfly,
 * Health the heart and Wealth the bull; every other page shows Today's swan. Each mark's words sit larger on the planet.
 * Changing pages crossfades figure and words together in 220 ms when motion is allowed, and swaps at once under reduced
 * motion or Motion Off.
 */
export function PageMark() {
  const key: MarkName = pageMarkFor(usePathname()).name;
  const [shown, setShown] = useState<{ key: MarkName; leaving: MarkName | null }>({ key, leaving: null });
  // A new page: keep the previous mark for one fade while the new one fades in (React's "adjust state on a prop change").
  if (shown.key !== key) setShown({ key, leaving: entranceAllowed() ? shown.key : null });
  const leaving = shown.key === key ? shown.leaving : null;
  useEffect(() => {
    if (!leaving) return;
    const timer = window.setTimeout(() => setShown(state => state.key === key ? { key, leaving: null } : state), FADE_MS + 40);
    return () => window.clearTimeout(timer);
  }, [key, leaving]);
  return <div className="sidebar-mark" data-mark={key} data-fading={leaving ? "" : undefined}>
    {leaving && <MarkLayer key={leaving} name={leaving} phase="out" />}
    <MarkLayer key={key} name={key} phase={leaving ? "in" : undefined} />
  </div>;
}

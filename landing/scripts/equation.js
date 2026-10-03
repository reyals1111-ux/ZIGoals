'use strict';
// Landing V5: "Goals, Habits & Health = Wealth" as a four-step scroll story.
// Each step block is one viewport tall, so every viewport of scrolling adds exactly one word. The step whose block
// crosses the middle of the viewport is the target; when a fast scroll passes several blocks at once, the words still
// arrive one at a time, in order. Nothing here ever moves the page: no scrollTo, no preventDefault, no wheel or touch
// listener. Without motion (reduced motion, ?motion=off, short viewports, no script) all four words show at once.
(() => {
  const root = document.documentElement;
  const section = document.querySelector('#equation');
  if (!section) return;
  const cells = [...section.querySelectorAll('[data-equation]')];
  const commas = [...section.querySelectorAll('[data-with]')];
  const ticks = [...section.querySelectorAll('.equation-track span')];
  const steps = [...section.querySelectorAll('.eqv5-step')];
  const last = cells.length - 1;
  const STEP_MS = 280;
  const forcedStatic = new URLSearchParams(location.search).get('motion') === 'off';
  // Keep in step with the pinned layout's media query in styles/final-v5.css.
  const motion = matchMedia('(scripting: enabled) and (prefers-reduced-motion: no-preference) and (min-height: 561px)');
  let shown = -1, target = -1, timer = 0, pending = false, listening = false;

  const paint = count => {
    shown = count;
    cells.forEach((cell, i) => cell.classList.toggle('is-on', i <= count));
    commas.forEach(comma => comma.classList.toggle('is-on', count >= Number(comma.dataset.with)));
    ticks.forEach((tick, i) => tick.classList.toggle('active', i <= count));
    section.dataset.step = String(count);
  };
  // One word per beat until the visible words match the target.
  const advance = () => {
    timer = 0;
    if (shown === target) return;
    paint(shown + (shown < target ? 1 : -1));
    if (shown !== target) timer = setTimeout(advance, STEP_MS);
  };
  // The last step block whose top has passed the middle of the viewport; -1 before the first.
  const current = () => {
    const middle = innerHeight / 2;
    let index = -1;
    for (const [i, step] of steps.entries()) if (step.getBoundingClientRect().top <= middle) index = i;
    return Math.min(index, last);
  };
  const animated = () => root.classList.contains('eqv5-ready');
  const update = () => {
    pending = false;
    if (!animated()) return;
    const next = current();
    if (next === target) return;
    target = next;
    if (!timer) advance();
  };
  const schedule = () => { if (!pending) { pending = true; requestAnimationFrame(update); } };
  const listen = on => {
    if (on === listening) return;
    listening = on;
    if (on) addEventListener('scroll', schedule, { passive: true });
    else removeEventListener('scroll', schedule);
  };

  // Scroll is only watched while the section is near the screen.
  const near = new IntersectionObserver(entries => {
    const visible = entries.some(entry => entry.isIntersecting) && animated();
    listen(visible);
    if (visible) schedule();
  }, { rootMargin: '100% 0px 100% 0px' });

  const setMode = () => {
    clearTimeout(timer); timer = 0;
    if (motion.matches && !forcedStatic) {
      root.classList.add('eqv5-ready');
      // Arriving mid-story (a reload, a link) shows the reached state at once; only scrolling animates.
      target = current();
      paint(target);
      listen(true);
      schedule();
    } else {
      root.classList.remove('eqv5-ready');
      listen(false);
      target = last;
      paint(last);
    }
  };

  setMode();
  near.observe(section);
  motion.addEventListener('change', setMode);
})();

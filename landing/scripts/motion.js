'use strict';
(() => {
  const root = document.documentElement;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const desktop = window.matchMedia('(min-width: 701px)');
  const staticMode = new URLSearchParams(location.search).get('motion') === 'off';
  const header = document.querySelector('#site-header');
  const equation = document.querySelector('#equation');
  const words = [...document.querySelectorAll('[data-equation]')];
  const ticks = [...document.querySelectorAll('.equation-track span')];
  const nav = [...document.querySelectorAll('.desktop-nav a')];
  let navBounds = [];
  const measureNavigation = () => { navBounds = nav.map(link => { const el = document.querySelector(link.hash), r = el.getBoundingClientRect(); return { link, top: r.top + scrollY, bottom: r.bottom + scrollY }; }); };
  measureNavigation();
  new ResizeObserver(() => { measureNavigation(); schedule(); }).observe(document.querySelector('main'));
  let pending = false;
  const motionAllowed = () => !reduced.matches && !staticMode;
  const update = () => {
    pending = false;
    header.classList.toggle('is-scrolled', window.scrollY > 28);
    const readingLine = scrollY + innerHeight * .3;
    navBounds.forEach(({ link, top, bottom }) => {
      const current = readingLine >= top && readingLine < bottom;
      if (current && !link.hasAttribute('aria-current')) link.setAttribute('aria-current', 'location');
      else if (!current && link.hasAttribute('aria-current')) link.removeAttribute('aria-current');
    });
    const enabled = motionAllowed() && desktop.matches;
    root.classList.toggle('equation-enabled', enabled);
    if (!enabled) { words.forEach(el => el.classList.add('active')); ticks.forEach(el => el.classList.add('active')); return; }
    const rect = equation.getBoundingClientRect();
    const progress = Math.max(0, Math.min(1, -rect.top / Math.max(1, rect.height - innerHeight)));
    words.forEach((el, index) => el.classList.toggle('active', progress >= [0,.18,.38,.62][index]));
    ticks.forEach((el, index) => el.classList.toggle('active', progress >= [0,.18,.38,.62][index]));
  };
  const schedule = () => { if (!pending) { pending = true; requestAnimationFrame(update); } };
  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', () => { measureNavigation(); schedule(); }, { passive: true });
  reduced.addEventListener('change', schedule);
  desktop.addEventListener('change', schedule);
  if ('IntersectionObserver' in window && motionAllowed()) {
    const observer = new IntersectionObserver(entries => entries.forEach(entry => {
      if (entry.isIntersecting) { entry.target.classList.add('in-view'); observer.unobserve(entry.target); }
    }), { threshold: .08, rootMargin: '0px 0px 35px 0px' });
    const elements = document.querySelectorAll('.reveal');
    elements.forEach(el => observer.observe(el));
    root.classList.add('reveal-ready');
    // Native hash navigation can skip the entrance; focus and anchor targets remain visible.
    document.addEventListener('focusin', e => e.target.closest('.reveal')?.classList.add('in-view'));
  }
  // Each chapter receives two finite folding planes; native scrolling stays untouched.
  if ('IntersectionObserver' in window) {
    const entrances = new IntersectionObserver(entries => entries.forEach(entry => {
      if (entry.isIntersecting) { entry.target.classList.add('is-revealed'); entrances.unobserve(entry.target); }
    }), { threshold: .18 });
    document.querySelectorAll('.chapter-opening').forEach(el => entrances.observe(el));

  }
  update();
})();

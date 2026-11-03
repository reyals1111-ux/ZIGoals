'use strict';
(() => {
  const root = document.documentElement;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const staticMode = new URLSearchParams(location.search).get('motion') === 'off';
  const header = document.querySelector('#site-header');
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
  };
  const schedule = () => { if (!pending) { pending = true; requestAnimationFrame(update); } };
  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', () => { measureNavigation(); schedule(); }, { passive: true });
  reduced.addEventListener('change', schedule);
  // The V5 equation has its own script (equation.js); V4's stepped reveal and its `equation-enabled` class are gone.
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
  // Session AK M6: NOVA's opening plays once when it comes into view, and again from its button; without motion the
  // finished dashboard simply shows. Slow drifts rest on low-end devices, Save-Data and a low battery.
  // Session AK P5 (LANDING_REVIEW LR-2): `nv-armed` keeps the dashboard dark until its opening starts, so the finished
  // screen no longer shows first and then blinks out (final-v7.css; only inside its no-preference block).
  const stage = document.querySelector('#nova-stage');
  if (stage && 'IntersectionObserver' in window && motionAllowed()) {
    const replay = stage.querySelector('.nv-replay');
    stage.classList.add('nv-armed');
    const play = () => { stage.classList.remove('is-online'); void stage.offsetWidth; stage.classList.add('is-online'); };
    const seen = new IntersectionObserver(e => { if (e.some(x => x.isIntersecting)) { seen.disconnect(); play(); } }, { threshold: .35 });
    seen.observe(stage); replay.hidden = false; replay.addEventListener('click', play);
  }
  const n = navigator, still = () => root.classList.add('lv7-still');
  if ((n.hardwareConcurrency || 8) <= 4 || (n.deviceMemory || 8) <= 4 || (n.connection && n.connection.saveData)) still();
  if (n.getBattery) n.getBattery().then(b => { if (!b.charging && b.level < .2) still(); }, () => {});
  update();
})();

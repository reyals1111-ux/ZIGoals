'use strict';
(() => {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const manualStatic = new URLSearchParams(location.search).get('motion') === 'off';
  if (manualStatic) document.documentElement.classList.add('motion-off');
  const toggle = document.querySelector('.menu-toggle');
  const menu = document.querySelector('#mobile-menu');
  const setMenu = (open, restore = false) => {
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    menu.hidden = !open;
    document.body.classList.toggle('menu-open', open);
    if (restore) toggle.focus();
  };
  toggle.addEventListener('click', () => setMenu(menu.hidden));
  menu.addEventListener('click', e => { if (e.target.closest('a')) setMenu(false); });
  document.addEventListener('keydown', e => {
    if (menu.hidden) return;
    if (e.key === 'Escape') { setMenu(false, true); return; }
    if (e.key !== 'Tab') return;
    const items = [toggle, ...menu.querySelectorAll('a')];
    const first = items[0], last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  });
  window.matchMedia('(min-width: 951px)').addEventListener('change', e => { if (e.matches) setMenu(false); });
  const dialog = document.querySelector('#image-dialog');
  const dialogImage = document.querySelector('#dialog-image');
  document.querySelectorAll('[data-image]').forEach(button => {
    button.addEventListener('click', () => {
      const mobileImage = window.matchMedia("(max-width: 700px)").matches && button.dataset.imageMobile;
      dialogImage.src = mobileImage || button.dataset.image;
      dialog.classList.toggle("mobile-capture", Boolean(mobileImage));
      dialogImage.alt = button.dataset.title + '. ' + (button.dataset.note || 'Actual screenshot; personal records are fictional Showcase examples.');
      document.querySelector('#dialog-note').textContent = (button.dataset.note || 'Actual public Alpha. Personal records are fictional Showcase examples.') + ' Scroll to explore the image.';
      document.querySelector('#dialog-title').textContent = button.dataset.title;
      dialog.showModal();
      document.body.classList.add('dialog-open');
      document.querySelector('#dialog-close').focus();
    });
  });
  document.querySelector('#dialog-close').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', e => {
    const rect = dialog.getBoundingClientRect();
    if (e.clientX < rect.left || e.clientX > rect.right || e.clientY < rect.top || e.clientY > rect.bottom) dialog.close();
  });
  dialog.addEventListener('close', () => document.body.classList.remove('dialog-open'));
  const gallery = document.querySelector('.context-gallery');
  const tablist = gallery.querySelector('.context-tabs');
  const tabs = [...tablist.querySelectorAll('button')];
  tablist.setAttribute('role', 'tablist');
  const selectTab = (selected, focus = false) => {
    tabs.forEach(tab => {
      const active = tab === selected;
      tab.setAttribute('role', 'tab');
      tab.setAttribute('aria-selected', String(active));
      tab.setAttribute('aria-controls', tab.dataset.panel);
      tab.tabIndex = active ? 0 : -1;
      const panel = document.getElementById(tab.dataset.panel);
      panel.setAttribute('role', 'tabpanel');
      panel.tabIndex = 0;
      panel.hidden = !active;
    });
    if (focus) selected.focus();
  };
  tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => selectTab(tab));
    tab.addEventListener('keydown', e => {
      const keys = { ArrowRight: (index + 1) % tabs.length, ArrowLeft: (index + tabs.length - 1) % tabs.length, Home: 0, End: tabs.length - 1 };
      if (!(e.key in keys)) return;
      e.preventDefault(); selectTab(tabs[keys[e.key]], true);
    });
  });
  selectTab(tabs[0]);
  const video = document.querySelector('#brand-film');
  const stage = document.querySelector('#film-stage');
  const poster = document.querySelector('#film-poster');
  const filmToggle = document.querySelector('#film-toggle');
  const sound = document.querySelector('#film-sound');
  const status = document.querySelector('#film-status');
  const controls = document.querySelector('.film-controls');
  controls.hidden = false;
  let autoAttempted = false;
  let completed = false;
  const constrained = () => reduced.matches || manualStatic || window.matchMedia('(prefers-reduced-data: reduce)').matches || navigator.connection?.saveData;
  const labels = () => {
    filmToggle.textContent = completed ? 'Replay film ↻' : video.paused ? 'Play film ▷' : 'Pause film Ⅱ';
    sound.textContent = video.muted ? 'Play with sound ↗' : 'Mute sound';
  };
  const restorePoster = (message = '') => {
    video.pause(); video.hidden = true; poster.hidden = false;
    video.muted = true; completed = false; labels();
    status.textContent = message;
  };
  const play = async ({ audible = false, restart = false } = {}) => {
    // The hidden film's poster is set only when it first plays: as an attribute it was fetched with the first view.
    if (!video.getAttribute('poster')) video.setAttribute('poster', video.dataset.poster);
    if (!video.getAttribute('src')) video.src = window.matchMedia('(max-width: 700px)').matches ? video.dataset.mobileSrc : video.dataset.src;
    if (restart || completed) video.currentTime = 0;
    completed = false; video.muted = !audible;
    try {
      await video.play(); video.hidden = false; poster.hidden = true; labels();
      status.textContent = audible ? 'Film playing with sound.' : 'Film playing muted.';
    } catch {
      restorePoster('Playback did not start. Select Play film to try again.');
    }
  };
  filmToggle.addEventListener('click', () => {
    autoAttempted = true;
    if (video.paused) play({ audible: !video.muted });
    else { video.pause(); labels(); status.textContent = 'Film paused.'; }
  });
  sound.addEventListener('click', () => {
    autoAttempted = true;
    if (!video.muted) { video.muted = true; labels(); status.textContent = 'Sound muted.'; }
    else play({ audible: true, restart: true });
  });
  video.addEventListener('ended', () => { completed = true; labels(); status.textContent = 'Film complete. Replay is available.'; });
  video.addEventListener('error', () => restorePoster('The film is unavailable. The approved poster remains visible.'));
  const pauseOffscreen = () => { if (!video.paused) { video.pause(); labels(); } };
  if ('IntersectionObserver' in window) new IntersectionObserver(entries => {
    const visible = entries[0].intersectionRatio >= .55;
    if (!entries[0].isIntersecting) { pauseOffscreen(); return; }
    if (visible && !autoAttempted && !constrained() && window.matchMedia('(min-width: 951px)').matches && video.dataset.autoplay === 'true') {
      autoAttempted = true; play();
    }
  }, { threshold: [0, .55] }).observe(stage);
  reduced.addEventListener('change', () => {
    if (reduced.matches) { restorePoster('Reduced motion: static film poster.'); video.removeAttribute('src'); video.load(); }
  });
  document.addEventListener('visibilitychange', () => { if (document.hidden) pauseOffscreen(); });
})();

import { readFileSync, readdirSync } from "node:fs";
import { expect, test } from "vitest";

// Session AK P5 (docs/review/session-ak/LANDING_REVIEW.md): a fresh review of the landing at 390, 768, 1440 and 1920 px.
// These pin what it fixed: NOVA is reachable from both menus; status lines never say more than the cards under them;
// the privacy and terms pages cover NOVA, local models and Hermes Agent; every button's name holds its visible words;
// NOVA's opening no longer shows its finished screen first; the example dashboard keeps the 14 px floor; and no
// stylesheet ships a rule that can match nothing on the landing (the first view had 2 KB of headroom left).
const read = file => readFileSync(new URL(`../landing/${file}`, import.meta.url), "utf8");
const html = read("index.html");
const text = fragment => fragment.replace(/<[^>]+>/g, " ").replace(/&rsquo;/g, "’").replace(/&amp;/g, "&").replace(/\s+/g, " ").replace(/ ([,.:;?])/g, "$1").trim();
const section = id => html.match(new RegExp(`<section id="${id}"[\\s\\S]*?</section>`))[0];

test("LR-1: NOVA's chapter is in the desktop navigation and the phone menu, in page order", () => {
  const desktop = [...html.match(/<nav class="desktop-nav"[\s\S]*?<\/nav>/)[0].matchAll(/href="#([\w-]+)"/g)].map(m => m[1]);
  const phone = [...html.match(/<nav id="mobile-menu"[\s\S]*?<\/nav>/)[0].matchAll(/href="#([\w-]+)"/g)].map(m => m[1]);
  for (const links of [desktop, phone]) {
    expect(links).toContain("nova");
    expect(links.indexOf("nova")).toBe(links.indexOf("wealth") + 1);
    // Every in-page link lands on a section that exists, in the order the page shows them.
    const at = links.map(id => html.indexOf(`id="${id}"`));
    expect(at.every(index => index > 0)).toBe(true);
    expect(at).toEqual([...at].sort((a, b) => a - b));
  }
});

test("OD-4: \"Private by design\" follows the NOVA chapter directly, and both menus list it right after NOVA", () => {
  const order = [...html.matchAll(/<section id="([\w-]+)"/g)].map(m => m[1]);
  expect(order[order.indexOf("nova") + 1]).toBe("privacy");
  expect(order.indexOf("privacy")).toBeLessThan(order.indexOf("ecosystem"));
  expect(text(section("privacy"))).toMatch(/^06 PRIVATE BY DESIGN Your plans should remain yours\./);
  const desktop = [...html.match(/<nav class="desktop-nav"[\s\S]*?<\/nav>/)[0].matchAll(/href="#([\w-]+)"/g)].map(m => m[1]);
  const phone = html.match(/<nav id="mobile-menu"[\s\S]*?<\/nav>/)[0];
  const phoneLinks = [...phone.matchAll(/href="#([\w-]+)"/g)].map(m => m[1]);
  for (const links of [desktop, phoneLinks]) expect(links.indexOf("privacy")).toBe(links.indexOf("nova") + 1);
  expect(phone).toContain('<a href="#nova">NOVA <span>06</span></a><a href="#privacy">Privacy <span>07</span></a>');
});

test("LR-4, LR-5: a section's status line never says more than its cards", () => {
  const coming = section("coming");
  const legal = text(coming.match(/<p class="coming-legal">([\s\S]*?)<\/p>/)[1]);
  // One card in "What's coming" is in the Alpha already, so the line speaks only of what is planned.
  expect(coming).toContain('<span class="availability available">');
  expect(legal).not.toMatch(/^Not available\b/);
  expect(legal).toContain("What is planned is not available yet.");
  expect(legal).toContain("financial advice");
  // "What's new" holds a card that waits for a switch, so its introduction does not say all of it is in the Alpha.
  const whatsNew = section("new");
  expect(whatsNew).toContain('<span class="availability switching">');
  expect(text(whatsNew)).not.toMatch(/\bAll of it is in the public Alpha\b/);
  expect(text(whatsNew)).toContain("Each card says whether it is in the public Alpha today or still waits for a switch on our side.");
  // The app's internal mode name is not visitor copy.
  expect(text(html)).not.toContain("Local Demo");
});

test("LR-6: the privacy page says where NOVA's messages go with a local model, a cloud key and Hermes Agent; the terms name NOVA", () => {
  const privacy = text(read("privacy.html")), terms = text(read("terms.html"));
  const nova = privacy.match(/NOVA, and a model or agent on your own computer:[^]*?Without a model, NOVA answers on your device and sends nothing\./)?.[0] ?? "";
  expect(nova).not.toBe("");
  expect(nova).toContain("Ollama, LM Studio or llama.cpp");
  expect(nova).toContain("a model that runs in Ollama’s cloud is not local");
  expect(nova).toContain("sent only to that provider");
  expect(nova).toContain("Hermes Agent (by Nous Research; ZIGoals is not affiliated)");
  expect(nova).toContain("which may include a cloud model");
  expect(nova).toContain("ZIGoals never sees, stores or relays any of it.");
  expect(nova).not.toMatch(/chats? (stay|stays) on (your|this) device/i);
  expect(terms).toContain("ZIGi and NOVA propose changes as cards");
  expect(terms).toContain("neither moves money");
});

test("LR-7: every named button's accessible name holds the words it shows (WCAG 2.5.3)", () => {
  const buttons = [...html.matchAll(/<button\b([^>]*)>([\s\S]*?)<\/button>/g)].filter(([, attributes]) => /aria-label="/.test(attributes));
  expect(buttons.length).toBeGreaterThanOrEqual(9);
  for (const [, attributes, inner] of buttons) {
    const name = attributes.match(/aria-label="([^"]*)"/)[1].toLowerCase();
    const shown = text(inner.replace(/<([a-z]+)[^>]*aria-hidden="true"[^>]*>[\s\S]*?<\/\1>/g, "")).replace(/[×↗▷]/g, "").trim().toLowerCase();
    if (shown) expect(name, `"${shown}" in "${name}"`).toContain(shown);
  }
});

test("LR-2: NOVA's opening keeps its screen dark until it starts, only where motion is allowed", () => {
  const js = read("scripts/motion.js"), css = read("styles/final-v7.css");
  // Armed only inside the motion-allowed branch, before the observer can start the opening.
  const branch = js.match(/if \(stage && 'IntersectionObserver' in window && motionAllowed\(\)\) \{([\s\S]*?)\n {2}\}/)[1];
  expect(branch.indexOf("stage.classList.add('nv-armed')")).toBeGreaterThan(-1);
  expect(branch.indexOf("stage.classList.add('nv-armed')")).toBeLessThan(branch.indexOf("seen.observe(stage)"));
  const block = css.match(/@media \(prefers-reduced-motion:no-preference\)\{([\s\S]*?)\n\}/)[1];
  expect(block).toContain("html:not(.motion-off) .nv-armed:not(.is-online) :is(.nv-orb,.nv-hello,.nv-tiles,.nv-bar){opacity:0}");
  expect(css.replace(block, "")).not.toContain("nv-armed");
});

test("LR-3: the example NOVA dashboard keeps the landing's floors (14 px labels, 15 px for its two sentences) at every width", () => {
  const css = read("styles/final-v7.css");
  // landing-v5-layout.spec counts the greeting and the ask bar (both <p>) as body copy.
  for (const [, selector, body] of css.matchAll(/([^{}]*\.nv-[^{}]*)\{([^{}]*)\}/g)) {
    const floor = /\.nv-(hello|bar)\b/.test(selector) ? 15 : 14;
    for (const [, size] of body.matchAll(/font-size:(\d+)px/g)) expect(Number(size), selector.trim()).toBeGreaterThanOrEqual(floor);
    for (const [, low] of body.matchAll(/font-size:clamp\((\d+)px/g)) expect(Number(low), selector.trim()).toBeGreaterThanOrEqual(floor);
  }
  expect(read("index.html")).toMatch(/<p class="nv-hello">[^<]+<\/p>[\s\S]*<p class="nv-bar">/);
});

test("LR-8: no stylesheet keeps a rule whose every selector names a class the landing never uses", () => {
  const corpus = ["index.html", "privacy.html", "terms.html", "scripts/main.js", "scripts/motion.js", "scripts/equation.js", "scripts/fold-stage.mjs", "scripts/fold-state.mjs"].map(read).join("\n");
  const unused = selector => [...selector.replace(/:not\([^()]*\)/g, "").matchAll(/\.([a-zA-Z][\w-]*)/g)].some(match => !corpus.includes(match[1]));
  const dead = [];
  const walk = (css, file) => {
    for (let i = 0; i < css.length;) {
      const open = css.indexOf("{", i);
      if (open < 0) break;
      let depth = 1, j = open + 1;
      while (depth && j < css.length) { if (css[j] === "{") depth++; else if (css[j] === "}") depth--; j++; }
      const head = css.slice(i, open).replace(/\/\*[\s\S]*?\*\//g, "").trim();
      if (/^@(media|supports)/.test(head)) walk(css.slice(open + 1, j - 1), file);
      else if (!head.startsWith("@") && head.split(",").every(unused)) dead.push(`${file}: ${head}`);
      i = j;
    }
  };
  for (const file of readdirSync(new URL("../landing/styles/", import.meta.url))) walk(read(`styles/${file}`), file);
  expect(dead).toEqual([]);
});

test("LR-9: the fold frames wait for the visitor's first scroll, so a tall first screen never fetches them", () => {
  const js = read("scripts/fold-stage.mjs");
  expect(js).toContain("moved = scrollY > 0");
  // Every place that loads a frame set checks it, and the first scroll loads the stages already near.
  const loads = [...js.matchAll(/^.*\bload\(s\);.*$/gm)].map(match => match[0]);
  expect(loads.length).toBe(4);
  for (const line of loads) expect(line, line.trim()).toMatch(/\bmoved\b/);
  expect(js).toMatch(/if \(!moved\) addEventListener\('scroll', \(\) => \{ moved = true; for \(const s of all\) if \(s\.near && animated\) load\(s\);[^\n]*\{ passive: true, once: true \}\);/);
});

test("LR-10: the gallery's tab panels are elements that may carry role=tabpanel", () => {
  const ecosystem = section("ecosystem");
  const panels = [...ecosystem.matchAll(/<(\w+) id="view-(\w+)" class="context-panel"/g)];
  expect(panels.map(match => match[2])).toEqual(["positions", "markets", "ecosystem"]);
  for (const [, tag] of panels) expect(tag).toBe("div");
});

test("LR-11: the bento's wide cards are its three longest, so none stretches into an empty box", () => {
  const css = read("styles/final-v7.css");
  const spans = css.match(/\.new-list>li:is\(([^)]*\))*\)\{grid-column:span 2\}/)[0];
  const picked = [...spans.matchAll(/:nth-child\((\d+)\)/g)].map(match => Number(match[1]));
  const titles = [...html.match(/<ul class="new-list[\s\S]*?<\/ul><p class="new-note/)[0].matchAll(/<li><span class="availability \w+">[^<]+<\/span><h3>([^<]+)<\/h3>([\s\S]*?)<\/ul><\/li>/g)].map(([, title, body]) => ({ title, length: text(body).length }));
  expect(picked.map(n => titles[n - 1].title)).toEqual(["Food", "Insights", "Money, day to day"]);
  const longest = [...titles].sort((a, b) => b.length - a.length).slice(0, 3).map(card => card.title).sort();
  expect(picked.map(n => titles[n - 1].title).sort()).toEqual(longest);
});

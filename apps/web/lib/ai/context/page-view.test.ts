// @vitest-environment jsdom
import {describe, expect, test} from 'vitest';
import {toolEnv} from '../tools/env';
import {gatesFor, showcaseSources} from '../tools/fixtures';
import {runTool} from '../tools/registry';
import {localAnswer} from '../local-answers/engine';
import {questionCalls} from './question';
import {todayView, withPage} from '../evals/fixtures-af';
import {cardOnPage, cleanLabel, MAX_PAGE_CARDS, pageViewOf, pageViewText, PAGE_VIEW_CHARS, readPageView, trackCardFocus} from './page-view';
import {CARD_HELP, cardHelp} from './card-help';

// Session AF (L4, P8.7): page awareness sends the route and the cards' ids and titles, never a value.
describe('what the person is looking at', () => {
  test('titles lose their figures; Health cards only with the gate; nothing on Settings or a private screen', () => {
    expect(cleanLabel('Water · 1.2 L')).toBe('Water');
    expect(cleanLabel('Net worth €12,400 (+3.2%)')).toBe('Net worth');
    expect(cleanLabel('Daily Habits 3 of 5')).toBe('Daily Habits');
    expect(cleanLabel('Steps today: 7,420 steps')).toBe('Steps today');
    const open = todayView(true), shut = todayView(false);
    expect(open.cards.map(c => c.id)).toEqual(['today:whole-life', 'today:habits', 'today:funding', 'today:health', 'card:zigi-brief']);
    expect(open.cards.find(c => c.id === 'today:health')!.label).toBe('Daily Health');
    expect(shut.cards.map(c => c.id)).not.toContain('today:health'); expect(shut.healthHidden).toBe(1);
    expect(pageViewOf('/app/settings', [{id: 'today:habits', text: 'x', inView: true}], {healthOpen: true, sensitive: false})).toBeNull();
    expect(pageViewOf('/app', [{id: 'today:habits', text: 'x', inView: true}], {healthOpen: true, sensitive: true})).toBeNull();
    // The cards in view come first; at most 40; the text stays within 1,500 characters and carries no figure of a card.
    const many = pageViewOf('/app/wealth', Array.from({length: 80}, (_, i) => ({id: `wealth:part-${i}`, text: `Part ${i} · $${i * 100}`, inView: i % 2 === 0})), {healthOpen: true, sensitive: false})!;
    expect(many.cards).toHaveLength(MAX_PAGE_CARDS); expect(many.cards[0]!.inView).toBe(true);
    const text = pageViewText(many);
    expect(text.length).toBeLessThanOrEqual(PAGE_VIEW_CHARS); expect(text).not.toMatch(/\$/);
    expect(pageViewText(open)).toBe('## On screen (card titles and ids only; no values)\nPage: Today (/app)\nThe card asked about: Funding rhythm [today:funding]\nIn view: Whole-life overview [today:whole-life]; Daily Habits [today:habits]\nFurther on the page: Funding rhythm [today:funding]; Daily Health [today:health]; ZIGi\'s brief [card:zigi-brief]');
  });
  test('the browser read: the page\'s own markers, skipping ZIGi\'s panel and hidden parts', () => {
    document.body.innerHTML = '<main><div class="placed-module" data-kind="builtin" data-module="funding"><h2>Funding rhythm 4 weeks</h2></div><div data-card="wrap-up"><article aria-label="Evening wrap-up"></article></div><section id="start-here"><h2>Start here</h2></section><div data-layout-item="wealth:holdings" hidden><h2>What you have</h2></div></main><dialog data-ai-dialog open><div data-card="inside-zigi"><h2>No</h2></div></dialog>';
    for (const el of Array.from(document.querySelectorAll('main *, dialog *'))) (el as HTMLElement).getBoundingClientRect = () => ({width: 100, height: 40, top: 10, bottom: 50, left: 0, right: 100, x: 0, y: 10, toJSON: () => ({})});
    const view = readPageView(document, '/app', {healthOpen: true, sensitive: false})!;
    expect(view.cards.map(c => [c.id, c.label])).toEqual([['today:funding', 'Funding rhythm'], ['card:wrap-up', 'Evening wrap-up'], ['#start-here', 'Start here']]);
    expect(readPageView(document, '/app/settings', {healthOpen: true, sensitive: false})).toBeNull();
  });
  test('Today as it is built: named regions count, once; a preset widget is judged by its title; a tap inside a card names the card', () => {
    document.body.innerHTML = '<main><section aria-labelledby="hero"><h1 id="hero">Today\'s Goals, Habits &amp; Health</h1></section>'
      + '<section aria-label="Checklist"><h2>Your day as a path of dots</h2><p>2 of 5</p></section>'
      + '<section aria-labelledby="focus"><h2 id="focus">Today’s focus</h2><section aria-label="Your coach"><h2>Your coach</h2></section></section>'
      + '<div class="placed-module" data-kind="widget" data-module="preset-habits-health-0"><article id="dashboard-widget-preset-habits-health-0"><h3>Daily Habits</h3><section aria-label="Morning"><button id="tap">Read</button></section></article></div>'
      + '<div class="placed-module" data-kind="widget" data-module="preset-habits-health-1"><article id="dashboard-widget-preset-habits-health-1"><h3>Water today 1.2 L</h3></article></div></main>';
    for (const el of Array.from(document.querySelectorAll('main *'))) (el as HTMLElement).getBoundingClientRect = () => ({width: 100, height: 40, top: 10, bottom: 50, left: 0, right: 100, x: 0, y: 10, toJSON: () => ({})});
    const view = readPageView(document, '/app', {healthOpen: false, sensitive: false})!;
    // The page's head (its h1) is not a card; "Your coach" and "Morning" are parts of a card; a widget's own article is the widget.
    expect(view.cards.map(c => [c.id, c.label])).toEqual([['region:checklist', 'Checklist'], ['region:today-s-focus', 'Today’s focus'], ['widget:preset-habits-health-0', 'Daily Habits']]);
    expect(view.healthHidden).toBe(1); // "Water today": its title, not the preset's name, makes it a Health card
    expect(cardHelp('region:checklist', 'en')).toBe(CARD_HELP['today:checklist']!.en);
    trackCardFocus(document);
    document.getElementById('tap')!.dispatchEvent(new FocusEvent('focusin', {bubbles: true}));
    expect(readPageView(document, '/app', {healthOpen: false, sensitive: false})!.focused).toBe('widget:preset-habits-health-0');
    expect(pageViewText(view)).not.toMatch(/1\.2|2 of 5|Water/); // no value, and nothing of the Health card
  });
  test('"explain this card" and "what am I looking at" are answered on the device from the cards\' plain-words notes, never a value', () => {
    const env = toolEnv(withPage(showcaseSources()), gatesFor(true), 'local');
    const looking = localAnswer('What am I looking at?', env);
    expect(looking.kind).toBe('answer'); expect('text' in looking && looking.text).toMatch(/^You are on Today\. In view:\n• Whole-life overview — /);
    expect('text' in looking && looking.text).toMatch(/Titles only: ZIGi reads no values here\.$/);
    const card = localAnswer('Explain this card', env);
    expect('text' in card && card.text).toMatch(/^Funding rhythm shows how often you have added to your goals/);
    expect(localAnswer('explain the daily habits card', env)).toMatchObject({kind: 'answer', calls: [{tool: 'page_view', args: {card: 'today:habits'}}]});
    expect('text' in localAnswer('leg deze kaart uit', env) && (localAnswer('leg deze kaart uit', env) as {text: string}).text).toMatch(/^Het inlegritme toont/);
    // A card ZIGi has no note for, or no page view: the other routes decide (the person's AI, with the "This page" chip).
    expect(localAnswer('Explain the mystery card', env).kind).toBe('none');
    expect(localAnswer('What am I looking at?', toolEnv(showcaseSources(), gatesFor(true), 'local')).kind).toBe('none');
    expect(localAnswer('Explain this page', env).kind).toBe('none');
    expect(cardOnPage(todayView(), 'whole-life overview')?.id).toBe('today:whole-life');
    for (const help of Object.values(CARD_HELP)) { expect(help.en, help.name).not.toMatch(/\d/); expect(help.nl, help.name).not.toMatch(/\d/); }
    expect(cardHelp('widget:habits', 'en')).toBe(CARD_HELP['today:habits']!.en);
  });
  test('the page_view tool and the "This page" chip: titles and ids only; the question about the page brings it', () => {
    const sources = withPage(showcaseSources()), env = toolEnv(sources, gatesFor(true), 'provider');
    const r = runTool('page_view', {}, env);
    expect(r.ok).toBe(true); expect(JSON.stringify(r)).not.toMatch(/\d+(?:\.\d+)? ?(?:L|kg|%|€|\$)/);
    expect(questionCalls('Explain this card to me', sources, gatesFor(true)).map(c => c.tool)).toContain('page_view');
    expect(questionCalls('How many minutes did I meditate this month?', sources, gatesFor(true)).map(c => c.tool)).not.toContain('page_view');
    expect((runTool('page_view', {}, toolEnv(showcaseSources(), gatesFor(true), 'provider')) as unknown as {data: {page: string}}).data.page).toMatch(/^not shared/);
  });
});

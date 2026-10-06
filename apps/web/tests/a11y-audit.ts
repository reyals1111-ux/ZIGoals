import type {Locator} from '@playwright/test';

/**
 * An axe-style check built from what the suite already has (Session V Part 16; no new dependency): Playwright's own
 * accessibility tree for names (every control has one, computed the way assistive technology computes it) and the DOM
 * rules axe-core also checks that matter to people using a screen reader, and to AI agents that drive a page by its
 * roles and names. Each finding names the rule and the element. Hidden elements are skipped.
 * - name: a button, link, field, switch, checkbox, radio, tab or option without an accessible name;
 * - label: a visible form field with no label (label[for], a wrapping label, aria-label, aria-labelledby or title);
 * - duplicate-id, and aria-labelledby / aria-describedby / aria-controls pointing at no element;
 * - aria-hidden-focus: something focusable inside aria-hidden; nested-interactive: a control inside a button or link;
 * - tabindex: a positive tabindex; image-alt: an image without alt; aria-required-attr: a switch, checkbox or radio role
 *   without aria-checked; radio-group: radios that are not in a named group (fieldset with a legend, or a named group);
 *   aria-prohibited-attr: aria-label or aria-labelledby on a div, span or p without a role, where it names nothing.
 */
export type Finding = {rule: string; where: string};
const NAMED_ROLES = 'button|link|textbox|checkbox|radio|switch|combobox|spinbutton|slider|searchbox|menuitem|menuitemcheckbox|tab|option|listbox';
export async function audit(scope: Locator): Promise<Finding[]> {
  const dom = await scope.evaluate((root: Element) => {
    const out: {rule: string; where: string}[] = [];
    const doc = root.ownerDocument;
    const describe = (el: Element) => {
      const cls = typeof el.className === 'string' && el.className.trim() ? `.${el.className.trim().split(/\s+/).join('.')}` : '';
      const name = el.getAttribute('aria-label') ?? el.getAttribute('name') ?? (el.textContent ?? '').trim().slice(0, 40);
      return `${el.tagName.toLowerCase()}${el.id ? `#${el.id}` : ''}${cls}${name ? ` "${name}"` : ''}`.slice(0, 200);
    };
    const shown = (el: Element) => { if (el.closest('[hidden], [inert]')) return false; const s = getComputedStyle(el); return s.display !== 'none' && s.visibility !== 'hidden' && el.getClientRects().length > 0; };
    const all = (selector: string) => [...(root.matches(selector) ? [root] : []), ...root.querySelectorAll(selector)];
    const counts = new Map<string, number>();
    for (const el of doc.querySelectorAll('[id]')) counts.set(el.id, (counts.get(el.id) ?? 0) + 1);
    for (const el of all('[id]')) if ((counts.get(el.id) ?? 0) > 1) out.push({rule: 'duplicate-id', where: describe(el)});
    for (const attr of ['aria-labelledby', 'aria-describedby', 'aria-controls', 'aria-errormessage']) for (const el of all(`[${attr}]`)) {
      // As in axe: a collapsed control may name a panel that is only rendered once it opens.
      if (attr === 'aria-controls' && el.getAttribute('aria-expanded') === 'false') continue;
      for (const id of (el.getAttribute(attr) ?? '').split(/\s+/).filter(Boolean)) if (!doc.getElementById(id)) out.push({rule: `${attr}-target`, where: `${describe(el)} → #${id}`});
    }
    for (const el of all('input:not([type=hidden]):not([type=submit]):not([type=button]):not([type=reset]):not([type=image]), select, textarea')) {
      if (!shown(el)) continue;
      const field = el as HTMLInputElement;
      const labelled = (field.labels?.length ?? 0) > 0 || !!field.getAttribute('aria-label')?.trim() || !!field.getAttribute('aria-labelledby')?.trim() || !!field.getAttribute('title')?.trim();
      if (!labelled) out.push({rule: 'label', where: describe(el)});
    }
    for (const hidden of all('[aria-hidden="true"]')) for (const el of hidden.querySelectorAll('a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])')) out.push({rule: 'aria-hidden-focus', where: describe(el)});
    for (const el of all('button a[href], button button, button input, button select, a[href] button, a[href] a[href], a[href] input, summary button, summary a[href], summary input')) out.push({rule: 'nested-interactive', where: describe(el)});
    for (const el of all('[tabindex]')) if (Number(el.getAttribute('tabindex')) > 0) out.push({rule: 'tabindex', where: describe(el)});
    for (const el of all('img')) if (!el.hasAttribute('alt') && el.getAttribute('aria-hidden') !== 'true' && el.getAttribute('role') !== 'presentation') out.push({rule: 'image-alt', where: describe(el)});
    // aria-label on an element with no role gives no name at all (ARIA 1.2 prohibits it there): it needs role="group" or similar.
    for (const el of all('div[aria-label], span[aria-label], p[aria-label], div[aria-labelledby], span[aria-labelledby], p[aria-labelledby]')) if (!el.getAttribute('role')) out.push({rule: 'aria-prohibited-attr', where: describe(el)});
    for (const el of all('[role=switch], [role=checkbox], [role=radio], [role=menuitemcheckbox]')) if (!(el instanceof HTMLInputElement) && !el.hasAttribute('aria-checked')) out.push({rule: 'aria-required-attr', where: describe(el)});
    for (const el of all('input[type=radio]')) {
      if (!shown(el)) continue;
      const group = el.closest('fieldset, [role=radiogroup], [role=group]');
      const named = !!group && (!!group.getAttribute('aria-label')?.trim() || !!group.getAttribute('aria-labelledby')?.trim() || (group.tagName === 'FIELDSET' && !!group.querySelector(':scope > legend')?.textContent?.trim()));
      if (!named) out.push({rule: 'radio-group', where: describe(el)});
    }
    return out;
  });
  const tree = await scope.ariaSnapshot();
  const unnamed = tree.split('\n').filter(line => new RegExp(`^\\s*- (?:${NAMED_ROLES})(?:$|:| \\[)`).test(line)).map(line => ({rule: 'name', where: line.trim()}));
  return [...dom, ...unnamed];
}

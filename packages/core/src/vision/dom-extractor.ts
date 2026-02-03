/**
 * DOM Extractor - Extracts structured DOM using Playwright's Accessibility Tree
 *
 * Uses page.accessibility.snapshot() to capture all interactive elements
 * the way a screen reader would see them - much more robust than CSS selectors.
 * Falls back to CSS-based extraction if accessibility API is unavailable.
 */

import type { Page } from 'playwright';
import type {
  StructuredDOM,
  ActionableElement,
  ElementType,
  PageRegion,
} from '@testfarm/shared';

// ============================================================================
// Accessibility Tree Types
// ============================================================================

interface AccessibilityNode {
  role: string;
  name: string;
  children?: AccessibilityNode[];
  focused?: boolean;
  disabled?: boolean;
  value?: string;
  description?: string;
  checked?: boolean | 'mixed';
  selected?: boolean;
  expanded?: boolean;
  level?: number;
  valuemin?: number;
  valuemax?: number;
  valuetext?: string;
  autocomplete?: string;
  haspopup?: string;
  invalid?: string;
  orientation?: string;
  multiselectable?: boolean;
  readonly?: boolean;
  required?: boolean;
}

// ============================================================================
// Role Mapping
// ============================================================================

const INTERACTIVE_ROLES = new Set([
  'button',
  'link',
  'textbox',
  'checkbox',
  'radio',
  'combobox',
  'listbox',
  'option',
  'menuitem',
  'menuitemcheckbox',
  'menuitemradio',
  'tab',
  'searchbox',
  'spinbutton',
  'slider',
  'switch',
  'treeitem',
]);

function mapRoleToType(role: string): ElementType {
  const mapping: Record<string, ElementType> = {
    'button': 'button',
    'link': 'link',
    'textbox': 'input-text',
    'searchbox': 'input-search',
    'checkbox': 'checkbox',
    'radio': 'radio',
    'combobox': 'select',
    'listbox': 'select',
    'option': 'other',
    'menuitem': 'button',
    'menuitemcheckbox': 'checkbox',
    'menuitemradio': 'radio',
    'tab': 'button',
    'spinbutton': 'input-text',
    'slider': 'other',
    'switch': 'checkbox',
    'treeitem': 'other',
  };
  return mapping[role] || 'other';
}

// ============================================================================
// Name Cleaning
// ============================================================================

/**
 * Clean duplicated names that sometimes appear in accessibility trees
 * E.g., "ExploreExplore" -> "Explore", "HomeHome" -> "Home"
 */
function cleanDuplicatedName(name: string): string {
  if (!name || name.length < 2) return name;

  const trimmed = name.trim();
  const len = trimmed.length;

  // Check if the string is exactly twice the same substring
  if (len % 2 === 0) {
    const half = len / 2;
    const firstHalf = trimmed.substring(0, half);
    const secondHalf = trimmed.substring(half);

    if (firstHalf === secondHalf) {
      console.log(`[DOM Extractor] Cleaned duplicate name: "${trimmed}" -> "${firstHalf}"`);
      return firstHalf;
    }
  }

  return trimmed;
}

// ============================================================================
// Selector Building
// ============================================================================

function buildAccessibleSelector(node: AccessibilityNode): string {
  // Use Playwright's role selector format - more robust than CSS
  // Clean potential duplicate names from accessibility tree
  const cleanedName = cleanDuplicatedName(node.name);
  const name = cleanedName.replace(/"/g, '\\"');
  return `role=${node.role}[name="${name}"]`;
}

// ============================================================================
// Element Extraction from Accessibility Tree
// ============================================================================

function extractInteractiveElements(
  node: AccessibilityNode | null,
  elements: ActionableElement[] = [],
  index = { value: 0 }
): ActionableElement[] {
  if (!node) return elements;

  // Check if this node is interactive AND has a name
  // Nameless elements (icon buttons) will be captured by CSS supplement
  if (INTERACTIVE_ROLES.has(node.role) && node.name && node.name.trim()) {
    // Detect input type from role or context
    let elementType = mapRoleToType(node.role);
    const displayName = cleanDuplicatedName(node.name);

    // Refine textbox types based on name hints
    if (node.role === 'textbox') {
      const nameLower = displayName.toLowerCase();
      if (nameLower.includes('password') || nameLower.includes('contraseña')) {
        elementType = 'input-password';
      } else if (nameLower.includes('email') || nameLower.includes('correo')) {
        elementType = 'input-email';
      } else if (nameLower.includes('search') || nameLower.includes('buscar')) {
        elementType = 'input-search';
      }
    }

    elements.push({
      id: `e${index.value++}`,
      type: elementType,
      text: displayName.slice(0, 100), // Limit text length
      location: { region: 'unknown' as PageRegion }, // Simplified - screenshot provides visual context
      state: {
        visible: true, // Accessibility tree only contains visible elements
        enabled: !node.disabled,
        focused: node.focused,
      },
      selector: buildAccessibleSelector(node),
      attributes: {},
    });
  }

  // Recursively process children
  if (node.children) {
    for (const child of node.children) {
      extractInteractiveElements(child, elements, index);
    }
  }

  return elements;
}

// ============================================================================
// Fallback: CSS-based extraction (used if accessibility API unavailable)
// ============================================================================

function extractDOMInBrowser(): Array<{
  type: string;
  text: string;
  region: string;
  visible: boolean;
  enabled: boolean;
  selector: string;
  attributes: {
    href?: string;
    placeholder?: string;
    ariaLabel?: string;
  };
}> {
  const result: Array<{
    type: string;
    text: string;
    region: string;
    visible: boolean;
    enabled: boolean;
    selector: string;
    attributes: {
      href?: string;
      placeholder?: string;
      ariaLabel?: string;
    };
  }> = [];

  // Broader selectors to capture more interactive elements
  const actionableSelectors = [
    'button',
    'a',  // All links, not just a[href]
    'input:not([type="hidden"])',
    'textarea',
    'select',
    '[role="button"]',
    '[role="link"]',
    '[role="checkbox"]',
    '[role="radio"]',
    '[role="tab"]',
    '[role="menuitem"]',
    '[role="option"]',
    '[role="switch"]',
    '[onclick]',
    '[tabindex]:not([tabindex="-1"])',
  ].join(', ');

  const elements = document.querySelectorAll(actionableSelectors);

  // Also find elements that LOOK clickable (cursor: pointer) but aren't semantic
  // This catches React/Vue apps that use divs/spans with onClick
  const allElements = document.querySelectorAll('span, div, p, label');
  const clickableByStyle: Element[] = [];

  allElements.forEach((el) => {
    const style = window.getComputedStyle(el);
    const rect = el.getBoundingClientRect();

    // Skip if already matched by semantic selectors
    if (el.matches(actionableSelectors)) return;

    // Check if it looks clickable
    const hasPointerCursor = style.cursor === 'pointer';

    // Must have text and be visible
    const text = el.textContent?.trim();
    const isVisible = rect.width > 0 && rect.height > 0 &&
                      style.display !== 'none' &&
                      style.visibility !== 'hidden';

    // Must be a leaf-ish element (not a huge container)
    const isLeafLike = rect.width < 500 && rect.height < 100;

    if (hasPointerCursor && text && isVisible && isLeafLike && text.length < 100) {
      // Check it's not nested inside another clickable
      const parent = el.parentElement;
      const parentClickable = parent?.matches(actionableSelectors) ||
                             window.getComputedStyle(parent!).cursor === 'pointer';
      if (!parentClickable) {
        clickableByStyle.push(el);
      }
    }
  });

  // Combine both sets
  const allInteractive = [...Array.from(elements), ...clickableByStyle];

  allInteractive.forEach((el) => {
    // Check visibility
    const rect = el.getBoundingClientRect();
    const style = window.getComputedStyle(el);
    const isVisible =
      rect.width > 0 &&
      rect.height > 0 &&
      style.display !== 'none' &&
      style.visibility !== 'hidden' &&
      style.opacity !== '0';

    if (!isVisible) return; // Skip hidden elements

    // Check if enabled
    const isEnabled = !(el as HTMLInputElement).disabled;

    // Get element info
    const tagName = el.tagName.toLowerCase();
    const type = (el as HTMLInputElement).type;
    const role = el.getAttribute('role');

    // Determine region
    let region = 'unknown';
    const parent = el.closest('header, nav, main, aside, footer, [role="dialog"]');
    if (parent) {
      const parentTag = parent.tagName.toLowerCase();
      const parentRole = parent.getAttribute('role');
      if (parentTag === 'header' || parentRole === 'banner') region = 'header';
      else if (parentTag === 'nav' || parentRole === 'navigation') region = 'nav';
      else if (parentTag === 'main' || parentRole === 'main') region = 'main';
      else if (parentTag === 'aside') region = 'sidebar';
      else if (parentTag === 'footer') region = 'footer';
      else if (parentRole === 'dialog') region = 'modal';
    }

    // Get text label - check multiple sources
    let text = '';
    let hasRealLabel = false;  // Track if text came from actual label (for selector generation)
    const ariaLabel = el.getAttribute('aria-label');
    const ariaLabelledBy = el.getAttribute('aria-labelledby');
    const placeholder = el.getAttribute('placeholder');
    const title = el.getAttribute('title');
    const value = (el as HTMLInputElement).value;

    if (ariaLabel) {
      text = ariaLabel;
      hasRealLabel = true;
    } else if (ariaLabelledBy) {
      const labelEl = document.getElementById(ariaLabelledBy);
      if (labelEl) {
        text = labelEl.textContent?.trim() || '';
        hasRealLabel = !!text;
      }
    } else if (placeholder) {
      text = placeholder;
      hasRealLabel = true;
    } else if (title) {
      text = title;
      hasRealLabel = true;
    } else {
      text = el.textContent?.trim() || '';
      hasRealLabel = !!text;
    }

    // For inputs with no visible text, use the value or a type description
    if (!text && tagName === 'input') {
      if (value) {
        text = value;
        hasRealLabel = false;  // Value isn't a label
      } else {
        text = `${type || 'text'} input`;
        hasRealLabel = false;
      }
    }

    // For buttons without text (icon buttons), generate descriptive name
    if (!text && (tagName === 'button' || role === 'button')) {
      // Check if it contains an SVG (common for icon buttons)
      const hasSvg = el.querySelector('svg') !== null;
      const hasImg = el.querySelector('img') !== null;

      if (hasSvg || hasImg) {
        // Try to determine button purpose from context
        const parentText = el.parentElement?.textContent?.trim().slice(0, 30) || '';
        const nearbyInput = el.closest('form')?.querySelector('input, textarea');

        if (nearbyInput) {
          text = 'send button';  // Button near input is likely send/submit
        } else if (parentText) {
          text = `${parentText} icon button`;
        } else {
          text = 'icon button';
        }
      } else {
        text = 'button';
      }
      hasRealLabel = false;  // Synthetic name
    }

    // For links without text (icon links)
    if (!text && (tagName === 'a' || role === 'link')) {
      text = 'icon link';
      hasRealLabel = false;
    }

    // Normalize text - remove excessive whitespace for cleaner display and selectors
    text = text.replace(/\s+/g, ' ').trim().slice(0, 100);

    // Skip elements with no meaningful text (after all fallbacks)
    if (!text) return;

    // Generate unique selector
    let selector = '';

    // Use normalized text for selectors
    const normalizedText = text;

    // Standard interactive ARIA roles that work reliably with role= selectors
    const standardInteractiveRoles = ['button', 'link', 'checkbox', 'radio', 'tab', 'menuitem', 'option', 'switch', 'textbox', 'combobox', 'listbox'];

    if (el.id) {
      // Prefer ID-based selector as it's most reliable
      // Use CSS.escape() to handle special characters in IDs (e.g., React's useId() generates ":r3s:")
      // Include tag name to make selector more specific (avoids duplicate ID issues in React portals)
      selector = `${tagName}#${CSS.escape(el.id)}`;
    } else if (role && normalizedText && hasRealLabel && standardInteractiveRoles.includes(role) && normalizedText.length < 50) {
      // Use role-based selector only for standard interactive roles with clean text
      const escapedName = normalizedText.replace(/"/g, '\\"');
      selector = `role=${role}[name="${escapedName}"]`;
    } else if ((tagName === 'span' || tagName === 'div' || tagName === 'p') &&
               normalizedText && normalizedText.length < 50 && style.cursor === 'pointer') {
      // For clickable text elements without semantic markup, use text selector
      const escapedText = normalizedText.replace(/"/g, '\\"');
      selector = `text="${escapedText}"`;
    } else {
      // Build a path-based selector
      const path: string[] = [];
      let current: Element | null = el;
      while (current && current !== document.body) {
        let segment = current.tagName.toLowerCase();
        if (current.id) {
          // Use CSS.escape() for IDs with special characters
          // Include tag name to avoid duplicate ID issues
          segment = `${current.tagName.toLowerCase()}#${CSS.escape(current.id)}`;
          path.unshift(segment);
          break;
        }
        const siblings = current.parentElement?.children || [];
        const index = Array.from(siblings).indexOf(current);
        if (siblings.length > 1) {
          segment += `:nth-child(${index + 1})`;
        }
        path.unshift(segment);
        current = current.parentElement;
      }
      selector = path.join(' > ');
    }

    // Determine element type
    let elementType = 'other';
    if (tagName === 'button' || role === 'button' || type === 'submit' || type === 'button') {
      elementType = 'button';
    } else if (tagName === 'a' || role === 'link') {
      elementType = 'link';
    } else if (tagName === 'input') {
      if (type === 'checkbox' || role === 'checkbox') elementType = 'checkbox';
      else if (type === 'radio' || role === 'radio') elementType = 'radio';
      else if (type === 'password') elementType = 'input-password';
      else if (type === 'email') elementType = 'input-email';
      else if (type === 'search') elementType = 'input-search';
      else elementType = 'input-text';
    } else if (tagName === 'textarea') {
      elementType = 'textarea';
    } else if (tagName === 'select') {
      elementType = 'select';
    } else if (role === 'tab') {
      elementType = 'button';
    } else if (role === 'switch') {
      elementType = 'checkbox';
    } else if ((tagName === 'span' || tagName === 'div' || tagName === 'p') && style.cursor === 'pointer') {
      // Clickable span/div - determine if it's link-like or button-like
      const textLower = text.toLowerCase();
      if (textLower.includes('cuenta') || textLower.includes('registro') ||
          textLower.includes('sign') || textLower.includes('login') ||
          textLower.includes('link') || textLower.includes('more') ||
          textLower.includes('ver más') || textLower.includes('leer')) {
        elementType = 'link';
      } else {
        elementType = 'button';
      }
    }

    result.push({
      type: elementType,
      text,
      region,
      visible: isVisible,
      enabled: isEnabled,
      selector,
      attributes: {
        href: el.getAttribute('href') || undefined,
        placeholder: placeholder || undefined,
        ariaLabel: ariaLabel || undefined,
      },
    });
  });

  return result;
}

// ============================================================================
// Public API
// ============================================================================

export async function extractDOM(page: Page): Promise<StructuredDOM> {
  const url = page.url();
  const title = await page.title();

  let elements: ActionableElement[] = [];
  let usedAccessibility = false;

  // Try accessibility tree first (more robust)
  try {
    const pageAny = page as any;
    if (pageAny.accessibility && typeof pageAny.accessibility.snapshot === 'function') {
      const accessibilityTree = await pageAny.accessibility.snapshot({
        interestingOnly: true,
      }) as AccessibilityNode | null;

      elements = extractInteractiveElements(accessibilityTree);
      usedAccessibility = true;
      console.log(`[DOM Extractor] Accessibility tree: ${elements.length} elements`);
    } else {
      throw new Error('Accessibility API not available');
    }
  } catch (error) {
    // Pure fallback to CSS-based extraction
    console.log('[DOM Extractor] Accessibility API unavailable, using CSS fallback');
  }

  // Always supplement with CSS extraction to catch:
  // - Icon buttons without aria-labels
  // - Overlay menus not in accessibility tree
  // - Clickable divs/spans in React/Vue apps
  const cssExtracted = await page.evaluate(extractDOMInBrowser);
  console.log(`[DOM Extractor] CSS scan found: ${cssExtracted.length} elements`);

  if (!usedAccessibility) {
    // Pure CSS fallback
    elements = cssExtracted.map((el, index) => ({
      id: `e${index}`,
      type: el.type as ElementType,
      text: el.text,
      location: { region: el.region as PageRegion },
      state: {
        visible: el.visible,
        enabled: el.enabled,
      },
      selector: el.selector,
      attributes: el.attributes,
    }));
  } else {
    // Merge CSS results with accessibility results
    // Add CSS elements that aren't already captured (by comparing text/selector)
    const existingTexts = new Set(elements.map(e => e.text.toLowerCase()));
    const existingSelectors = new Set(elements.map(e => e.selector));

    let addedFromCss = 0;
    for (const cssEl of cssExtracted) {
      const textLower = cssEl.text.toLowerCase();
      // Skip if we already have this element (by text or selector)
      if (existingTexts.has(textLower) || existingSelectors.has(cssEl.selector)) {
        continue;
      }
      // Add unique elements from CSS extraction
      elements.push({
        id: `e${elements.length}`,
        type: cssEl.type as ElementType,
        text: cssEl.text,
        location: { region: cssEl.region as PageRegion },
        state: {
          visible: cssEl.visible,
          enabled: cssEl.enabled,
        },
        selector: cssEl.selector,
        attributes: cssEl.attributes,
      });
      existingTexts.add(textLower);
      existingSelectors.add(cssEl.selector);
      addedFromCss++;
    }
    if (addedFromCss > 0) {
      console.log(`[DOM Extractor] Added ${addedFromCss} elements from CSS supplement`);
    }
  }

  // Log extraction results for debugging
  if (elements.length > 0) {
    console.log('[DOM Extractor] Elements:');
    for (const el of elements.slice(0, 10)) {
      const stateInfo = [];
      if (!el.state.enabled) stateInfo.push('disabled');
      if (el.state.focused) stateInfo.push('focused');
      const stateStr = stateInfo.length > 0 ? ` (${stateInfo.join(', ')})` : '';
      console.log(`  ${el.id}: [${el.type}] "${el.text}"${stateStr}`);
    }
    if (elements.length > 10) {
      console.log(`  ... and ${elements.length - 10} more elements`);
    }
  }

  return {
    metadata: {
      title,
      url,
      timestamp: Date.now(),
    },
    elements,
    textRegions: [],
    navigation: [],
  };
}

/**
 * Count approximate tokens for the DOM snapshot
 */
export function estimateTokens(dom: StructuredDOM): number {
  let chars = 0;

  chars += dom.metadata.title.length + dom.metadata.url.length;

  for (const el of dom.elements) {
    chars += el.id.length + el.type.length + el.text.length + 50;
  }

  for (const tr of dom.textRegions) {
    chars += tr.summary.length + 20;
  }

  for (const nav of dom.navigation) {
    chars += nav.text.length + 20;
  }

  return Math.ceil(chars / 4);
}

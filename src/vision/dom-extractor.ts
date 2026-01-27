/**
 * DOM Extractor - Extracts structured, token-efficient DOM representation
 *
 * Note: extractDOMInBrowser runs in browser context via page.evaluate()
 */

/// <reference lib="dom" />

import type { Page } from 'playwright';
import type {
  StructuredDOM,
  ActionableElement,
  TextRegion,
  NavigationElement,
  ElementType,
  PageRegion,
} from '../core/types.js';

// ============================================================================
// Main Extraction Function (runs in browser context via page.evaluate)
// ============================================================================

function extractDOMInBrowser(): {
  elements: Array<{
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
  }>;
  textRegions: Array<{
    region: string;
    text: string;
    wordCount: number;
  }>;
  navigation: Array<{
    text: string;
    href?: string;
    isCurrent: boolean;
  }>;
} {
  const result = {
    elements: [] as Array<{
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
    }>,
    textRegions: [] as Array<{
      region: string;
      text: string;
      wordCount: number;
    }>,
    navigation: [] as Array<{
      text: string;
      href?: string;
      isCurrent: boolean;
    }>,
  };

  // Selectors for actionable elements
  const actionableSelectors = [
    'button',
    'a[href]',
    'input:not([type="hidden"])',
    'textarea',
    'select',
    '[role="button"]',
    '[role="link"]',
    '[role="checkbox"]',
    '[role="radio"]',
    '[onclick]',
    '[tabindex]:not([tabindex="-1"])',
  ].join(', ');

  // Extract actionable elements
  const elements = document.querySelectorAll(actionableSelectors);

  elements.forEach((el) => {
    // Check visibility
    const rect = el.getBoundingClientRect();
    const style = window.getComputedStyle(el);
    const isVisible =
      rect.width > 0 &&
      rect.height > 0 &&
      style.display !== 'none' &&
      style.visibility !== 'hidden' &&
      style.opacity !== '0';

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

    // Get text label
    let text = '';
    const ariaLabel = el.getAttribute('aria-label');
    const placeholder = el.getAttribute('placeholder');
    const title = el.getAttribute('title');

    if (ariaLabel) {
      text = ariaLabel;
    } else if (placeholder) {
      text = placeholder;
    } else if (title) {
      text = title;
    } else {
      text = el.textContent?.trim() || '';
    }
    text = text.slice(0, 100);

    // Generate unique selector
    let selector = '';
    if (el.id) {
      selector = `#${el.id}`;
    } else {
      // Build a path-based selector
      const path: string[] = [];
      let current: Element | null = el;
      while (current && current !== document.body) {
        let segment = current.tagName.toLowerCase();
        if (current.id) {
          segment = `#${current.id}`;
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
    } else if (tagName === 'a') {
      elementType = 'link';
    } else if (tagName === 'input') {
      if (type === 'checkbox') elementType = 'checkbox';
      else if (type === 'radio') elementType = 'radio';
      else if (type === 'password') elementType = 'input-password';
      else if (type === 'email') elementType = 'input-email';
      else if (type === 'search') elementType = 'input-search';
      else elementType = 'input-text';
    } else if (tagName === 'textarea') {
      elementType = 'textarea';
    } else if (tagName === 'select') {
      elementType = 'select';
    }

    result.elements.push({
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

  // Extract text regions (summarized)
  const regions = ['header', 'main', 'nav', 'aside', 'footer'];
  regions.forEach((regionName) => {
    const regionEl = document.querySelector(regionName) ||
      document.querySelector(`[role="${regionName === 'aside' ? 'complementary' : regionName}"]`);

    if (regionEl) {
      const text = regionEl.textContent?.trim() || '';
      const words = text.split(/\s+/).filter(w => w.length > 0);

      if (words.length > 0) {
        // Create summary (first 50 words)
        const summary = words.slice(0, 50).join(' ') + (words.length > 50 ? '...' : '');

        result.textRegions.push({
          region: regionName,
          text: summary,
          wordCount: words.length,
        });
      }
    }
  });

  // Extract navigation links
  const navElements = document.querySelectorAll('nav a, [role="navigation"] a');
  navElements.forEach((el) => {
    const text = el.textContent?.trim() || '';
    const href = el.getAttribute('href');
    const isCurrent =
      el.getAttribute('aria-current') === 'page' ||
      el.classList.contains('active') ||
      el.classList.contains('current');

    if (text) {
      result.navigation.push({
        text: text.slice(0, 50),
        href: href || undefined,
        isCurrent,
      });
    }
  });

  return result;
}

// ============================================================================
// Public API
// ============================================================================

export async function extractDOM(page: Page): Promise<StructuredDOM> {
  const url = page.url();
  const title = await page.title();

  // Run extraction in browser context
  const extracted = await page.evaluate(extractDOMInBrowser);

  // Assign IDs to elements
  const elements: ActionableElement[] = extracted.elements.map((el, index) => ({
    id: `e${index}`,
    type: el.type as ElementType,
    text: el.text,
    location: {
      region: el.region as PageRegion,
    },
    state: {
      visible: el.visible,
      enabled: el.enabled,
    },
    selector: el.selector,
    attributes: el.attributes,
  }));

  // Map text regions
  const textRegions: TextRegion[] = extracted.textRegions.map((tr, index) => ({
    id: `t${index}`,
    region: tr.region as PageRegion,
    summary: tr.text,
    wordCount: tr.wordCount,
  }));

  // Map navigation
  const navigation: NavigationElement[] = extracted.navigation.map((nav, index) => ({
    id: `n${index}`,
    text: nav.text,
    href: nav.href,
    isCurrent: nav.isCurrent,
  }));

  return {
    metadata: {
      title,
      url,
      timestamp: Date.now(),
    },
    elements,
    textRegions,
    navigation,
  };
}

/**
 * Count approximate tokens for the DOM snapshot
 */
export function estimateTokens(dom: StructuredDOM): number {
  // Rough estimation: ~4 chars per token
  let chars = 0;

  chars += dom.metadata.title.length + dom.metadata.url.length;

  for (const el of dom.elements) {
    chars += el.id.length + el.type.length + el.text.length + 50; // overhead
  }

  for (const tr of dom.textRegions) {
    chars += tr.summary.length + 20;
  }

  for (const nav of dom.navigation) {
    chars += nav.text.length + 20;
  }

  return Math.ceil(chars / 4);
}

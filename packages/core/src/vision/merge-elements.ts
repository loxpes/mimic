/**
 * Merge Elements - Combine DOM and Vision elements with deduplication
 *
 * Merges elements from DOM extraction and vision analysis, deduplicating
 * by position proximity. DOM elements provide selectors, vision elements
 * provide better names for icon buttons.
 */

import type { UnifiedElement } from '@testfarm/shared';

// ============================================================================
// Types
// ============================================================================

export interface MergeOptions {
  /** Pixel threshold for considering elements as the same (default: 30) */
  threshold?: number;
  /** Prefer vision names over DOM names when both exist (default: true) */
  preferVisionNames?: boolean;
}

export interface MergeResult {
  elements: UnifiedElement[];
  stats: {
    domOnly: number;
    visionOnly: number;
    merged: number;
    total: number;
  };
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Calculate Euclidean distance between two element centers
 */
function distance(a: UnifiedElement, b: UnifiedElement): number {
  return Math.sqrt(Math.pow(a.x - b.x, 2) + Math.pow(a.y - b.y, 2));
}

/**
 * Check if two elements overlap significantly
 */
function overlaps(a: UnifiedElement, b: UnifiedElement): boolean {
  // Calculate overlap area
  const xOverlap = Math.max(0,
    Math.min(a.x + a.width / 2, b.x + b.width / 2) -
    Math.max(a.x - a.width / 2, b.x - b.width / 2)
  );
  const yOverlap = Math.max(0,
    Math.min(a.y + a.height / 2, b.y + b.height / 2) -
    Math.max(a.y - a.height / 2, b.y - b.height / 2)
  );

  const overlapArea = xOverlap * yOverlap;
  const minArea = Math.min(a.width * a.height, b.width * b.height);

  // Consider overlapping if overlap is more than 30% of smaller element
  return overlapArea > minArea * 0.3;
}

/**
 * Determine if vision name is better than DOM name
 * Vision names are often better for icon buttons without text
 */
function isBetterName(visionName: string, domName: string): boolean {
  // If DOM name is very short or generic, vision is probably better
  const genericPatterns = [
    /^icon$/i,
    /^button$/i,
    /^image$/i,
    /^img$/i,
    /^\s*$/,
    /^[a-f0-9-]{36}$/i, // UUID
  ];

  const isDomGeneric = genericPatterns.some(p => p.test(domName));
  if (isDomGeneric) return true;

  // If vision name is more descriptive (longer), prefer it
  if (visionName.length > domName.length + 3) return true;

  return false;
}

// ============================================================================
// Main Functions
// ============================================================================

/**
 * Merge DOM elements with vision elements, deduplicating by position
 *
 * @param domElements - Elements extracted from DOM
 * @param visionElements - Elements extracted from vision analysis
 * @param options - Merge options
 * @returns Merged and deduplicated element list
 */
export function mergeElements(
  domElements: UnifiedElement[],
  visionElements: UnifiedElement[],
  options: MergeOptions = {}
): MergeResult {
  const {
    threshold = 30,
    preferVisionNames = true,
  } = options;

  const merged: UnifiedElement[] = [];
  const usedVisionIndices = new Set<number>();

  let domOnlyCount = 0;
  let mergedCount = 0;

  // Process each DOM element
  for (const dom of domElements) {
    // Find matching vision element by proximity and overlap
    let bestMatch: { element: UnifiedElement; index: number; dist: number } | null = null;

    for (let i = 0; i < visionElements.length; i++) {
      if (usedVisionIndices.has(i)) continue;

      const vision = visionElements[i];
      const dist = distance(dom, vision);

      // Check if within threshold distance
      if (dist < threshold) {
        if (!bestMatch || dist < bestMatch.dist) {
          bestMatch = { element: vision, index: i, dist };
        }
      }
      // Also check for overlap even if centers are far
      else if (overlaps(dom, vision) && !bestMatch) {
        bestMatch = { element: vision, index: i, dist };
      }
    }

    if (bestMatch) {
      // Merge DOM and vision elements
      usedVisionIndices.add(bestMatch.index);
      mergedCount++;

      const useBetterName = preferVisionNames &&
        isBetterName(bestMatch.element.name, dom.name);

      merged.push({
        ...dom,
        name: useBetterName ? bestMatch.element.name : dom.name,
        source: 'both',
      });
    } else {
      // DOM only element
      domOnlyCount++;
      merged.push({ ...dom, source: 'dom' });
    }
  }

  // Add remaining vision-only elements
  const visionOnly: UnifiedElement[] = [];
  for (let i = 0; i < visionElements.length; i++) {
    if (!usedVisionIndices.has(i)) {
      visionOnly.push({
        ...visionElements[i],
        source: 'vision',
      });
    }
  }

  // Combine all elements
  merged.push(...visionOnly);

  // Reassign sequential IDs
  const result: UnifiedElement[] = merged.map((el, index) => ({
    ...el,
    id: `el_${index + 1}`,
  }));

  return {
    elements: result,
    stats: {
      domOnly: domOnlyCount,
      visionOnly: visionOnly.length,
      merged: mergedCount,
      total: result.length,
    },
  };
}

/**
 * Convert PageElement from read_page to UnifiedElement
 */
export function pageElementToUnified(
  element: {
    ref: string;
    role: string;
    name: string;
    value?: string;
    backendNodeId: number;
    bbox: {
      x: number;
      y: number;
      width: number;
      height: number;
      centerX: number;
      centerY: number;
    };
    state: {
      disabled: boolean;
    };
    attributes?: {
      id?: string;
      className?: string;
      dataTestId?: string;
      type?: string;
      tagName?: string;
    };
  },
  selector?: string
): UnifiedElement {
  // Map ARIA role to UnifiedElementType
  const roleToType: Record<string, UnifiedElement['type']> = {
    button: 'button',
    link: 'link',
    textbox: 'input',
    searchbox: 'input',
    spinbutton: 'input',
    checkbox: 'checkbox',
    radio: 'radio',
    combobox: 'select',
    listbox: 'select',
    switch: 'checkbox',
  };

  // Generate selector from attributes if not provided
  let generatedSelector = selector;
  if (!generatedSelector && element.attributes) {
    const { id, dataTestId, className, tagName } = element.attributes;
    if (dataTestId) {
      generatedSelector = `[data-testid="${dataTestId}"]`;
    } else if (id) {
      generatedSelector = `#${id}`;
    } else if (className && tagName) {
      // Use first meaningful class
      const firstClass = className.split(' ').find(c =>
        c && !c.startsWith('css-') && !c.match(/^[a-z]{1,2}\d/)
      );
      if (firstClass) {
        generatedSelector = `${tagName}.${firstClass}`;
      }
    }
  }

  return {
    id: element.ref,
    name: element.name,
    type: roleToType[element.role] || 'other',
    x: element.bbox.centerX,
    y: element.bbox.centerY,
    width: element.bbox.width,
    height: element.bbox.height,
    source: 'dom',
    selector: generatedSelector,
    value: element.value,
    disabled: element.state.disabled,
    role: element.role,
    backendNodeId: element.backendNodeId,
  };
}

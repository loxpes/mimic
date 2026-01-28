/**
 * Find Element - Search for elements by natural language query
 *
 * Provides flexible element search in the unified element list,
 * supporting exact match, partial match, and type-aware search.
 */

import type { UnifiedElement, UnifiedElementType } from '@testfarm/shared';

// ============================================================================
// Types
// ============================================================================

export interface FindOptions {
  /** Only search elements of this type */
  type?: UnifiedElementType;
  /** Only search elements from this source */
  source?: 'dom' | 'vision' | 'both';
  /** Exclude disabled elements (default: false) */
  excludeDisabled?: boolean;
}

export interface FindResult {
  element: UnifiedElement | null;
  confidence: 'exact' | 'partial' | 'fuzzy' | 'none';
  alternatives?: UnifiedElement[];
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Normalize text for comparison (lowercase, trim, remove extra spaces)
 */
function normalize(text: string): string {
  return text.toLowerCase().trim().replace(/\s+/g, ' ');
}

/**
 * Extract keywords from a query (removes common words)
 */
function extractKeywords(query: string): string[] {
  const stopWords = new Set([
    'the', 'a', 'an', 'el', 'la', 'los', 'las', 'un', 'una',
    'button', 'link', 'field', 'input', 'boton', 'botón', 'campo',
    'de', 'del', 'para', 'en', 'con', 'of', 'for', 'in', 'with',
  ]);

  return normalize(query)
    .split(' ')
    .filter(word => word.length > 1 && !stopWords.has(word));
}

/**
 * Calculate similarity score between query and element name
 * Returns a score from 0 to 1
 */
function similarity(query: string, elementName: string): number {
  const queryNorm = normalize(query);
  const nameNorm = normalize(elementName);

  // Exact match
  if (queryNorm === nameNorm) return 1.0;

  // Element name contains query
  if (nameNorm.includes(queryNorm)) return 0.9;

  // Query contains element name
  if (queryNorm.includes(nameNorm)) return 0.8;

  // Keyword matching
  const queryKeywords = extractKeywords(query);
  const nameKeywords = extractKeywords(elementName);

  if (queryKeywords.length === 0 || nameKeywords.length === 0) {
    return 0;
  }

  // Count matching keywords
  let matches = 0;
  for (const qk of queryKeywords) {
    for (const nk of nameKeywords) {
      if (nk.includes(qk) || qk.includes(nk)) {
        matches++;
        break;
      }
    }
  }

  return matches / Math.max(queryKeywords.length, nameKeywords.length) * 0.7;
}

/**
 * Parse type from query string
 */
function extractTypeFromQuery(query: string): UnifiedElementType | null {
  const typeMappings: Record<string, UnifiedElementType> = {
    'button': 'button',
    'botón': 'button',
    'boton': 'button',
    'btn': 'button',
    'link': 'link',
    'enlace': 'link',
    'input': 'input',
    'field': 'input',
    'campo': 'input',
    'textbox': 'input',
    'checkbox': 'checkbox',
    'check': 'checkbox',
    'select': 'select',
    'dropdown': 'select',
    'radio': 'radio',
  };

  const queryLower = query.toLowerCase();
  for (const [keyword, type] of Object.entries(typeMappings)) {
    if (queryLower.includes(keyword)) {
      return type;
    }
  }

  return null;
}

// ============================================================================
// Main Functions
// ============================================================================

/**
 * Find an element by natural language query
 *
 * Supports queries like:
 * - "send button" - finds button with "send" in name
 * - "email field" - finds input with "email" in name
 * - "submit" - finds any element with "submit" in name
 * - "el_5" - finds element by ID
 *
 * @param elements - List of unified elements to search
 * @param query - Natural language search query
 * @param options - Search options
 * @returns The best matching element or null
 */
export function findElement(
  elements: UnifiedElement[],
  query: string,
  options: FindOptions = {}
): FindResult {
  const { type, source, excludeDisabled = false } = options;

  // Filter elements by options
  let candidates = elements;

  if (type) {
    candidates = candidates.filter(e => e.type === type);
  }

  if (source) {
    candidates = candidates.filter(e => e.source === source);
  }

  if (excludeDisabled) {
    candidates = candidates.filter(e => !e.disabled);
  }

  if (candidates.length === 0) {
    return { element: null, confidence: 'none' };
  }

  const queryLower = normalize(query);

  // 1. Check for exact ID match (el_1, el_5, etc.)
  const idMatch = candidates.find(e => e.id === query || e.id === queryLower);
  if (idMatch) {
    return { element: idMatch, confidence: 'exact' };
  }

  // 2. Check for exact name match
  const exactMatch = candidates.find(e => normalize(e.name) === queryLower);
  if (exactMatch) {
    return { element: exactMatch, confidence: 'exact' };
  }

  // 3. Extract type hint from query and refine search
  const queryType = extractTypeFromQuery(query);
  if (queryType && !type) {
    candidates = candidates.filter(e => e.type === queryType);
    // Remove type keyword from query for better name matching
    const typeKeywords = ['button', 'botón', 'boton', 'link', 'enlace', 'input', 'field', 'campo', 'checkbox', 'select', 'dropdown', 'radio'];
    const cleanQuery = queryLower.split(' ').filter(w => !typeKeywords.includes(w)).join(' ');
    if (cleanQuery.trim()) {
      const nameMatch = candidates.find(e => normalize(e.name).includes(cleanQuery.trim()));
      if (nameMatch) {
        return { element: nameMatch, confidence: 'partial' };
      }
    }
  }

  // 4. Partial name match
  const partialMatch = candidates.find(e => normalize(e.name).includes(queryLower));
  if (partialMatch) {
    return { element: partialMatch, confidence: 'partial' };
  }

  // 5. Query contains element name
  const reverseMatch = candidates.find(e => queryLower.includes(normalize(e.name)));
  if (reverseMatch) {
    return { element: reverseMatch, confidence: 'partial' };
  }

  // 6. Fuzzy matching with similarity scoring
  const scored = candidates
    .map(e => ({ element: e, score: similarity(query, e.name) }))
    .filter(s => s.score > 0.3)
    .sort((a, b) => b.score - a.score);

  if (scored.length > 0) {
    return {
      element: scored[0].element,
      confidence: 'fuzzy',
      alternatives: scored.slice(1, 4).map(s => s.element),
    };
  }

  return { element: null, confidence: 'none' };
}

/**
 * Find all elements matching a query
 */
export function findAllElements(
  elements: UnifiedElement[],
  query: string,
  options: FindOptions = {}
): UnifiedElement[] {
  const { type, source, excludeDisabled = false } = options;

  let candidates = elements;

  if (type) {
    candidates = candidates.filter(e => e.type === type);
  }

  if (source) {
    candidates = candidates.filter(e => e.source === source);
  }

  if (excludeDisabled) {
    candidates = candidates.filter(e => !e.disabled);
  }

  // Return all elements that match the query
  return candidates
    .map(e => ({ element: e, score: similarity(query, e.name) }))
    .filter(s => s.score > 0.3)
    .sort((a, b) => b.score - a.score)
    .map(s => s.element);
}

/**
 * Find element by position (nearest to coordinates)
 */
export function findElementByPosition(
  elements: UnifiedElement[],
  x: number,
  y: number,
  maxDistance: number = 50
): UnifiedElement | null {
  let nearest: UnifiedElement | null = null;
  let minDist = Infinity;

  for (const el of elements) {
    const dist = Math.sqrt(Math.pow(el.x - x, 2) + Math.pow(el.y - y, 2));
    if (dist < minDist && dist <= maxDistance) {
      minDist = dist;
      nearest = el;
    }
  }

  return nearest;
}

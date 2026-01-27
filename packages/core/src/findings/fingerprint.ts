/**
 * Fingerprint generation for finding deduplication
 */

import { createHash } from 'crypto';
import type { FindingType, FindingSeverity } from '@testfarm/shared';

export interface FingerprintInput {
  type: FindingType;
  severity: FindingSeverity;
  description: string;
  url: string;
  elementId?: string;
}

/**
 * Normalizes a URL by removing dynamic parameters (session, tracking, etc.)
 */
export function normalizeUrl(url: string): string {
  try {
    const parsed = new URL(url);

    // Parameters to remove (common session/tracking params)
    const paramsToRemove = [
      'sid',
      'session',
      'sessionid',
      'token',
      'ref',
      'source',
      'fbclid',
      'gclid',
      '_ga',
      '_gl',
      'mc_cid',
      'mc_eid',
    ];

    // Remove exact matches
    paramsToRemove.forEach((param) => {
      parsed.searchParams.delete(param);
    });

    // Remove UTM parameters (utm_*)
    [...parsed.searchParams.keys()]
      .filter((k) => k.startsWith('utm_'))
      .forEach((k) => parsed.searchParams.delete(k));

    // Sort remaining parameters for consistency
    parsed.searchParams.sort();

    // Return normalized URL without trailing slash
    const result = `${parsed.origin}${parsed.pathname}${parsed.search}`;
    return result.endsWith('/') ? result.slice(0, -1) : result;
  } catch {
    // If URL parsing fails, return as-is
    return url;
  }
}

/**
 * Normalizes a description for comparison:
 * - Lowercase
 * - Replace specific numbers (IDs, timestamps) with placeholders
 * - Normalize whitespace
 */
export function normalizeDescription(description: string): string {
  return (
    description
      .toLowerCase()
      // Replace timestamps (10+ digit numbers)
      .replace(/\d{10,}/g, '[TIMESTAMP]')
      // Replace hex hashes (8+ chars)
      .replace(/[a-f0-9]{8,}/gi, '[HASH]')
      // Replace UUIDs
      .replace(
        /[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/gi,
        '[UUID]'
      )
      // Replace numbers with 4+ digits (likely IDs)
      .replace(/\b\d{4,}\b/g, '[ID]')
      // Normalize whitespace
      .replace(/\s+/g, ' ')
      .trim()
  );
}

/**
 * Generates a unique fingerprint for a finding
 */
export function generateFingerprint(input: FingerprintInput): string {
  const normalized = {
    type: input.type,
    severity: input.severity,
    description: normalizeDescription(input.description),
    url: normalizeUrl(input.url),
    elementId: input.elementId || '',
  };

  const data = JSON.stringify(normalized);
  return createHash('sha256').update(data).digest('hex').substring(0, 16);
}

/**
 * Calculates Levenshtein distance between two strings
 */
function levenshteinDistance(s1: string, s2: string): number {
  const len1 = s1.length;
  const len2 = s2.length;

  // Use a single array for space optimization
  const prev = Array.from({ length: len2 + 1 }, (_, i) => i);
  const curr = new Array<number>(len2 + 1);

  for (let i = 1; i <= len1; i++) {
    curr[0] = i;

    for (let j = 1; j <= len2; j++) {
      const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
      curr[j] = Math.min(
        prev[j] + 1, // deletion
        curr[j - 1] + 1, // insertion
        prev[j - 1] + cost // substitution
      );
    }

    // Swap arrays
    for (let j = 0; j <= len2; j++) {
      prev[j] = curr[j];
    }
  }

  return prev[len2];
}

/**
 * Calculates similarity between two descriptions (0-1)
 * Uses normalized Levenshtein distance
 */
export function descriptionSimilarity(desc1: string, desc2: string): number {
  const norm1 = normalizeDescription(desc1);
  const norm2 = normalizeDescription(desc2);

  if (norm1 === norm2) return 1;

  const maxLen = Math.max(norm1.length, norm2.length);
  if (maxLen === 0) return 1;

  const distance = levenshteinDistance(norm1, norm2);
  return 1 - distance / maxLen;
}

/**
 * Checks if two URLs match the same pattern (ignoring query params)
 */
export function urlPatternMatch(url1: string, url2: string): boolean {
  const norm1 = normalizeUrl(url1);
  const norm2 = normalizeUrl(url2);

  // Exact match after normalization
  if (norm1 === norm2) return true;

  try {
    const parsed1 = new URL(norm1);
    const parsed2 = new URL(norm2);

    // Same origin and pathname
    return parsed1.origin === parsed2.origin && parsed1.pathname === parsed2.pathname;
  } catch {
    return norm1 === norm2;
  }
}

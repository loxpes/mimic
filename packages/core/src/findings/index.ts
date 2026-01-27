/**
 * Findings module - deduplication and fingerprinting
 */

export {
  generateFingerprint,
  normalizeUrl,
  normalizeDescription,
  descriptionSimilarity,
  urlPatternMatch,
  type FingerprintInput,
} from './fingerprint.js';

export {
  checkAndDeduplicateFinding,
  loadKnownIssues,
  incrementSessionCount,
  type FindingInput,
} from './deduplication.js';

/**
 * Rating Utilities - Weighted score calculations for session chains
 */

import type { ChainScoreEntry, AggregatedScore } from '@testfarm/shared';

/**
 * Calculate weight for a session based on its position in the chain.
 * More recent sessions have higher weight using exponential decay.
 *
 * @param sessionIndex - Index of the session (0 = first/oldest)
 * @param totalSessions - Total number of sessions in the chain
 * @param decayFactor - How much older sessions are devalued (default 0.85 = 15% decay per position)
 * @returns Weight value between 0 and 1
 *
 * Example with 5 sessions and decay 0.85:
 * - Session 0 (oldest): 0.85^4 = 0.52
 * - Session 1: 0.85^3 = 0.61
 * - Session 2: 0.85^2 = 0.72
 * - Session 3: 0.85^1 = 0.85
 * - Session 4 (newest): 0.85^0 = 1.0
 */
export function calculateWeight(
  sessionIndex: number,
  totalSessions: number,
  decayFactor: number = 0.85
): number {
  // Position from end: newest = 0, oldest = totalSessions - 1
  const positionFromEnd = totalSessions - sessionIndex - 1;
  return Math.pow(decayFactor, positionFromEnd);
}

/**
 * Calculate weighted average from score entries.
 *
 * @param scores - Array of score entries with weights
 * @returns Weighted average rounded to 1 decimal place
 */
export function calculateWeightedAverage(
  scores: Array<{ score: number; weight: number }>
): number {
  if (scores.length === 0) return 0;

  const totalWeight = scores.reduce((sum, s) => sum + s.weight, 0);
  if (totalWeight === 0) return 0;

  const weightedSum = scores.reduce((sum, s) => sum + s.score * s.weight, 0);
  return Math.round((weightedSum / totalWeight) * 10) / 10;
}

/**
 * Determine the trend based on recent vs older scores.
 * Compares average of last 3 sessions with previous 3 sessions.
 *
 * @param scores - Array of score entries ordered by time (oldest first)
 * @returns Trend or null if not enough data
 */
export function calculateTrend(
  scores: Array<{ score: number; timestamp: number }>
): 'improving' | 'stable' | 'declining' | null {
  // Need at least 6 sessions for meaningful trend
  if (scores.length < 6) return null;

  // Get last 3 and previous 3 sessions
  const sorted = [...scores].sort((a, b) => a.timestamp - b.timestamp);
  const recent = sorted.slice(-3);
  const previous = sorted.slice(-6, -3);

  const recentAvg = recent.reduce((s, x) => s + x.score, 0) / 3;
  const previousAvg = previous.reduce((s, x) => s + x.score, 0) / 3;

  const diff = recentAvg - previousAvg;

  // Threshold of 0.5 points to determine trend
  if (diff > 0.5) return 'improving';
  if (diff < -0.5) return 'declining';
  return 'stable';
}

/**
 * Add a new score to the aggregated score and recalculate.
 *
 * @param current - Current aggregated score (or undefined for first session)
 * @param sessionId - ID of the session being added
 * @param score - Score for the session (1-10)
 * @param maxScoresKept - Maximum number of individual scores to keep (default 20)
 * @returns Updated aggregated score
 */
export function addScoreToAggregate(
  current: AggregatedScore | undefined | null,
  sessionId: string,
  score: number,
  maxScoresKept: number = 20
): AggregatedScore {
  const existingScores: ChainScoreEntry[] = current?.scores ?? [];

  // Add new score entry
  const newEntry: ChainScoreEntry = {
    sessionId,
    score,
    weight: 1, // Will be recalculated
    timestamp: Date.now(),
  };

  const allScores = [...existingScores, newEntry];

  // Recalculate weights for all scores
  const totalSessions = allScores.length;
  const scoredEntries = allScores.map((entry, index) => ({
    ...entry,
    weight: calculateWeight(index, totalSessions),
  }));

  // Calculate weighted average
  const weightedScore = calculateWeightedAverage(scoredEntries);

  // Calculate trend
  const trend = calculateTrend(scoredEntries);

  // Keep only the most recent scores
  const recentScores = scoredEntries.slice(-maxScoresKept);

  return {
    totalSessions,
    weightedScore,
    scores: recentScores,
    trend,
  };
}

/**
 * Merge memory arrays with deduplication, keeping most recent entries.
 *
 * @param existing - Existing array
 * @param newItems - New items to add
 * @param maxItems - Maximum items to keep (default 50)
 * @returns Merged array with unique items, trimmed to maxItems
 */
export function mergeMemoryArray(
  existing: string[],
  newItems: string[],
  maxItems: number = 50
): string[] {
  // Use Set for deduplication, preserving order
  const merged = [...existing];

  for (const item of newItems) {
    // Only add if not already present (case-insensitive check)
    const itemLower = item.toLowerCase();
    if (!merged.some((m) => m.toLowerCase() === itemLower)) {
      merged.push(item);
    }
  }

  // Keep most recent items if exceeding max
  return merged.slice(-maxItems);
}

/**
 * Merge visited pages arrays.
 *
 * @param existing - Existing visited pages
 * @param newPages - New pages visited
 * @returns Merged unique pages
 */
export function mergeVisitedPages(
  existing: string[],
  newPages: string[]
): string[] {
  const uniquePages = new Set([...existing, ...newPages]);
  return Array.from(uniquePages);
}

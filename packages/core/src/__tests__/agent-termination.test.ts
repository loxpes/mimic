/**
 * Tests for agent termination logic
 */

import { describe, it, expect } from 'vitest';

// Constants that should match agent.ts
const MAX_CONSECUTIVE_COMPLETED_WAITS = 2;

/**
 * Pure function to test termination logic
 * Returns true if agent should terminate
 */
function shouldTerminateOnCompletedWait(
  consecutiveCompletedWaits: number,
  maxConsecutiveWaits: number = MAX_CONSECUTIVE_COMPLETED_WAITS
): boolean {
  return consecutiveCompletedWaits >= maxConsecutiveWaits;
}

describe('Agent termination logic', () => {
  describe('shouldTerminateOnCompletedWait', () => {
    it('should not terminate after first completed wait', () => {
      expect(shouldTerminateOnCompletedWait(1)).toBe(false);
    });

    it('should terminate after reaching max consecutive completed waits', () => {
      expect(shouldTerminateOnCompletedWait(2)).toBe(true);
    });

    it('should terminate when exceeding max consecutive completed waits', () => {
      expect(shouldTerminateOnCompletedWait(3)).toBe(true);
    });

    it('should not terminate with zero consecutive waits', () => {
      expect(shouldTerminateOnCompletedWait(0)).toBe(false);
    });

    it('should respect custom max value', () => {
      expect(shouldTerminateOnCompletedWait(2, 3)).toBe(false);
      expect(shouldTerminateOnCompletedWait(3, 3)).toBe(true);
    });
  });
});

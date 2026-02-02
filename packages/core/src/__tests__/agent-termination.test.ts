/**
 * Tests for agent termination logic
 *
 * The agent terminates immediately when objectiveStatus is 'completed',
 * regardless of the action type (including 'wait').
 */

import { describe, it, expect } from 'vitest';

/**
 * Pure function to test termination logic
 * Returns true if agent should terminate based on objective status
 */
function shouldTerminate(objectiveStatus: 'pursuing' | 'completed' | 'abandoned' | 'blocked'): boolean {
  return objectiveStatus === 'completed' || objectiveStatus === 'abandoned';
}

/**
 * Pure function to check if blocked status with many failures should terminate
 */
function shouldTerminateOnBlocked(
  objectiveStatus: 'pursuing' | 'completed' | 'abandoned' | 'blocked',
  failedAttempts: number,
  maxFailedAttempts: number = 5
): boolean {
  return objectiveStatus === 'blocked' && failedAttempts > maxFailedAttempts;
}

describe('Agent termination logic', () => {
  describe('shouldTerminate', () => {
    it('should terminate immediately when status is completed', () => {
      expect(shouldTerminate('completed')).toBe(true);
    });

    it('should terminate immediately when status is abandoned', () => {
      expect(shouldTerminate('abandoned')).toBe(true);
    });

    it('should not terminate when status is pursuing', () => {
      expect(shouldTerminate('pursuing')).toBe(false);
    });

    it('should not terminate immediately when status is blocked (needs failed attempts check)', () => {
      expect(shouldTerminate('blocked')).toBe(false);
    });
  });

  describe('shouldTerminateOnBlocked', () => {
    it('should terminate when blocked with more than 5 failed attempts', () => {
      expect(shouldTerminateOnBlocked('blocked', 6)).toBe(true);
    });

    it('should not terminate when blocked with 5 or fewer failed attempts', () => {
      expect(shouldTerminateOnBlocked('blocked', 5)).toBe(false);
      expect(shouldTerminateOnBlocked('blocked', 3)).toBe(false);
    });

    it('should not terminate when pursuing even with many failed attempts', () => {
      expect(shouldTerminateOnBlocked('pursuing', 10)).toBe(false);
    });

    it('should respect custom max failed attempts', () => {
      expect(shouldTerminateOnBlocked('blocked', 3, 3)).toBe(false);
      expect(shouldTerminateOnBlocked('blocked', 4, 3)).toBe(true);
    });
  });

  describe('completed status terminates regardless of action type', () => {
    // These tests document the behavior: when LLM says 'completed',
    // we trust it and terminate immediately, regardless of action type

    it('should terminate on completed status even with wait action', () => {
      const actionType = 'wait';
      const objectiveStatus = 'completed' as const;

      // The key insight: we trust the LLM's assessment
      // If it says completed, we terminate regardless of action
      expect(shouldTerminate(objectiveStatus)).toBe(true);
      // actionType doesn't matter for termination decision
      expect(actionType).toBe('wait'); // just documenting the scenario
    });

    it('should terminate on completed status with click action', () => {
      const objectiveStatus = 'completed' as const;
      expect(shouldTerminate(objectiveStatus)).toBe(true);
    });

    it('should terminate on completed status with type action', () => {
      const objectiveStatus = 'completed' as const;
      expect(shouldTerminate(objectiveStatus)).toBe(true);
    });
  });
});

/**
 * Tests for steps to reproduce generation
 *
 * The agent should generate human-readable steps to reproduce
 * from the action history when creating findings.
 */

import { describe, it, expect } from 'vitest';
import type { ActionHistory } from '@testfarm/shared';

/**
 * Format a single action as a human-readable step
 * Extracted for testability
 */
export function formatActionAsStep(action: ActionHistory): string {
  const { type, target, value, direction, duration } = action.action;
  const status = action.success ? '' : ' (failed)';

  switch (type) {
    case 'click':
      return `Click on "${target?.description || 'element'}"${status}`;
    case 'type':
      return `Type "${value}" into "${target?.description || 'field'}"${status}`;
    case 'fillForm':
      return `Fill form${status}`;
    case 'scroll':
      return `Scroll ${direction || 'down'}${status}`;
    case 'wait':
      return `Wait ${duration || 1000}ms${status}`;
    case 'navigate':
      return `Navigate to ${value || 'URL'}${status}`;
    case 'back':
      return `Go back${status}`;
    case 'hover':
      return `Hover over "${target?.description || 'element'}"${status}`;
    case 'select':
      return `Select "${value}" from "${target?.description || 'dropdown'}"${status}`;
    case 'abandon':
      return `Abandon objective${status}`;
    default:
      return `${type}${status}`;
  }
}

/**
 * Build steps to reproduce from action history
 */
export function buildStepsToReproduce(targetUrl: string, actions: ActionHistory[]): string[] {
  const steps: string[] = [];
  steps.push(`Navigate to ${targetUrl}`);

  for (const action of actions) {
    const step = formatActionAsStep(action);
    if (step) {
      steps.push(step);
    }
  }

  return steps;
}

describe('Steps to reproduce generation', () => {
  describe('formatActionAsStep', () => {
    it('should format click action with target description', () => {
      const action: ActionHistory = {
        action: {
          type: 'click',
          target: { description: 'Submit button' },
        },
        timestamp: Date.now(),
        url: 'http://example.com',
        success: true,
      };

      expect(formatActionAsStep(action)).toBe('Click on "Submit button"');
    });

    it('should format click action with failed status', () => {
      const action: ActionHistory = {
        action: {
          type: 'click',
          target: { description: 'Submit button' },
        },
        timestamp: Date.now(),
        url: 'http://example.com',
        success: false,
        error: 'Element not found',
      };

      expect(formatActionAsStep(action)).toBe('Click on "Submit button" (failed)');
    });

    it('should format type action with value and target', () => {
      const action: ActionHistory = {
        action: {
          type: 'type',
          target: { description: 'Email field' },
          value: 'user@example.com',
        },
        timestamp: Date.now(),
        url: 'http://example.com',
        success: true,
      };

      expect(formatActionAsStep(action)).toBe('Type "user@example.com" into "Email field"');
    });

    it('should format scroll action with direction', () => {
      const action: ActionHistory = {
        action: {
          type: 'scroll',
          direction: 'up',
        },
        timestamp: Date.now(),
        url: 'http://example.com',
        success: true,
      };

      expect(formatActionAsStep(action)).toBe('Scroll up');
    });

    it('should format wait action with duration', () => {
      const action: ActionHistory = {
        action: {
          type: 'wait',
          duration: 2000,
        },
        timestamp: Date.now(),
        url: 'http://example.com',
        success: true,
      };

      expect(formatActionAsStep(action)).toBe('Wait 2000ms');
    });

    it('should format select action with value and target', () => {
      const action: ActionHistory = {
        action: {
          type: 'select',
          target: { description: 'Country dropdown' },
          value: 'Spain',
        },
        timestamp: Date.now(),
        url: 'http://example.com',
        success: true,
      };

      expect(formatActionAsStep(action)).toBe('Select "Spain" from "Country dropdown"');
    });
  });

  describe('buildStepsToReproduce', () => {
    it('should start with navigation to target URL', () => {
      const steps = buildStepsToReproduce('https://example.com', []);
      expect(steps[0]).toBe('Navigate to https://example.com');
    });

    it('should include all actions in order', () => {
      const actions: ActionHistory[] = [
        {
          action: { type: 'click', target: { description: 'Login button' } },
          timestamp: Date.now(),
          url: 'http://example.com',
          success: true,
        },
        {
          action: { type: 'type', target: { description: 'Email field' }, value: 'test@test.com' },
          timestamp: Date.now(),
          url: 'http://example.com',
          success: true,
        },
        {
          action: { type: 'click', target: { description: 'Submit' } },
          timestamp: Date.now(),
          url: 'http://example.com',
          success: true,
        },
      ];

      const steps = buildStepsToReproduce('https://example.com', actions);

      expect(steps).toHaveLength(4);
      expect(steps[0]).toBe('Navigate to https://example.com');
      expect(steps[1]).toBe('Click on "Login button"');
      expect(steps[2]).toBe('Type "test@test.com" into "Email field"');
      expect(steps[3]).toBe('Click on "Submit"');
    });

    it('should mark failed actions', () => {
      const actions: ActionHistory[] = [
        {
          action: { type: 'click', target: { description: 'Submit' } },
          timestamp: Date.now(),
          url: 'http://example.com',
          success: false,
          error: 'Button disabled',
        },
      ];

      const steps = buildStepsToReproduce('https://example.com', actions);

      expect(steps[1]).toBe('Click on "Submit" (failed)');
    });
  });
});

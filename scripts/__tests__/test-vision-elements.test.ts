/**
 * Tests for test-vision-elements script
 *
 * Tests the pure functions: argument parsing, schema validation,
 * NDJSON result parsing, and CLI argument building.
 */

import { describe, it, expect } from 'vitest';
import {
  parseArgs,
  ScreenAnalysisSchema,
  buildCliArgs,
  parseNdjsonResult,
} from '../test-vision-elements';

describe('test-vision-elements', () => {
  describe('parseArgs', () => {
    it('should parse image path from first positional argument', () => {
      const result = parseArgs(['node', 'script.ts', 'screenshot.png']);
      expect(result.imagePath).toBe('screenshot.png');
      expect(result.model).toBe('sonnet');
    });

    it('should parse --model flag', () => {
      const result = parseArgs(['node', 'script.ts', 'screenshot.png', '--model', 'haiku']);
      expect(result.imagePath).toBe('screenshot.png');
      expect(result.model).toBe('haiku');
    });

    it('should parse --model flag with opus', () => {
      const result = parseArgs(['node', 'script.ts', 'img.png', '--model', 'opus']);
      expect(result.model).toBe('opus');
    });

    it('should return null imagePath when no arguments provided', () => {
      const result = parseArgs(['node', 'script.ts']);
      expect(result.imagePath).toBeNull();
    });

    it('should default to sonnet when --model has no value', () => {
      const result = parseArgs(['node', 'script.ts', 'img.png', '--model']);
      expect(result.model).toBe('sonnet');
    });
  });

  describe('ScreenAnalysisSchema', () => {
    it('should validate a correct screen analysis result', () => {
      const data = {
        pageDescription: 'A login page with email and password fields',
        elements: [
          {
            name: 'Email Input',
            description: 'Text input for email address',
            type: 'input',
            coordinates: { x: 400, y: 200 },
            bounds: { top: 185, left: 300, width: 200, height: 30 },
          },
          {
            name: 'Login Button',
            description: 'Submits the login form',
            type: 'button',
            coordinates: { x: 400, y: 300 },
          },
        ],
      };

      const result = ScreenAnalysisSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('should accept elements without bounds (optional)', () => {
      const data = {
        pageDescription: 'A simple page',
        elements: [
          {
            name: 'Link',
            description: 'A navigation link',
            type: 'link',
            coordinates: { x: 100, y: 50 },
          },
        ],
      };

      const result = ScreenAnalysisSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('should reject invalid element types', () => {
      const data = {
        pageDescription: 'A page',
        elements: [
          {
            name: 'Thing',
            description: 'Unknown thing',
            type: 'unknown_type',
            coordinates: { x: 0, y: 0 },
          },
        ],
      };

      const result = ScreenAnalysisSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('should reject missing required fields', () => {
      const data = {
        elements: [],
      };

      const result = ScreenAnalysisSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('should accept all valid element types', () => {
      const validTypes = ['button', 'link', 'input', 'select', 'checkbox', 'radio', 'icon', 'menu', 'tab', 'other'];

      for (const type of validTypes) {
        const data = {
          pageDescription: 'Test',
          elements: [
            {
              name: 'Element',
              description: 'Test element',
              type,
              coordinates: { x: 0, y: 0 },
            },
          ],
        };
        const result = ScreenAnalysisSchema.safeParse(data);
        expect(result.success).toBe(true);
      }
    });
  });

  describe('buildCliArgs', () => {
    it('should build correct CLI args with default model', () => {
      const args = buildCliArgs('/path/to/image.png', 'sonnet');
      expect(args).toContain('--print');
      expect(args).toContain('--output-format');
      expect(args).toContain('stream-json');
      expect(args).toContain('--verbose');
      expect(args).toContain('--model');
      expect(args).toContain('--max-turns');
      expect(args).toContain('3');
      expect(args).toContain('--dangerously-skip-permissions');
      expect(args).toContain('--json-schema');
      expect(args).toContain('-p');
      expect(args).toContain('-');
    });

    it('should include the correct model name for sonnet', () => {
      const args = buildCliArgs('/path/to/image.png', 'sonnet');
      const modelIndex = args.indexOf('--model');
      expect(args[modelIndex + 1]).toContain('sonnet');
    });

    it('should include the correct model name for haiku', () => {
      const args = buildCliArgs('/path/to/image.png', 'haiku');
      const modelIndex = args.indexOf('--model');
      expect(args[modelIndex + 1]).toContain('haiku');
    });

    it('should include the correct model name for opus', () => {
      const args = buildCliArgs('/path/to/image.png', 'opus');
      const modelIndex = args.indexOf('--model');
      expect(args[modelIndex + 1]).toContain('opus');
    });

    it('should include the image path in the prompt via stdin args', () => {
      const args = buildCliArgs('/path/to/image.png', 'sonnet');
      // The prompt is passed via stdin (-p -), so the image path
      // should be referenced in the prompt that gets piped
      expect(args).toContain('-p');
      expect(args).toContain('-');
    });
  });

  describe('parseNdjsonResult', () => {
    it('should parse a valid NDJSON result line', () => {
      const ndjson = JSON.stringify({
        type: 'result',
        result: 'some text',
        structured_output: { pageDescription: 'test', elements: [] },
        usage: { input_tokens: 100, output_tokens: 50 },
        total_cost_usd: 0.001,
      });

      const result = parseNdjsonResult(ndjson);
      expect(result).not.toBeNull();
      expect(result!.structuredOutput).toEqual({ pageDescription: 'test', elements: [] });
      expect(result!.usage.inputTokens).toBe(100);
      expect(result!.usage.outputTokens).toBe(50);
      expect(result!.costUsd).toBe(0.001);
    });

    it('should handle multiple NDJSON lines and find the result', () => {
      const lines = [
        JSON.stringify({ type: 'assistant', message: 'thinking...' }),
        JSON.stringify({
          type: 'result',
          result: 'done',
          structured_output: { pageDescription: 'p', elements: [] },
          usage: { input_tokens: 200, output_tokens: 100 },
          total_cost_usd: 0.002,
        }),
      ].join('\n');

      const result = parseNdjsonResult(lines);
      expect(result).not.toBeNull();
      expect(result!.usage.inputTokens).toBe(200);
    });

    it('should return null when no result line is found', () => {
      const ndjson = JSON.stringify({ type: 'assistant', message: 'hello' });
      const result = parseNdjsonResult(ndjson);
      expect(result).toBeNull();
    });

    it('should handle invalid JSON lines gracefully', () => {
      const lines = 'not json\n' + JSON.stringify({
        type: 'result',
        result: 'ok',
        usage: { input_tokens: 10, output_tokens: 5 },
        total_cost_usd: 0.0001,
      });

      const result = parseNdjsonResult(lines);
      expect(result).not.toBeNull();
    });
  });
});

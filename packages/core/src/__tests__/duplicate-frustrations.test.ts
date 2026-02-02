/**
 * Tests for duplicate frustration prevention in prompts
 *
 * The system prompt should include clear instructions to avoid
 * reporting the same frustration multiple times in a session.
 */

import { describe, it, expect } from 'vitest';
import { buildDuplicatePreventionSection } from '../llm/client.js';

describe('Duplicate frustration prevention', () => {
  describe('buildDuplicatePreventionSection', () => {
    it('should return empty string when there are no frustrations', () => {
      expect(buildDuplicatePreventionSection([])).toBe('');
    });

    it('should list existing frustrations when present', () => {
      const frustrations = ['Button is not visible', 'Form validation fails'];
      const result = buildDuplicatePreventionSection(frustrations);

      expect(result).toContain('1. Button is not visible');
      expect(result).toContain('2. Form validation fails');
    });

    it('should include instruction to check before adding', () => {
      const frustrations = ['Some issue'];
      const result = buildDuplicatePreventionSection(frustrations);

      expect(result).toContain('ANTES de añadir una frustración');
      expect(result).toContain('Revisa la lista de frustraciones ya reportadas');
    });

    it('should warn about similar issues with different wording', () => {
      const frustrations = ['Some issue'];
      const result = buildDuplicatePreventionSection(frustrations);

      expect(result).toContain('SIMILAR');
      expect(result).toContain('mismo problema, diferente redacción');
    });

    it('should instruct to only report NEW problems', () => {
      const frustrations = ['Some issue'];
      const result = buildDuplicatePreventionSection(frustrations);

      expect(result).toContain('Solo reporta problemas NUEVOS');
    });

    it('should number frustrations correctly for multiple items', () => {
      const frustrations = ['Issue 1', 'Issue 2', 'Issue 3', 'Issue 4', 'Issue 5'];
      const result = buildDuplicatePreventionSection(frustrations);

      expect(result).toContain('1. Issue 1');
      expect(result).toContain('2. Issue 2');
      expect(result).toContain('3. Issue 3');
      expect(result).toContain('4. Issue 4');
      expect(result).toContain('5. Issue 5');
    });
  });
});

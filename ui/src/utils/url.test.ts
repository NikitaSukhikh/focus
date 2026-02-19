// URL tests lock in pass-through behavior for user-provided URL values.
import { describe, expect, it } from 'vitest';

import { isLikelyHttpUrl, normalizeUrl, validateUrlOnSubmit } from '@/utils/url';

describe('url utils', () => {
  describe('normalizeUrl', () => {
    it('returns values as-is', () => {
      expect(normalizeUrl('https://kity.software')).toBe('https://kity.software');
      expect(normalizeUrl('https;//kity.software')).toBe('https;//kity.software');
    });
  });

  describe('validation', () => {
    it('accepts well-formed http(s) URL values only', () => {
      expect(isLikelyHttpUrl('https://kity.software')).toBe(true);
      expect(isLikelyHttpUrl('https;//kity.software')).toBe(false);
      expect(validateUrlOnSubmit('https://kity.software')).toEqual({
        normalizedUrl: 'https://kity.software',
        isValid: true,
      });
    });
  });
});

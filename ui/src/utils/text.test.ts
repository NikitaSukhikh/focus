// Tests for link title helpers to prevent regressions in percent-encoded title rendering.
import { describe, expect, it } from 'vitest';

import { decodeLinkTitleText, deriveLinkTitleFromUrl, resolveLinkTitle, truncateDisplayUrl } from '@/utils/text';

describe('text utils', () => {
  describe('resolveLinkTitle', () => {
    it('decodes percent-encoded metadata titles', () => {
      expect(resolveLinkTitle('Understanding%20TypeScript%20Generics')).toBe('Understanding TypeScript Generics');
    });

    it('decodes encoded fragments without breaking literal percent signs', () => {
      expect(resolveLinkTitle('Save 50% on Nike%20Shoes')).toBe('Save 50% on Nike Shoes');
    });

    it('keeps plain percent signs unchanged when text is not encoded', () => {
      expect(resolveLinkTitle('100% coverage')).toBe('100% coverage');
    });

    it('handles encoded URLs returned as titles', () => {
      expect(resolveLinkTitle('https%3A%2F%2Fexample.com%2Fblog%2Fhello%20world')).toBe('hello world');
    });

    it('preserves capitalization for plain titles that look domain-like', () => {
      expect(resolveLinkTitle('MyBrand.COM')).toBe('MyBrand.COM');
    });
  });

  describe('deriveLinkTitleFromUrl', () => {
    it('decodes percent-encoded URL path segments', () => {
      expect(deriveLinkTitleFromUrl('https://example.com/posts/hello%20world')).toBe('hello world');
    });

    it('preserves host capitalization when host is used as fallback title', () => {
      expect(deriveLinkTitleFromUrl('https://WWW.GitHub.com')).toBe('GitHub.com');
    });
  });

  describe('decodeLinkTitleText', () => {
    it('decodes encoded text while preserving literal percent', () => {
      expect(decodeLinkTitleText('Save%20up%20to%2050%')).toBe('Save up to 50%');
    });
  });

  describe('truncateDisplayUrl', () => {
    it('shows decoded URL text in link tiles', () => {
      const displayed = truncateDisplayUrl('https://example.com/path%20with%20spaces').replace(/\n/g, ' ');
      expect(displayed).toContain('path');
      expect(displayed).toContain('spaces');
      expect(displayed).not.toContain('%20');
    });
  });
});

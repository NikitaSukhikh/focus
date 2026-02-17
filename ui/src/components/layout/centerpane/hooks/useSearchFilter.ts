/**
 * useSearchFilter returns only tiles that match the active search query.
 * For URL-based tiles (links and web articles), it also indexes extracted page text so body content is searchable.
 */
import { useEffect, useMemo, useState } from 'react';
import { useSearchStore } from '@/stores/searchStore';
import { DroppedIcon } from '@/components/layout/centerpane/types';
import { API_BASE } from '@/config/api';

const extractedTextByUrl = new Map<string, string>();
const pendingExtractRequests = new Set<string>();

const normalizeText = (value?: string | null): string => (value || '').toLowerCase();

const stripHtml = (html: string): string => {
  if (!html) return '';
  const parsed = new DOMParser().parseFromString(html, 'text/html');
  const text = parsed.body.textContent || '';
  return text.replace(/\s+/g, ' ').trim();
};

const canUseExtractedContent = (icon: DroppedIcon): boolean =>
  (icon.type === 'link' || icon.type === 'web_article') && !!icon.url?.trim();

export const useSearchFilter = (icons: DroppedIcon[]): DroppedIcon[] => {
  const searchQuery = useSearchStore((state) => state.searchQuery);
  const normalizedQuery = searchQuery.trim().toLowerCase();
  const [cacheVersion, setCacheVersion] = useState(0);

  useEffect(() => {
    if (!normalizedQuery || normalizedQuery.length < 2) return;

    const urlsToLoad = Array.from(
      new Set(
        icons
          .filter(canUseExtractedContent)
          .map((icon) => icon.url?.trim() || '')
          .filter((url) => !!url && !extractedTextByUrl.has(url) && !pendingExtractRequests.has(url))
      )
    );

    if (!urlsToLoad.length) return;

    urlsToLoad.forEach(async (url) => {
      pendingExtractRequests.add(url);
      try {
        const params = new URLSearchParams({ url });
        const response = await fetch(`${API_BASE}/article/extract?${params.toString()}`);
        if (!response.ok) {
          extractedTextByUrl.set(url, '');
          return;
        }

        const payload = await response.json();
        const title = payload?.title || '';
        const contentHtml = payload?.content_html || '';
        const contentText = payload?.content_text || '';
        const searchText = `${title} ${contentText} ${stripHtml(contentHtml)}`.trim();
        extractedTextByUrl.set(url, searchText);
      } catch {
        extractedTextByUrl.set(url, '');
      } finally {
        pendingExtractRequests.delete(url);
        setCacheVersion((prev) => prev + 1);
      }
    });
  }, [icons, normalizedQuery]);

  return useMemo(() => {
    // Keeps memo recalculation tied to async cache updates.
    const _cacheVersion = cacheVersion;
    void _cacheVersion;

    if (!normalizedQuery) return icons;

    return icons.filter((icon) => {
      const extractedText = icon.url ? extractedTextByUrl.get(icon.url) || '' : '';
      const fields = [
        icon.title,
        icon.description,
        icon.content,
        icon.url,
        icon.channelName,
        icon.defaultTitle,
        icon.defaultDescription,
        icon.customTitle,
        icon.customDescription,
        extractedText,
      ];

      return fields.some((field) => normalizeText(field).includes(normalizedQuery));
    });
  }, [cacheVersion, icons, normalizedQuery]);
};

/**
 * Saved Links Management Hook
 *
 * Purpose: Manages saved links state and operations
 * Responsibilities:
 * - Loading saved links from API for the selected island
 * - Creating new links with favicon extraction
 * - Updating existing link metadata
 * - Deleting links from the island
 * - Auto-reloading when integrations dropdown opens
 */

import { useState, useEffect } from 'react';
import { objectsApi } from '../../../../api/objects';
import { buildFaviconUrl } from '../../../../utils/favicon';
import { SavedLink } from '../types';

const getLinkDisplayName = (url: string, title?: string) => {
  const trimmedTitle = title?.trim();
  if (trimmedTitle && trimmedTitle !== url) return trimmedTitle;
  try {
    const hostname = new URL(url).hostname.replace(/^www\./i, '');
    return hostname || url;
  } catch {
    return trimmedTitle || url;
  }
};

export const useSavedLinks = (selectedIslandId: string | undefined, isDropdownOpen: boolean) => {
  const [savedLinks, setSavedLinks] = useState<SavedLink[]>([]);

  const reloadSavedLinks = async () => {
    if (!selectedIslandId) {
      setSavedLinks([]);
      return;
    }

    try {
      const objects = await objectsApi.list(selectedIslandId);
      // Only show links that are visible on the center pane (x >= 0 AND y >= 0)
      const links = objects.filter(obj => {
        if (obj.type !== 'link') return false;
        const metadata = obj.metadata as any;
        const x = metadata?.x ?? -1;
        const y = metadata?.y ?? -1;
        return x >= 0 && y >= 0;
      });
      const mapped = links.map((link) => ({
        id: link.id,
        url: (link.metadata as any)?.url || link.title || '',
        title: link.title,
        name: getLinkDisplayName((link.metadata as any)?.url || link.title || '', link.title),
        description: link.description,
        favicon_url: (link.metadata as any)?.favicon_url || buildFaviconUrl((link.metadata as any)?.url || ''),
      }));
      setSavedLinks(mapped);
    } catch (err) {
      console.error('Failed to load saved links:', err);
    }
  };


  const handleDeleteLink = async (linkId: string) => {
    if (!selectedIslandId) return;

    try {
      await objectsApi.delete(linkId);
      await reloadSavedLinks();
    } catch (err) {
      console.error('Failed to delete link:', err);
      alert('Failed to delete link. Please try again.');
    }
  };

  const handleUpdateLink = async (linkId: string, url: string, title: string, description: string) => {
    if (!selectedIslandId) return;

    try {
      const favicon_url = buildFaviconUrl(url) ?? '';
      await objectsApi.updateLink(linkId, url, title, description ?? '', favicon_url);
      await reloadSavedLinks();
    } catch (err) {
      console.error('Failed to update link:', err);
      alert('Failed to update link. Please try again.');
    }
  };

  // Load saved links when dropdown opens
  useEffect(() => {
    if (isDropdownOpen) {
      reloadSavedLinks();
    }
  }, [isDropdownOpen, selectedIslandId]);

  return {
    savedLinks,
    handleDeleteLink,
    handleUpdateLink,
    reloadSavedLinks,
  };
};

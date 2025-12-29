/**
 * CenterPane Link Creation Hook
 *
 * Purpose: Manages link creation directly from the center pane
 * Responsibilities:
 * - Showing/hiding the Add Link dialog
 * - Creating new links at specific canvas positions
 * - Adding newly created links to the canvas
 */

import { useEffect, useState } from 'react';
import { objectsApi } from '../../../../api/objects';
import { undoApi } from '../../../../api/undo';
import { buildFaviconUrl } from '../../../../utils/favicon';
import { truncateLinkTitle } from '../../../../utils/text';
import { DroppedIcon } from '../types';
import { normalizeTag } from '../../../../types/tags';
import { isGmailUrl } from '../utils';

interface LinkCreationParams {
  selectedIsland: any;
  setIconsByIsland: React.Dispatch<React.SetStateAction<Record<string, DroppedIcon[]>>>;
}

export const useCenterPaneLinkCreation = ({ selectedIsland, setIconsByIsland }: LinkCreationParams) => {
  const [isAddLinkDialogOpen, setIsAddLinkDialogOpen] = useState(false);
  const [pendingLinkPosition, setPendingLinkPosition] = useState<{ x: number; y: number } | null>(null);
  const [editingLink, setEditingLink] = useState<{
    id: string;
    url?: string;
    defaultTitle?: string;
    defaultDescription?: string;
    customTitle?: string | null;
    customDescription?: string | null;
    faviconUrl?: string;
  } | null>(null);

  const looksLikeFavicon = (src?: string) => {
    const s = (src || '').toLowerCase();
    return s.endsWith('.ico') || s.includes('favicon');
  };

  const pickFavicon = (metadata: any, resolvedUrl: string, originalUrl: string) => {
    const targetUrl = resolvedUrl || originalUrl;
    const candidateImage = metadata?.og_image || metadata?.thumbnail_url || metadata?.image;
    if (candidateImage && !looksLikeFavicon(candidateImage)) {
      return candidateImage;
    }

    return metadata?.favicon_url || buildFaviconUrl(targetUrl);
  };

  const openAddLinkDialog = (x: number, y: number) => {
    setPendingLinkPosition({ x, y });
    setEditingLink(null);
    setIsAddLinkDialogOpen(true);
  };

  const openLinkEditDialog = (link: DroppedIcon) => {
    setPendingLinkPosition(null);
    setEditingLink({
      id: link.id,
      url: link.url,
      defaultTitle: link.defaultTitle || link.title,
      defaultDescription: link.defaultDescription ?? link.description ?? '',
      customTitle: link.customTitle ?? null,
      customDescription: link.customDescription ?? null,
      faviconUrl: link.faviconUrl,
    });
    setIsAddLinkDialogOpen(true);
  };

  const handleAddLink = async (
    url: string,
    defaultTitle: string,
    defaultDescription: string,
    customTitle?: string,
    customDescription?: string
  ) => {
    if (!selectedIsland) {
      alert('Please select an island first');
      return;
    }

    // Edit existing link
    if (editingLink) {
      const favicon_url =
        editingLink.url === url
          ? editingLink.faviconUrl || buildFaviconUrl(url)
          : buildFaviconUrl(url);
      const isGmail = isGmailUrl(url);
      try {
        const updated = await objectsApi.updateLink(
          editingLink.id,
          url,
          defaultTitle,
          defaultDescription,
          favicon_url,
          customTitle ?? null,
          customDescription ?? null
        );

        const displayTitle = updated.custom_title || updated.title || defaultTitle;
        const displayDescription = updated.custom_description ?? updated.default_description ?? defaultDescription;
        const updatedMetaFavicon = (updated.metadata as any)?.favicon_url;
        const nextFavicon =
          updatedMetaFavicon ||
          (editingLink.url === url ? editingLink.faviconUrl : undefined) ||
          favicon_url;

        setIconsByIsland((prev) => {
          const current = prev[selectedIsland.id] || [];
          return {
            ...prev,
            [selectedIsland.id]: current.map((icon) =>
              icon.id === editingLink.id
                ? {
                    ...icon,
                    title: displayTitle,
                    url,
                    description: displayDescription,
                    defaultTitle: updated.default_title || defaultTitle,
                    defaultDescription: updated.default_description ?? defaultDescription ?? '',
                    customTitle: updated.custom_title ?? customTitle ?? null,
                    customDescription: updated.custom_description ?? customDescription ?? null,
                    faviconUrl: isGmail ? undefined : nextFavicon,
                  }
                : icon
            ),
          };
        });
        window.dispatchEvent(new CustomEvent('link:updated', { detail: { linkId: editingLink.id } }));

        // Auto-refresh metadata after save to keep favicon/default fields current
        if (!isGmail) {
          setTimeout(async () => {
            try {
              const params = new URLSearchParams({ url });
              const response = await fetch(`/api/metadata/url?${params.toString()}`);
              if (!response.ok) return;
              const metadata = await response.json();
              const resolvedUrl = metadata.resolved_url || url;
              const refreshedTitle = truncateLinkTitle(metadata.title || metadata.og_title || defaultTitle);
              const refreshedDescription = metadata.description || metadata.og_description || defaultDescription;
              const refreshedFavicon = pickFavicon(metadata, resolvedUrl, url) || nextFavicon;

              setIconsByIsland((prev) => {
                const current = prev[selectedIsland.id] || [];
                const updatedIcons = current.map((icon) =>
                  icon.id === editingLink.id
                    ? {
                        ...icon,
                        url: resolvedUrl,
                        defaultTitle: refreshedTitle,
                        defaultDescription: refreshedDescription,
                        title: icon.customTitle ? icon.title : refreshedTitle,
                        description: icon.customDescription ?? refreshedDescription,
                        faviconUrl: refreshedFavicon,
                      }
                    : icon
                );
                return { ...prev, [selectedIsland.id]: updatedIcons };
              });

              await objectsApi.updateLink(
                editingLink.id,
                resolvedUrl,
                refreshedTitle,
                refreshedDescription,
                refreshedFavicon
              );
              window.dispatchEvent(new CustomEvent('link:updated', { detail: { linkId: editingLink.id } }));
            } catch (err) {
              console.error('[AUTO-REFRESH][EDIT] Failed to refresh metadata:', err);
            }
          }, 10);
        }
      } catch (err) {
        console.error('Failed to update link:', err);
        alert('Failed to update link. Please try again.');
      } finally {
        setIsAddLinkDialogOpen(false);
        setEditingLink(null);
      }
      return;
    }

    const favicon_url = buildFaviconUrl(url);
    const isGmail = isGmailUrl(url);

    if (!pendingLinkPosition) {
      alert('Please pick a drop position first');
      return;
    }

    const { x, y } = pendingLinkPosition;

    try {
      const created = await objectsApi.create(selectedIsland.id, {
        type: isGmail ? 'gmail' : 'link',
        title: defaultTitle,
        url,
        description: defaultDescription,
        custom_title: customTitle,
        custom_description: customDescription,
        favicon_url,
        x,
        y,
      });

      // Add to canvas immediately
      const displayDescription = customDescription ?? created.description ?? defaultDescription;
      const displayTitle = created.custom_title || created.title || defaultTitle;
      const newIcon: DroppedIcon = {
        id: created.id,
        type: isGmail ? 'gmail' : 'link',
        title: displayTitle,
        x,
        y,
        tag: normalizeTag(created.tag),
        url,
        description: displayDescription,
        defaultTitle: created.default_title || defaultTitle,
        defaultDescription: created.default_description ?? defaultDescription ?? '',
        customTitle: created.custom_title ?? customTitle ?? null,
        customDescription: created.custom_description ?? customDescription ?? null,
        faviconUrl: isGmail ? undefined : favicon_url,
      };

      setIconsByIsland((prev) => {
        const current = prev[selectedIsland.id] || [];
        return { ...prev, [selectedIsland.id]: [...current, newIcon] };
      });

      // Add to backend undo history
      undoApi
        .createEvent(selectedIsland.id, {
          event_type: 'tile_create',
              event_data: {
                tile: {
                  id: created.id,
                  type: isGmail ? 'gmail' : 'link',
                  title: displayTitle,
                  tag: normalizeTag(created.tag),
                  defaultTitle: created.default_title,
              defaultDescription: created.default_description,
              customTitle: created.custom_title ?? customTitle ?? null,
              customDescription: created.custom_description ?? customDescription ?? null,
              x,
              y,
              url,
              description: displayDescription,
              faviconUrl: isGmail ? undefined : favicon_url,
            },
          },
        })
        .catch((err) => console.error('Failed to create undo event:', err));

      // Notify other components that a link was created
      window.dispatchEvent(new CustomEvent('link:created', { detail: { linkId: created.id } }));

      // Auto-refresh metadata shortly after creation to update title/description/favicon
      setTimeout(async () => {
        try {
          const params = new URLSearchParams({ url });
          const response = await fetch(`/api/metadata/url?${params.toString()}`);
          if (response.ok) {
            const metadata = await response.json();
            console.log('[AUTO-REFRESH] Received metadata:', metadata);
            const resolvedUrl = metadata.resolved_url || url;
            const updatedTitle = truncateLinkTitle(metadata.title || metadata.og_title || created.title);
            const updatedDescription = metadata.description || metadata.og_description || created.description;
            const updatedFavicon = pickFavicon(metadata, resolvedUrl, url) || favicon_url;
            console.log('[AUTO-REFRESH] Using favicon:', updatedFavicon);

            // Update the icon in state
            setIconsByIsland((prev) => {
              const current = prev[selectedIsland.id] || [];
              const updated = current.map((icon) =>
                icon.id === created.id
                  ? {
                      ...icon,
                      defaultTitle: updatedTitle,
                      defaultDescription: updatedDescription,
                      title: icon.customTitle ? icon.title : updatedTitle,
                      description: icon.customDescription ?? updatedDescription,
                      faviconUrl: updatedFavicon,
                      url: resolvedUrl,
                    }
                  : icon
              );
              return { ...prev, [selectedIsland.id]: updated };
            });

            // Persist to backend
            await objectsApi.updateLink(
              created.id,
              resolvedUrl,
              updatedTitle,
              updatedDescription,
              updatedFavicon
            );
            window.dispatchEvent(new CustomEvent('link:updated', { detail: { linkId: created.id } }));
          }
        } catch (err) {
          console.error('[AUTO-REFRESH] Failed to refresh metadata:', err);
        }
      }, 10);

      setIsAddLinkDialogOpen(false);
      setPendingLinkPosition(null);
    } catch (err) {
      console.error('Failed to create link:', err);
      alert('Failed to add link. Please try again.');
    }
  };

  const closeAddLinkDialog = () => {
    setIsAddLinkDialogOpen(false);
    setPendingLinkPosition(null);
    setEditingLink(null);
  };

  // Keep editing dialog in sync if link is updated elsewhere
  useEffect(() => {
    if (!editingLink) return;

    const handleLinkUpdated = (e: Event) => {
      const customEvent = e as CustomEvent<{
        linkId: string;
        url?: string;
        defaultTitle?: string;
        defaultDescription?: string;
        customTitle?: string | null;
        customDescription?: string | null;
        faviconUrl?: string;
        title?: string;
        description?: string;
      }>;
      const { linkId, url, defaultTitle, defaultDescription, customTitle, customDescription, faviconUrl, title, description } = customEvent.detail;
      if (linkId !== editingLink.id) return;

      setEditingLink((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          url: url ?? prev.url,
          defaultTitle: defaultTitle ?? prev.defaultTitle ?? title ?? prev.defaultTitle,
          defaultDescription: defaultDescription ?? prev.defaultDescription ?? description ?? prev.defaultDescription,
          customTitle: customTitle ?? prev.customTitle ?? null,
          customDescription: customDescription ?? prev.customDescription ?? null,
          faviconUrl: faviconUrl ?? prev.faviconUrl,
        };
      });
    };

    window.addEventListener('link:updated', handleLinkUpdated);
    return () => window.removeEventListener('link:updated', handleLinkUpdated);
  }, [editingLink]);

  return {
    isAddLinkDialogOpen,
    openAddLinkDialog,
    openLinkEditDialog,
    handleAddLink,
    closeAddLinkDialog,
    editingLink,
  };
};

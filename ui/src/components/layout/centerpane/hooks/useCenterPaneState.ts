/**
 * CenterPane State Management Hook
 *
 * Purpose: Manages core state and data loading for the center pane canvas
 * Responsibilities:
 * - Managing icons state by space (iconsBySpace)
 * - Loading objects from API and mapping to DroppedIcon format
 * - Tracking selected icon and drag-over state
 * - Calculating dynamic content height based on icon positions
 * - Handling keyboard delete for selected icons
 * - Syncing state when space selection changes
 */

import { useState, useEffect, useMemo, useRef } from 'react';
import { useSpaceStore } from '@/stores/spaceStore';
import { useUndoHistoryStore } from '@/stores/undoHistoryStore';
import { objectsApi } from '@/api/objects';
import { undoApi } from '@/api/undo';
import { buildFaviconUrl } from '@/utils/favicon';
import { decodeLinkTitleText, resolveLinkTitle } from '@/utils/text';
import { DroppedIcon, IconKind, ArrowSegment } from '@/components/layout/centerpane/types';
import { normalizeTag } from '@/types/tags';
import { isGmailUrl } from '@/components/layout/centerpane/utils';
import { calculateContentHeight } from '@/components/layout/centerpane/boundaries';
import { API_BASE } from '@/config/api';

const isFocusRingEdge = (value: unknown): value is 'top' | 'right' | 'bottom' | 'left' =>
  value === 'top' || value === 'right' || value === 'bottom' || value === 'left';

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

const toArrowUndoPayload = (arrow: ArrowSegment) => ({
  id: arrow.id,
  start: { x: arrow.start.x, y: arrow.start.y },
  end: { x: arrow.end.x, y: arrow.end.y },
  start_anchor: arrow.startAnchor
    ? { tile_id: arrow.startAnchor.tileId, edge: arrow.startAnchor.edge, edge_index: arrow.startAnchor.edgeIndex }
    : undefined,
  end_anchor: arrow.endAnchor
    ? { tile_id: arrow.endAnchor.tileId, edge: arrow.endAnchor.edge, edge_index: arrow.endAnchor.edgeIndex }
    : undefined,
});

export const useCenterPaneState = (paneRef: React.RefObject<HTMLDivElement | null>) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [iconsBySpace, setIconsBySpace] = useState<Record<string, DroppedIcon[]>>({});
  const [arrowsBySpace, setArrowsBySpace] = useState<Record<string, ArrowSegment[]>>({});
  const [selectedIconIds, setSelectedIconIds] = useState<string[]>([]);
  const [dragGhost, setDragGhost] = useState<{
    id: string;
    x: number;
    y: number;
    type: IconKind;
  } | null>(null);

  const selectedSpace = useSpaceStore((state) => state.getSelectedSpace());
  const addEvent = useUndoHistoryStore((state) => state.addEvent);

  const contentHeight = useMemo(() => {
    const currentIcons = selectedSpace ? iconsBySpace[selectedSpace.id] || [] : [];
    const viewportHeight = paneRef.current?.getBoundingClientRect().height || 600;
    return calculateContentHeight(currentIcons, viewportHeight);
  }, [iconsBySpace, selectedSpace, paneRef]);

  // Track which links have already been refreshed per space to avoid repeated fetches.
  const refreshedLinksRef = useRef<Map<string, Set<string>>>(new Map());

  // Load existing objects as icons when space changes
  useEffect(() => {
    const spaceId = selectedSpace?.id;
    if (!spaceId) return;

    objectsApi
      .list(spaceId)
      .then((objects) => {
        const arrows: ArrowSegment[] = [];
        const mapped: DroppedIcon[] = objects
          .filter((obj) => {
            const meta = (obj.metadata || {}) as Record<string, any>;
            const x = meta.x;
            const y = meta.y;
            const deletedAt = meta.deleted_at;
            const isArrow = meta.arrow === true;
            const hasCoords = typeof x === 'number' && typeof y === 'number' && x >= 0 && y >= 0;
            return hasCoords && !deletedAt && !isArrow;
          })
          .map((obj, idx) => {
            const meta = (obj.metadata || {}) as Record<string, any>;
            const x = typeof meta.x === 'number' ? meta.x : 100 + (idx % 5) * 120;
            const y = typeof meta.y === 'number' ? meta.y : 100 + Math.floor(idx / 5) * 140;

            const defaultTitle = (obj as any).default_title as string | undefined;
            const defaultDescription = (obj as any).default_description as string | undefined;
            const customTitle = ((obj as any).custom_title as string | null | undefined) ?? null;
            const normalizedCustomTitle = customTitle ? decodeLinkTitleText(customTitle) : null;
            const customDescription = ((obj as any).custom_description as string | null | undefined) ?? null;
            const serviceKey = obj.type === 'google_drive' ? obj.description : undefined;
            const description = obj.type !== 'google_drive' ? (customDescription ?? obj.description ?? defaultDescription) : undefined;
            const url = (obj.type === 'link' || obj.type === 'gmail' || obj.type === 'web_article') ? (meta.url as string) : undefined;
            const effectiveDefaultTitle =
              obj.type === 'link' ? resolveLinkTitle(defaultTitle || obj.title, url) : defaultTitle;
            const service = meta.service as string | undefined;
            const faviconUrl = (meta.favicon_url as string | undefined) || (url ? buildFaviconUrl(url) : undefined);
            const filePath = obj.type === 'file' ? (meta.file_path as string) : undefined;
            const channelName = meta.channel_name as string | undefined;

            // Gmail - extract email subject from metadata if present (for display on tile)
            const gmailEmail = meta.gmail_email as string | undefined;

            const tag = normalizeTag((obj as any).tag ?? meta.tag);
            const displayTitle =
              obj.type === 'link'
                ? (normalizedCustomTitle || resolveLinkTitle(obj.title || defaultTitle, url))
                : customTitle || obj.title || defaultTitle || '';

            // Check if this is a Gmail URL (for showing Gmail icon on pasted Gmail links)
            const isGmail = url && isGmailUrl(url);

            let kind: IconKind =
              obj.type === 'link'
                ? (isGmail ? 'gmail' : 'link')
                : obj.type === 'file'
                ? 'file'
                : obj.type === 'gmail'
                ? 'gmail'
                : service === 'telegram'
                ? 'telegram'
                : service === 'intstorage'
                ? 'intstorage'
                : obj.type === 'google_drive'
                ? (
                  serviceKey === 'sheets' ? 'google_sheets' :
                  serviceKey === 'docs' ? 'google_docs' :
                  serviceKey === 'slides' ? 'google_slides' :
                  'google_drive'
                )
                : obj.type === 'text'
                ? 'text'
                : obj.type === 'web_article'
                ? 'web_article'
                : 'unknown';

            return {
              id: obj.id,
              type: kind,
              title: displayTitle,
              x,
              y,
              tag,
              serviceKey,
              url,
              service,
              description,
              channelName,
              defaultTitle: effectiveDefaultTitle,
              defaultDescription,
              customTitle: normalizedCustomTitle,
              customDescription,
              faviconUrl,
              filePath,
              content: obj.type === 'text' ? (meta.content as string) : undefined,
              gmailEmail,
            };
          });
        objects.forEach((obj) => {
          const meta = (obj.metadata || {}) as Record<string, any>;
          const hasArrowFlag = meta.arrow === true;
          const startX = meta.start_x;
          const startY = meta.start_y;
          const endX = meta.end_x;
          const endY = meta.end_y;
          const startTileId = typeof meta.start_tile_id === 'string' ? meta.start_tile_id : undefined;
          const startAnchorEdge = isFocusRingEdge(meta.start_anchor_edge) ? meta.start_anchor_edge : undefined;
          const startAnchorIndex = Number.isInteger(meta.start_anchor_index) ? Number(meta.start_anchor_index) : undefined;
          const endTileId = typeof meta.end_tile_id === 'string' ? meta.end_tile_id : undefined;
          const endAnchorEdge = isFocusRingEdge(meta.end_anchor_edge) ? meta.end_anchor_edge : undefined;
          const endAnchorIndex = Number.isInteger(meta.end_anchor_index) ? Number(meta.end_anchor_index) : undefined;
          if (hasArrowFlag && [startX, startY, endX, endY].every((v) => typeof v === 'number')) {
            arrows.push({
              id: obj.id,
              start: { x: startX, y: startY },
              end: { x: endX, y: endY },
              startAnchor:
                startTileId && startAnchorEdge && typeof startAnchorIndex === 'number'
                  ? {
                      tileId: startTileId,
                      edge: startAnchorEdge,
                      edgeIndex: startAnchorIndex,
                    }
                  : undefined,
              endAnchor:
                endTileId && endAnchorEdge && typeof endAnchorIndex === 'number'
                  ? {
                      tileId: endTileId,
                      edge: endAnchorEdge,
                      edgeIndex: endAnchorIndex,
                    }
                  : undefined,
            });
          }
        });
        setIconsBySpace((prev) => ({ ...prev, [spaceId]: mapped }));
        setArrowsBySpace((prev) => ({ ...prev, [spaceId]: arrows }));
      })
      .catch((err) => {
        console.error('Failed to load objects for space', spaceId, err);
      });
  }, [selectedSpace?.id]);

  // Refresh link metadata once per space load to keep titles/favicons current.
  useEffect(() => {
    const spaceId = selectedSpace?.id;
    if (!spaceId) return;

    const alreadyRefreshed = refreshedLinksRef.current.get(spaceId) || new Set<string>();
    const icons = iconsBySpace[spaceId] || [];
    const linksNeedingRefresh = icons.filter(
      (icon) => icon.type === 'link' && icon.url && !alreadyRefreshed.has(icon.id)
    );

    if (!linksNeedingRefresh.length) return;

    let cancelled = false;
    const timers: number[] = [];

    linksNeedingRefresh.forEach((icon, idx) => {
      const timer = window.setTimeout(async () => {
        if (cancelled || !selectedSpace?.id) return;

        try {
          const params = new URLSearchParams({ url: icon.url || '' });
          const response = await fetch(`${API_BASE}/metadata/url?${params.toString()}`);
          if (!response.ok) return;

          const metadata = await response.json();
          const resolvedUrl = metadata.resolved_url || icon.url || '';
          const updatedTitle = resolveLinkTitle(
            metadata.title || metadata.og_title || icon.defaultTitle || icon.title,
            resolvedUrl
          );
          const updatedDescription =
            metadata.description || metadata.og_description || icon.defaultDescription || icon.description || '';
          const updatedFavicon = pickFavicon(metadata, resolvedUrl, icon.url || '');
          const updatedChannelName = metadata.channel_name || icon.channelName;

          setIconsBySpace((prev) => {
            const current = prev[spaceId] || [];
            return {
              ...prev,
              [spaceId]: current.map((i) =>
                i.id === icon.id
                  ? {
                      ...i,
                      defaultTitle: updatedTitle,
                      defaultDescription: updatedDescription,
                      title: i.customTitle ? i.title : updatedTitle,
                      description: i.customDescription ?? updatedDescription,
                      channelName: updatedChannelName,
                      faviconUrl: updatedFavicon,
                      url: resolvedUrl,
                    }
                  : i
              ),
            };
          });

          await objectsApi.updateLink(icon.id, resolvedUrl, updatedTitle, updatedDescription, updatedFavicon);
          window.dispatchEvent(new CustomEvent('link:updated', {
            detail: {
              linkId: icon.id,
              channelName: updatedChannelName,
            },
          }));
        } catch (err) {
          console.error('[METADATA_REFRESH] Failed to refresh link metadata:', err);
        } finally {
          const set = refreshedLinksRef.current.get(spaceId) || new Set<string>();
          set.add(icon.id);
          refreshedLinksRef.current.set(spaceId, set);
        }
      }, idx * 150); // slight stagger to avoid burst

      timers.push(timer);
    });

    return () => {
      cancelled = true;
      timers.forEach((t) => window.clearTimeout(t));
    };
  }, [iconsBySpace, selectedSpace?.id]);

  // Listen for tile updates from preview pane
  useEffect(() => {
    const handleTileUpdated = (e: Event) => {
      const customEvent = e as CustomEvent<{ tileId: string; title: string; content: string }>;
      const { tileId, title, content } = customEvent.detail;

      if (!selectedSpace) return;

      setIconsBySpace((prev) => {
        const current = prev[selectedSpace.id] || [];
        return {
          ...prev,
          [selectedSpace.id]: current.map((icon) =>
            icon.id === tileId
              ? { ...icon, title, content, description: content.substring(0, 100) }
              : icon
          ),
        };
      });
    };

    window.addEventListener('tile:updated', handleTileUpdated);
    return () => window.removeEventListener('tile:updated', handleTileUpdated);
  }, [selectedSpace, setIconsBySpace]);

  // Sync link updates (title/description/custom/default) from other UI surfaces (e.g., sidebar)
  useEffect(() => {
    const handleLinkUpdated = (e: Event) => {
      const customEvent = e as CustomEvent<{
        linkId: string;
        title?: string;
        description?: string;
        url?: string;
        defaultTitle?: string;
        defaultDescription?: string;
        customTitle?: string | null;
        customDescription?: string | null;
        faviconUrl?: string;
        channelName?: string;
      }>;
      const {
        linkId,
        title,
        description,
        url,
        defaultTitle,
        defaultDescription,
        customTitle,
        customDescription,
        faviconUrl,
        channelName,
      } = customEvent.detail;

      if (!selectedSpace) return;

      setIconsBySpace((prev) => {
        const current = prev[selectedSpace.id] || [];
        return {
          ...prev,
          [selectedSpace.id]: current.map((icon) =>
            icon.id === linkId
              ? (() => {
                  if (icon.type !== 'link') {
                    return {
                      ...icon,
                      title: title ?? icon.title,
                      description: description ?? icon.description,
                      url: url ?? icon.url,
                      defaultTitle: defaultTitle ?? icon.defaultTitle,
                      defaultDescription: defaultDescription ?? icon.defaultDescription,
                      customTitle: customTitle ?? icon.customTitle ?? null,
                      customDescription: customDescription ?? icon.customDescription ?? null,
                      faviconUrl: faviconUrl ?? icon.faviconUrl,
                      channelName: channelName ?? icon.channelName,
                    };
                  }

                  const nextUrl = url ?? icon.url;
                  const nextCustomTitleRaw = customTitle ?? icon.customTitle ?? null;
                  const nextCustomTitle =
                    typeof nextCustomTitleRaw === 'string'
                      ? decodeLinkTitleText(nextCustomTitleRaw)
                      : null;
                  const nextDefaultTitle = resolveLinkTitle(
                    defaultTitle ?? icon.defaultTitle ?? icon.title,
                    nextUrl
                  );
                  const nextDisplayTitle = nextCustomTitle
                    || resolveLinkTitle(title ?? nextDefaultTitle ?? icon.title, nextUrl);

                  return {
                    ...icon,
                    title: nextDisplayTitle,
                    description: description ?? icon.description,
                    url: nextUrl,
                    defaultTitle: nextDefaultTitle,
                    defaultDescription: defaultDescription ?? icon.defaultDescription,
                    customTitle: nextCustomTitle,
                    customDescription: customDescription ?? icon.customDescription ?? null,
                    faviconUrl: faviconUrl ?? icon.faviconUrl,
                    channelName: channelName ?? icon.channelName,
                  };
                })()
              : icon
          ),
        };
      });
    };

    window.addEventListener('link:updated', handleLinkUpdated);
    return () => window.removeEventListener('link:updated', handleLinkUpdated);
  }, [selectedSpace, setIconsBySpace]);

  // Handle keyboard delete for selected icon
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const primarySelectedId = selectedIconIds[0];
      if ((e.key === 'Delete' || e.key === 'Backspace') && primarySelectedId && selectedSpace) {
        const target = e.target as HTMLElement;
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;

        e.preventDefault();

        console.log('[DELETE] Removing icon from canvas:', primarySelectedId);

        // Find the tile to save to history
        const tileToDelete = (iconsBySpace[selectedSpace.id] || []).find((i) => i.id === primarySelectedId);
        const connectedArrows = (arrowsBySpace[selectedSpace.id] || [])
          .filter((arrow) => arrow.startAnchor?.tileId === primarySelectedId || arrow.endAnchor?.tileId === primarySelectedId)
          .map(toArrowUndoPayload);
        if (tileToDelete) {
          // Keep keyboard delete in both local undo store and server undo log
          const isTextTile = tileToDelete.type === 'text';
          const tileEventPayload = {
            id: tileToDelete.id,
            type: tileToDelete.type,
            title: tileToDelete.title,
            x: tileToDelete.x,
            y: tileToDelete.y,
            tag: tileToDelete.tag,
            url: tileToDelete.url,
            description: tileToDelete.description,
            faviconUrl: tileToDelete.faviconUrl,
            filePath: tileToDelete.filePath,
            serviceKey: tileToDelete.serviceKey,
            service: tileToDelete.service,
            content: tileToDelete.content,
          };
          const textEventPayload = {
            id: tileToDelete.id,
            title: tileToDelete.title,
            content: tileToDelete.content || '',
            x: tileToDelete.x,
            y: tileToDelete.y,
          };

          // Local history store
          addEvent(
            isTextTile
              ? { type: 'text_delete', spaceId: selectedSpace.id, text: textEventPayload }
              : { type: 'tile_delete', spaceId: selectedSpace.id, tile: tileEventPayload }
          );

          // Persist undo event to backend
          undoApi
            .createEvent(selectedSpace.id, {
              event_type: isTextTile ? 'text_delete' : 'tile_delete',
              event_data: isTextTile
                ? { text: textEventPayload, deleted_arrows: connectedArrows }
                : { tile: tileEventPayload, deleted_arrows: connectedArrows },
            })
            .catch((err) => console.error('Failed to create undo event:', err));
        }

        // Dispatch event before deleting to notify preview pane
        window.dispatchEvent(new CustomEvent('tile:deleted', { detail: { tileId: primarySelectedId } }));

        setIconsBySpace((prev) => ({
          ...prev,
          [selectedSpace.id]: (prev[selectedSpace.id] || []).filter((i) => i.id !== primarySelectedId),
        }));

        objectsApi.markDeleted(primarySelectedId).catch((err) => {
          console.error('Failed to mark object deleted:', err);
        });
        setSelectedIconIds([]);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedIconIds, selectedSpace, iconsBySpace, arrowsBySpace, addEvent]);

  return {
    isDragOver,
    setIsDragOver,
    iconsBySpace,
    setIconsBySpace,
    arrowsBySpace,
    setArrowsBySpace,
    selectedIconId: selectedIconIds[0] ?? null,
    setSelectedIconId: (id: string | null) => setSelectedIconIds(id ? [id] : []),
    selectedIconIds,
    setSelectedIconIds,
    dragGhost,
    setDragGhost,
    selectedSpace,
    contentHeight,
  };
};

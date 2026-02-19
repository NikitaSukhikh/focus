/**
 * CenterPane Drag & Drop Hook
 *
 * Purpose: Handles all drag and drop operations on the center pane canvas
 * Responsibilities:
 * - Processing drag enter/over/leave/drop events
 * - Auto-scrolling when dragging near canvas edges
 * - Handling existing icon repositioning (move operations)
 * - Handling saved link drops from sidebar
 * - Handling new integration drops (Gmail, Drive, Telegram, links, etc.)
 * - Creating optimistic UI updates with backend sync
 * - Building payloads for different object types
 * - Managing scroll position during drag operations
 */

import { useRef, useCallback, useEffect } from 'react';
import { objectsApi, ObjectCreatePayload } from '@/api/objects';
import { undoApi } from '@/api/undo';
import { buildFaviconUrl } from '@/utils/favicon';
import { deriveLinkTitleFromUrl, resolveLinkTitle } from '@/utils/text';
import { DroppedIcon, IconKind } from '@/components/layout/centerpane/types';
import { useDebouncedPositionUpdate } from '@/hooks/useDebouncedPositionUpdate';
import { normalizeTag } from '@/types/tags';
import { getVideoTilePadding } from '@/components/layout/centerpane/tileBounds';
import { resolveObjectUrl } from '@/components/layout/centerpane/utils';

interface DragDropParams {
  selectedSpace: any;
  paneRef: React.RefObject<HTMLDivElement | null>;
  setIsDragOver: (value: boolean) => void;
  setIconsBySpace: React.Dispatch<React.SetStateAction<Record<string, DroppedIcon[]>>>;
  clampToBoundaries: (x: number, y: number) => { x: number; y: number };
  clampToBoundariesWithPadding: (x: number, y: number, paddingX?: number, paddingY?: number) => { x: number; y: number };
  getIconById: (id: string) => DroppedIcon | undefined;
  setDragGhost: (ghost: { id: string; x: number; y: number; type: IconKind } | null) => void;
  zoom: number;
}

export const useCenterPaneDragDrop = ({
  selectedSpace,
  paneRef,
  setIsDragOver,
  setIconsBySpace,
  clampToBoundaries,
  clampToBoundariesWithPadding,
  getIconById,
  setDragGhost,
  zoom,
}: DragDropParams) => {
  const autoScrollIntervalRef = useRef<number | null>(null);
  const dragStartScrollTopRef = useRef<number>(0);
  const dragDepthRef = useRef<number>(0);
  const activeTileDragRef = useRef<{
    iconId: string;
    spaceId: string;
    startX: number;
    startY: number;
    droppedInPane: boolean;
  } | null>(null);
  const { updatePosition } = useDebouncedPositionUpdate();
  const safeZoom = Math.max(zoom, 0.01);

  type DragStartData = {
    startCursorX: number;
    startCursorY: number;
    iconX: number;
    iconY: number;
    startScrollTop: number;
  };

  const parseDragStart = (raw: string, fallback: DragStartData): DragStartData => {
    try {
      const parsed = JSON.parse(raw);
      return {
        startCursorX: parsed.startCursorX ?? fallback.startCursorX,
        startCursorY: parsed.startCursorY ?? fallback.startCursorY,
        iconX: parsed.iconX ?? fallback.iconX,
        iconY: parsed.iconY ?? fallback.iconY,
        startScrollTop: parsed.startScrollTop ?? fallback.startScrollTop,
      };
    } catch {
      return fallback;
    }
  };

  const handleAutoScroll = useCallback((clientY: number) => {
    if (!paneRef.current) return;

    const SCROLL_ZONE = 50;
    const SCROLL_SPEED = 10;

    const rect = paneRef.current.getBoundingClientRect();
    const distanceFromTop = clientY - rect.top;
    const distanceFromBottom = rect.bottom - clientY;

    if (autoScrollIntervalRef.current) {
      clearInterval(autoScrollIntervalRef.current);
      autoScrollIntervalRef.current = null;
    }

    if (distanceFromTop < SCROLL_ZONE && distanceFromTop > 0) {
      autoScrollIntervalRef.current = window.setInterval(() => {
        if (paneRef.current) {
          paneRef.current.scrollTop = Math.max(0, paneRef.current.scrollTop - SCROLL_SPEED);
        }
      }, 16);
    } else if (distanceFromBottom < SCROLL_ZONE && distanceFromBottom > 0) {
      autoScrollIntervalRef.current = window.setInterval(() => {
        if (paneRef.current) {
          paneRef.current.scrollTop += SCROLL_SPEED;
        }
      }, 16);
    }
  }, [paneRef]);

  const stopAutoScroll = useCallback(() => {
    if (autoScrollIntervalRef.current) {
      clearInterval(autoScrollIntervalRef.current);
      autoScrollIntervalRef.current = null;
    }
  }, []);

  const logTileCreate = useCallback((tile: {
    id: string;
    type: IconKind | string;
    title: string;
    x: number;
    y: number;
    tag?: string;
    url?: string;
    description?: string;
    faviconUrl?: string;
    filePath?: string;
    serviceKey?: string;
    service?: string;
    content?: string;
  }) => {
    if (!selectedSpace) return;
    undoApi
      .createEvent(selectedSpace.id, {
        event_type: 'tile_create',
        event_data: { tile },
      })
      .catch((err) => console.error('Failed to create undo event:', err));
  }, [selectedSpace]);

  const clampToTileBounds = useCallback(
    (x: number, y: number, type?: IconKind, url?: string, filePath?: string) => {
      if (!type) {
        return clampToBoundaries(x, y);
      }

      const padding = getVideoTilePadding(type, url, filePath);
      if (padding) {
        return clampToBoundariesWithPadding(x, y, padding.x, padding.y);
      }

      return clampToBoundaries(x, y);
    },
    [clampToBoundaries, clampToBoundariesWithPadding]
  );

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    console.log('[DRAG] DragEnter event', e.dataTransfer.types);
    dragDepthRef.current += 1;
    const iconId = e.dataTransfer.types.includes('application/x-icon-id');
    e.dataTransfer.dropEffect = iconId ? 'move' : 'copy';
    setIsDragOver(true);

    if (paneRef.current) {
      dragStartScrollTopRef.current = paneRef.current.scrollTop;
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const iconId = e.dataTransfer.types.includes('application/x-icon-id');
    e.dataTransfer.dropEffect = iconId ? 'move' : 'copy';

   // Update ghost position for existing icon drags
    if (iconId && paneRef.current) {
      const draggedId = e.dataTransfer.getData('application/x-icon-id');
      const startData = e.dataTransfer.getData('application/x-drag-start');
      const dragStart = parseDragStart(startData, {
        startCursorX: e.clientX,
        startCursorY: e.clientY,
        iconX: 0,
        iconY: 0,
        startScrollTop: dragStartScrollTopRef.current ?? paneRef.current.scrollTop ?? 0,
      });

      const deltaX = (e.clientX - dragStart.startCursorX) / safeZoom;
      const deltaY = (e.clientY - dragStart.startCursorY) / safeZoom;
      const scrollDelta = paneRef.current.scrollTop - dragStart.startScrollTop;
      const targetX = dragStart.iconX + deltaX;
      const targetY = dragStart.iconY + deltaY + scrollDelta;
      const draggedIcon = draggedId ? getIconById(draggedId) : undefined;
      const { x, y } = clampToTileBounds(
        targetX,
        targetY,
        draggedIcon?.type,
        draggedIcon?.url,
        draggedIcon?.filePath
      );
      if (draggedIcon) {
        if (selectedSpace && (!activeTileDragRef.current || activeTileDragRef.current.iconId !== draggedId)) {
          activeTileDragRef.current = {
            iconId: draggedId,
            spaceId: selectedSpace.id,
            startX: dragStart.iconX,
            startY: dragStart.iconY,
            droppedInPane: false,
          };
        }

        if (selectedSpace) {
          setIconsBySpace((prev) => {
            const current = prev[selectedSpace.id] || [];
            let changed = false;
            const next = current.map((icon) =>
              icon.id === draggedId
                ? (() => {
                    if (icon.x === x && icon.y === y) return icon;
                    changed = true;
                    return { ...icon, x, y };
                  })()
                : icon
            );
            if (!changed) return prev;
            return { ...prev, [selectedSpace.id]: next };
          });
        }

        setDragGhost({ id: draggedId, x, y, type: draggedIcon.type });
      }
    }

    handleAutoScroll(e.clientY);
  };

  const handleDragLeave = () => {
    console.log('[DRAG] DragLeave event');
    dragDepthRef.current = Math.max(0, dragDepthRef.current - 1);
    if (dragDepthRef.current === 0) {
      setIsDragOver(false);
      setDragGhost(null);
      stopAutoScroll();
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragDepthRef.current = 0;
    setIsDragOver(false);
    setDragGhost(null);
    stopAutoScroll();

    console.log('[DROP] Drop event triggered', {
      types: e.dataTransfer.types,
      files: e.dataTransfer.files.length,
      items: e.dataTransfer.items?.length,
    });

    if (!paneRef.current || !selectedSpace) {
      console.log('[DROP] Missing paneRef or selectedSpace');
      return;
    }

    const rect = paneRef.current.getBoundingClientRect();

    // Handle existing icon drag
    const iconId = e.dataTransfer.getData('application/x-icon-id');
    if (iconId) {
      if (activeTileDragRef.current?.iconId === iconId) {
        activeTileDragRef.current.droppedInPane = true;
      }

      const startData = e.dataTransfer.getData('application/x-drag-start');
      const dragStart = parseDragStart(startData, {
        startCursorX: e.clientX,
        startCursorY: e.clientY,
        iconX: 0,
        iconY: 0,
        startScrollTop: dragStartScrollTopRef.current ?? paneRef.current.scrollTop ?? 0,
      });

      const deltaX = (e.clientX - dragStart.startCursorX) / safeZoom;
      const deltaY = (e.clientY - dragStart.startCursorY) / safeZoom;
      const scrollDelta = paneRef.current.scrollTop - dragStart.startScrollTop;
      const movedIcon = getIconById(iconId);
      const targetX = dragStart.iconX + deltaX;
      const targetY = dragStart.iconY + deltaY + scrollDelta;
      const { x, y } = clampToTileBounds(
        targetX,
        targetY,
        movedIcon?.type,
        movedIcon?.url,
        movedIcon?.filePath
      );
      const hasMoved = dragStart.iconX !== x || dragStart.iconY !== y;
      const fromX = dragStart.iconX;
      const fromY = dragStart.iconY;

      setIconsBySpace((prev) => ({
        ...prev,
        [selectedSpace.id]: (prev[selectedSpace.id] || []).map((i) =>
          i.id === iconId ? { ...i, x, y } : i
        ),
      }));

      // Debounced position update - UI updates immediately, API call is debounced
      updatePosition(iconId, x, y);

      // Record move for undo/redo history when position actually changes
      if (movedIcon && hasMoved) {
        // Emit backend undo event for tile move
        const isText = movedIcon.type === 'text';
        undoApi
          .createEvent(selectedSpace.id, {
            event_type: isText ? 'text_move' : 'tile_move',
            event_data: {
              ...(isText
                ? {
                    text: {
                      id: movedIcon.id,
                      title: movedIcon.title,
                      content: movedIcon.content || '',
                      x,
                      y,
                    },
                  }
                : {
                    tile: {
                      id: movedIcon.id,
                      type: movedIcon.type,
                      title: movedIcon.title,
                      x,
                      y,
                      width: movedIcon.width,
                      height: movedIcon.height,
                      url: movedIcon.url,
                      description: movedIcon.description,
                      faviconUrl: movedIcon.faviconUrl,
                      filePath: movedIcon.filePath,
                      serviceKey: movedIcon.serviceKey,
                      service: movedIcon.service,
                      content: movedIcon.content,
                    },
                  }),
              from: { x: fromX, y: fromY },
              to: { x, y },
            },
          })
          .catch((err) => console.error('Failed to create tile move undo event:', err));
      }

      activeTileDragRef.current = null;
      return;
    }

    const rawX = (e.clientX - rect.left) / Math.max(zoom, 0.01);
    const rawY = (e.clientY - rect.top + paneRef.current.scrollTop) / Math.max(zoom, 0.01);
    const { x: baseX, y: baseY } = clampToBoundaries(rawX, rawY);

    // Handle file drops
    if (e.dataTransfer.files.length > 0) {
      console.log('[DROP] Handling file drop:', e.dataTransfer.files);
      const files = Array.from(e.dataTransfer.files);

      files.forEach((file, index) => {
        // Get file path from file object using Electron's webUtils API
        let filePath: string;
        try {
          if ((window as any).desktopAPI?.getPathForFile) {
            filePath = (window as any).desktopAPI.getPathForFile(file);
          } else {
            // Fallback for older Electron or development environment
            filePath = (file as any).path || file.name;
          }
        } catch (error) {
          console.error('[DROP] Failed to get file path:', error);
          filePath = file.name;
        }
        const filename = file.name;

        console.log('[DROP] Processing file:', { filename, filePath });

        // Stagger multiple files in a grid
        const offsetX = (index % 3) * 80;
        const offsetY = Math.floor(index / 3) * 80;
        const fileX = baseX + offsetX;
        const fileY = baseY + offsetY;
        const { x: clampedX, y: clampedY } = clampToTileBounds(fileX, fileY, 'file', undefined, filePath);

        const payload: ObjectCreatePayload = {
          type: 'file',
          title: filename,
          file_path: filePath,
          x: clampedX,
          y: clampedY,
        };

        const tempId = `icon-${Date.now()}-${Math.random().toString(16).slice(2)}-${index}`;
        const optimisticIcon: DroppedIcon = {
          id: tempId,
          type: 'file',
          title: filename,
          x: clampedX,
          y: clampedY,
          tag: '',
          filePath: filePath,
        };

        setIconsBySpace((prev) => ({
          ...prev,
          [selectedSpace.id]: [...(prev[selectedSpace.id] || []), optimisticIcon],
        }));

        objectsApi
          .create(selectedSpace.id, payload)
          .then((created) => {
            const meta = (created.metadata || {}) as Record<string, any>;
            const createdFilePath = meta.file_path as string;
            const createdX = typeof meta.x === 'number' ? meta.x : clampedX;
            const createdY = typeof meta.y === 'number' ? meta.y : clampedY;
            const tag = normalizeTag((created as any).tag ?? meta.tag);

            setIconsBySpace((prev) => ({
              ...prev,
              [selectedSpace.id]: (prev[selectedSpace.id] || []).map((i) =>
                i.id === tempId ? { ...i, id: created.id, filePath: createdFilePath, x: createdX, y: createdY, tag } : i
              ),
            }));

            logTileCreate({
              id: created.id,
              type: 'file',
              title: filename,
              x: createdX,
              y: createdY,
              tag,
              filePath: createdFilePath,
              service: (meta.service as string | undefined),
              serviceKey: created.description,
            });
          })
          .catch((err) => {
            console.error('Failed to create file object:', err);
            setIconsBySpace((prev) => ({
              ...prev,
              [selectedSpace.id]: (prev[selectedSpace.id] || []).filter((i) => i.id !== tempId),
            }));
          });
      });
      return;
    }

    // Handle new integration drop
    const rawJson = e.dataTransfer.getData('application/json');

    const uriFallback = e.dataTransfer.getData('text/uri-list') || e.dataTransfer.getData('text/plain');

    const buildPayload = (position: { x: number; y: number }): ObjectCreatePayload => {
      if (rawJson) {
        try {
          const payload = JSON.parse(rawJson);
          const provider = (payload?.provider || payload?.source || '').toString().toLowerCase();
          const key = (payload?.key || '').toString().toLowerCase();
          const label = payload?.label || payload?.title || 'Integration';

          if (provider === 'telegram') {
            return {
              type: 'text',
              title: label,
              content: 'Telegram integration',
              description: payload?.description,
              service: 'telegram',
              x: position.x,
              y: position.y,
            };
          }
          if (provider === 'intstorage') {
            return {
              type: 'text',
              title: label,
              content: 'Internal storage integration',
              description: payload?.description,
              service: 'intstorage',
              x: position.x,
              y: position.y,
            };
          }
          if (provider.includes('gmail') || key.includes('gmail')) {
            const threadId = payload?.thread_id || crypto.randomUUID?.() || Date.now().toString();
            return {
              type: 'gmail',
              title: label,
              thread_id: threadId,
              message_id: payload?.message_id || crypto.randomUUID?.() || `${Date.now()}-msg`,
              subject: payload?.subject || label,
              sender: payload?.sender || 'unknown@example.com',
              snippet: payload?.snippet || '',
              url: payload?.url || `https://mail.google.com/mail/u/0/#inbox/${threadId}`,
              x: position.x,
              y: position.y,
            };
          }
          if (provider.includes('drive') || key.includes('drive') ||
              key.includes('sheets') || key.includes('docs') || key.includes('slides') ||
              provider === 'google') {
            const drivePayload: any = {
              type: 'google_drive',
              title: label,
              drive_file_id: payload?.drive_file_id || payload?.id || `${Date.now()}`,
              drive_file_name: payload?.drive_file_name || payload?.name || label,
              mime_type: payload?.mime_type,
              web_view_link: payload?.url || payload?.web_view_link,
              x: position.x,
              y: position.y,
            };
            if (key) {
              drivePayload.description = key;
            }
            return drivePayload as ObjectCreatePayload;
          }
          if (payload?.url && !payload?.source) {
            const favicon_url = buildFaviconUrl(payload.url);
            return {
              type: 'link',
              title: resolveLinkTitle(label, payload.url),
              url: payload.url,
              description: payload.description,
              favicon_url,
              x: position.x,
              y: position.y,
            };
          }
          return {
            type: 'text',
            title: label,
            content: label,
            x: position.x,
            y: position.y,
          };
        } catch {
          // ignore
        }
      }

      if (uriFallback) {
        const url = uriFallback.trim();
        if (url.startsWith('http')) {
          const favicon_url = buildFaviconUrl(url);
          return { type: 'link', title: deriveLinkTitleFromUrl(url), url, x: position.x, y: position.y, favicon_url };
        }
        return { type: 'text', title: url, content: url, x: position.x, y: position.y };
      }

      return { type: 'text', title: 'Integration', content: 'Integration', x: position.x, y: position.y };
    };

    const basePayload = buildPayload({ x: rawX, y: rawY });
    const payloadKind: IconKind = basePayload.type === 'link'
      ? 'link'
      : basePayload.type === 'file'
      ? 'file'
      : 'unknown';
    const payloadUrl = basePayload.type === 'link' ? (basePayload as any).url : undefined;
    const payloadFilePath = basePayload.type === 'file' ? (basePayload as any).file_path : undefined;
    const { x, y } = clampToTileBounds(rawX, rawY, payloadKind, payloadUrl, payloadFilePath);
    const payload: ObjectCreatePayload = { ...basePayload, x, y };

    let serviceKey: string | undefined;
    let dragPayloadData: any;
    try {
      dragPayloadData = JSON.parse(rawJson);
      serviceKey = dragPayloadData?.key;
    } catch {
      // Ignore
    }

    const tempId = `icon-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const optimisticType: IconKind =
      payload.service === 'telegram' ? 'telegram' :
      payload.service === 'intstorage' ? 'intstorage' :
      payload.type === 'gmail' ? 'gmail' :
      payload.type === 'google_drive' ? (
        serviceKey === 'sheets' ? 'google_sheets' :
        serviceKey === 'docs' ? 'google_docs' :
        serviceKey === 'slides' ? 'google_slides' :
        'google_drive'
      ) :
      payload.type === 'link' ? 'link' :
      payload.type === 'file' ? 'file' :
      payload.type === 'text' ? 'text' : 'unknown';
    const optimisticUrl = (
      payload.type === 'link'
      || payload.type === 'gmail'
      || payload.type === 'google_drive'
      || payload.type === 'web_article'
    )
      ? resolveObjectUrl({
          type: payload.type,
          metadata: {
            url: (payload as any).url,
            web_view_link: (payload as any).web_view_link,
            thread_id: (payload as any).thread_id,
          },
        })
      : undefined;
    const optimisticIcon: DroppedIcon = {
      id: tempId,
      type: optimisticType,
      title: payload.title,
      x,
      y,
      tag: '',
      serviceKey,
      url: optimisticUrl,
      description: payload.description,
      faviconUrl: optimisticUrl ? (payload as any).favicon_url || buildFaviconUrl(optimisticUrl) : undefined,
    };
    setIconsBySpace((prev) => {
      const current = prev[selectedSpace.id] || [];
      return { ...prev, [selectedSpace.id]: [...current, optimisticIcon] };
    });

    objectsApi
      .create(selectedSpace.id, payload)
      .then((created) => {
        const createdServiceKey = created.description;
        const iconType: IconKind =
          (created.metadata as any)?.service === 'telegram'
            ? 'telegram'
            : (created.metadata as any)?.service === 'intstorage'
            ? 'intstorage'
            : created.type === 'gmail'
            ? 'gmail'
            : created.type === 'google_drive'
            ? (
              createdServiceKey === 'sheets' ? 'google_sheets' :
              createdServiceKey === 'docs' ? 'google_docs' :
              createdServiceKey === 'slides' ? 'google_slides' :
              'google_drive'
            )
            : created.type === 'link'
            ? 'link'
            : created.type === 'file'
            ? 'file'
            : created.type === 'text'
            ? ((created.metadata as any)?.service === 'telegram' ? 'telegram' : (created.metadata as any)?.service === 'intstorage' ? 'intstorage' : 'text')
            : 'unknown';

        const meta = (created.metadata || {}) as Record<string, any>;
        const finalX = typeof meta.x === 'number' ? meta.x : x;
        const finalY = typeof meta.y === 'number' ? meta.y : y;
        const finalUrl = (
          created.type === 'link'
          || created.type === 'gmail'
          || created.type === 'google_drive'
          || created.type === 'web_article'
        )
          ? resolveObjectUrl({ type: created.type, metadata: meta })
          : undefined;
        const finalDescription = created.type !== 'google_drive' ? created.description : undefined;
        const finalFavicon = (created.type === 'link' || created.type === 'gmail' || created.type === 'google_drive')
          ? (meta.favicon_url as string | undefined) || (finalUrl ? buildFaviconUrl(finalUrl) : undefined)
          : undefined;
        const finalTitle =
          created.type === 'link'
            ? resolveLinkTitle(created.title, finalUrl)
            : created.title;
        const finalService = (meta.service as string | undefined) || payload.service;
        const finalServiceKey = created.description;
        const tag = normalizeTag((created as any).tag ?? meta.tag);

        setIconsBySpace((prev) => {
          const current = (prev[selectedSpace.id] || []).filter((i) => i.id !== tempId);
          return {
            ...prev,
            [selectedSpace.id]: [
              ...current,
              {
                id: created.id,
                type: iconType,
                title: finalTitle,
                x: finalX,
                y: finalY,
                tag,
                serviceKey: finalServiceKey,
                url: finalUrl,
                description: finalDescription,
                faviconUrl: finalFavicon,
              },
            ],
          };
        });

        logTileCreate({
          id: created.id,
          type: iconType,
          title: finalTitle,
          x: finalX,
          y: finalY,
          url: finalUrl,
          description: finalDescription,
          faviconUrl: finalFavicon,
          filePath: (meta.file_path as string | undefined),
          service: finalService,
          serviceKey: finalServiceKey,
          content: (meta.content as string | undefined),
          tag,
        });

        // Notify other components that a link was created
        if (created.type === 'link') {
          window.dispatchEvent(new CustomEvent('link:created', { detail: { linkId: created.id } }));
        }
      })
      .catch((err) => {
        console.error('Failed to create object from drop:', err);
        setIconsBySpace((prev) => ({
          ...prev,
          [selectedSpace.id]: (prev[selectedSpace.id] || []).filter((i) => i.id !== tempId),
        }));
      });
  };

  // Ensure drag state is cleaned up even if the drag ends outside the canvas
  useEffect(() => {
    const clearGlobalDragUiState = () => {
      dragDepthRef.current = 0;
      setIsDragOver(false);
      setDragGhost(null);
      stopAutoScroll();
    };

    const handleGlobalDrop = () => {
      clearGlobalDragUiState();
    };

    const handleGlobalDragEnd = () => {
      const activeDrag = activeTileDragRef.current;
      if (activeDrag && !activeDrag.droppedInPane) {
        setIconsBySpace((prev) => {
          const current = prev[activeDrag.spaceId] || [];
          const next = current.map((icon) =>
            icon.id === activeDrag.iconId
              ? { ...icon, x: activeDrag.startX, y: activeDrag.startY }
              : icon
          );
          return { ...prev, [activeDrag.spaceId]: next };
        });
      }
      activeTileDragRef.current = null;
      clearGlobalDragUiState();
    };

    window.addEventListener('dragend', handleGlobalDragEnd, true);
    window.addEventListener('drop', handleGlobalDrop, true);
    return () => {
      window.removeEventListener('dragend', handleGlobalDragEnd, true);
      window.removeEventListener('drop', handleGlobalDrop, true);
    };
  }, [setDragGhost, setIconsBySpace, setIsDragOver, stopAutoScroll]);

  return {
    handleDragEnter,
    handleDragOver,
    handleDragLeave,
    handleDrop,
  };
};

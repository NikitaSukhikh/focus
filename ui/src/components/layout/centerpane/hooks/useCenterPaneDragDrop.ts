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

import { useRef, useCallback } from 'react';
import { objectsApi, ObjectCreatePayload } from '../../../../api/objects';
import { buildFaviconUrl } from '../../../../utils/favicon';
import { DroppedIcon, IconKind } from '../types';
import { isGmailUrl } from '../utils';

interface DragDropParams {
  selectedIsland: any;
  paneRef: React.RefObject<HTMLDivElement | null>;
  setIsDragOver: (value: boolean) => void;
  setIconsByIsland: React.Dispatch<React.SetStateAction<Record<string, DroppedIcon[]>>>;
  clampToBoundaries: (x: number, y: number) => { x: number; y: number };
  getIconById: (id: string) => DroppedIcon | undefined;
  setDragGhost: (ghost: { id: string; x: number; y: number; type: IconKind } | null) => void;
  zoom: number;
}

export const useCenterPaneDragDrop = ({
  selectedIsland,
  paneRef,
  setIsDragOver,
  setIconsByIsland,
  clampToBoundaries,
  getIconById,
  setDragGhost,
  zoom,
}: DragDropParams) => {
  const autoScrollIntervalRef = useRef<number | null>(null);
  const dragStartScrollTopRef = useRef<number>(0);

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

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    console.log('[DRAG] DragEnter event', e.dataTransfer.types);
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
      const rect = paneRef.current.getBoundingClientRect();
      const draggedId = e.dataTransfer.getData('application/x-icon-id');
      const startData = e.dataTransfer.getData('application/x-drag-start');
      let dragStart = { startCursorX: 0, startCursorY: 0, iconX: 0, iconY: 0 };
      try {
        if (startData) {
          dragStart = JSON.parse(startData);
        }
      } catch {
        // ignore
      }
      const deltaX = (e.clientX - dragStart.startCursorX) / Math.max(zoom, 0.01);
      const deltaY = (e.clientY - dragStart.startCursorY) / Math.max(zoom, 0.01);
      const scrollDelta = paneRef.current.scrollTop - dragStartScrollTopRef.current;
      const targetX = dragStart.iconX + deltaX;
      const targetY = dragStart.iconY + deltaY + scrollDelta;
      const { x, y } = clampToBoundaries(targetX, targetY);
      const draggedIcon = draggedId ? getIconById(draggedId) : undefined;
      if (draggedIcon) {
        setDragGhost({ id: draggedId, x, y, type: draggedIcon.type });
      }
    }

    handleAutoScroll(e.clientY);
  };

  const handleDragLeave = () => {
    console.log('[DRAG] DragLeave event');
    setIsDragOver(false);
    setDragGhost(null);
    stopAutoScroll();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    setDragGhost(null);
    stopAutoScroll();

    console.log('[DROP] Drop event triggered', {
      types: e.dataTransfer.types,
      files: e.dataTransfer.files.length,
      items: e.dataTransfer.items?.length,
    });

    if (!paneRef.current || !selectedIsland) {
      console.log('[DROP] Missing paneRef or selectedIsland');
      return;
    }

    const rect = paneRef.current.getBoundingClientRect();

    // Handle existing icon drag
    const iconId = e.dataTransfer.getData('application/x-icon-id');
    if (iconId) {
      const startData = e.dataTransfer.getData('application/x-drag-start');
      let dragStart = { startCursorX: 0, startCursorY: 0, iconX: 0, iconY: 0 };
      try {
        if (startData) {
          dragStart = JSON.parse(startData);
        }
      } catch {
        // Ignore
      }

      const deltaX = e.clientX - dragStart.startCursorX;
      const deltaY = e.clientY - dragStart.startCursorY;
      const scrollDelta = paneRef.current.scrollTop - dragStartScrollTopRef.current;
      const targetX = dragStart.iconX + deltaX;
      const targetY = dragStart.iconY + deltaY + scrollDelta;
      const { x, y } = clampToBoundaries(targetX, targetY);

      setIconsByIsland((prev) => ({
        ...prev,
        [selectedIsland.id]: (prev[selectedIsland.id] || []).map((i) =>
          i.id === iconId ? { ...i, x, y } : i
        ),
      }));

      objectsApi.updatePosition(iconId, x, y).catch((err) => {
        console.error('Failed to update position:', err);
      });
      return;
    }

    const targetX = (e.clientX - rect.left) / Math.max(zoom, 0.01);
    const targetY = (e.clientY - rect.top + paneRef.current.scrollTop) / Math.max(zoom, 0.01);
    const { x, y } = clampToBoundaries(targetX, targetY);

    // Handle file drops
    if (e.dataTransfer.files.length > 0) {
      console.log('[DROP] Handling file drop:', e.dataTransfer.files);
      const files = Array.from(e.dataTransfer.files);

      files.forEach((file, index) => {
        // Get file path from file object
        const filePath = (file as any).path || file.name;
        const filename = file.name;

        console.log('[DROP] Processing file:', { filename, filePath });

        // Stagger multiple files in a grid
        const offsetX = (index % 3) * 80;
        const offsetY = Math.floor(index / 3) * 80;
        const fileX = x + offsetX;
        const fileY = y + offsetY;
        const { x: clampedX, y: clampedY } = clampToBoundaries(fileX, fileY);

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
          filePath: filePath,
        };

        setIconsByIsland((prev) => ({
          ...prev,
          [selectedIsland.id]: [...(prev[selectedIsland.id] || []), optimisticIcon],
        }));

        objectsApi
          .create(selectedIsland.id, payload)
          .then((created) => {
            const meta = (created.metadata || {}) as Record<string, any>;
            const createdFilePath = meta.file_path as string;

            setIconsByIsland((prev) => ({
              ...prev,
              [selectedIsland.id]: (prev[selectedIsland.id] || []).map((i) =>
                i.id === tempId ? { ...i, id: created.id, filePath: createdFilePath } : i
              ),
            }));
          })
          .catch((err) => {
            console.error('Failed to create file object:', err);
            setIconsByIsland((prev) => ({
              ...prev,
              [selectedIsland.id]: (prev[selectedIsland.id] || []).filter((i) => i.id !== tempId),
            }));
          });
      });
      return;
    }

    // Handle new integration drop
    const rawJson = e.dataTransfer.getData('application/json');

    const uriFallback = e.dataTransfer.getData('text/uri-list') || e.dataTransfer.getData('text/plain');

    const buildPayload = (): ObjectCreatePayload => {
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
              x,
              y,
            };
          }
          if (provider === 'intstorage') {
            return {
              type: 'text',
              title: label,
              content: 'Internal storage integration',
              description: payload?.description,
              service: 'intstorage',
              x,
              y,
            };
          }
          if (provider.includes('gmail') || key.includes('gmail')) {
            return {
              type: 'gmail',
              title: label,
              thread_id: payload?.thread_id || crypto.randomUUID?.() || Date.now().toString(),
              message_id: payload?.message_id || crypto.randomUUID?.() || `${Date.now()}-msg`,
              subject: payload?.subject || label,
              sender: payload?.sender || 'unknown@example.com',
              snippet: payload?.snippet || '',
              x,
              y,
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
              x,
              y,
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
              title: label || payload.url,
              url: payload.url,
              description: payload.description,
              favicon_url,
              x,
              y,
            };
          }
          return {
            type: 'text',
            title: label,
            content: label,
            x,
            y,
          };
        } catch {
          // ignore
        }
      }

      if (uriFallback) {
        const url = uriFallback.trim();
        if (url.startsWith('http')) {
          const favicon_url = buildFaviconUrl(url);
          return { type: 'link', title: url, url, x, y, favicon_url };
        }
        return { type: 'text', title: url, content: url, x, y };
      }

      return { type: 'text', title: 'Integration', content: 'Integration', x, y };
    };

    const payload = buildPayload();

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
    const optimisticIcon: DroppedIcon = {
      id: tempId,
      type: optimisticType,
      title: payload.title,
      x,
      y,
      serviceKey,
      url: payload.type === 'link' ? (payload as any).url : undefined,
      description: payload.description,
      faviconUrl: payload.type === 'link' ? (payload as any).favicon_url || buildFaviconUrl((payload as any).url) : undefined,
    };
    setIconsByIsland((prev) => {
      const current = prev[selectedIsland.id] || [];
      return { ...prev, [selectedIsland.id]: [...current, optimisticIcon] };
    });

    objectsApi
      .create(selectedIsland.id, payload)
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
        const finalUrl = created.type === 'link' ? (meta.url as string) : undefined;
        const finalDescription = created.type !== 'google_drive' ? created.description : undefined;
        const finalFavicon = created.type === 'link'
          ? (meta.favicon_url as string | undefined) || (finalUrl ? buildFaviconUrl(finalUrl) : undefined)
          : undefined;

        setIconsByIsland((prev) => {
          const current = (prev[selectedIsland.id] || []).filter((i) => i.id !== tempId);
          return {
            ...prev,
            [selectedIsland.id]: [
              ...current,
              {
                id: created.id,
                type: iconType,
                title: created.title,
                x: finalX,
                y: finalY,
                serviceKey: createdServiceKey,
                url: finalUrl,
                description: finalDescription,
                faviconUrl: finalFavicon,
              },
            ],
          };
        });

        // Notify other components that a link was created
        if (created.type === 'link') {
          window.dispatchEvent(new CustomEvent('link:created', { detail: { linkId: created.id } }));
        }
      })
      .catch((err) => {
        console.error('Failed to create object from drop:', err);
      });
  };

  return {
    handleDragEnter,
    handleDragOver,
    handleDragLeave,
    handleDrop,
  };
};

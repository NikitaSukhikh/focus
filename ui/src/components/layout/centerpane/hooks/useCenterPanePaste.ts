/**
 * CenterPane Paste Hook
 *
 * Purpose: Handles smart Ctrl+V paste operations on the center pane canvas
 * Responsibilities:
 * - Listening for paste events (Ctrl+V)
 * - Detecting clipboard content type (local files vs URLs vs plain text)
 * - Creating file tiles for local file paths
 * - Creating link tiles for URLs
 * - Positioning pasted tiles at the center of the viewport
 */

import { useEffect, useCallback } from 'react';
import { objectsApi, ObjectCreatePayload } from '../../../../api/objects';
import { undoApi } from '../../../../api/undo';
import { buildFaviconUrl } from '../../../../utils/favicon';
import { DroppedIcon, IconKind } from '../types';
import { normalizeTag } from '../../../../types/tags';

interface PasteParams {
  selectedSpace: any;
  paneRef: React.RefObject<HTMLDivElement | null>;
  setIconsBySpace: React.Dispatch<React.SetStateAction<Record<string, DroppedIcon[]>>>;
  clampToBoundaries: (x: number, y: number) => { x: number; y: number };
  zoom: number;
}

export const useCenterPanePaste = ({
  selectedSpace,
  paneRef,
  setIconsBySpace,
  clampToBoundaries,
  zoom,
}: PasteParams) => {
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
  }) => {
    if (!selectedSpace) return;
    undoApi
      .createEvent(selectedSpace.id, {
        event_type: 'tile_create',
        event_data: { tile },
      })
      .catch((err) => console.error('Failed to create undo event:', err));
  }, [selectedSpace]);

  const getCenterCanvasPosition = useCallback(() => {
    if (!paneRef.current) return { x: 200, y: 200 };

    const rect = paneRef.current.getBoundingClientRect();
    const scrollLeft = paneRef.current.scrollLeft;
    const scrollTop = paneRef.current.scrollTop;
    const safeZoom = Math.max(zoom, 0.01);

    const centerCanvasX = (rect.width / 2 + scrollLeft) / safeZoom;
    const centerCanvasY = (rect.height / 2 + scrollTop) / safeZoom;

    return clampToBoundaries(centerCanvasX, centerCanvasY);
  }, [paneRef, zoom, clampToBoundaries]);

  const isValidUrl = (text: string): boolean => {
    try {
      const url = new URL(text);
      return url.protocol === 'http:' || url.protocol === 'https:';
    } catch {
      return false;
    }
  };

  const handlePaste = useCallback((e: ClipboardEvent) => {
    // Don't intercept paste events in input fields, textareas, or contenteditable elements
    const target = e.target as HTMLElement;
    if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
      return;
    }

    // Don't handle paste if no space is selected
    if (!selectedSpace || !paneRef.current) {
      return;
    }

    const clipboardData = e.clipboardData;
    if (!clipboardData) return;

    // Check for files first (highest priority)
    if (clipboardData.files.length > 0) {
      e.preventDefault();
      console.log('[PASTE] Handling file paste:', clipboardData.files);

      const { x, y } = getCenterCanvasPosition();
      const files = Array.from(clipboardData.files);

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
          console.error('[PASTE] Failed to get file path:', error);
          filePath = file.name;
        }
        const filename = file.name;

        console.log('[PASTE] Processing file:', { filename, filePath });

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

    // Check for text content (URL or plain text)
    const text = clipboardData.getData('text/plain')?.trim();
    if (text) {
      // Check if it's a valid URL
      if (isValidUrl(text)) {
        e.preventDefault();
        console.log('[PASTE] Handling URL paste:', text);

        const { x, y } = getCenterCanvasPosition();
        const favicon_url = buildFaviconUrl(text);

        const payload: ObjectCreatePayload = {
          type: 'link',
          title: text,
          url: text,
          favicon_url,
          x,
          y,
        };

        const tempId = `icon-${Date.now()}-${Math.random().toString(16).slice(2)}`;
        const optimisticIcon: DroppedIcon = {
          id: tempId,
          type: 'link',
          title: text,
          x,
          y,
          tag: '',
          url: text,
          faviconUrl: favicon_url,
        };

        setIconsBySpace((prev) => ({
          ...prev,
          [selectedSpace.id]: [...(prev[selectedSpace.id] || []), optimisticIcon],
        }));

        objectsApi
          .create(selectedSpace.id, payload)
          .then((created) => {
            const meta = (created.metadata || {}) as Record<string, any>;
            const finalX = typeof meta.x === 'number' ? meta.x : x;
            const finalY = typeof meta.y === 'number' ? meta.y : y;
            const finalUrl = meta.url as string;
            const finalDescription = created.description;
            const finalFavicon = (meta.favicon_url as string | undefined) || buildFaviconUrl(finalUrl);
            const tag = normalizeTag((created as any).tag ?? meta.tag);

            setIconsBySpace((prev) => ({
              ...prev,
              [selectedSpace.id]: (prev[selectedSpace.id] || []).map((i) =>
                i.id === tempId
                  ? {
                      ...i,
                      id: created.id,
                      title: created.title,
                      x: finalX,
                      y: finalY,
                      url: finalUrl,
                      description: finalDescription,
                      faviconUrl: finalFavicon,
                      tag,
                    }
                  : i
              ),
            }));

            logTileCreate({
              id: created.id,
              type: 'link',
              title: created.title,
              x: finalX,
              y: finalY,
              url: finalUrl,
              description: finalDescription,
              faviconUrl: finalFavicon,
              tag,
            });

            // Notify other components that a link was created
            window.dispatchEvent(new CustomEvent('link:created', { detail: { linkId: created.id } }));
          })
          .catch((err) => {
            console.error('Failed to create link object:', err);
            setIconsBySpace((prev) => ({
              ...prev,
              [selectedSpace.id]: (prev[selectedSpace.id] || []).filter((i) => i.id !== tempId),
            }));
          });
      }
      // If it's plain text but not a URL, we don't handle it (let default behavior work)
    }
  }, [selectedSpace, paneRef, setIconsBySpace, clampToBoundaries, getCenterCanvasPosition, logTileCreate]);

  useEffect(() => {
    window.addEventListener('paste', handlePaste, true);
    return () => window.removeEventListener('paste', handlePaste, true);
  }, [handlePaste]);

  return {};
};

/**
 * CenterPane Paste Hook
 *
 * Purpose: Handles smart Ctrl+V paste operations on the center pane canvas
 * Responsibilities:
 * - Listening for paste events (Ctrl+V)
 * - Detecting clipboard content type (local files vs URLs vs plain text)
 * - Creating file tiles for local file paths
 * - Creating link tiles for URLs
 * - Positioning pasted tiles at the cursor (or a bottom-left fallback)
 */

import { useEffect, useCallback } from 'react';
import { objectsApi, ObjectCreatePayload } from '../../../../api/objects';
import { undoApi } from '../../../../api/undo';
import { buildFaviconUrl } from '../../../../utils/favicon';
import { DroppedIcon, IconKind } from '../types';
import { normalizeTag } from '../../../../types/tags';
import { getVideoTilePadding } from '../tileBounds';

interface PasteParams {
  selectedSpace: any;
  paneRef: React.RefObject<HTMLDivElement | null>;
  setIconsBySpace: React.Dispatch<React.SetStateAction<Record<string, DroppedIcon[]>>>;
  iconsBySpace: Record<string, DroppedIcon[]>;
  clampToBoundaries: (x: number, y: number) => { x: number; y: number };
  clampToBoundariesWithPadding: (x: number, y: number, paddingX?: number, paddingY?: number) => { x: number; y: number };
  zoom: number;
  getCursorCanvasPosition: () => { x: number; y: number } | null;
}

type ClipboardFileEntry = {
  filePath: string;
  filename: string;
};

const isValidUrl = (text: string): boolean => {
  try {
    const url = new URL(text);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
};

const toFilePathFromUri = (value: string): string | null => {
  const trimmed = value.trim();
  if (!/^file:\/\//i.test(trimmed)) return null;
  const withoutScheme = trimmed.replace(/^file:\/\//i, '');
  const decoded = decodeURI(withoutScheme);
  if (/^[a-zA-Z]:/.test(decoded)) return decoded;
  if (/^\/[a-zA-Z]:/.test(decoded)) return decoded.slice(1);
  if (decoded.startsWith('/')) return decoded;
  return `//${decoded}`;
};

const isLikelyFilePath = (value: string): boolean => {
  if (/^[a-zA-Z]:[\\/]/.test(value)) return true;
  if (/^\\\\/.test(value)) return true;
  return value.startsWith('/') && !value.startsWith('//');
};

const parseClipboardLines = (text: string): string[] =>
  text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith('#'));

const PASTE_CLEARANCE = 140;

export const useCenterPanePaste = ({
  selectedSpace,
  paneRef,
  setIconsBySpace,
  iconsBySpace,
  clampToBoundaries,
  clampToBoundariesWithPadding,
  zoom,
  getCursorCanvasPosition,
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

  const getBottomLeftPosition = useCallback(() => {
    if (!paneRef.current) return { x: 200, y: 200 };

    const { x: leftBoundary, y: minY } = clampToBoundaries(0, 0);
    const rect = paneRef.current.getBoundingClientRect();
    const scrollTop = paneRef.current.scrollTop;
    const safeZoom = Math.max(zoom, 0.01);
    const viewBottom = (scrollTop + rect.height) / safeZoom;
    const startY = Math.max(minY, viewBottom - PASTE_CLEARANCE);

    const icons = selectedSpace ? iconsBySpace[selectedSpace.id] || [] : [];
    const isOccupied = (x: number, y: number) =>
      icons.some((icon) => Math.hypot(icon.x - x, icon.y - y) < PASTE_CLEARANCE);

    let candidateY = startY;
    const maxAttempts = 12;
    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      if (!isOccupied(leftBoundary, candidateY)) {
        return clampToBoundaries(leftBoundary, candidateY);
      }
      candidateY += PASTE_CLEARANCE;
    }

    return clampToBoundaries(leftBoundary, candidateY);
  }, [paneRef, clampToBoundaries, zoom, selectedSpace, iconsBySpace]);

  const getPasteAnchorPosition = useCallback(() => {
    const cursorPosition = getCursorCanvasPosition();
    if (cursorPosition) {
      return clampToBoundaries(cursorPosition.x, cursorPosition.y);
    }

    return getBottomLeftPosition();
  }, [getCursorCanvasPosition, clampToBoundaries, getBottomLeftPosition]);

  const clampToTileBounds = useCallback(
    (x: number, y: number, type: IconKind, url?: string, filePath?: string) => {
      const padding = getVideoTilePadding(type, url, filePath);
      if (padding) {
        return clampToBoundariesWithPadding(x, y, padding.x, padding.y);
      }
      return clampToBoundaries(x, y);
    },
    [clampToBoundaries, clampToBoundariesWithPadding]
  );

  const getFilePathForClipboardFile = useCallback((file: File): string => {
    try {
      const desktopApi = (window as any).desktopAPI;
      if (desktopApi?.getPathForFile) {
        return desktopApi.getPathForFile(file);
      }
      return (file as any).path || file.name;
    } catch (error) {
      console.error('[PASTE] Failed to get file path:', error);
      return file.name;
    }
  }, []);

  const createFileTiles = useCallback((files: ClipboardFileEntry[]) => {
    if (!selectedSpace || !paneRef.current || files.length === 0) return;

    const { x, y } = getPasteAnchorPosition();
    console.log('[PASTE] Processing file entries:', files);

    files.forEach((file, index) => {
      const offsetX = (index % 3) * 80;
      const offsetY = Math.floor(index / 3) * 80;
      const fileX = x + offsetX;
      const fileY = y + offsetY;
      const { x: clampedX, y: clampedY } = clampToTileBounds(fileX, fileY, 'file', undefined, file.filePath);

      const payload: ObjectCreatePayload = {
        type: 'file',
        title: file.filename,
        file_path: file.filePath,
        x: clampedX,
        y: clampedY,
      };

      const tempId = `icon-${Date.now()}-${Math.random().toString(16).slice(2)}-${index}`;
      const optimisticIcon: DroppedIcon = {
        id: tempId,
        type: 'file',
        title: file.filename,
        x: clampedX,
        y: clampedY,
        tag: '',
        filePath: file.filePath,
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
            title: file.filename,
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
  }, [selectedSpace, paneRef, getPasteAnchorPosition, clampToTileBounds, setIconsBySpace, logTileCreate]);

  const createLinkTile = useCallback((url: string) => {
    if (!selectedSpace || !paneRef.current) return;

    const anchor = getPasteAnchorPosition();
    const { x, y } = clampToTileBounds(anchor.x, anchor.y, 'link', url);
    const faviconUrl = buildFaviconUrl(url);

    const payload: ObjectCreatePayload = {
      type: 'link',
      title: url,
      url,
      favicon_url: faviconUrl,
      x,
      y,
    };

    const tempId = `icon-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const optimisticIcon: DroppedIcon = {
      id: tempId,
      type: 'link',
      title: url,
      x,
      y,
      tag: '',
      url,
      faviconUrl,
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

        window.dispatchEvent(new CustomEvent('link:created', { detail: { linkId: created.id } }));
      })
      .catch((err) => {
        console.error('Failed to create link object:', err);
        setIconsBySpace((prev) => ({
          ...prev,
          [selectedSpace.id]: (prev[selectedSpace.id] || []).filter((i) => i.id !== tempId),
        }));
      });
  }, [selectedSpace, paneRef, getPasteAnchorPosition, clampToTileBounds, setIconsBySpace, logTileCreate]);

  const handleClipboardText = useCallback((text: string): boolean => {
    const lines = parseClipboardLines(text);
    if (lines.length === 0) return false;

    const filePaths: string[] = [];
    lines.forEach((line) => {
      const fromUri = toFilePathFromUri(line);
      if (fromUri) {
        filePaths.push(fromUri);
        return;
      }
      if (isLikelyFilePath(line)) {
        filePaths.push(line);
      }
    });

    if (filePaths.length > 0) {
      const entries = filePaths.map((filePath) => ({
        filePath,
        filename: filePath.split(/[\\/]/).pop() || 'Unknown File',
      }));
      createFileTiles(entries);
      return true;
    }

    const url = lines.find((line) => isValidUrl(line));
    if (url) {
      createLinkTile(url);
      return true;
    }

    return false;
  }, [createFileTiles, createLinkTile]);

  const handlePaste = useCallback((e: ClipboardEvent) => {
    const target = e.target as HTMLElement;
    if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
      return;
    }

    if (!selectedSpace || !paneRef.current) {
      return;
    }

    const clipboardData = e.clipboardData;
    if (!clipboardData) return;

    if (clipboardData.files.length > 0) {
      e.preventDefault();
      console.log('[PASTE] Handling file paste:', clipboardData.files);
      const files = Array.from(clipboardData.files).map((file) => ({
        filename: file.name,
        filePath: getFilePathForClipboardFile(file),
      }));
      createFileTiles(files);
      return;
    }

    const text = clipboardData.getData('text/plain');
    if (text && handleClipboardText(text)) {
      e.preventDefault();
    }
  }, [selectedSpace, paneRef, createFileTiles, handleClipboardText, getFilePathForClipboardFile]);

  const pasteFromClipboard = useCallback(async () => {
    if (!selectedSpace || !paneRef.current) return;
    const clipboard = navigator.clipboard;
    if (!clipboard) return;

    let handled = false;

    if (clipboard.read) {
      try {
        const items = await clipboard.read();
        for (const item of items) {
          if (!item.types.includes('text/uri-list')) continue;
          const blob = await item.getType('text/uri-list');
          if (handleClipboardText(await blob.text())) {
            handled = true;
            break;
          }
        }

        if (!handled) {
          for (const item of items) {
            if (!item.types.includes('text/plain')) continue;
            const blob = await item.getType('text/plain');
            if (handleClipboardText(await blob.text())) {
              handled = true;
              break;
            }
          }
        }
      } catch (err) {
        console.error('[PASTE] Failed to read clipboard items:', err);
      }
    }

    if (handled || !clipboard.readText) return;

    try {
      const text = await clipboard.readText();
      if (text) {
        handleClipboardText(text);
      }
    } catch (err) {
      console.error('[PASTE] Failed to read clipboard text:', err);
    }
  }, [selectedSpace, paneRef, handleClipboardText]);

  useEffect(() => {
    window.addEventListener('paste', handlePaste, true);
    return () => window.removeEventListener('paste', handlePaste, true);
  }, [handlePaste]);

  return { pasteFromClipboard };
};

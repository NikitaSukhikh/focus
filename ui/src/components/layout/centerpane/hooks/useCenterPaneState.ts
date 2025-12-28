/**
 * CenterPane State Management Hook
 *
 * Purpose: Manages core state and data loading for the center pane canvas
 * Responsibilities:
 * - Managing icons state by island (iconsByIsland)
 * - Loading objects from API and mapping to DroppedIcon format
 * - Tracking selected icon and drag-over state
 * - Calculating dynamic content height based on icon positions
 * - Handling keyboard delete for selected icons
 * - Syncing state when island selection changes
 */

import { useState, useEffect, useMemo } from 'react';
import { useIslandStore } from '../../../../stores/islandStore';
import { useUndoHistoryStore } from '../../../../stores/undoHistoryStore';
import { objectsApi } from '../../../../api/objects';
import { buildFaviconUrl } from '../../../../utils/favicon';
import { DroppedIcon, IconKind, ArrowSegment } from '../types';
import { isGmailUrl } from '../utils';
import { calculateContentHeight } from '../boundaries';

export const useCenterPaneState = (paneRef: React.RefObject<HTMLDivElement | null>) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [iconsByIsland, setIconsByIsland] = useState<Record<string, DroppedIcon[]>>({});
  const [arrowsByIsland, setArrowsByIsland] = useState<Record<string, ArrowSegment[]>>({});
  const [selectedIconIds, setSelectedIconIds] = useState<string[]>([]);
  const [dragGhost, setDragGhost] = useState<{
    id: string;
    x: number;
    y: number;
    type: IconKind;
  } | null>(null);

  const selectedIsland = useIslandStore((state) => state.getSelectedIsland());
  const addEvent = useUndoHistoryStore((state) => state.addEvent);

  const contentHeight = useMemo(() => {
    const currentIcons = selectedIsland ? iconsByIsland[selectedIsland.id] || [] : [];
    const viewportHeight = paneRef.current?.getBoundingClientRect().height || 600;
    return calculateContentHeight(currentIcons, viewportHeight);
  }, [iconsByIsland, selectedIsland, paneRef]);

  // Load existing objects as icons when island changes
  useEffect(() => {
    const islandId = selectedIsland?.id;
    if (!islandId) return;

    objectsApi
      .list(islandId)
      .then((objects) => {
        const arrows: ArrowSegment[] = [];
        const mapped: DroppedIcon[] = objects
          .filter((obj) => {
            const meta = (obj.metadata || {}) as Record<string, any>;
            const x = meta.x;
            const y = meta.y;
            return typeof x === 'number' && typeof y === 'number' && x >= 0 && y >= 0;
          })
          .map((obj, idx) => {
            const meta = (obj.metadata || {}) as Record<string, any>;
            const x = typeof meta.x === 'number' ? meta.x : 100 + (idx % 5) * 120;
            const y = typeof meta.y === 'number' ? meta.y : 100 + Math.floor(idx / 5) * 140;

            const serviceKey = obj.type === 'google_drive' ? obj.description : undefined;
            const description = obj.type !== 'google_drive' ? obj.description : undefined;
            const url = obj.type === 'link' ? (meta.url as string) : undefined;
            const service = meta.service as string | undefined;
            const faviconUrl = (meta.favicon_url as string | undefined) || (url ? buildFaviconUrl(url) : undefined);
            const filePath = obj.type === 'file' ? (meta.file_path as string) : undefined;

            const isGmail = url && isGmailUrl(url);
            const displayTitle = isGmail && description?.includes('Gmail - ')
              ? description.replace('Gmail - ', '')
              : obj.title;

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
                : 'unknown';

            return {
              id: obj.id,
              type: kind,
              title: displayTitle,
              x,
              y,
              serviceKey,
              url,
              service,
              description,
              faviconUrl,
              filePath,
              content: obj.type === 'text' ? (meta.content as string) : undefined,
            };
          });
        objects.forEach((obj) => {
          const meta = (obj.metadata || {}) as Record<string, any>;
          const hasArrowFlag = meta.arrow === true;
          const startX = meta.start_x;
          const startY = meta.start_y;
          const endX = meta.end_x;
          const endY = meta.end_y;
          if (hasArrowFlag && [startX, startY, endX, endY].every((v) => typeof v === 'number')) {
            arrows.push({
              id: obj.id,
              start: { x: startX, y: startY },
              end: { x: endX, y: endY },
            });
          }
        });
        setIconsByIsland((prev) => ({ ...prev, [islandId]: mapped }));
        setArrowsByIsland((prev) => ({ ...prev, [islandId]: arrows }));
      })
      .catch((err) => {
        console.error('Failed to load objects for island', islandId, err);
      });
  }, [selectedIsland?.id]);

  // Handle keyboard delete for selected icon
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const primarySelectedId = selectedIconIds[0];
      if ((e.key === 'Delete' || e.key === 'Backspace') && primarySelectedId && selectedIsland) {
        const target = e.target as HTMLElement;
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;

        e.preventDefault();

        console.log('[DELETE] Removing icon from canvas:', primarySelectedId);

        // Find the tile to save to history
        const tileToDelete = (iconsByIsland[selectedIsland.id] || []).find((i) => i.id === primarySelectedId);
        if (tileToDelete) {
          addEvent({
            type: 'tile_delete',
            islandId: selectedIsland.id,
            tile: {
              id: tileToDelete.id,
              type: tileToDelete.type,
              title: tileToDelete.title,
              x: tileToDelete.x,
              y: tileToDelete.y,
              url: tileToDelete.url,
              description: tileToDelete.description,
              faviconUrl: tileToDelete.faviconUrl,
              filePath: tileToDelete.filePath,
              serviceKey: tileToDelete.serviceKey,
              service: tileToDelete.service,
              content: tileToDelete.content,
            },
          });
        }

        // Dispatch event before deleting to notify preview pane
        window.dispatchEvent(new CustomEvent('tile:deleted', { detail: { tileId: primarySelectedId } }));

        setIconsByIsland((prev) => ({
          ...prev,
          [selectedIsland.id]: (prev[selectedIsland.id] || []).filter((i) => i.id !== primarySelectedId),
        }));

        objectsApi.updatePosition(primarySelectedId, -1, -1).catch((err) => {
          console.error('Failed to clear object position:', err);
        });
        setSelectedIconIds([]);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedIconIds, selectedIsland, iconsByIsland, addEvent]);

  return {
    isDragOver,
    setIsDragOver,
    iconsByIsland,
    setIconsByIsland,
    arrowsByIsland,
    setArrowsByIsland,
    selectedIconId: selectedIconIds[0] ?? null,
    setSelectedIconId: (id: string | null) => setSelectedIconIds(id ? [id] : []),
    selectedIconIds,
    setSelectedIconIds,
    dragGhost,
    setDragGhost,
    selectedIsland,
    contentHeight,
  };
};

/**
 * Unified Undo Hook
 *
 * Purpose: Provides a single, unified undo system for all center pane events
 * Responsibilities:
 * - Managing Ctrl+Z keyboard handler
 * - Processing undo events in strict chronological order (by timestamp)
 * - Delegating undo actions to appropriate handlers based on event type
 * - Handling tile restoration, arrow restoration/deletion, and text deletion
 */

import { useEffect } from 'react';
import { useUndoHistoryStore } from '../../../../stores/undoHistoryStore';
import { objectsApi } from '../../../../api/objects';
import { DroppedIcon, ArrowSegment } from '../types';

interface UseUnifiedUndoProps {
  selectedIslandId?: string;
  setIconsByIsland: React.Dispatch<React.SetStateAction<Record<string, DroppedIcon[]>>>;
  setArrowsByIsland: React.Dispatch<React.SetStateAction<Record<string, ArrowSegment[]>>>;
}

export const useUnifiedUndo = ({
  selectedIslandId,
  setIconsByIsland,
  setArrowsByIsland,
}: UseUnifiedUndoProps) => {
  const getLastEvent = useUndoHistoryStore((state) => state.getLastEvent);
  const removeLastEvent = useUndoHistoryStore((state) => state.removeLastEvent);

  useEffect(() => {
    const handleUndo = (e: KeyboardEvent) => {
      // Check for Ctrl+Z or Cmd+Z (but not Shift+Ctrl+Z which is usually redo)
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        const target = e.target as HTMLElement;
        // Don't interfere with native undo in input fields
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
          return;
        }

        if (!selectedIslandId) return;

        e.preventDefault();

        const lastEvent = getLastEvent(selectedIslandId);
        if (!lastEvent) return;

        console.log('[UNIFIED UNDO] Processing event:', lastEvent.type, lastEvent);

        // Process the event based on type
        switch (lastEvent.type) {
          case 'tile_delete': {
            // Undo tile deletion = restore the tile
            const { tile } = lastEvent;
            const restoredIcon: DroppedIcon = {
              id: tile.id,
              type: tile.type as any,
              title: tile.title,
              x: tile.x,
              y: tile.y,
              url: tile.url,
              description: tile.description,
              faviconUrl: tile.faviconUrl,
              filePath: tile.filePath,
              serviceKey: tile.serviceKey,
              service: tile.service,
              content: tile.content,
            };

            setIconsByIsland((prev) => ({
              ...prev,
              [selectedIslandId]: [...(prev[selectedIslandId] || []), restoredIcon],
            }));

            // Restore position in backend
            objectsApi.updatePosition(tile.id, tile.x, tile.y).catch((err) => {
              console.error('[UNIFIED UNDO] Failed to restore tile position:', err);
            });

            removeLastEvent(selectedIslandId);
            break;
          }

          case 'arrow_create': {
            // Undo arrow creation = delete the arrow
            const { arrow } = lastEvent;
            setArrowsByIsland((prev) => ({
              ...prev,
              [selectedIslandId]: (prev[selectedIslandId] || []).filter((a) => a.id !== arrow.id),
            }));

            // Delete from backend
            objectsApi.delete(arrow.id).catch((err) => {
              console.error('[UNIFIED UNDO] Failed to delete arrow:', err);
            });

            window.dispatchEvent(
              new CustomEvent('arrow:deleted', { detail: { arrowId: arrow.id, undo: true } })
            );

            removeLastEvent(selectedIslandId);
            break;
          }

          case 'arrow_delete': {
            // Undo arrow deletion = restore the arrow
            const { arrow } = lastEvent;

            // Create the arrow with a temporary ID first
            const tempId = crypto.randomUUID ? crypto.randomUUID() : `arrow-${Date.now()}`;
            const tempArrow: ArrowSegment = {
              id: tempId,
              start: arrow.start,
              end: arrow.end,
            };

            setArrowsByIsland((prev) => ({
              ...prev,
              [selectedIslandId]: [...(prev[selectedIslandId] || []), tempArrow],
            }));

            // Persist to backend
            void (async () => {
              try {
                const created = await objectsApi.create(selectedIslandId, {
                  type: 'text',
                  title: 'Arrow',
                  content: 'Arrow connection',
                });

                await objectsApi.updateMetadata(created.id, {
                  arrow: true,
                  start_x: arrow.start.x,
                  start_y: arrow.start.y,
                  end_x: arrow.end.x,
                  end_y: arrow.end.y,
                  content: 'Arrow connection',
                });

                // Replace temp ID with real ID
                setArrowsByIsland((prev) => ({
                  ...prev,
                  [selectedIslandId]: (prev[selectedIslandId] || []).map((a) =>
                    a.id === tempId ? { ...a, id: created.id } : a
                  ),
                }));

                window.dispatchEvent(
                  new CustomEvent('arrow:created', { detail: { arrowId: created.id, restored: true } })
                );
              } catch (err) {
                console.error('[UNIFIED UNDO] Failed to restore arrow:', err);
                // Remove the temp arrow on failure
                setArrowsByIsland((prev) => ({
                  ...prev,
                  [selectedIslandId]: (prev[selectedIslandId] || []).filter((a) => a.id !== tempId),
                }));
              }
            })();

            removeLastEvent(selectedIslandId);
            break;
          }

          case 'text_create': {
            // Undo text creation = delete the text
            const { text } = lastEvent;
            setIconsByIsland((prev) => ({
              ...prev,
              [selectedIslandId]: (prev[selectedIslandId] || []).filter((icon) => icon.id !== text.id),
            }));

            // Delete from backend
            objectsApi.updatePosition(text.id, -1, -1).catch((err) => {
              console.error('[UNIFIED UNDO] Failed to delete text note:', err);
            });

            window.dispatchEvent(new CustomEvent('tile:deleted', { detail: { tileId: text.id } }));

            removeLastEvent(selectedIslandId);
            break;
          }

          default:
            console.warn('[UNIFIED UNDO] Unknown event type:', lastEvent);
        }
      }
    };

    window.addEventListener('keydown', handleUndo);
    return () => window.removeEventListener('keydown', handleUndo);
  }, [selectedIslandId, getLastEvent, removeLastEvent, setIconsByIsland, setArrowsByIsland]);
};

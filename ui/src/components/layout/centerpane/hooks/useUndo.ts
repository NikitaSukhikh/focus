/**
 * Undo/Redo Hook
 *
 * Purpose: Provides a single undo/redo system for all center pane events
 * Responsibilities:
 * - Managing Ctrl+Z (undo) and Ctrl+Shift+Z (redo) keyboard handlers
 * - Processing undo/redo events in strict chronological order (by timestamp)
 * - Delegating actions to appropriate handlers based on event type
 * - Handling tile restoration/deletion, arrow restoration/deletion, and text creation/deletion
 */

import { useEffect } from 'react';
import { useUndoHistoryStore } from '../../../../stores/undoHistoryStore';
import { objectsApi } from '../../../../api/objects';
import { DroppedIcon, ArrowSegment } from '../types';

interface UseUndoProps {
  selectedIslandId?: string;
  setIconsByIsland: React.Dispatch<React.SetStateAction<Record<string, DroppedIcon[]>>>;
  setArrowsByIsland: React.Dispatch<React.SetStateAction<Record<string, ArrowSegment[]>>>;
}

export const useUndo = ({
  selectedIslandId,
  setIconsByIsland,
  setArrowsByIsland,
}: UseUndoProps) => {
  const getLastEvent = useUndoHistoryStore((state) => state.getLastEvent);
  const removeLastEvent = useUndoHistoryStore((state) => state.removeLastEvent);
  const getLastRedoEvent = useUndoHistoryStore((state) => state.getLastRedoEvent);
  const removeLastRedoEvent = useUndoHistoryStore((state) => state.removeLastRedoEvent);
  const moveEventToRedo = useUndoHistoryStore((state) => state.moveEventToRedo);
  const moveEventToUndo = useUndoHistoryStore((state) => state.moveEventToUndo);

  useEffect(() => {
    const handleUndoRedo = (e: KeyboardEvent) => {
      // Check for Ctrl+Z or Cmd+Z (undo) or Ctrl+Shift+Z or Cmd+Shift+Z (redo)
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        const target = e.target as HTMLElement;
        // Don't interfere with native undo in input fields
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
          return;
        }

        if (!selectedIslandId) return;

        e.preventDefault();

        const isRedo = e.shiftKey;

        if (isRedo) {
          // Handle redo (Ctrl+Shift+Z)
          const lastRedoEvent = getLastRedoEvent(selectedIslandId);
          if (!lastRedoEvent) return;

          console.log('[REDO] Processing event:', lastRedoEvent.type, lastRedoEvent);

          // Process the redo event (reverse the undo operation)
          switch (lastRedoEvent.type) {
            case 'tile_create': {
              // Redo tile creation = create the tile again
              const { tile } = lastRedoEvent;
              const restoredTile: DroppedIcon = {
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
                [selectedIslandId]: [...(prev[selectedIslandId] || []), restoredTile],
              }));

              objectsApi.updatePosition(tile.id, tile.x, tile.y).catch((err) => {
                console.error('[REDO] Failed to restore tile:', err);
              });

              removeLastRedoEvent(selectedIslandId);
              moveEventToUndo(lastRedoEvent);
              break;
            }

            case 'tile_delete': {
              // Redo tile deletion = delete the tile again
              const { tile } = lastRedoEvent;
              setIconsByIsland((prev) => ({
                ...prev,
                [selectedIslandId]: (prev[selectedIslandId] || []).filter((icon) => icon.id !== tile.id),
              }));

              objectsApi.updatePosition(tile.id, -1, -1).catch((err) => {
                console.error('[REDO] Failed to delete tile:', err);
              });

              window.dispatchEvent(new CustomEvent('tile:deleted', { detail: { tileId: tile.id } }));

              removeLastRedoEvent(selectedIslandId);
              moveEventToUndo(lastRedoEvent);
              break;
            }

            case 'arrow_create': {
              // Redo arrow creation = create the arrow again
              const { arrow } = lastRedoEvent;

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
                  console.error('[REDO] Failed to create arrow:', err);
                  setArrowsByIsland((prev) => ({
                    ...prev,
                    [selectedIslandId]: (prev[selectedIslandId] || []).filter((a) => a.id !== tempId),
                  }));
                }
              })();

              removeLastRedoEvent(selectedIslandId);
              moveEventToUndo(lastRedoEvent);
              break;
            }

            case 'arrow_delete': {
              // Redo arrow deletion = delete the arrow again
              const { arrow } = lastRedoEvent;
              setArrowsByIsland((prev) => ({
                ...prev,
                [selectedIslandId]: (prev[selectedIslandId] || []).filter((a) => a.id !== arrow.id),
              }));

              objectsApi.delete(arrow.id).catch((err) => {
                console.error('[REDO] Failed to delete arrow:', err);
              });

              window.dispatchEvent(
                new CustomEvent('arrow:deleted', { detail: { arrowId: arrow.id, undo: false } })
              );

              removeLastRedoEvent(selectedIslandId);
              moveEventToUndo(lastRedoEvent);
              break;
            }

            case 'text_create': {
              // Redo text creation = create the text again
              const { text } = lastRedoEvent;
              const restoredText: DroppedIcon = {
                id: text.id,
                type: 'text',
                title: text.title,
                x: text.x,
                y: text.y,
                content: text.content,
              };

              setIconsByIsland((prev) => ({
                ...prev,
                [selectedIslandId]: [...(prev[selectedIslandId] || []), restoredText],
              }));

              objectsApi.updatePosition(text.id, text.x, text.y).catch((err) => {
                console.error('[REDO] Failed to restore text note:', err);
              });

              removeLastRedoEvent(selectedIslandId);
              moveEventToUndo(lastRedoEvent);
              break;
            }

            case 'text_delete': {
              // Redo text deletion = delete the text again
              const { text } = lastRedoEvent;
              setIconsByIsland((prev) => ({
                ...prev,
                [selectedIslandId]: (prev[selectedIslandId] || []).filter((icon) => icon.id !== text.id),
              }));

              objectsApi.updatePosition(text.id, -1, -1).catch((err) => {
                console.error('[REDO] Failed to delete text note:', err);
              });

              window.dispatchEvent(new CustomEvent('tile:deleted', { detail: { tileId: text.id } }));

              removeLastRedoEvent(selectedIslandId);
              moveEventToUndo(lastRedoEvent);
              break;
            }

            default:
              console.warn('[REDO] Unknown event type:', lastRedoEvent);
          }
        } else {
          // Handle undo (Ctrl+Z)
          const lastEvent = getLastEvent(selectedIslandId);
          if (!lastEvent) return;

          console.log('[UNDO] Processing event:', lastEvent.type, lastEvent);

          // Process the event based on type
          switch (lastEvent.type) {
            case 'tile_create': {
              // Undo tile creation = delete the tile
              const { tile } = lastEvent;
              setIconsByIsland((prev) => ({
                ...prev,
                [selectedIslandId]: (prev[selectedIslandId] || []).filter((icon) => icon.id !== tile.id),
              }));

              objectsApi.updatePosition(tile.id, -1, -1).catch((err) => {
                console.error('[UNDO] Failed to delete tile:', err);
              });

              window.dispatchEvent(new CustomEvent('tile:deleted', { detail: { tileId: tile.id } }));

              removeLastEvent(selectedIslandId);
              moveEventToRedo(lastEvent);
              break;
            }

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
                console.error('[UNDO] Failed to restore tile position:', err);
              });

              removeLastEvent(selectedIslandId);
              moveEventToRedo(lastEvent);
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
                console.error('[UNDO] Failed to delete arrow:', err);
              });

              window.dispatchEvent(
                new CustomEvent('arrow:deleted', { detail: { arrowId: arrow.id, undo: true } })
              );

              removeLastEvent(selectedIslandId);
              moveEventToRedo(lastEvent);
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
                  console.error('[UNDO] Failed to restore arrow:', err);
                  // Remove the temp arrow on failure
                  setArrowsByIsland((prev) => ({
                    ...prev,
                    [selectedIslandId]: (prev[selectedIslandId] || []).filter((a) => a.id !== tempId),
                  }));
                }
              })();

              removeLastEvent(selectedIslandId);
              moveEventToRedo(lastEvent);
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
                console.error('[UNDO] Failed to delete text note:', err);
              });

              window.dispatchEvent(new CustomEvent('tile:deleted', { detail: { tileId: text.id } }));

              removeLastEvent(selectedIslandId);
              moveEventToRedo(lastEvent);
              break;
            }

            case 'text_delete': {
              // Undo text deletion = restore the text
              const { text } = lastEvent;
              const restoredText: DroppedIcon = {
                id: text.id,
                type: 'text',
                title: text.title,
                x: text.x,
                y: text.y,
                content: text.content,
              };

              setIconsByIsland((prev) => ({
                ...prev,
                [selectedIslandId]: [...(prev[selectedIslandId] || []), restoredText],
              }));

              objectsApi.updatePosition(text.id, text.x, text.y).catch((err) => {
                console.error('[UNDO] Failed to restore text note:', err);
              });

              removeLastEvent(selectedIslandId);
              moveEventToRedo(lastEvent);
              break;
            }

            default:
              console.warn('[UNDO] Unknown event type:', lastEvent);
          }
        }
      }
    };

    window.addEventListener('keydown', handleUndoRedo);
    return () => window.removeEventListener('keydown', handleUndoRedo);
  }, [selectedIslandId, getLastEvent, removeLastEvent, getLastRedoEvent, removeLastRedoEvent, moveEventToRedo, moveEventToUndo, setIconsByIsland, setArrowsByIsland]);
};

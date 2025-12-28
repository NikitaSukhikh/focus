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
import { undoApi } from '../../../../api/undo';
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
          void (async () => {
            try {
              const response = await undoApi.redo(selectedIslandId);
              if (!response.success || !response.event) {
                console.log('[REDO] No events to redo');
                return;
              }

              const lastRedoEvent = response.event;
              console.log('[REDO] Processing event:', lastRedoEvent.event_type, lastRedoEvent);

              // Process the redo event (reverse the undo operation)
              switch (lastRedoEvent.event_type) {
                case 'tile_create': {
                  // Redo tile creation = create the tile again
                  const { tile } = lastRedoEvent.event_data;
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
                  break;
                }

                case 'tile_delete': {
                  // Redo tile deletion = delete the tile again
                  const { tile } = lastRedoEvent.event_data;
              setIconsByIsland((prev) => ({
                ...prev,
                [selectedIslandId]: (prev[selectedIslandId] || []).filter((icon) => icon.id !== tile.id),
              }));

                  objectsApi.updatePosition(tile.id, -1, -1).catch((err) => {
                    console.error('[REDO] Failed to delete tile:', err);
                  });

                  window.dispatchEvent(new CustomEvent('tile:deleted', { detail: { tileId: tile.id } }));
                  break;
                }

                case 'arrow_create': {
                  // Redo arrow creation = create the arrow again
                  const { arrow } = lastRedoEvent.event_data;

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
                  break;
                }

                case 'arrow_delete': {
                  // Redo arrow deletion = delete the arrow again
                  const { arrow } = lastRedoEvent.event_data;
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
                  break;
                }

                case 'text_create': {
                  // Redo text creation = create the text again
                  const { text } = lastRedoEvent.event_data;
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
                  break;
                }

                case 'text_delete': {
                  // Redo text deletion = delete the text again
                  const { text } = lastRedoEvent.event_data;
              setIconsByIsland((prev) => ({
                ...prev,
                [selectedIslandId]: (prev[selectedIslandId] || []).filter((icon) => icon.id !== text.id),
              }));

                  objectsApi.updatePosition(text.id, -1, -1).catch((err) => {
                    console.error('[REDO] Failed to delete text note:', err);
                  });

                  window.dispatchEvent(new CustomEvent('tile:deleted', { detail: { tileId: text.id } }));
                  break;
                }

                default:
                  console.warn('[REDO] Unknown event type:', lastRedoEvent);
              }
            } catch (err) {
              console.error('[REDO] Error processing redo:', err);
            }
          })();
        } else {
          // Handle undo (Ctrl+Z)
          void (async () => {
            try {
              const response = await undoApi.undo(selectedIslandId);
              if (!response.success || !response.event) {
                console.log('[UNDO] No events to undo');
                return;
              }

              const lastEvent = response.event;
              console.log('[UNDO] Processing event:', lastEvent.event_type, lastEvent);

              // Process the event based on type
              switch (lastEvent.event_type) {
                case 'tile_create': {
                  // Undo tile creation = delete the tile
                  const { tile } = lastEvent.event_data;
              setIconsByIsland((prev) => ({
                ...prev,
                [selectedIslandId]: (prev[selectedIslandId] || []).filter((icon) => icon.id !== tile.id),
              }));

                  objectsApi.updatePosition(tile.id, -1, -1).catch((err) => {
                    console.error('[UNDO] Failed to delete tile:', err);
                  });

                  window.dispatchEvent(new CustomEvent('tile:deleted', { detail: { tileId: tile.id } }));
                  break;
                }

                case 'tile_delete': {
                  // Undo tile deletion = restore the tile
                  const { tile } = lastEvent.event_data;
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
                  break;
                }

                case 'arrow_create': {
                  // Undo arrow creation = delete the arrow
                  const { arrow } = lastEvent.event_data;
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
                  break;
                }

                case 'arrow_delete': {
                  // Undo arrow deletion = restore the arrow
                  const { arrow } = lastEvent.event_data;

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
                  break;
                }

                case 'text_create': {
                  // Undo text creation = delete the text
                  const { text } = lastEvent.event_data;
              setIconsByIsland((prev) => ({
                ...prev,
                [selectedIslandId]: (prev[selectedIslandId] || []).filter((icon) => icon.id !== text.id),
              }));

                  // Delete from backend
                  objectsApi.updatePosition(text.id, -1, -1).catch((err) => {
                    console.error('[UNDO] Failed to delete text note:', err);
                  });

                  window.dispatchEvent(new CustomEvent('tile:deleted', { detail: { tileId: text.id } }));
                  break;
                }

                case 'text_delete': {
                  // Undo text deletion = restore the text
                  const { text } = lastEvent.event_data;
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
                  break;
                }

                default:
                  console.warn('[UNDO] Unknown event type:', lastEvent);
              }
            } catch (err) {
              console.error('[UNDO] Error processing undo:', err);
            }
          })();
        }
      }
    };

    window.addEventListener('keydown', handleUndoRedo);
    return () => window.removeEventListener('keydown', handleUndoRedo);
  }, [selectedIslandId, setIconsByIsland, setArrowsByIsland]);
};

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

import { useEffect, useRef } from 'react';
import { undoApi } from '../../../../api/undo';
import { objectsApi } from '../../../../api/objects';
import { DroppedIcon, ArrowSegment } from '../types';
import { normalizeTag } from '../../../../types/tags';
import { useUndoHistoryStore } from '../../../../stores/undoHistoryStore';

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
  const clearLocalHistory = useUndoHistoryStore((state) => state.clearHistory);
  // Track current arrow IDs when they get recreated so redo/undo can target the right object even if the original ID was deleted.
  const arrowIdAliasRef = useRef<Map<string, string>>(new Map());

  // Reset mapping when switching islands to avoid cross-island ID reuse.
  useEffect(() => {
    arrowIdAliasRef.current.clear();
  }, [selectedIslandId]);

  const resolveArrowId = (
    currentArrows: ArrowSegment[],
    eventArrow?: { id: string; start: { x: number; y: number }; end: { x: number; y: number } }
  ): string | null => {
    if (!eventArrow) return null;
    const aliasId = arrowIdAliasRef.current.get(eventArrow.id);
    if (aliasId) {
      const aliased = currentArrows.find((a) => a.id === aliasId);
      if (aliased) return aliased.id;
    }

    const byId = currentArrows.find((a) => a.id === eventArrow.id);
    if (byId) return byId.id;

    const coordsMatch = (a: { x: number; y: number }, b: { x: number; y: number }) =>
      Math.abs(a.x - b.x) < 0.5 && Math.abs(a.y - b.y) < 0.5;

    const byCoords = currentArrows.find(
      (a) => coordsMatch(a.start, eventArrow.start) && coordsMatch(a.end, eventArrow.end)
    );

    if (byCoords) {
      arrowIdAliasRef.current.set(eventArrow.id, byCoords.id);
      return byCoords.id;
    }

    return null;
  };

  // Clear undo history on mount/unmount and before unload so no stale events persist across sessions.
  useEffect(() => {
    if (!selectedIslandId) return;

    const clearServerHistory = async () => {
      try {
        if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
          const url = `/api/islands/${selectedIslandId}/undo-events`;
          const blob = new Blob([], { type: 'application/json' });
          navigator.sendBeacon(url, blob);
        } else {
          await fetch(`/api/islands/${selectedIslandId}/undo-events`, { method: 'DELETE', keepalive: true });
        }
      } catch (err) {
        console.error('[UNDO] Failed to clear undo history:', err);
      }
    };

    clearLocalHistory(selectedIslandId);
    void clearServerHistory();

    const handleBeforeUnload = () => {
      clearLocalHistory(selectedIslandId);
      clearServerHistory().catch(() => {
        // swallow errors on unload
      });
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      clearLocalHistory(selectedIslandId);
      void clearServerHistory();
    };
  }, [clearLocalHistory, selectedIslandId]);

  useEffect(() => {
    const handleUndoRedo = (e: KeyboardEvent) => {
      // Check for Ctrl+Z or Cmd+Z (undo) or Ctrl+Shift+Z or Cmd+Shift+Z (redo)
      const key = e.key.toLowerCase();
      if ((e.ctrlKey || e.metaKey) && key === 'z') {
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
            tag: normalizeTag(tile.tag),
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

                case 'tile_move': {
                  // Redo tile move = apply the new position again
                  const { tile, to } = lastRedoEvent.event_data;
                  if (!tile) {
                    console.warn('[REDO] Missing tile data for tile_move event');
                    break;
                  }

                  const targetX = typeof to?.x === 'number' ? to.x : tile.x;
                  const targetY = typeof to?.y === 'number' ? to.y : tile.y;

                  setIconsByIsland((prev) => {
                    const current = prev[selectedIslandId] || [];
                    const existing = current.find((icon) => icon.id === tile.id);

                    if (existing) {
                      return {
                        ...prev,
                        [selectedIslandId]: current.map((icon) =>
                          icon.id === tile.id ? { ...icon, x: targetX, y: targetY } : icon
                        ),
                      };
                    }

                    const fallbackTile: DroppedIcon = {
                      id: tile.id,
                      type: tile.type as any,
                      title: tile.title,
                      x: targetX,
                      y: targetY,
                      tag: normalizeTag(tile.tag),
                      url: tile.url,
                      description: tile.description,
                      faviconUrl: tile.faviconUrl,
                      filePath: tile.filePath,
                      serviceKey: tile.serviceKey,
                      service: tile.service,
                      content: tile.content,
                    };

                    return {
                      ...prev,
                      [selectedIslandId]: [...current, fallbackTile],
                    };
                  });

                  objectsApi.updatePosition(tile.id, targetX, targetY).catch((err) => {
                    console.error('[REDO] Failed to move tile:', err);
                  });
                  break;
                }

                case 'text_move': {
                  // Redo text move = apply the new position again
                  const { text, to } = lastRedoEvent.event_data;
                  if (!text) {
                    console.warn('[REDO] Missing text data for text_move event');
                    break;
                  }

                  const targetX = typeof to?.x === 'number' ? to.x : text.x;
                  const targetY = typeof to?.y === 'number' ? to.y : text.y;

                  setIconsByIsland((prev) => {
                    const current = prev[selectedIslandId] || [];
                    const existing = current.find((icon) => icon.id === text.id);

                    if (existing) {
                      return {
                        ...prev,
                        [selectedIslandId]: current.map((icon) =>
                          icon.id === text.id ? { ...icon, x: targetX, y: targetY } : icon
                        ),
                      };
                    }

                    const fallbackText: DroppedIcon = {
                      id: text.id,
                      type: 'text',
                      title: text.title,
                      x: targetX,
                      y: targetY,
                      tag: normalizeTag(text.tag),
                      content: text.content,
                    };

                    return {
                      ...prev,
                      [selectedIslandId]: [...current, fallbackText],
                    };
                  });

                  objectsApi.updatePosition(text.id, targetX, targetY).catch((err) => {
                    console.error('[REDO] Failed to move text note:', err);
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
                      arrowIdAliasRef.current.set(arrow.id, created.id);

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

                case 'arrow_move': {
                  // Redo arrow move = apply the new coordinates
                  const { arrow, to } = lastRedoEvent.event_data;
                  if (!arrow) {
                    console.warn('[REDO] Missing arrow data for arrow_move event');
                    break;
                  }

                  const targetStart =
                    to && typeof to.start?.x === 'number' && typeof to.start?.y === 'number'
                      ? to.start
                      : arrow.start;
                  const targetEnd =
                    to && typeof to.end?.x === 'number' && typeof to.end?.y === 'number'
                      ? to.end
                      : arrow.end;

                  let updatedArrowId = arrow.id;
                  setArrowsByIsland((prev) => {
                    const current = prev[selectedIslandId] || [];
                    const resolvedId = resolveArrowId(current, arrow) || arrow.id;
                    updatedArrowId = resolvedId;
                    const existing = current.find((a) => a.id === resolvedId);

                    if (existing) {
                      if (resolvedId !== arrow.id) {
                        arrowIdAliasRef.current.set(arrow.id, resolvedId);
                      }
                      return {
                        ...prev,
                        [selectedIslandId]: current.map((a) =>
                          a.id === resolvedId ? { ...a, start: targetStart, end: targetEnd } : a
                        ),
                      };
                    }

                    const fallbackArrow: ArrowSegment = {
                      id: resolvedId,
                      start: targetStart,
                      end: targetEnd,
                    };

                    if (resolvedId !== arrow.id) {
                      arrowIdAliasRef.current.set(arrow.id, resolvedId);
                    }

                    return {
                      ...prev,
                      [selectedIslandId]: [...current, fallbackArrow],
                    };
                  });

                  objectsApi
                    .updateMetadata(updatedArrowId, {
                      arrow: true,
                      start_x: targetStart.x,
                      start_y: targetStart.y,
                      end_x: targetEnd.x,
                      end_y: targetEnd.y,
                    })
                    .catch((err) => {
                      console.error('[REDO] Failed to move arrow:', err);
                    });
                  break;
                }

                case 'arrow_delete': {
                  // Redo arrow deletion = delete the arrow again
                  const { arrow } = lastRedoEvent.event_data;
                  let deletedArrowId: string | null = null;
                  setArrowsByIsland((prev) => {
                    const current = prev[selectedIslandId] || [];
                    const resolvedId = resolveArrowId(current, arrow);
                    deletedArrowId = resolvedId || arrow.id;
                    arrowIdAliasRef.current.delete(arrow.id);
                    return {
                      ...prev,
                      [selectedIslandId]: current.filter((a) => a.id !== (resolvedId || arrow.id)),
                    };
                  });

                  if (deletedArrowId) {
                    objectsApi.delete(deletedArrowId).catch((err) => {
                      console.error('[REDO] Failed to delete arrow:', err);
                    });
                  }

                  window.dispatchEvent(
                    new CustomEvent('arrow:deleted', { detail: { arrowId: deletedArrowId || arrow.id, undo: false } })
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
                tag: normalizeTag(text.tag),
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

                case 'tile_move': {
                  // Undo tile move = restore the previous position
                  const { tile, from } = lastEvent.event_data;
                  if (!tile) {
                    console.warn('[UNDO] Missing tile data for tile_move event');
                    break;
                  }

                  const targetX = typeof from?.x === 'number' ? from.x : tile.x;
                  const targetY = typeof from?.y === 'number' ? from.y : tile.y;

                  setIconsByIsland((prev) => {
                    const current = prev[selectedIslandId] || [];
                    const existing = current.find((icon) => icon.id === tile.id);

                    if (existing) {
                      return {
                        ...prev,
                        [selectedIslandId]: current.map((icon) =>
                          icon.id === tile.id ? { ...icon, x: targetX, y: targetY } : icon
                        ),
                      };
                    }

                    const fallbackTile: DroppedIcon = {
                      id: tile.id,
                      type: tile.type as any,
                      title: tile.title,
                      x: targetX,
                      y: targetY,
                      tag: normalizeTag(tile.tag),
                      url: tile.url,
                      description: tile.description,
                      faviconUrl: tile.faviconUrl,
                      filePath: tile.filePath,
                      serviceKey: tile.serviceKey,
                      service: tile.service,
                      content: tile.content,
                    };

                    return {
                      ...prev,
                      [selectedIslandId]: [...current, fallbackTile],
                    };
                  });

                  objectsApi.updatePosition(tile.id, targetX, targetY).catch((err) => {
                    console.error('[UNDO] Failed to move tile:', err);
                  });
                  break;
                }

                case 'text_move': {
                  // Undo text move = restore the previous position
                  const { text, from } = lastEvent.event_data;
                  if (!text) {
                    console.warn('[UNDO] Missing text data for text_move event');
                    break;
                  }

                  const targetX = typeof from?.x === 'number' ? from.x : text.x;
                  const targetY = typeof from?.y === 'number' ? from.y : text.y;

                  setIconsByIsland((prev) => {
                    const current = prev[selectedIslandId] || [];
                    const existing = current.find((icon) => icon.id === text.id);

                    if (existing) {
                      return {
                        ...prev,
                        [selectedIslandId]: current.map((icon) =>
                          icon.id === text.id ? { ...icon, x: targetX, y: targetY } : icon
                        ),
                      };
                    }

                    const fallbackText: DroppedIcon = {
                      id: text.id,
                      type: 'text',
                      title: text.title,
                      x: targetX,
                      y: targetY,
                      tag: normalizeTag(text.tag),
                      content: text.content,
                    };

                    return {
                      ...prev,
                      [selectedIslandId]: [...current, fallbackText],
                    };
                  });

                  objectsApi.updatePosition(text.id, targetX, targetY).catch((err) => {
                    console.error('[UNDO] Failed to move text note:', err);
                  });
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
                tag: normalizeTag(tile.tag),
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
                  let deletedArrowId: string | null = null;
                  setArrowsByIsland((prev) => {
                    const current = prev[selectedIslandId] || [];
                    const resolvedId = resolveArrowId(current, arrow);
                    deletedArrowId = resolvedId || arrow.id;
                    arrowIdAliasRef.current.delete(arrow.id);
                    return {
                      ...prev,
                      [selectedIslandId]: current.filter((a) => a.id !== (resolvedId || arrow.id)),
                    };
                  });

                  // Delete from backend regardless of local presence to keep server state consistent
                  if (deletedArrowId) {
                    objectsApi.delete(deletedArrowId).catch((err) => {
                      console.error('[UNDO] Failed to delete arrow:', err);
                    });
                  }

                  window.dispatchEvent(
                    new CustomEvent('arrow:deleted', { detail: { arrowId: deletedArrowId || arrow.id, undo: true } })
                  );
                  break;
                }

                case 'arrow_move': {
                  // Undo arrow move = restore previous coordinates
                  const { arrow, from } = lastEvent.event_data;
                  if (!arrow) {
                    console.warn('[UNDO] Missing arrow data for arrow_move event');
                    break;
                  }

                  const targetStart =
                    from && typeof from.start?.x === 'number' && typeof from.start?.y === 'number'
                      ? from.start
                      : arrow.start;
                  const targetEnd =
                    from && typeof from.end?.x === 'number' && typeof from.end?.y === 'number'
                      ? from.end
                      : arrow.end;

                  let updatedArrowId = arrow.id;
                  setArrowsByIsland((prev) => {
                    const current = prev[selectedIslandId] || [];
                    const resolvedId = resolveArrowId(current, arrow) || arrow.id;
                    updatedArrowId = resolvedId;
                    const existing = current.find((a) => a.id === resolvedId);

                    if (existing) {
                      if (resolvedId !== arrow.id) {
                        arrowIdAliasRef.current.set(arrow.id, resolvedId);
                      }
                      return {
                        ...prev,
                        [selectedIslandId]: current.map((a) =>
                          a.id === resolvedId ? { ...a, start: targetStart, end: targetEnd } : a
                        ),
                      };
                    }

                    const fallbackArrow: ArrowSegment = {
                      id: resolvedId,
                      start: targetStart,
                      end: targetEnd,
                    };

                    if (resolvedId !== arrow.id) {
                      arrowIdAliasRef.current.set(arrow.id, resolvedId);
                    }

                    return {
                      ...prev,
                      [selectedIslandId]: [...current, fallbackArrow],
                    };
                  });

                  objectsApi
                    .updateMetadata(updatedArrowId, {
                      arrow: true,
                      start_x: targetStart.x,
                      start_y: targetStart.y,
                      end_x: targetEnd.x,
                      end_y: targetEnd.y,
                    })
                    .catch((err) => {
                      console.error('[UNDO] Failed to move arrow:', err);
                    });
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
                      arrowIdAliasRef.current.set(arrow.id, created.id);

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
                tag: normalizeTag(text.tag),
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

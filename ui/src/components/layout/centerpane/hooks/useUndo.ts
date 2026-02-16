/**
 * Undo/Redo Hook
 *
 * Purpose: Provides a single undo/redo system for all center pane events
 * Responsibilities:
 * - Managing Ctrl+Z (undo) and Ctrl+Shift+Z (redo) keyboard handlers
 * - Applying the most recent undo/redo event returned by the server
 * - Delegating actions to appropriate handlers based on event type
 * - Handling tile create/move/delete, arrow create/move/delete, and text create/move/delete flows
 */

import { useEffect, useRef } from 'react';
import { undoApi } from '@/api/undo';
import { objectsApi } from '@/api/objects';
import { DroppedIcon, ArrowSegment } from '@/components/layout/centerpane/types';
import { normalizeTag } from '@/types/tags';
import { useUndoHistoryStore } from '@/stores/undoHistoryStore';
import type { UndoEventResponse } from '@/api/undo';
import { API_BASE } from '@/config/api';

interface UseUndoProps {
  selectedSpaceId?: string;
  setIconsBySpace: React.Dispatch<React.SetStateAction<Record<string, DroppedIcon[]>>>;
  setArrowsBySpace: React.Dispatch<React.SetStateAction<Record<string, ArrowSegment[]>>>;
}

export const useUndo = ({
  selectedSpaceId,
  setIconsBySpace,
  setArrowsBySpace,
}: UseUndoProps) => {
  const clearLocalHistory = useUndoHistoryStore((state) => state.clearHistory);
  // Track current arrow IDs when they get recreated so redo/undo can target the right object even if the original ID was deleted.
  const arrowIdAliasRef = useRef<Map<string, string>>(new Map());

  // Reset mapping when switching spaces to avoid cross-space ID reuse.
  useEffect(() => {
    arrowIdAliasRef.current.clear();
  }, [selectedSpaceId]);

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

  type UndoDirection = 'undo' | 'redo';

  const toDroppedIconFromTile = (tile: any): DroppedIcon => ({
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
  });

  const toDroppedTextFromEvent = (text: any): DroppedIcon => ({
    id: text.id,
    type: 'text',
    title: text.title,
    x: text.x,
    y: text.y,
    tag: normalizeTag(text.tag),
    content: text.content,
  });

  const processUndoRedoEvent = async (event: UndoEventResponse, direction: UndoDirection) => {
    const isRedo = direction === 'redo';

    switch (event.event_type) {
      case 'tile_create': {
        const { tile } = event.event_data;
        if (!tile || !selectedSpaceId) break;

        if (isRedo) {
          const restoredTile = toDroppedIconFromTile(tile);
          setIconsBySpace((prev) => ({
            ...prev,
            [selectedSpaceId]: [...(prev[selectedSpaceId] || []), restoredTile],
          }));

          objectsApi.updatePosition(tile.id, tile.x, tile.y).catch((err) => {
            console.error(`[${direction.toUpperCase()}] Failed to restore tile:`, err);
          });
        } else {
          setIconsBySpace((prev) => ({
            ...prev,
            [selectedSpaceId]: (prev[selectedSpaceId] || []).filter((icon) => icon.id !== tile.id),
          }));

          objectsApi.updatePosition(tile.id, -1, -1).catch((err) => {
            console.error('[UNDO] Failed to delete tile:', err);
          });
          window.dispatchEvent(new CustomEvent('tile:deleted', { detail: { tileId: tile.id } }));
        }
        break;
      }

      case 'tile_move': {
        const { tile, from, to } = event.event_data;
        if (!tile || !selectedSpaceId) break;

        const target = isRedo ? to : from;
        const targetX = typeof target?.x === 'number' ? target.x : tile.x;
        const targetY = typeof target?.y === 'number' ? target.y : tile.y;

        setIconsBySpace((prev) => {
          const current = prev[selectedSpaceId] || [];
          const existing = current.find((icon) => icon.id === tile.id);

          if (existing) {
            return {
              ...prev,
              [selectedSpaceId]: current.map((icon) =>
                icon.id === tile.id ? { ...icon, x: targetX, y: targetY } : icon
              ),
            };
          }

          const fallbackTile = toDroppedIconFromTile({ ...tile, x: targetX, y: targetY });
          return { ...prev, [selectedSpaceId]: [...current, fallbackTile] };
        });

        objectsApi.updatePosition(tile.id, targetX, targetY).catch((err) => {
          console.error(`[${direction.toUpperCase()}] Failed to move tile:`, err);
        });
        break;
      }

      case 'text_move': {
        const { text, from, to } = event.event_data;
        if (!text || !selectedSpaceId) break;
        const target = isRedo ? to : from;
        const targetX = typeof target?.x === 'number' ? target.x : text.x;
        const targetY = typeof target?.y === 'number' ? target.y : text.y;

        setIconsBySpace((prev) => {
          const current = prev[selectedSpaceId] || [];
          const existing = current.find((icon) => icon.id === text.id);

          if (existing) {
            return {
              ...prev,
              [selectedSpaceId]: current.map((icon) =>
                icon.id === text.id ? { ...icon, x: targetX, y: targetY } : icon
              ),
            };
          }

          const fallbackText = toDroppedTextFromEvent({ ...text, x: targetX, y: targetY });
          return { ...prev, [selectedSpaceId]: [...current, fallbackText] };
        });

        objectsApi.updatePosition(text.id, targetX, targetY).catch((err) => {
          console.error(`[${direction.toUpperCase()}] Failed to move text note:`, err);
        });
        break;
      }

      case 'tile_delete': {
        const { tile } = event.event_data;
        if (!tile || !selectedSpaceId) break;

        if (isRedo) {
          setIconsBySpace((prev) => ({
            ...prev,
            [selectedSpaceId]: (prev[selectedSpaceId] || []).filter((icon) => icon.id !== tile.id),
          }));

          objectsApi.updatePosition(tile.id, -1, -1).catch((err) => {
            console.error('[REDO] Failed to delete tile:', err);
          });
          window.dispatchEvent(new CustomEvent('tile:deleted', { detail: { tileId: tile.id } }));
        } else {
          const restoredIcon = toDroppedIconFromTile(tile);
          setIconsBySpace((prev) => ({
            ...prev,
            [selectedSpaceId]: [...(prev[selectedSpaceId] || []), restoredIcon],
          }));

          objectsApi.updatePosition(tile.id, tile.x, tile.y).catch((err) => {
            console.error('[UNDO] Failed to restore tile position:', err);
          });
        }
        break;
      }

      case 'arrow_create': {
        const { arrow } = event.event_data;
        if (!arrow || !selectedSpaceId) break;

        if (isRedo) {
          const tempId = crypto.randomUUID ? crypto.randomUUID() : `arrow-${Date.now()}`;
          const tempArrow: ArrowSegment = { id: tempId, start: arrow.start, end: arrow.end };

          setArrowsBySpace((prev) => ({
            ...prev,
            [selectedSpaceId]: [...(prev[selectedSpaceId] || []), tempArrow],
          }));

          void (async () => {
            try {
              const created = await objectsApi.create(selectedSpaceId, {
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

              setArrowsBySpace((prev) => ({
                ...prev,
                [selectedSpaceId]: (prev[selectedSpaceId] || []).map((a) =>
                  a.id === tempId ? { ...a, id: created.id } : a
                ),
              }));
              arrowIdAliasRef.current.set(arrow.id, created.id);
              window.dispatchEvent(new CustomEvent('arrow:created', { detail: { arrowId: created.id, restored: true } }));
            } catch (err) {
              console.error('[REDO] Failed to create arrow:', err);
              setArrowsBySpace((prev) => ({
                ...prev,
                [selectedSpaceId]: (prev[selectedSpaceId] || []).filter((a) => a.id !== tempId),
              }));
            }
          })();
        } else {
          let deletedArrowId: string | null = null;
          setArrowsBySpace((prev) => {
            const current = prev[selectedSpaceId] || [];
            const resolvedId = resolveArrowId(current, arrow);
            deletedArrowId = resolvedId || arrow.id;
            arrowIdAliasRef.current.delete(arrow.id);
            return {
              ...prev,
              [selectedSpaceId]: current.filter((a) => a.id !== (resolvedId || arrow.id)),
            };
          });

          if (deletedArrowId) {
            objectsApi.delete(deletedArrowId).catch((err) => {
              console.error('[UNDO] Failed to delete arrow:', err);
            });
          }

          window.dispatchEvent(new CustomEvent('arrow:deleted', { detail: { arrowId: deletedArrowId || arrow.id, undo: true } }));
        }
        break;
      }

      case 'arrow_move': {
        const { arrow, from, to } = event.event_data;
        if (!arrow || !selectedSpaceId) break;
        const targetStart = isRedo
          ? (to && typeof to.start?.x === 'number' && typeof to.start?.y === 'number' ? to.start : arrow.start)
          : (from && typeof from.start?.x === 'number' && typeof from.start?.y === 'number' ? from.start : arrow.start);
        const targetEnd = isRedo
          ? (to && typeof to.end?.x === 'number' && typeof to.end?.y === 'number' ? to.end : arrow.end)
          : (from && typeof from.end?.x === 'number' && typeof from.end?.y === 'number' ? from.end : arrow.end);

        let updatedArrowId = arrow.id;
        setArrowsBySpace((prev) => {
          const current = prev[selectedSpaceId] || [];
          const resolvedId = resolveArrowId(current, arrow) || arrow.id;
          updatedArrowId = resolvedId;
          const existing = current.find((a) => a.id === resolvedId);

          if (existing) {
            if (resolvedId !== arrow.id) {
              arrowIdAliasRef.current.set(arrow.id, resolvedId);
            }
            return {
              ...prev,
              [selectedSpaceId]: current.map((a) =>
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
            [selectedSpaceId]: [...current, fallbackArrow],
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
            console.error(`[${direction.toUpperCase()}] Failed to move arrow:`, err);
          });
        break;
      }

      case 'arrow_delete': {
        const { arrow } = event.event_data;
        if (!arrow || !selectedSpaceId) break;

        if (isRedo) {
          let deletedArrowId: string | null = null;
          setArrowsBySpace((prev) => {
            const current = prev[selectedSpaceId] || [];
            const resolvedId = resolveArrowId(current, arrow);
            deletedArrowId = resolvedId || arrow.id;
            arrowIdAliasRef.current.delete(arrow.id);
            return {
              ...prev,
              [selectedSpaceId]: current.filter((a) => a.id !== (resolvedId || arrow.id)),
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
        } else {
          const tempId = crypto.randomUUID ? crypto.randomUUID() : `arrow-${Date.now()}`;
          const tempArrow: ArrowSegment = {
            id: tempId,
            start: arrow.start,
            end: arrow.end,
          };

          setArrowsBySpace((prev) => ({
            ...prev,
            [selectedSpaceId]: [...(prev[selectedSpaceId] || []), tempArrow],
          }));

          void (async () => {
            try {
              const created = await objectsApi.create(selectedSpaceId, {
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

              setArrowsBySpace((prev) => ({
                ...prev,
                [selectedSpaceId]: (prev[selectedSpaceId] || []).map((a) =>
                  a.id === tempId ? { ...a, id: created.id } : a
                ),
              }));
              arrowIdAliasRef.current.set(arrow.id, created.id);

              window.dispatchEvent(
                new CustomEvent('arrow:created', { detail: { arrowId: created.id, restored: true } })
              );
            } catch (err) {
              console.error('[UNDO] Failed to restore arrow:', err);
              setArrowsBySpace((prev) => ({
                ...prev,
                [selectedSpaceId]: (prev[selectedSpaceId] || []).filter((a) => a.id !== tempId),
              }));
            }
          })();
        }
        break;
      }

      case 'text_create': {
        const { text } = event.event_data;
        if (!text || !selectedSpaceId) break;

        if (isRedo) {
          const restoredText = toDroppedTextFromEvent(text);
          setIconsBySpace((prev) => ({
            ...prev,
            [selectedSpaceId]: [...(prev[selectedSpaceId] || []), restoredText],
          }));

          objectsApi.updatePosition(text.id, text.x, text.y).catch((err) => {
            console.error('[REDO] Failed to restore text note:', err);
          });
        } else {
          setIconsBySpace((prev) => ({
            ...prev,
            [selectedSpaceId]: (prev[selectedSpaceId] || []).filter((icon) => icon.id !== text.id),
          }));

          objectsApi.updatePosition(text.id, -1, -1).catch((err) => {
            console.error('[UNDO] Failed to delete text note:', err);
          });
          window.dispatchEvent(new CustomEvent('tile:deleted', { detail: { tileId: text.id } }));
        }
        break;
      }

      case 'text_delete': {
        const { text } = event.event_data;
        if (!text || !selectedSpaceId) break;

        if (isRedo) {
          setIconsBySpace((prev) => ({
            ...prev,
            [selectedSpaceId]: (prev[selectedSpaceId] || []).filter((icon) => icon.id !== text.id),
          }));

          objectsApi.updatePosition(text.id, -1, -1).catch((err) => {
            console.error('[REDO] Failed to delete text note:', err);
          });
          window.dispatchEvent(new CustomEvent('tile:deleted', { detail: { tileId: text.id } }));
        } else {
          const restoredText = toDroppedTextFromEvent(text);
          setIconsBySpace((prev) => ({
            ...prev,
            [selectedSpaceId]: [...(prev[selectedSpaceId] || []), restoredText],
          }));

          objectsApi.updatePosition(text.id, text.x, text.y).catch((err) => {
            console.error('[UNDO] Failed to restore text note:', err);
          });
        }
        break;
      }

      default:
        console.warn(`[${direction.toUpperCase()}] Unknown event type:`, event);
    }
  };
  // Clear undo history on mount/unmount and before unload so no stale events persist across sessions.
  useEffect(() => {
    if (!selectedSpaceId) return;

    const clearServerHistory = async () => {
      try {
        await fetch(`${API_BASE}/spaces/${selectedSpaceId}/undo-events`, {
          method: 'DELETE',
          keepalive: true,
        });
      } catch (err) {
        try {
          if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
            const url = `${API_BASE}/spaces/${selectedSpaceId}/undo-events`;
            const blob = new Blob([], { type: 'application/json' });
            navigator.sendBeacon(url, blob);
          }
        } catch (sendBeaconErr) {
          console.error('[UNDO] Failed to clear undo history:', err, sendBeaconErr);
        }
      }
    };

    clearLocalHistory(selectedSpaceId);
    void clearServerHistory();

    const handleBeforeUnload = () => {
      clearLocalHistory(selectedSpaceId);
      clearServerHistory().catch(() => {
        // swallow errors on unload
      });
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      clearLocalHistory(selectedSpaceId);
      void clearServerHistory();
    };
  }, [clearLocalHistory, selectedSpaceId]);

  useEffect(() => {
    const handleUndoRedo = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if (!(e.ctrlKey || e.metaKey) || key !== 'z') return;

      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return;
      }

      if (!selectedSpaceId) return;

      e.preventDefault();
      const direction: UndoDirection = e.shiftKey ? 'redo' : 'undo';
      const runner = direction === 'redo' ? undoApi.redo : undoApi.undo;

      void (async () => {
        try {
          const response = await runner(selectedSpaceId);
          if (!response.success || !response.event) {
            console.log(`[${direction.toUpperCase()}] No events to ${direction}`);
            return;
          }

          console.log(`[${direction.toUpperCase()}] Processing event:`, response.event.event_type, response.event);
          await processUndoRedoEvent(response.event, direction);
        } catch (err) {
          console.error(`[${direction.toUpperCase()}] Error processing ${direction}:`, err);
        }
      })();
    };

    window.addEventListener('keydown', handleUndoRedo);
    return () => window.removeEventListener('keydown', handleUndoRedo);
  }, [selectedSpaceId]);
};

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
import { ArrowAnchorRef, DroppedIcon, ArrowSegment } from '@/components/layout/centerpane/types';
import { normalizeTag } from '@/types/tags';
import { useUndoHistoryStore } from '@/stores/undoHistoryStore';
import type { UndoEventResponse } from '@/api/undo';
import { API_BASE } from '@/config/api';

interface UseUndoProps {
  selectedSpaceId?: string;
  setIconsBySpace: React.Dispatch<React.SetStateAction<Record<string, DroppedIcon[]>>>;
  setArrowsBySpace: React.Dispatch<React.SetStateAction<Record<string, ArrowSegment[]>>>;
}

interface UndoArrowPayload {
  id: string;
  start: { x: number; y: number };
  end: { x: number; y: number };
  start_anchor?: { tile_id?: string; edge?: string; edge_index?: number };
  end_anchor?: { tile_id?: string; edge?: string; edge_index?: number };
}

const isUndoArrowPayload = (value: unknown): value is UndoArrowPayload => {
  const arrow = value as UndoArrowPayload | null;
  if (!arrow || typeof arrow !== 'object') return false;
  if (typeof arrow.id !== 'string') return false;
  if (typeof arrow.start?.x !== 'number' || typeof arrow.start?.y !== 'number') return false;
  if (typeof arrow.end?.x !== 'number' || typeof arrow.end?.y !== 'number') return false;
  return true;
};

const parseDeletedArrows = (eventData: Record<string, unknown>): UndoArrowPayload[] => {
  const raw = eventData.deleted_arrows;
  if (!Array.isArray(raw)) return [];
  return raw.filter((item): item is UndoArrowPayload => isUndoArrowPayload(item));
};

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
    eventArrow?: UndoArrowPayload
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
    width: typeof tile.width === 'number' ? tile.width : undefined,
    height: typeof tile.height === 'number' ? tile.height : undefined,
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
    width: typeof text.width === 'number' ? text.width : undefined,
    height: typeof text.height === 'number' ? text.height : undefined,
    tag: normalizeTag(text.tag),
    content: text.content,
  });

  const toAnchorRef = (anchor?: UndoArrowPayload['start_anchor']): ArrowAnchorRef | undefined => {
    if (!anchor?.tile_id) return undefined;
    if (anchor.edge !== 'top' && anchor.edge !== 'right' && anchor.edge !== 'bottom' && anchor.edge !== 'left') {
      return undefined;
    }
    if (!Number.isInteger(anchor.edge_index)) return undefined;
    return {
      tileId: anchor.tile_id,
      edge: anchor.edge,
      edgeIndex: Number(anchor.edge_index),
    };
  };

  const toArrowSegmentFromEvent = (arrow: UndoArrowPayload, idOverride?: string): ArrowSegment => ({
    id: idOverride ?? arrow.id,
    start: arrow.start,
    end: arrow.end,
    startAnchor: toAnchorRef(arrow.start_anchor),
    endAnchor: toAnchorRef(arrow.end_anchor),
  });

  const toArrowMetadata = (arrow: ArrowSegment) => ({
    arrow: true,
    start_x: arrow.start.x,
    start_y: arrow.start.y,
    end_x: arrow.end.x,
    end_y: arrow.end.y,
    start_tile_id: arrow.startAnchor?.tileId ?? null,
    start_anchor_edge: arrow.startAnchor?.edge ?? null,
    start_anchor_index: arrow.startAnchor?.edgeIndex ?? null,
    end_tile_id: arrow.endAnchor?.tileId ?? null,
    end_anchor_edge: arrow.endAnchor?.edge ?? null,
    end_anchor_index: arrow.endAnchor?.edgeIndex ?? null,
  });

  const restoreDeletedArrows = async (deletedArrows: UndoArrowPayload[]) => {
    if (!selectedSpaceId || deletedArrows.length === 0) return;

    const staged = deletedArrows.map((payload, index) => ({
      tempId: crypto.randomUUID ? crypto.randomUUID() : `arrow-restore-${Date.now()}-${index}`,
      payload,
      segment: toArrowSegmentFromEvent(payload),
    }));

    setArrowsBySpace((prev) => ({
      ...prev,
      [selectedSpaceId]: [
        ...(prev[selectedSpaceId] || []),
        ...staged.map((item) => ({ ...item.segment, id: item.tempId })),
      ],
    }));

    for (const item of staged) {
      try {
        const created = await objectsApi.create(selectedSpaceId, {
          type: 'text',
          title: 'Arrow',
          content: 'Arrow connection',
        });

        await objectsApi.updateMetadata(created.id, {
          ...toArrowMetadata(item.segment),
          content: 'Arrow connection',
        });

        setArrowsBySpace((prev) => ({
          ...prev,
          [selectedSpaceId]: (prev[selectedSpaceId] || []).map((arrow) =>
            arrow.id === item.tempId ? { ...arrow, id: created.id } : arrow
          ),
        }));
        arrowIdAliasRef.current.set(item.payload.id, created.id);
      } catch (err) {
        console.error('[UNDO] Failed to restore grouped deleted arrow:', err);
        setArrowsBySpace((prev) => ({
          ...prev,
          [selectedSpaceId]: (prev[selectedSpaceId] || []).filter((arrow) => arrow.id !== item.tempId),
        }));
      }
    }
  };

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

          const hasSize = typeof tile.width === 'number' || typeof tile.height === 'number';
          const persist = hasSize
            ? objectsApi.patchObject(tile.id, {
                metadata: {
                  x: tile.x,
                  y: tile.y,
                  width: typeof tile.width === 'number' ? tile.width : null,
                  height: typeof tile.height === 'number' ? tile.height : null,
                },
              })
            : objectsApi.updatePosition(tile.id, tile.x, tile.y);
          persist.catch((err) => {
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
        const tileWidth = typeof tile?.width === 'number' ? tile.width : undefined;
        const tileHeight = typeof tile?.height === 'number' ? tile.height : undefined;
        const targetHasWidth = Boolean(target && Object.prototype.hasOwnProperty.call(target, 'width'));
        const targetHasHeight = Boolean(target && Object.prototype.hasOwnProperty.call(target, 'height'));
        const targetWidth = typeof target?.width === 'number' ? target.width : undefined;
        const targetHeight = typeof target?.height === 'number' ? target.height : undefined;

        setIconsBySpace((prev) => {
          const current = prev[selectedSpaceId] || [];
          const existing = current.find((icon) => icon.id === tile.id);

          if (existing) {
            const nextWidth = targetHasWidth ? targetWidth : existing.width;
            const nextHeight = targetHasHeight ? targetHeight : existing.height;
            return {
              ...prev,
              [selectedSpaceId]: current.map((icon) =>
                icon.id === tile.id ? { ...icon, x: targetX, y: targetY, width: nextWidth, height: nextHeight } : icon
              ),
            };
          }

          const fallbackTile = toDroppedIconFromTile({
            ...tile,
            x: targetX,
            y: targetY,
            width: targetHasWidth ? targetWidth : tileWidth,
            height: targetHasHeight ? targetHeight : tileHeight,
          });
          return { ...prev, [selectedSpaceId]: [...current, fallbackTile] };
        });

        const shouldPersistSize = targetHasWidth || targetHasHeight || typeof tileWidth === 'number' || typeof tileHeight === 'number';
        if (shouldPersistSize) {
          const persistedWidth = targetHasWidth ? targetWidth : tileWidth;
          const persistedHeight = targetHasHeight ? targetHeight : tileHeight;
          objectsApi
            .patchObject(tile.id, {
              metadata: {
                x: targetX,
                y: targetY,
                width: persistedWidth ?? null,
                height: persistedHeight ?? null,
              },
            })
            .catch((err) => {
              console.error(`[${direction.toUpperCase()}] Failed to move/resize tile:`, err);
            });
        } else {
          objectsApi.updatePosition(tile.id, targetX, targetY).catch((err) => {
            console.error(`[${direction.toUpperCase()}] Failed to move tile:`, err);
          });
        }
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
        const deletedArrows = parseDeletedArrows(event.event_data as Record<string, unknown>);
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

          const hasSize = typeof tile.width === 'number' || typeof tile.height === 'number';
          const persist = hasSize
            ? objectsApi.patchObject(tile.id, {
                metadata: {
                  x: tile.x,
                  y: tile.y,
                  width: typeof tile.width === 'number' ? tile.width : null,
                  height: typeof tile.height === 'number' ? tile.height : null,
                },
              })
            : objectsApi.updatePosition(tile.id, tile.x, tile.y);
          persist.catch((err) => {
            console.error('[UNDO] Failed to restore tile position:', err);
          });
          await restoreDeletedArrows(deletedArrows);
        }
        break;
      }

      case 'arrow_create': {
        const { arrow } = event.event_data as { arrow?: UndoArrowPayload };
        if (!arrow || !selectedSpaceId) break;

        if (isRedo) {
          const tempId = crypto.randomUUID ? crypto.randomUUID() : `arrow-${Date.now()}`;
          const tempArrow: ArrowSegment = toArrowSegmentFromEvent(arrow, tempId);

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
                ...toArrowMetadata(tempArrow),
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
        const { arrow, from, to } = event.event_data as {
          arrow?: UndoArrowPayload;
          from?: {
            start?: { x: number; y: number };
            end?: { x: number; y: number };
            start_anchor?: UndoArrowPayload['start_anchor'];
            end_anchor?: UndoArrowPayload['end_anchor'];
          };
          to?: {
            start?: { x: number; y: number };
            end?: { x: number; y: number };
            start_anchor?: UndoArrowPayload['start_anchor'];
            end_anchor?: UndoArrowPayload['end_anchor'];
          };
        };
        if (!arrow || !selectedSpaceId) break;
        const targetFrame = isRedo ? (to || {}) : (from || {});
        const targetStart = isRedo
          ? (to && typeof to.start?.x === 'number' && typeof to.start?.y === 'number' ? to.start : arrow.start)
          : (from && typeof from.start?.x === 'number' && typeof from.start?.y === 'number' ? from.start : arrow.start);
        const targetEnd = isRedo
          ? (to && typeof to.end?.x === 'number' && typeof to.end?.y === 'number' ? to.end : arrow.end)
          : (from && typeof from.end?.x === 'number' && typeof from.end?.y === 'number' ? from.end : arrow.end);
        const targetStartAnchor = toAnchorRef(targetFrame.start_anchor) ?? toAnchorRef(arrow.start_anchor);
        const targetEndAnchor = toAnchorRef(targetFrame.end_anchor) ?? toAnchorRef(arrow.end_anchor);

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
                a.id === resolvedId
                  ? { ...a, start: targetStart, end: targetEnd, startAnchor: targetStartAnchor, endAnchor: targetEndAnchor }
                  : a
              ),
            };
          }

          const fallbackArrow: ArrowSegment = {
            id: resolvedId,
            start: targetStart,
            end: targetEnd,
            startAnchor: targetStartAnchor,
            endAnchor: targetEndAnchor,
          };

          if (resolvedId !== arrow.id) {
            arrowIdAliasRef.current.set(arrow.id, resolvedId);
          }

          return {
            ...prev,
            [selectedSpaceId]: [...current, fallbackArrow],
          };
        });

        const movedArrow: ArrowSegment = {
          id: updatedArrowId,
          start: targetStart,
          end: targetEnd,
          startAnchor: targetStartAnchor,
          endAnchor: targetEndAnchor,
        };

        objectsApi
          .updateMetadata(updatedArrowId, toArrowMetadata(movedArrow))
          .catch((err) => {
            console.error(`[${direction.toUpperCase()}] Failed to move arrow:`, err);
          });
        break;
      }

      case 'arrow_delete': {
        const { arrow } = event.event_data as { arrow?: UndoArrowPayload };
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
          const tempArrow: ArrowSegment = toArrowSegmentFromEvent(arrow, tempId);

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
                ...toArrowMetadata(tempArrow),
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

          const hasSize = typeof text.width === 'number' || typeof text.height === 'number';
          const persist = hasSize
            ? objectsApi.patchObject(text.id, {
                metadata: {
                  x: text.x,
                  y: text.y,
                  width: typeof text.width === 'number' ? text.width : null,
                  height: typeof text.height === 'number' ? text.height : null,
                },
              })
            : objectsApi.updatePosition(text.id, text.x, text.y);
          persist.catch((err) => {
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
        const deletedArrows = parseDeletedArrows(event.event_data as Record<string, unknown>);
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

          const hasSize = typeof text.width === 'number' || typeof text.height === 'number';
          const persist = hasSize
            ? objectsApi.patchObject(text.id, {
                metadata: {
                  x: text.x,
                  y: text.y,
                  width: typeof text.width === 'number' ? text.width : null,
                  height: typeof text.height === 'number' ? text.height : null,
                },
              })
            : objectsApi.updatePosition(text.id, text.x, text.y);
          persist.catch((err) => {
            console.error('[UNDO] Failed to restore text note:', err);
          });
          await restoreDeletedArrows(deletedArrows);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps -- processUndoRedoEvent references store callbacks; re-subscribing on space change is the intended behavior
  }, [selectedSpaceId]);
};

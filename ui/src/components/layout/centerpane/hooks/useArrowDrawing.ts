import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type React from 'react';
import { objectsApi } from '../../../../api/objects';
import { undoApi } from '../../../../api/undo';
import { ArrowSegment } from '../types';

interface UseArrowDrawingProps {
  zoom: number;
  paneRef: React.RefObject<HTMLDivElement | null>;
  selectedIslandId?: string;
  arrowsByIsland: Record<string, ArrowSegment[]>;
  setArrowsByIsland: React.Dispatch<React.SetStateAction<Record<string, ArrowSegment[]>>>;
  contentHeight: number;
  toCanvasCoords: (clientX: number, clientY: number) => { x: number; y: number };
  contextMenuOpen: boolean;
  isTargetBlocked: (el: HTMLElement) => boolean;
}

const ARROW_PADDING = 120;

// useArrowDrawing handles pointer-based arrow creation/selection on the canvas and keeps arrow segments in sync with backend objects and undo events.
export const useArrowDrawing = ({
  zoom,
  paneRef,
  selectedIslandId,
  arrowsByIsland,
  setArrowsByIsland,
  contentHeight,
  toCanvasCoords,
  contextMenuOpen,
  isTargetBlocked,
}: UseArrowDrawingProps) => {
  const [selectedArrowId, setSelectedArrowId] = useState<string | null>(null);
  const [draftArrow, setDraftArrow] = useState<ArrowSegment | null>(null);
  const [isDrawingArrow, setIsDrawingArrow] = useState(false);
  const [hasArrowMovement, setHasArrowMovement] = useState(false);
  const arrowStartRef = useRef<{ x: number; y: number } | null>(null);
  const [draggingArrowId, setDraggingArrowId] = useState<string | null>(null);
  const arrowDragStateRef = useRef<{
    arrowId: string;
    pointerStart: { x: number; y: number };
    initial: { start: { x: number; y: number }; end: { x: number; y: number } };
    last?: { start: { x: number; y: number }; end: { x: number; y: number } };
  } | null>(null);
  const arrowDragMovedRef = useRef(false);

  useEffect(() => {
    setDraftArrow(null);
    setIsDrawingArrow(false);
    setHasArrowMovement(false);
    setSelectedArrowId(null);
    arrowStartRef.current = null;
    setDraggingArrowId(null);
    arrowDragStateRef.current = null;
    arrowDragMovedRef.current = false;
  }, [selectedIslandId]);

  const deleteArrow = useCallback(
    (arrowId: string) => {
      if (!selectedIslandId) return;

      let arrowToDelete: ArrowSegment | undefined;

      setArrowsByIsland((prev) => {
        const current = prev[selectedIslandId] || [];
        arrowToDelete = current.find((a) => a.id === arrowId);
        if (!current.length) return prev;
        return { ...prev, [selectedIslandId]: current.filter((segment) => segment.id !== arrowId) };
      });

      setSelectedArrowId((prev) => (prev === arrowId ? null : prev));

      if (arrowToDelete) {
        // Track deletion in undo log so keyboard/context actions stay reversible
        undoApi
          .createEvent(selectedIslandId, {
            event_type: 'arrow_delete',
            event_data: {
              arrow: {
                id: arrowToDelete.id,
                start: { x: arrowToDelete.start.x, y: arrowToDelete.start.y },
                end: { x: arrowToDelete.end.x, y: arrowToDelete.end.y },
              },
            },
          })
          .catch((err) => console.error('Failed to create undo event:', err));
      }

      objectsApi.delete(arrowId).catch((err) => {
        console.error('Failed to delete arrow', err);
      });
      window.dispatchEvent(new CustomEvent('arrow:deleted', { detail: { arrowId } }));
    },
    [selectedIslandId, setArrowsByIsland]
  );

  const currentArrows = useMemo(() => {
    if (!selectedIslandId) return [];
    return arrowsByIsland[selectedIslandId] || [];
  }, [arrowsByIsland, selectedIslandId]);

  const toArrowCoords = (clientX: number, clientY: number) => {
    const base = toCanvasCoords(clientX, clientY);
    const safeZoom = Math.max(zoom, 0.01);
    return {
      x: base.x - 24 / safeZoom,
      y: base.y - 34 / safeZoom,
    };
  };

  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    if (!paneRef.current || !selectedIslandId) return;
    if (contextMenuOpen) return;

    const target = e.target as HTMLElement;
    if (isTargetBlocked(target)) return;

    arrowStartRef.current = toArrowCoords(e.clientX, e.clientY);
    setDraftArrow(null);
    setIsDrawingArrow(true);
    setHasArrowMovement(false);
    setSelectedArrowId(null);
  };

  const startArrowDrag = (segment: ArrowSegment, e: React.PointerEvent<SVGLineElement>) => {
    if (e.button !== 0) return;
    if (!selectedIslandId) return;

    e.preventDefault();
    e.stopPropagation();

    setSelectedArrowId(segment.id);
    setDraggingArrowId(segment.id);
    arrowDragMovedRef.current = false;

    const pointerStart = toArrowCoords(e.clientX, e.clientY);
    arrowDragStateRef.current = {
      arrowId: segment.id,
      pointerStart,
      initial: { start: { ...segment.start }, end: { ...segment.end } },
    };
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDrawingArrow) return;
    if (!arrowStartRef.current) return;

    const nextEnd = toArrowCoords(e.clientX, e.clientY);
    const dx = nextEnd.x - arrowStartRef.current.x;
    const dy = nextEnd.y - arrowStartRef.current.y;
    const distance = Math.hypot(dx, dy);

    const movedEnough = distance > 3;
    if (movedEnough && !draftArrow) {
      setDraftArrow({ id: 'arrow-draft', start: arrowStartRef.current, end: nextEnd });
    } else if (draftArrow) {
      setDraftArrow((prev) => (prev ? { ...prev, end: nextEnd } : prev));
    }

    if (movedEnough && !hasArrowMovement) {
      setHasArrowMovement(true);
    }
  };

  const handleCanvasMouseUp = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDrawingArrow) return;

    setIsDrawingArrow(false);

    const target = e.target as HTMLElement;
    if (isTargetBlocked(target)) {
      setDraftArrow(null);
      arrowStartRef.current = null;
      setHasArrowMovement(false);
      return;
    }

    if (!paneRef.current || !selectedIslandId) {
      setDraftArrow(null);
      arrowStartRef.current = null;
      setHasArrowMovement(false);
      return;
    }

    const rect = paneRef.current.getBoundingClientRect();
    const isInsidePane =
      e.clientX >= rect.left &&
      e.clientX <= rect.right &&
      e.clientY >= rect.top &&
      e.clientY <= rect.bottom;
    const end = toArrowCoords(e.clientX, e.clientY);
    const startPoint = arrowStartRef.current;
    const moved = hasArrowMovement || (startPoint ? Math.hypot(end.x - startPoint.x, end.y - startPoint.y) > 3 : false);

    if (!isInsidePane || !moved) {
      setDraftArrow(null);
      setHasArrowMovement(false);
      arrowStartRef.current = null;
      return;
    }

    const start = draftArrow?.start || startPoint;
    if (!start) {
      setDraftArrow(null);
      setHasArrowMovement(false);
      arrowStartRef.current = null;
      return;
    }

    const newArrow: ArrowSegment = {
      id: crypto.randomUUID ? crypto.randomUUID() : `arrow-${Date.now()}`,
      start,
      end,
    };

    const islandId = selectedIslandId;

    setArrowsByIsland((prev) => {
      const current = prev[selectedIslandId] || [];
      return {
        ...prev,
        [selectedIslandId]: [...current, newArrow],
      };
    });
    setSelectedArrowId(newArrow.id);
    setDraftArrow(null);
    setHasArrowMovement(false);
    arrowStartRef.current = null;

    void (async () => {
      try {
        const created = await objectsApi.create(islandId, {
          type: 'text',
          title: 'Arrow',
          content: 'Arrow connection',
        });
        await objectsApi.updateMetadata(created.id, {
          arrow: true,
          start_x: newArrow.start.x,
          start_y: newArrow.start.y,
          end_x: newArrow.end.x,
          end_y: newArrow.end.y,
          content: 'Arrow connection',
        });
        setArrowsByIsland((prev) => {
          const current = prev[islandId] || [];
          return {
            ...prev,
            [islandId]: current.map((segment) =>
              segment.id === newArrow.id ? { ...segment, id: created.id } : segment
            ),
          };
        });
        setSelectedArrowId(created.id);

        // Add to backend undo history
        undoApi
          .createEvent(islandId, {
            event_type: 'arrow_create',
            event_data: {
              arrow: {
                id: created.id,
                start: { x: newArrow.start.x, y: newArrow.start.y },
                end: { x: newArrow.end.x, y: newArrow.end.y },
              },
            },
          })
          .catch((err) => console.error('Failed to create undo event:', err));

        window.dispatchEvent(new CustomEvent('arrow:created', { detail: { arrowId: created.id } }));
      } catch (err) {
        console.error('Failed to persist arrow', err);
        setArrowsByIsland((prev) => {
          const current = prev[selectedIslandId] || [];
          return {
            ...prev,
            [selectedIslandId]: current.filter((segment) => segment.id !== newArrow.id),
          };
        });
        setSelectedArrowId(null);
      }
    })();
  };

  useEffect(() => {
    if (!draggingArrowId) return;

    // Track pointer-driven arrow moves and emit undo/redo events on release
    const handlePointerMove = (e: PointerEvent) => {
      if (!selectedIslandId) return;
      const dragState = arrowDragStateRef.current;
      if (!dragState) return;

      const current = toArrowCoords(e.clientX, e.clientY);
      const dx = current.x - dragState.pointerStart.x;
      const dy = current.y - dragState.pointerStart.y;

      const nextStart = {
        x: dragState.initial.start.x + dx,
        y: dragState.initial.start.y + dy,
      };
      const nextEnd = {
        x: dragState.initial.end.x + dx,
        y: dragState.initial.end.y + dy,
      };

      dragState.last = { start: nextStart, end: nextEnd };

      const moved =
        Math.abs(nextStart.x - dragState.initial.start.x) > 0.5 ||
        Math.abs(nextStart.y - dragState.initial.start.y) > 0.5 ||
        Math.abs(nextEnd.x - dragState.initial.end.x) > 0.5 ||
        Math.abs(nextEnd.y - dragState.initial.end.y) > 0.5;

      if (moved) {
        arrowDragMovedRef.current = true;
      }

      setArrowsByIsland((prev) => {
        const currentArrows = prev[selectedIslandId] || [];
        return {
          ...prev,
          [selectedIslandId]: currentArrows.map((a) =>
            a.id === dragState.arrowId ? { ...a, start: nextStart, end: nextEnd } : a
          ),
        };
      });
    };

    const handlePointerUp = (e: PointerEvent) => {
      const dragState = arrowDragStateRef.current;
      arrowDragStateRef.current = null;
      setDraggingArrowId(null);

      if (!selectedIslandId || !dragState) return;
      if (!arrowDragMovedRef.current || !dragState.last) return;

      const finalStart = dragState.last.start;
      const finalEnd = dragState.last.end;

      // Persist move
      objectsApi
        .updateMetadata(dragState.arrowId, {
          arrow: true,
          start_x: finalStart.x,
          start_y: finalStart.y,
          end_x: finalEnd.x,
          end_y: finalEnd.y,
        })
        .catch((err) => {
          console.error('[ARROW] Failed to persist arrow move:', err);
        });

      // Record undo/redo event
      undoApi
        .createEvent(selectedIslandId, {
          event_type: 'arrow_move',
          event_data: {
            arrow: {
              id: dragState.arrowId,
              start: finalStart,
              end: finalEnd,
            },
            from: dragState.initial,
            to: { start: finalStart, end: finalEnd },
          },
        })
        .catch((err) => console.error('Failed to create arrow move undo event:', err));
    };

    window.addEventListener('pointermove', handlePointerMove, true);
    window.addEventListener('pointerup', handlePointerUp, true);
    window.addEventListener('pointercancel', handlePointerUp, true);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove, true);
      window.removeEventListener('pointerup', handlePointerUp, true);
      window.removeEventListener('pointercancel', handlePointerUp, true);
    };
  }, [draggingArrowId, selectedIslandId, setArrowsByIsland]);

  useEffect(() => {
    const handleDeleteArrow = (e: KeyboardEvent) => {
      if (!(e.key === 'Delete' || e.key === 'Backspace')) return;
      if (!selectedArrowId || !selectedIslandId) return;
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return;
      e.preventDefault();
      e.stopPropagation();

      deleteArrow(selectedArrowId);
    };

    window.addEventListener('keydown', handleDeleteArrow, true);
    return () => window.removeEventListener('keydown', handleDeleteArrow, true);
  }, [deleteArrow, selectedArrowId, selectedIslandId]);


  const allArrowSegments = useMemo(() => {
    const segments = [...currentArrows];
    if (draftArrow) {
      segments.push(draftArrow);
    }
    return segments;
  }, [currentArrows, draftArrow]);

  const maxArrowY = allArrowSegments.length
    ? Math.max(...allArrowSegments.map((segment) => Math.max(segment.start.y, segment.end.y)))
    : 0;
  const contentHeightWithArrows = Math.max(contentHeight, maxArrowY + ARROW_PADDING);

  const baseWidth = paneRef.current ? paneRef.current.clientWidth / Math.max(zoom, 0.01) : 0;
  const baseHeight = contentHeightWithArrows / Math.max(zoom, 0.01);
  const maxArrowX = allArrowSegments.length
    ? Math.max(...allArrowSegments.map((segment) => Math.max(segment.start.x, segment.end.x)))
    : 0;
  const svgWidth = Math.max(baseWidth, maxArrowX + ARROW_PADDING, 1);
  const svgHeight = Math.max(baseHeight, maxArrowY + ARROW_PADDING, 1);

  return {
    selectedArrowId,
    setSelectedArrowId,
    deleteArrow,
    clearArrowSelection: () => setSelectedArrowId(null),
    handleCanvasMouseDown,
    handleCanvasMouseMove,
    handleCanvasMouseUp,
    handleArrowPointerDown: startArrowDrag,
    allArrowSegments,
    svgWidth,
    svgHeight,
    contentHeightWithArrows,
  };
};

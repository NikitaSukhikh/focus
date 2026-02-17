// useArrowDrawing handles anchor-based arrow creation, endpoint retargeting, and graph-link persistence.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type React from 'react';
import { objectsApi } from '@/api/objects';
import { undoApi } from '@/api/undo';
import { ArrowAnchorRef, ArrowSegment } from '@/components/layout/centerpane/types';
import {
  findFocusRingTileIdAtClientPoint,
  getNearestAnchorForTile,
} from '@/components/layout/centerpane/arrowGeometry';

interface UseArrowDrawingProps {
  zoom: number;
  paneRef: React.RefObject<HTMLDivElement | null>;
  selectedSpaceId?: string;
  arrowsBySpace: Record<string, ArrowSegment[]>;
  setArrowsBySpace: React.Dispatch<React.SetStateAction<Record<string, ArrowSegment[]>>>;
  contentHeight: number;
  toCanvasCoords: (_clientX: number, _clientY: number) => { x: number; y: number };
  contextMenuOpen: boolean;
}

interface ArrowUndoPayload {
  id: string;
  start: { x: number; y: number };
  end: { x: number; y: number };
  start_anchor?: { tile_id: string; edge: string; edge_index: number };
  end_anchor?: { tile_id: string; edge: string; edge_index: number };
}

interface ArrowUndoFrame {
  start: { x: number; y: number };
  end: { x: number; y: number };
  start_anchor?: { tile_id: string; edge: string; edge_index: number };
  end_anchor?: { tile_id: string; edge: string; edge_index: number };
}

interface DrawState {
  pointerId: number;
  startTileId: string;
  startAnchor: ArrowAnchorRef;
  startPoint: { x: number; y: number };
}

type ArrowEndpoint = 'start' | 'end';

interface EndpointDragState {
  pointerId: number;
  arrowId: string;
  endpoint: ArrowEndpoint;
  initial: ArrowSegment;
}

const ARROW_PADDING = 120;

const cloneAnchor = (anchor?: ArrowAnchorRef): ArrowAnchorRef | undefined =>
  anchor
    ? { tileId: anchor.tileId, edge: anchor.edge, edgeIndex: anchor.edgeIndex }
    : undefined;

const cloneSegment = (segment: ArrowSegment): ArrowSegment => ({
  id: segment.id,
  start: { x: segment.start.x, y: segment.start.y },
  end: { x: segment.end.x, y: segment.end.y },
  startAnchor: cloneAnchor(segment.startAnchor),
  endAnchor: cloneAnchor(segment.endAnchor),
});

const toMetadataAnchor = (anchor: ArrowAnchorRef) => ({
  tile_id: anchor.tileId,
  edge: anchor.edge,
  edge_index: anchor.edgeIndex,
});

const toUndoPayload = (arrow: ArrowSegment): ArrowUndoPayload => ({
  id: arrow.id,
  start: { x: arrow.start.x, y: arrow.start.y },
  end: { x: arrow.end.x, y: arrow.end.y },
  start_anchor: arrow.startAnchor ? toMetadataAnchor(arrow.startAnchor) : undefined,
  end_anchor: arrow.endAnchor ? toMetadataAnchor(arrow.endAnchor) : undefined,
});

const toUndoFrame = (arrow: ArrowSegment): ArrowUndoFrame => ({
  start: { x: arrow.start.x, y: arrow.start.y },
  end: { x: arrow.end.x, y: arrow.end.y },
  start_anchor: arrow.startAnchor ? toMetadataAnchor(arrow.startAnchor) : undefined,
  end_anchor: arrow.endAnchor ? toMetadataAnchor(arrow.endAnchor) : undefined,
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

const isSameAnchor = (a?: ArrowAnchorRef, b?: ArrowAnchorRef) => {
  if (!a && !b) return true;
  if (!a || !b) return false;
  return a.tileId === b.tileId && a.edge === b.edge && a.edgeIndex === b.edgeIndex;
};

const didArrowChange = (before: ArrowSegment, after: ArrowSegment) => {
  const moved =
    Math.abs(before.start.x - after.start.x) > 0.5 ||
    Math.abs(before.start.y - after.start.y) > 0.5 ||
    Math.abs(before.end.x - after.end.x) > 0.5 ||
    Math.abs(before.end.y - after.end.y) > 0.5;
  return moved || !isSameAnchor(before.startAnchor, after.startAnchor) || !isSameAnchor(before.endAnchor, after.endAnchor);
};

const applyEndpointRetarget = (
  original: ArrowSegment,
  endpoint: ArrowEndpoint,
  point: { x: number; y: number },
  anchor?: ArrowAnchorRef
): ArrowSegment => {
  if (endpoint === 'start') {
    return {
      ...original,
      start: point,
      startAnchor: cloneAnchor(anchor),
    };
  }
  return {
    ...original,
    end: point,
    endAnchor: cloneAnchor(anchor),
  };
};

// Anchor-only arrows keep graph relationships stable and endpoint retargeting makes graph editing explicit.
export const useArrowDrawing = ({
  zoom,
  paneRef,
  selectedSpaceId,
  arrowsBySpace,
  setArrowsBySpace,
  contentHeight,
  toCanvasCoords,
  contextMenuOpen,
}: UseArrowDrawingProps) => {
  const [selectedArrowId, setSelectedArrowId] = useState<string | null>(null);
  const [draftArrow, setDraftArrow] = useState<ArrowSegment | null>(null);
  const [isDrawingArrow, setIsDrawingArrow] = useState(false);
  const drawStateRef = useRef<DrawState | null>(null);
  const endpointDragStateRef = useRef<EndpointDragState | null>(null);
  const [draggingEndpoint, setDraggingEndpoint] = useState<{ arrowId: string; endpoint: ArrowEndpoint } | null>(null);

  useEffect(() => {
    setDraftArrow(null);
    setIsDrawingArrow(false);
    setSelectedArrowId(null);
    drawStateRef.current = null;
    endpointDragStateRef.current = null;
    setDraggingEndpoint(null);
  }, [selectedSpaceId]);

  const deleteArrow = useCallback(
    (arrowId: string) => {
      if (!selectedSpaceId) return;

      let arrowToDelete: ArrowSegment | undefined;

      setArrowsBySpace((prev) => {
        const current = prev[selectedSpaceId] || [];
        arrowToDelete = current.find((a) => a.id === arrowId);
        if (!current.length) return prev;
        return { ...prev, [selectedSpaceId]: current.filter((segment) => segment.id !== arrowId) };
      });

      setSelectedArrowId((prev) => (prev === arrowId ? null : prev));

      if (arrowToDelete) {
        undoApi
          .createEvent(selectedSpaceId, {
            event_type: 'arrow_delete',
            event_data: {
              arrow: toUndoPayload(arrowToDelete),
            },
          })
          .catch((err) => console.error('Failed to create undo event:', err));
      }

      objectsApi.delete(arrowId).catch((err) => {
        console.error('Failed to delete arrow', err);
      });
      window.dispatchEvent(new CustomEvent('arrow:deleted', { detail: { arrowId } }));
    },
    [selectedSpaceId, setArrowsBySpace]
  );

  const currentArrows = useMemo(() => {
    if (!selectedSpaceId) return [];
    return arrowsBySpace[selectedSpaceId] || [];
  }, [arrowsBySpace, selectedSpaceId]);

  const getPointerCanvasPoint = useCallback(
    (clientX: number, clientY: number) => toCanvasCoords(clientX, clientY),
    [toCanvasCoords]
  );

  const getAnchorAtPointer = useCallback(
    (clientX: number, clientY: number) => {
      const hoveredTileId = findFocusRingTileIdAtClientPoint(clientX, clientY);
      if (!hoveredTileId) return null;
      return getNearestAnchorForTile(hoveredTileId, clientX, clientY, toCanvasCoords);
    },
    [toCanvasCoords]
  );

  const computeDraftEndpoint = useCallback(
    (startTileId: string, clientX: number, clientY: number) => {
      const anchorHit = getAnchorAtPointer(clientX, clientY);
      const pointerPoint = getPointerCanvasPoint(clientX, clientY);
      if (!anchorHit || anchorHit.anchor.tileId === startTileId) {
        return { point: pointerPoint, anchor: null as ArrowAnchorRef | null };
      }
      return { point: anchorHit.point, anchor: anchorHit.anchor };
    },
    [getAnchorAtPointer, getPointerCanvasPoint]
  );

  const handleFocusRingPointerDown = useCallback(
    (event: React.PointerEvent<HTMLElement | SVGElement>, tileId: string) => {
      if (event.button !== 0) return;
      if (!selectedSpaceId || contextMenuOpen || endpointDragStateRef.current) return;

      const startAnchor = getNearestAnchorForTile(tileId, event.clientX, event.clientY, toCanvasCoords);
      if (!startAnchor) return;

      event.preventDefault();
      event.stopPropagation();

      drawStateRef.current = {
        pointerId: event.pointerId,
        startTileId: tileId,
        startAnchor: startAnchor.anchor,
        startPoint: startAnchor.point,
      };

      setSelectedArrowId(null);
      setIsDrawingArrow(true);
      setDraftArrow({
        id: 'arrow-draft',
        start: startAnchor.point,
        end: startAnchor.point,
        startAnchor: startAnchor.anchor,
      });
    },
    [contextMenuOpen, selectedSpaceId, toCanvasCoords]
  );

  const handleArrowPointerDown = (segment: ArrowSegment, e: React.PointerEvent<SVGPathElement>) => {
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    setSelectedArrowId(segment.id);
  };

  const handleArrowEndpointPointerDown = useCallback(
    (segment: ArrowSegment, endpoint: ArrowEndpoint, e: React.PointerEvent<SVGCircleElement>) => {
      if (e.button !== 0) return;
      if (!selectedSpaceId || isDrawingArrow) return;

      e.preventDefault();
      e.stopPropagation();

      setSelectedArrowId(segment.id);
      endpointDragStateRef.current = {
        pointerId: e.pointerId,
        arrowId: segment.id,
        endpoint,
        initial: cloneSegment(segment),
      };
      setDraggingEndpoint({ arrowId: segment.id, endpoint });
    },
    [isDrawingArrow, selectedSpaceId]
  );

  useEffect(() => {
    if (!isDrawingArrow) return;

    const handlePointerMove = (e: PointerEvent) => {
      const drawState = drawStateRef.current;
      if (!drawState) return;
      if (e.pointerId !== drawState.pointerId) return;

      const next = computeDraftEndpoint(drawState.startTileId, e.clientX, e.clientY);

      setDraftArrow({
        id: 'arrow-draft',
        start: drawState.startPoint,
        end: next.point,
        startAnchor: drawState.startAnchor,
        endAnchor: next.anchor ?? undefined,
      });
    };

    const finishDrawing = (e: PointerEvent) => {
      const drawState = drawStateRef.current;
      if (!drawState) return;
      if (e.pointerId !== drawState.pointerId) return;

      const next = computeDraftEndpoint(drawState.startTileId, e.clientX, e.clientY);

      setIsDrawingArrow(false);
      setDraftArrow(null);
      drawStateRef.current = null;

      if (!selectedSpaceId || !next.anchor || next.anchor.tileId === drawState.startTileId) {
        return;
      }

      const newArrow: ArrowSegment = {
        id: crypto.randomUUID ? crypto.randomUUID() : `arrow-${Date.now()}`,
        start: drawState.startPoint,
        end: next.point,
        startAnchor: drawState.startAnchor,
        endAnchor: next.anchor,
      };

      const spaceId = selectedSpaceId;

      setArrowsBySpace((prev) => {
        const current = prev[spaceId] || [];
        return { ...prev, [spaceId]: [...current, newArrow] };
      });
      setSelectedArrowId(newArrow.id);

      void (async () => {
        try {
          const created = await objectsApi.create(spaceId, {
            type: 'text',
            title: 'Arrow',
            content: 'Arrow connection',
          });

          await objectsApi.updateMetadata(created.id, {
            ...toArrowMetadata(newArrow),
            content: 'Arrow connection',
          });

          setArrowsBySpace((prev) => {
            const current = prev[spaceId] || [];
            return {
              ...prev,
              [spaceId]: current.map((segment) =>
                segment.id === newArrow.id ? { ...segment, id: created.id } : segment
              ),
            };
          });
          setSelectedArrowId(created.id);

          undoApi
            .createEvent(spaceId, {
              event_type: 'arrow_create',
              event_data: {
                arrow: {
                  ...toUndoPayload(newArrow),
                  id: created.id,
                },
              },
            })
            .catch((err) => console.error('Failed to create undo event:', err));

          window.dispatchEvent(new CustomEvent('arrow:created', { detail: { arrowId: created.id } }));
        } catch (err) {
          console.error('Failed to persist arrow', err);
          setArrowsBySpace((prev) => {
            const current = prev[spaceId] || [];
            return { ...prev, [spaceId]: current.filter((segment) => segment.id !== newArrow.id) };
          });
          setSelectedArrowId(null);
        }
      })();
    };

    window.addEventListener('pointermove', handlePointerMove, true);
    window.addEventListener('pointerup', finishDrawing, true);
    window.addEventListener('pointercancel', finishDrawing, true);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove, true);
      window.removeEventListener('pointerup', finishDrawing, true);
      window.removeEventListener('pointercancel', finishDrawing, true);
    };
  }, [computeDraftEndpoint, isDrawingArrow, selectedSpaceId, setArrowsBySpace]);

  useEffect(() => {
    if (!draggingEndpoint) return;

    const handlePointerMove = (e: PointerEvent) => {
      const dragState = endpointDragStateRef.current;
      if (!dragState || e.pointerId !== dragState.pointerId) return;
      if (!selectedSpaceId) return;

      const anchorHit = getAnchorAtPointer(e.clientX, e.clientY);
      const point = anchorHit?.point ?? getPointerCanvasPoint(e.clientX, e.clientY);
      const nextSegment = applyEndpointRetarget(
        dragState.initial,
        dragState.endpoint,
        point,
        anchorHit?.anchor
      );

      setArrowsBySpace((prev) => {
        const current = prev[selectedSpaceId] || [];
        return {
          ...prev,
          [selectedSpaceId]: current.map((segment) =>
            segment.id === dragState.arrowId ? nextSegment : segment
          ),
        };
      });
    };

    const finishRetarget = (e: PointerEvent) => {
      const dragState = endpointDragStateRef.current;
      if (!dragState || e.pointerId !== dragState.pointerId) return;

      endpointDragStateRef.current = null;
      setDraggingEndpoint(null);

      if (!selectedSpaceId) return;

      const anchorHit = getAnchorAtPointer(e.clientX, e.clientY);
      if (!anchorHit || !anchorHit.anchor) {
        setArrowsBySpace((prev) => {
          const current = prev[selectedSpaceId] || [];
          return {
            ...prev,
            [selectedSpaceId]: current.map((segment) =>
              segment.id === dragState.arrowId ? dragState.initial : segment
            ),
          };
        });
        return;
      }

      const finalSegment = applyEndpointRetarget(dragState.initial, dragState.endpoint, anchorHit.point, anchorHit.anchor);

      setArrowsBySpace((prev) => {
        const current = prev[selectedSpaceId] || [];
        return {
          ...prev,
          [selectedSpaceId]: current.map((segment) =>
            segment.id === dragState.arrowId ? finalSegment : segment
          ),
        };
      });

      if (!didArrowChange(dragState.initial, finalSegment)) {
        return;
      }

      const persistedSegment = { ...finalSegment, id: dragState.arrowId };
      objectsApi
        .updateMetadata(dragState.arrowId, toArrowMetadata(persistedSegment))
        .catch((err) => {
          console.error('[ARROW] Failed to persist endpoint retarget:', err);
        });

      undoApi
        .createEvent(selectedSpaceId, {
          event_type: 'arrow_move',
          event_data: {
            arrow: toUndoPayload(persistedSegment),
            from: toUndoFrame(dragState.initial),
            to: toUndoFrame(persistedSegment),
          },
        })
        .catch((err) => console.error('Failed to create arrow move undo event:', err));
    };

    window.addEventListener('pointermove', handlePointerMove, true);
    window.addEventListener('pointerup', finishRetarget, true);
    window.addEventListener('pointercancel', finishRetarget, true);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove, true);
      window.removeEventListener('pointerup', finishRetarget, true);
      window.removeEventListener('pointercancel', finishRetarget, true);
    };
  }, [
    draggingEndpoint,
    getAnchorAtPointer,
    getPointerCanvasPoint,
    selectedSpaceId,
    setArrowsBySpace,
  ]);

  useEffect(() => {
    const handleTileDeleted = (event: Event) => {
      if (!selectedSpaceId) return;

      const customEvent = event as CustomEvent<{ tileId?: string }>;
      const tileId = customEvent.detail?.tileId;
      if (!tileId) return;

      let removedArrows: ArrowSegment[] = [];

      setArrowsBySpace((prev) => {
        const current = prev[selectedSpaceId] || [];
        removedArrows = current.filter(
          (arrow) => arrow.startAnchor?.tileId === tileId || arrow.endAnchor?.tileId === tileId
        );
        if (!removedArrows.length) return prev;

        const removedIds = new Set(removedArrows.map((arrow) => arrow.id));
        return {
          ...prev,
          [selectedSpaceId]: current.filter((arrow) => !removedIds.has(arrow.id)),
        };
      });

      if (!removedArrows.length) return;

      const removedIds = new Set(removedArrows.map((arrow) => arrow.id));
      setSelectedArrowId((prev) => (prev && removedIds.has(prev) ? null : prev));
      setDraggingEndpoint((prev) => (prev && removedIds.has(prev.arrowId) ? null : prev));

      const endpointState = endpointDragStateRef.current;
      if (endpointState && removedIds.has(endpointState.arrowId)) {
        endpointDragStateRef.current = null;
      }

      const drawState = drawStateRef.current;
      if (drawState && drawState.startTileId === tileId) {
        drawStateRef.current = null;
        setDraftArrow(null);
        setIsDrawingArrow(false);
      }

      removedArrows.forEach((arrow) => {
        objectsApi.delete(arrow.id).catch((err) => {
          console.error('Failed to delete connected arrow', err);
        });
        window.dispatchEvent(new CustomEvent('arrow:deleted', { detail: { arrowId: arrow.id, cascade: true } }));
      });
    };

    window.addEventListener('tile:deleted', handleTileDeleted);
    return () => window.removeEventListener('tile:deleted', handleTileDeleted);
  }, [selectedSpaceId, setArrowsBySpace]);

  useEffect(() => {
    const handleDeleteArrow = (e: KeyboardEvent) => {
      if (!(e.key === 'Delete' || e.key === 'Backspace')) return;
      if (!selectedArrowId || !selectedSpaceId) return;
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return;
      e.preventDefault();
      e.stopPropagation();

      deleteArrow(selectedArrowId);
    };

    window.addEventListener('keydown', handleDeleteArrow, true);
    return () => window.removeEventListener('keydown', handleDeleteArrow, true);
  }, [deleteArrow, selectedArrowId, selectedSpaceId]);

  const allArrowSegments = useMemo(() => {
    const segments = [...currentArrows];
    if (draftArrow) segments.push(draftArrow);
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
    handleFocusRingPointerDown,
    handleArrowPointerDown,
    handleArrowEndpointPointerDown,
    allArrowSegments,
    svgWidth,
    svgHeight,
    contentHeightWithArrows,
    isDrawingArrow,
    draggingEndpoint,
  };
};

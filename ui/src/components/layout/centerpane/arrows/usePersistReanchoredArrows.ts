// usePersistReanchoredArrows persists endpoint updates after tile drag settles, avoiding noisy writes mid-interaction.
import { useEffect, useRef } from 'react';
import type React from 'react';
import { objectsApi } from '@/api/objects';
import { undoApi } from '@/api/undo';
import { buildArrowGeometrySignature, didArrowEndpointChange, toArrowMetadata } from '@/components/layout/centerpane/arrows/arrowMetadata';
import type { ArrowSegment } from '@/components/layout/centerpane/types';

type DraggingEndpointState = { arrowId: string; endpoint: 'start' | 'end' } | null;

interface UsePersistReanchoredArrowsProps {
  selectedSpaceId?: string;
  dragGhostActive: boolean;
  isDrawingArrow: boolean;
  draggingEndpoint: DraggingEndpointState;
  allArrowSegments: ArrowSegment[];
  renderArrowSegments: ArrowSegment[];
  setArrowsBySpace: React.Dispatch<React.SetStateAction<Record<string, ArrowSegment[]>>>;
}

const toUndoArrowAnchor = (anchor?: ArrowSegment['startAnchor']) =>
  anchor
    ? {
        tile_id: anchor.tileId,
        edge: anchor.edge,
        edge_index: anchor.edgeIndex,
      }
    : undefined;

const toUndoArrowPayload = (arrow: ArrowSegment) => ({
  id: arrow.id,
  start: { x: arrow.start.x, y: arrow.start.y },
  end: { x: arrow.end.x, y: arrow.end.y },
  start_anchor: toUndoArrowAnchor(arrow.startAnchor),
  end_anchor: toUndoArrowAnchor(arrow.endAnchor),
});

const toUndoArrowFrame = (arrow: ArrowSegment) => ({
  start: { x: arrow.start.x, y: arrow.start.y },
  end: { x: arrow.end.x, y: arrow.end.y },
  start_anchor: toUndoArrowAnchor(arrow.startAnchor),
  end_anchor: toUndoArrowAnchor(arrow.endAnchor),
});

export const usePersistReanchoredArrows = ({
  selectedSpaceId,
  dragGhostActive,
  isDrawingArrow,
  draggingEndpoint,
  allArrowSegments,
  renderArrowSegments,
  setArrowsBySpace,
}: UsePersistReanchoredArrowsProps): void => {
  const tileDragSeenRef = useRef(false);
  const persistedArrowSignatureRef = useRef<Map<string, string>>(new Map());

  useEffect(() => {
    if (dragGhostActive) {
      tileDragSeenRef.current = true;
    }
  }, [dragGhostActive]);

  useEffect(() => {
    tileDragSeenRef.current = false;
    persistedArrowSignatureRef.current.clear();
  }, [selectedSpaceId]);

  useEffect(() => {
    if (!selectedSpaceId) return;
    if (isDrawingArrow || draggingEndpoint || dragGhostActive) return;
    if (!tileDragSeenRef.current) return;
    tileDragSeenRef.current = false;

    const segmentById = new Map(allArrowSegments.map((segment) => [segment.id, segment]));
    const changedSegments = renderArrowSegments
      .filter((segment) => segment.id !== 'arrow-draft')
      .map((segment) => ({ previous: segmentById.get(segment.id), next: segment }))
      .filter((pair): pair is { previous: ArrowSegment; next: ArrowSegment } => Boolean(pair.previous))
      .filter(({ previous, next }) => didArrowEndpointChange(previous, next));
    if (!changedSegments.length) return;

    const changedById = new Map(changedSegments.map(({ next }) => [next.id, next]));
    setArrowsBySpace((prev) => {
      const current = prev[selectedSpaceId] || [];
      const nextArrows = current.map((segment) => changedById.get(segment.id) ?? segment);
      return { ...prev, [selectedSpaceId]: nextArrows };
    });

    const spaceId = selectedSpaceId;
    changedSegments.forEach(({ previous, next }) => {
      const signature = buildArrowGeometrySignature(next);
      if (persistedArrowSignatureRef.current.get(next.id) === signature) {
        return;
      }
      persistedArrowSignatureRef.current.set(next.id, signature);
      objectsApi
        .updateMetadata(next.id, toArrowMetadata(next))
        .then(() => {
          undoApi
            .createEvent(spaceId, {
              event_type: 'arrow_move',
              event_data: {
                arrow: toUndoArrowPayload(next),
                from: toUndoArrowFrame(previous),
                to: toUndoArrowFrame(next),
              },
            })
            .catch((err) => {
              console.error('[ARROW] Failed to create re-anchored undo event:', err);
            });
        })
        .catch((err) => {
          console.error('[ARROW] Failed to persist re-anchored geometry:', err);
        });
    });
  }, [
    allArrowSegments,
    dragGhostActive,
    draggingEndpoint,
    isDrawingArrow,
    renderArrowSegments,
    selectedSpaceId,
    setArrowsBySpace,
  ]);
};

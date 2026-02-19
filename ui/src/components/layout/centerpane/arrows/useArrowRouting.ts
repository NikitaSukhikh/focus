// useArrowRouting re-resolves anchored arrow endpoints against live tile metrics so routes stay attached during resize/drag.
import { useCallback, useMemo } from 'react';
import { getBestAnchorPairForRoute } from '@/components/layout/centerpane/arrows/arrowGeometry';
import type { RouteAnchorCandidate } from '@/components/layout/centerpane/arrows/arrowGeometry';
import { ARROW_ROUTE_OBSTACLE_PADDING, FOCUS_RING_DOTS_PER_EDGE } from '@/components/layout/centerpane/arrows/constants';
import type { ArrowTileObstacle, TileMetricsSnapshot } from '@/components/layout/centerpane/arrows/arrowTypes';
import type { ArrowSegment, DroppedIcon, FocusRingEdge } from '@/components/layout/centerpane/types';
import { TILE_RING } from '@/constants/objectsDimensions';

interface UseArrowRoutingProps {
  iconsById: Map<string, DroppedIcon>;
  currentSpaceIcons: DroppedIcon[];
  tileMetricsById: Record<string, TileMetricsSnapshot>;
  allArrowSegments: ArrowSegment[];
}

interface UseArrowRoutingResult {
  arrowTileObstacles: ArrowTileObstacle[];
  renderArrowSegments: ArrowSegment[];
}

export const useArrowRouting = ({
  iconsById,
  currentSpaceIcons,
  tileMetricsById,
  allArrowSegments,
}: UseArrowRoutingProps): UseArrowRoutingResult => {
  const resolveAnchorPointForTile = useCallback(
    (tileId: string, edge: FocusRingEdge, edgeIndex: number): { x: number; y: number } | null => {
      const icon = iconsById.get(tileId);
      const metrics = tileMetricsById[tileId];
      if (!icon || !metrics) return null;
      if (metrics.width <= 0 || metrics.height <= 0) return null;
      if (edgeIndex < 0 || edgeIndex >= FOCUS_RING_DOTS_PER_EDGE) return null;

      const originLeft = metrics.isCentered ? icon.x - (metrics.width / 2) : icon.x;
      const originTop = metrics.isCentered ? icon.y - (metrics.height / 2) : icon.y;
      const ringOffset = TILE_RING.margin + (TILE_RING.strokeWidth / 2);
      const safeContentWidth = Math.max(1, metrics.width - (metrics.contentInset * 2));
      const safeContentHeight = Math.max(1, metrics.height - (metrics.contentInset * 2));
      const ringLeft = originLeft + metrics.contentInset - ringOffset;
      const ringTop = originTop + metrics.contentInset - ringOffset;
      const ringWidth = safeContentWidth + (ringOffset * 2);
      const ringHeight = safeContentHeight + (ringOffset * 2);
      const fraction = (edgeIndex + 1) / (FOCUS_RING_DOTS_PER_EDGE + 1);
      const edgeX = ringLeft + (ringWidth * fraction);
      const edgeY = ringTop + (ringHeight * fraction);

      if (edge === 'top') return { x: edgeX, y: ringTop };
      if (edge === 'right') return { x: ringLeft + ringWidth, y: edgeY };
      if (edge === 'bottom') return { x: edgeX, y: ringTop + ringHeight };
      return { x: ringLeft, y: edgeY };
    },
    [iconsById, tileMetricsById]
  );

  const resolveAnchorFromTileState = useCallback(
    (anchorRef: ArrowSegment['startAnchor'], fallback: { x: number; y: number }): { x: number; y: number } => {
      if (!anchorRef) return fallback;
      return resolveAnchorPointForTile(anchorRef.tileId, anchorRef.edge, anchorRef.edgeIndex) ?? fallback;
    },
    [resolveAnchorPointForTile]
  );

  const buildTileAnchorCandidates = useCallback(
    (tileId: string): RouteAnchorCandidate[] => {
      const edges: FocusRingEdge[] = ['top', 'right', 'bottom', 'left'];
      const candidates: RouteAnchorCandidate[] = [];

      edges.forEach((edge) => {
        for (let edgeIndex = 0; edgeIndex < FOCUS_RING_DOTS_PER_EDGE; edgeIndex += 1) {
          const point = resolveAnchorPointForTile(tileId, edge, edgeIndex);
          if (!point) continue;
          candidates.push({
            anchor: { tileId, edge, edgeIndex },
            point,
          });
        }
      });

      return candidates;
    },
    [resolveAnchorPointForTile]
  );

  const arrowTileObstacles: ArrowTileObstacle[] = useMemo(
    () =>
      currentSpaceIcons
        .map((icon) => {
          const metrics = tileMetricsById[icon.id];
          if (!metrics || metrics.width <= 0 || metrics.height <= 0) return null;

          const originLeft = metrics.isCentered ? icon.x - (metrics.width / 2) : icon.x;
          const originTop = metrics.isCentered ? icon.y - (metrics.height / 2) : icon.y;
          return {
            tileId: icon.id,
            left: originLeft - ARROW_ROUTE_OBSTACLE_PADDING,
            top: originTop - ARROW_ROUTE_OBSTACLE_PADDING,
            right: originLeft + metrics.width + ARROW_ROUTE_OBSTACLE_PADDING,
            bottom: originTop + metrics.height + ARROW_ROUTE_OBSTACLE_PADDING,
          };
        })
        .filter((obstacle): obstacle is ArrowTileObstacle => Boolean(obstacle)),
    [currentSpaceIcons, tileMetricsById]
  );

  const renderArrowSegments: ArrowSegment[] = useMemo(
    () =>
      allArrowSegments.map((segment) => {
        const resolvedStart = resolveAnchorFromTileState(segment.startAnchor, segment.start);
        const resolvedEnd = resolveAnchorFromTileState(segment.endAnchor, segment.end);
        if (!segment.startAnchor || !segment.endAnchor) {
          return {
            ...segment,
            start: resolvedStart,
            end: resolvedEnd,
          };
        }

        const startCandidates = buildTileAnchorCandidates(segment.startAnchor.tileId).map((candidate) => ({
          ...candidate,
          scoreOffset:
            (Math.hypot(candidate.point.x - resolvedStart.x, candidate.point.y - resolvedStart.y) * 8)
            + (candidate.anchor.edge === segment.startAnchor?.edge
              && candidate.anchor.edgeIndex === segment.startAnchor?.edgeIndex
              ? 0
              : 40),
        }));
        const endCandidates = buildTileAnchorCandidates(segment.endAnchor.tileId).map((candidate) => ({
          ...candidate,
          scoreOffset:
            (Math.hypot(candidate.point.x - resolvedEnd.x, candidate.point.y - resolvedEnd.y) * 8)
            + (candidate.anchor.edge === segment.endAnchor?.edge
              && candidate.anchor.edgeIndex === segment.endAnchor?.edgeIndex
              ? 0
              : 40),
        }));
        if (!startCandidates.length || !endCandidates.length) {
          return {
            ...segment,
            start: resolvedStart,
            end: resolvedEnd,
          };
        }

        const routingObstacles = arrowTileObstacles
          .filter(
            (obstacle) =>
              obstacle.tileId !== segment.startAnchor?.tileId
              && obstacle.tileId !== segment.endAnchor?.tileId
          )
          .map(({ left, top, right, bottom }) => ({ left, top, right, bottom }));
        const bestPair = getBestAnchorPairForRoute(startCandidates, endCandidates, {
          obstacles: routingObstacles,
        });
        if (!bestPair) {
          return {
            ...segment,
            start: resolvedStart,
            end: resolvedEnd,
          };
        }

        return {
          ...segment,
          start: bestPair.start.point,
          end: bestPair.end.point,
          startAnchor: bestPair.start.anchor,
          endAnchor: bestPair.end.anchor,
        };
      }),
    [allArrowSegments, arrowTileObstacles, buildTileAnchorCandidates, resolveAnchorFromTileState]
  );

  return { arrowTileObstacles, renderArrowSegments };
};

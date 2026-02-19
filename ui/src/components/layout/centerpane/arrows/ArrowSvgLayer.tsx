// ArrowSvgLayer encapsulates arrow path rendering and endpoint hit-targets so CenterPane stays focused on orchestration.
import React from 'react';
import { buildArrowPath, buildArrowRoutePoints } from '@/components/layout/centerpane/arrows/arrowGeometry';
import { ARROW_ENDPOINT_SEGMENT_HANDLE_WIDTH, ARROW_ENDPOINT_DOT_OPACITY } from '@/components/layout/centerpane/arrows/constants';
import { buildEndpointSegmentHandles } from '@/components/layout/centerpane/arrows/endpointSegmentHandles';
import type { ArrowTileObstacle } from '@/components/layout/centerpane/arrows/arrowTypes';
import type { ArrowSegment } from '@/components/layout/centerpane/types';
import { Z_INDEX } from '@/constants/zIndex';
import { ARROW_SETTINGS } from '@/styles/arrowSettings';

type DraggingEndpointState = { arrowId: string; endpoint: 'start' | 'end' } | null;

interface ArrowSvgLayerProps {
  segments: ArrowSegment[];
  svgWidth: number;
  svgHeight: number;
  isDrawingArrow: boolean;
  selectedArrowId: string | null;
  draggingEndpoint: DraggingEndpointState;
  isDark: boolean;
  arrowTileObstacles: ArrowTileObstacle[];
  getArrowColorForTile: (tileId?: string | null) => string | null;
  onArrowPointerDown: (segment: ArrowSegment, event: React.PointerEvent<SVGPathElement>) => void;
  onArrowEndpointPointerDown: (
    segment: ArrowSegment,
    endpoint: 'start' | 'end',
    event: React.PointerEvent<SVGElement>
  ) => void;
  onArrowContextMenu: (event: React.MouseEvent<SVGPathElement>, arrowId: string) => void;
  onClearTileSelection: () => void;
}

const sanitizeSvgId = (value: string): string => value.replace(/[^a-zA-Z0-9_-]/g, '-');

export const ArrowSvgLayer = ({
  segments,
  svgWidth,
  svgHeight,
  isDrawingArrow,
  selectedArrowId,
  draggingEndpoint,
  isDark,
  arrowTileObstacles,
  getArrowColorForTile,
  onArrowPointerDown,
  onArrowEndpointPointerDown,
  onArrowContextMenu,
  onClearTileSelection,
}: ArrowSvgLayerProps) => {
  if (segments.length === 0) return null;

  return (
    <svg
      aria-hidden
      width={svgWidth}
      height={svgHeight}
      viewBox={`0 0 ${svgWidth} ${svgHeight}`}
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: isDrawingArrow ? 'none' : 'auto',
        overflow: 'visible',
        zIndex: Z_INDEX.CONTENT_DEFAULT - 1,
      }}
    >
      {segments.map((segment) => {
        const isDraft = segment.id === 'arrow-draft';
        const isSelectedArrow = selectedArrowId === segment.id && !isDraft;
        const isDraggingStart = draggingEndpoint?.arrowId === segment.id && draggingEndpoint.endpoint === 'start';
        const isDraggingEnd = draggingEndpoint?.arrowId === segment.id && draggingEndpoint.endpoint === 'end';
        const clickableWidth = ARROW_SETTINGS.strokeWidth + (ARROW_SETTINGS.clickAreaPadding * 2);
        const arrowOpacity = isDraft
          ? ARROW_SETTINGS.opacity.draft
          : (isDark ? ARROW_SETTINGS.opacity.normal : 'var(--tile-ring-opacity, 0.8)');
        const startRingColor = getArrowColorForTile(segment.startAnchor?.tileId);
        const endRingColor = getArrowColorForTile(segment.endAnchor?.tileId);
        const fallbackArrowColor = startRingColor ?? endRingColor ?? ARROW_SETTINGS.color;
        const arrowStartColor = startRingColor ?? fallbackArrowColor;
        const arrowEndColor = endRingColor ?? fallbackArrowColor;
        const hasSplitGradient = arrowStartColor !== arrowEndColor;
        const svgSafeId = sanitizeSvgId(segment.id);
        const gradientId = `center-pane-arrow-gradient-${svgSafeId}`;
        const markerId = `center-pane-arrowhead-${svgSafeId}`;
        const visibleStroke = hasSplitGradient ? `url(#${gradientId})` : arrowStartColor;
        const routingObstacles = arrowTileObstacles
          .filter(
            (obstacle) =>
              obstacle.tileId !== segment.startAnchor?.tileId
              && obstacle.tileId !== segment.endAnchor?.tileId
          )
          .map(({ left, top, right, bottom }) => ({ left, top, right, bottom }));
        const pathOptions = {
          startEdge: segment.startAnchor?.edge,
          endEdge: segment.endAnchor?.edge,
          obstacles: routingObstacles,
        };
        const pathData = buildArrowPath(segment.start, segment.end, pathOptions);
        const endpointSegmentHandles = buildEndpointSegmentHandles(buildArrowRoutePoints(segment.start, segment.end, pathOptions));

        return (
          <g key={segment.id} style={{ opacity: arrowOpacity }}>
            <defs>
              {hasSplitGradient && (
                <linearGradient
                  id={gradientId}
                  gradientUnits="userSpaceOnUse"
                  x1={segment.start.x}
                  y1={segment.start.y}
                  x2={segment.end.x}
                  y2={segment.end.y}
                >
                  <stop offset="0%" stopColor={arrowStartColor} />
                  <stop offset="33.333%" stopColor={arrowStartColor} />
                  <stop offset="66.667%" stopColor={arrowEndColor} />
                  <stop offset="100%" stopColor={arrowEndColor} />
                </linearGradient>
              )}
              <marker
                id={markerId}
                markerWidth={ARROW_SETTINGS.marker.width}
                markerHeight={ARROW_SETTINGS.marker.height}
                refX={ARROW_SETTINGS.marker.refX}
                refY={ARROW_SETTINGS.marker.refY}
                orient="auto"
                markerUnits="userSpaceOnUse"
              >
                <path d={ARROW_SETTINGS.marker.path} fill={arrowEndColor} />
              </marker>
            </defs>
            <path
              d={pathData}
              stroke="transparent"
              fill="none"
              strokeWidth={clickableWidth}
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{
                cursor: isDraft ? 'default' : 'pointer',
                pointerEvents: isDraft ? 'none' : 'stroke',
              }}
              onPointerDown={
                isDraft
                  ? undefined
                  : (event) => {
                      onArrowPointerDown(segment, event);
                      onClearTileSelection();
                    }
              }
              onClick={isDraft ? undefined : (event) => event.stopPropagation()}
              onContextMenu={isDraft ? undefined : (event) => onArrowContextMenu(event, segment.id)}
            />
            {!isDraft && endpointSegmentHandles.map((handle) => (
              <line
                key={`${segment.id}-${handle.endpoint}-handle`}
                x1={handle.x1}
                y1={handle.y1}
                x2={handle.x2}
                y2={handle.y2}
                stroke="rgba(0,0,0,0.001)"
                strokeWidth={ARROW_ENDPOINT_SEGMENT_HANDLE_WIDTH}
                strokeLinecap="round"
                style={{
                  cursor: 'pointer',
                  pointerEvents: 'all',
                }}
                onPointerDown={(event) => {
                  onArrowEndpointPointerDown(segment, handle.endpoint, event);
                  onClearTileSelection();
                }}
                onClick={(event) => {
                  event.stopPropagation();
                }}
              />
            ))}
            <path
              d={pathData}
              stroke={visibleStroke}
              strokeWidth={ARROW_SETTINGS.strokeWidth}
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
              markerEnd={`url(#${markerId})`}
              style={{ pointerEvents: 'none' }}
            />
            {isSelectedArrow && (
              <>
                <circle
                  cx={segment.start.x}
                  cy={segment.start.y}
                  r={4.2}
                  fill={isDraggingStart ? '#38BDF8' : arrowStartColor}
                  stroke="#0f172a"
                  strokeWidth={1}
                  style={{ pointerEvents: 'none', opacity: ARROW_ENDPOINT_DOT_OPACITY }}
                />
                <circle
                  cx={segment.end.x}
                  cy={segment.end.y}
                  r={4.8}
                  fill={isDraggingEnd ? '#38BDF8' : arrowEndColor}
                  stroke="#0f172a"
                  strokeWidth={1}
                  style={{ pointerEvents: 'none', opacity: ARROW_ENDPOINT_DOT_OPACITY }}
                />
              </>
            )}
          </g>
        );
      })}
    </svg>
  );
};

// FocusRing renders edge anchors around a tile so graph-link interactions have stable connection targets.
// Corner handles at each ring corner let the user drag to resize the tile.
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { TILE_RING } from '@/constants/objectsDimensions';
import { FocusRingEdge } from '@/components/layout/centerpane/types';
import { ResizeCorner } from '@/components/layout/centerpane/tile/useTileResize';
import { ARROW_SETTINGS } from '@/styles/arrowSettings';
import { useThemeToggle } from '@/hooks/useThemeToggle';

interface FocusRingAnchor {
  edge: FocusRingEdge;
  edgeIndex: number;
  x: number;
  y: number;
}

interface CornerHandle {
  corner: ResizeCorner;
  x: number;
  y: number;
  cursor: string;
}

interface FocusRingProps {
  tileId: string;
  tileWidth: number;
  tileHeight: number;
  contentInset: number;
  ringOutlineOffset?: number;
  ringColor: string;
  hoverScaleClass: string;
  suppressGhostArrow?: boolean;
  onPointerDown?: (_event: React.PointerEvent<HTMLElement | SVGElement>, _tileId: string) => void;
  onCornerPointerDown?: (_event: React.PointerEvent<HTMLSpanElement>, _corner: ResizeCorner) => void;
}

interface EdgeHitSegment {
  edge: FocusRingEdge;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

interface GhostArrowPreview {
  edge: FocusRingEdge;
  x: number;
  y: number;
}

const FOCUS_RING_DOTS_PER_EDGE = 3;
const FOCUS_RING_ANCHOR_DIAMETER = 8;
const FOCUS_RING_INTERACTION_WIDTH = Math.max(12, (TILE_RING.margin * 2) + TILE_RING.strokeWidth);
const FOCUS_RING_ANCHOR_OPACITY = 0;
const FOCUS_RING_CORNER_GAP = Math.max(18, Math.ceil(FOCUS_RING_INTERACTION_WIDTH * 1.5));
const RESIZE_HANDLE_SIZE = 10;
const FOCUS_RING_CORNER_HANDLE_INSET = Math.max(0, TILE_RING.borderRadius * (1 - Math.SQRT1_2));
const CURSOR_COLOR_HEX_PATTERN = /^#(?:[0-9A-Fa-f]{3}){1,2}$/;
const DEFAULT_GHOST_CURSOR_COLOR = '#38bdf8';
const GHOST_CURSOR_SIZE = 68;
const GHOST_CURSOR_HOTSPOT_X = 34;
const GHOST_CURSOR_HOTSPOT_Y = 34;
const GHOST_ARROW_TAIL_LENGTH = 10;
const GHOST_ARROW_TAIL_HALF_THICKNESS = 1;
const GHOST_ARROW_HEAD_SCALE = 0.92;
const GHOST_ARROW_HEAD_TRANSLATE_X = GHOST_CURSOR_HOTSPOT_X + GHOST_ARROW_TAIL_LENGTH - (3 * GHOST_ARROW_HEAD_SCALE);
const GHOST_ARROW_HEAD_TRANSLATE_Y = GHOST_CURSOR_HOTSPOT_Y - (ARROW_SETTINGS.marker.refY * GHOST_ARROW_HEAD_SCALE);
const GHOST_ARROW_TAIL_PATH = [
  `M${GHOST_CURSOR_HOTSPOT_X} ${GHOST_CURSOR_HOTSPOT_Y - GHOST_ARROW_TAIL_HALF_THICKNESS}`,
  `L${GHOST_CURSOR_HOTSPOT_X + GHOST_ARROW_TAIL_LENGTH} ${GHOST_CURSOR_HOTSPOT_Y - GHOST_ARROW_TAIL_HALF_THICKNESS}`,
  `L${GHOST_CURSOR_HOTSPOT_X + GHOST_ARROW_TAIL_LENGTH} ${GHOST_CURSOR_HOTSPOT_Y + GHOST_ARROW_TAIL_HALF_THICKNESS}`,
  `L${GHOST_CURSOR_HOTSPOT_X} ${GHOST_CURSOR_HOTSPOT_Y + GHOST_ARROW_TAIL_HALF_THICKNESS}`,
  'Z',
].join(' ');

const clamp = (value: number, min: number, max: number): number => Math.min(Math.max(value, min), max);
const getFocusRingCenterOffset = (ringOutlineOffset: number): number =>
  Math.max(0, ringOutlineOffset) + (TILE_RING.strokeWidth / 2);

const getGhostArrowRotation = (edge: FocusRingEdge): number => {
  switch (edge) {
    case 'top':
      return -90;
    case 'right':
      return 0;
    case 'bottom':
      return 90;
    case 'left':
      return 180;
  }
};

const getGhostArrowAnchorOnSegment = (
  event: React.PointerEvent<SVGLineElement>,
  segment: EdgeHitSegment
): { x: number; y: number } => {
  const svgRect = (event.currentTarget.ownerSVGElement ?? event.currentTarget).getBoundingClientRect();
  const localX = event.clientX - svgRect.left;
  const localY = event.clientY - svgRect.top;

  if (segment.edge === 'top' || segment.edge === 'bottom') {
    return {
      x: clamp(localX, Math.min(segment.x1, segment.x2), Math.max(segment.x1, segment.x2)),
      y: segment.y1,
    };
  }

  return {
    x: segment.x1,
    y: clamp(localY, Math.min(segment.y1, segment.y2), Math.max(segment.y1, segment.y2)),
  };
};

const buildFocusRingAnchors = (
  tileWidth: number,
  tileHeight: number,
  contentInset: number,
  ringOutlineOffset: number,
): FocusRingAnchor[] => {
  const safeContentWidth = Math.max(1, tileWidth - (contentInset * 2));
  const safeContentHeight = Math.max(1, tileHeight - (contentInset * 2));
  const ringCenterOffset = getFocusRingCenterOffset(ringOutlineOffset);
  const ringLeft = contentInset - ringCenterOffset;
  const ringTop = contentInset - ringCenterOffset;
  const ringWidth = safeContentWidth + (ringCenterOffset * 2);
  const ringHeight = safeContentHeight + (ringCenterOffset * 2);
  const edgeFractions = Array.from(
    { length: FOCUS_RING_DOTS_PER_EDGE },
    (_, index) => (index + 1) / (FOCUS_RING_DOTS_PER_EDGE + 1)
  );

  const anchors: FocusRingAnchor[] = [];
  edgeFractions.forEach((fraction, edgeIndex) => {
    const edgeX = ringLeft + (ringWidth * fraction);
    const edgeY = ringTop + (ringHeight * fraction);

    anchors.push({ edge: 'top', edgeIndex, x: edgeX, y: ringTop });
    anchors.push({ edge: 'right', edgeIndex, x: ringLeft + ringWidth, y: edgeY });
    anchors.push({ edge: 'bottom', edgeIndex, x: edgeX, y: ringTop + ringHeight });
    anchors.push({ edge: 'left', edgeIndex, x: ringLeft, y: edgeY });
  });

  return anchors;
};

const buildCornerHandles = (
  tileWidth: number,
  tileHeight: number,
  contentInset: number,
  ringOutlineOffset: number,
): CornerHandle[] => {
  const safeContentWidth = Math.max(1, tileWidth - (contentInset * 2));
  const safeContentHeight = Math.max(1, tileHeight - (contentInset * 2));
  const ringCenterOffset = getFocusRingCenterOffset(ringOutlineOffset);
  const ringLeft = contentInset - ringCenterOffset;
  const ringTop = contentInset - ringCenterOffset;
  const ringWidth = safeContentWidth + (ringCenterOffset * 2);
  const ringHeight = safeContentHeight + (ringCenterOffset * 2);
  const maxInset = Math.max(0, Math.min(ringWidth, ringHeight) / 2 - 1);
  const cornerInset = Math.min(FOCUS_RING_CORNER_HANDLE_INSET, maxInset);
  const left = ringLeft + cornerInset;
  const top = ringTop + cornerInset;
  const right = ringLeft + ringWidth - cornerInset;
  const bottom = ringTop + ringHeight - cornerInset;
  return [
    { corner: 'tl', x: left, y: top, cursor: 'nwse-resize' },
    { corner: 'tr', x: right, y: top, cursor: 'nesw-resize' },
    { corner: 'bl', x: left, y: bottom, cursor: 'nesw-resize' },
    { corner: 'br', x: right, y: bottom, cursor: 'nwse-resize' },
  ];
};

export function FocusRing({
  tileId,
  tileWidth,
  tileHeight,
  contentInset,
  ringOutlineOffset = TILE_RING.margin,
  ringColor,
  hoverScaleClass,
  suppressGhostArrow = false,
  onPointerDown,
  onCornerPointerDown,
}: FocusRingProps) {
  const [ghostArrowPreview, setGhostArrowPreview] = useState<GhostArrowPreview | null>(null);
  const { isDark } = useThemeToggle();
  const shouldShowGhostArrow = !suppressGhostArrow;

  const focusRingAnchors = useMemo(() => {
    if (tileWidth <= 0 || tileHeight <= 0) return [];
    return buildFocusRingAnchors(tileWidth, tileHeight, contentInset, ringOutlineOffset);
  }, [contentInset, ringOutlineOffset, tileHeight, tileWidth]);

  const ringGeometry = useMemo(() => {
    const safeContentWidth = Math.max(1, tileWidth - (contentInset * 2));
    const safeContentHeight = Math.max(1, tileHeight - (contentInset * 2));
    const ringCenterOffset = getFocusRingCenterOffset(ringOutlineOffset);
    const ringLeft = contentInset - ringCenterOffset;
    const ringTop = contentInset - ringCenterOffset;
    const ringWidth = safeContentWidth + (ringCenterOffset * 2);
    const ringHeight = safeContentHeight + (ringCenterOffset * 2);
    return { ringLeft, ringTop, ringWidth, ringHeight };
  }, [contentInset, ringOutlineOffset, tileHeight, tileWidth]);
  const cornerHandles = useMemo(() => {
    if (tileWidth <= 0 || tileHeight <= 0) return [];
    return buildCornerHandles(tileWidth, tileHeight, contentInset, ringOutlineOffset);
  }, [contentInset, ringOutlineOffset, tileHeight, tileWidth]);

  const safeGhostArrowColor = CURSOR_COLOR_HEX_PATTERN.test(ringColor) ? ringColor : DEFAULT_GHOST_CURSOR_COLOR;
  const ghostArrowOpacity = isDark ? ARROW_SETTINGS.opacity.normal : 'var(--tile-ring-opacity, 0.8)';
  const edgeHitSegments = useMemo<EdgeHitSegment[]>(() => {
    const maxGap = Math.max(0, Math.min(ringGeometry.ringWidth, ringGeometry.ringHeight) / 2 - 1);
    const cornerGap = Math.min(FOCUS_RING_CORNER_GAP, maxGap);
    const left = ringGeometry.ringLeft;
    const right = ringGeometry.ringLeft + ringGeometry.ringWidth;
    const top = ringGeometry.ringTop;
    const bottom = ringGeometry.ringTop + ringGeometry.ringHeight;
    return [
      { edge: 'top', x1: left + cornerGap, y1: top, x2: right - cornerGap, y2: top },
      { edge: 'right', x1: right, y1: top + cornerGap, x2: right, y2: bottom - cornerGap },
      { edge: 'bottom', x1: left + cornerGap, y1: bottom, x2: right - cornerGap, y2: bottom },
      { edge: 'left', x1: left, y1: top + cornerGap, x2: left, y2: bottom - cornerGap },
    ];
  }, [ringGeometry.ringHeight, ringGeometry.ringLeft, ringGeometry.ringTop, ringGeometry.ringWidth]);
  const handleGhostArrowMove = useCallback((event: React.PointerEvent<SVGLineElement>, segment: EdgeHitSegment) => {
    const nextAnchor = getGhostArrowAnchorOnSegment(event, segment);
    setGhostArrowPreview({
      edge: segment.edge,
      x: nextAnchor.x,
      y: nextAnchor.y,
    });
  }, []);

  useEffect(() => {
    if (shouldShowGhostArrow) return;
    setGhostArrowPreview(null);
  }, [shouldShowGhostArrow]);

  if (focusRingAnchors.length === 0) {
    return null;
  }

  return (
    <div
      className={`absolute inset-0 pointer-events-none transition-transform duration-150 ${hoverScaleClass}`}
      data-focus-ring-root
      data-focus-ring-tile-id={tileId}
      style={{ zIndex: 30 }}
    >
      <svg
        width={tileWidth}
        height={tileHeight}
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          overflow: 'visible',
          pointerEvents: 'none',
        }}
      >
        {edgeHitSegments.map((segment) => (
          <line
            key={segment.edge}
            data-focus-ring-hitbox
            data-focus-ring-tile-id={tileId}
            x1={segment.x1}
            y1={segment.y1}
            x2={segment.x2}
            y2={segment.y2}
            fill="none"
            stroke="rgba(0,0,0,0)"
            strokeWidth={FOCUS_RING_INTERACTION_WIDTH}
            style={{
              pointerEvents: 'stroke' as React.CSSProperties['pointerEvents'],
              cursor: shouldShowGhostArrow ? 'none' : 'crosshair',
            }}
            onPointerEnter={(event) => {
              if (!shouldShowGhostArrow) return;
              handleGhostArrowMove(event, segment);
            }}
            onPointerMove={(event) => {
              if (!shouldShowGhostArrow) return;
              handleGhostArrowMove(event, segment);
            }}
            onPointerLeave={() => {
              if (!shouldShowGhostArrow) return;
              setGhostArrowPreview((previous) => (
                previous?.edge === segment.edge ? null : previous
              ));
            }}
            onPointerDown={(event) => {
              if (event.button !== 0) return;
              event.stopPropagation();
              setGhostArrowPreview(null);
              onPointerDown?.(event, tileId);
            }}
          />
        ))}
      </svg>
      {shouldShowGhostArrow && ghostArrowPreview && (
        <svg
          width={GHOST_CURSOR_SIZE}
          height={GHOST_CURSOR_SIZE}
          viewBox={`0 0 ${GHOST_CURSOR_SIZE} ${GHOST_CURSOR_SIZE}`}
          style={{
            position: 'absolute',
            left: `${ghostArrowPreview.x - GHOST_CURSOR_HOTSPOT_X}px`,
            top: `${ghostArrowPreview.y - GHOST_CURSOR_HOTSPOT_Y}px`,
            overflow: 'visible',
            pointerEvents: 'none',
            zIndex: 32,
          }}
        >
          <g
            transform={`rotate(${getGhostArrowRotation(ghostArrowPreview.edge)} ${GHOST_CURSOR_HOTSPOT_X} ${GHOST_CURSOR_HOTSPOT_Y})`}
            style={{ opacity: ghostArrowOpacity }}
          >
            <path d={GHOST_ARROW_TAIL_PATH} fill={safeGhostArrowColor} />
            <path
              d={ARROW_SETTINGS.marker.path}
              transform={`matrix(${GHOST_ARROW_HEAD_SCALE} 0 0 ${GHOST_ARROW_HEAD_SCALE} ${GHOST_ARROW_HEAD_TRANSLATE_X} ${GHOST_ARROW_HEAD_TRANSLATE_Y})`}
              fill={safeGhostArrowColor}
            />
          </g>
        </svg>
      )}
      {focusRingAnchors.map((anchor) => (
        <span
          key={`${anchor.edge}-${anchor.edgeIndex}`}
          data-focus-ring-anchor
          data-focus-ring-tile-id={tileId}
          data-focus-ring-edge={anchor.edge}
          data-focus-ring-edge-index={anchor.edgeIndex}
          style={{
            position: 'absolute',
            left: `${anchor.x}px`,
            top: `${anchor.y}px`,
            width: `${FOCUS_RING_ANCHOR_DIAMETER}px`,
            height: `${FOCUS_RING_ANCHOR_DIAMETER}px`,
            transform: 'translate(-50%, -50%)',
            borderRadius: '9999px',
            border: '1px solid rgba(255,255,255,0.95)',
            background: 'rgba(56, 189, 248, 0.95)',
            boxShadow: '0 0 0 1px rgba(15, 23, 42, 0.65), 0 0 8px rgba(56, 189, 248, 0.85)',
            pointerEvents: 'none',
            opacity: FOCUS_RING_ANCHOR_OPACITY,
          }}
        />
      ))}
      {onCornerPointerDown && cornerHandles.map((handle) => (
        <span
          key={`resize-${handle.corner}`}
          data-resize-corner={handle.corner}
          className="opacity-0 group-hover:opacity-100 transition-opacity duration-100"
          style={{
            position: 'absolute',
            left: `${handle.x}px`,
            top: `${handle.y}px`,
            width: `${RESIZE_HANDLE_SIZE}px`,
            height: `${RESIZE_HANDLE_SIZE}px`,
            transform: 'translate(-50%, -50%)',
            borderRadius: '3px',
            border: '1.5px solid rgba(255,255,255,0.95)',
            background: 'rgba(56, 189, 248, 0.95)',
            boxShadow: '0 0 0 1px rgba(15, 23, 42, 0.65), 0 1px 4px rgba(0,0,0,0.3)',
            pointerEvents: 'all',
            cursor: handle.cursor,
            zIndex: 35,
          }}
          onPointerDown={(e) => {
            if (e.button !== 0) return;
            e.stopPropagation();
            onCornerPointerDown(e, handle.corner);
          }}
        />
      ))}
    </div>
  );
}

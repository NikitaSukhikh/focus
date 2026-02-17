// FocusRing renders edge anchors around a tile so graph-link interactions have stable connection targets.
import React, { useMemo } from 'react';
import { TILE_RING } from '@/constants/objectsDimensions';
import { FocusRingEdge } from '@/components/layout/centerpane/types';

interface FocusRingAnchor {
  edge: FocusRingEdge;
  edgeIndex: number;
  x: number;
  y: number;
}

interface FocusRingProps {
  tileId: string;
  tileWidth: number;
  tileHeight: number;
  contentInset: number;
  hoverScaleClass: string;
  onPointerDown?: (_event: React.PointerEvent<HTMLElement | SVGElement>, _tileId: string) => void;
}

const FOCUS_RING_DOTS_PER_EDGE = 3;
const FOCUS_RING_ANCHOR_DIAMETER = 8;
const FOCUS_RING_CENTER_OFFSET = TILE_RING.margin + (TILE_RING.strokeWidth / 2);
const FOCUS_RING_INTERACTION_WIDTH = Math.max(12, (TILE_RING.margin * 2) + TILE_RING.strokeWidth);

const buildFocusRingAnchors = (tileWidth: number, tileHeight: number, contentInset: number): FocusRingAnchor[] => {
  const safeContentWidth = Math.max(1, tileWidth - (contentInset * 2));
  const safeContentHeight = Math.max(1, tileHeight - (contentInset * 2));
  const ringLeft = contentInset - FOCUS_RING_CENTER_OFFSET;
  const ringTop = contentInset - FOCUS_RING_CENTER_OFFSET;
  const ringWidth = safeContentWidth + (FOCUS_RING_CENTER_OFFSET * 2);
  const ringHeight = safeContentHeight + (FOCUS_RING_CENTER_OFFSET * 2);
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

export function FocusRing({
  tileId,
  tileWidth,
  tileHeight,
  contentInset,
  hoverScaleClass,
  onPointerDown,
}: FocusRingProps) {
  const focusRingAnchors = useMemo(() => {
    if (tileWidth <= 0 || tileHeight <= 0) return [];
    return buildFocusRingAnchors(tileWidth, tileHeight, contentInset);
  }, [contentInset, tileHeight, tileWidth]);

  const ringGeometry = useMemo(() => {
    const safeContentWidth = Math.max(1, tileWidth - (contentInset * 2));
    const safeContentHeight = Math.max(1, tileHeight - (contentInset * 2));
    const ringLeft = contentInset - FOCUS_RING_CENTER_OFFSET;
    const ringTop = contentInset - FOCUS_RING_CENTER_OFFSET;
    const ringWidth = safeContentWidth + (FOCUS_RING_CENTER_OFFSET * 2);
    const ringHeight = safeContentHeight + (FOCUS_RING_CENTER_OFFSET * 2);
    return { ringLeft, ringTop, ringWidth, ringHeight };
  }, [contentInset, tileHeight, tileWidth]);

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
        <rect
          data-focus-ring-hitbox
          data-focus-ring-tile-id={tileId}
          x={ringGeometry.ringLeft}
          y={ringGeometry.ringTop}
          width={ringGeometry.ringWidth}
          height={ringGeometry.ringHeight}
          rx={TILE_RING.borderRadius + TILE_RING.margin}
          fill="none"
          stroke="rgba(0,0,0,0)"
          strokeWidth={FOCUS_RING_INTERACTION_WIDTH}
          style={{ pointerEvents: 'stroke' as React.CSSProperties['pointerEvents'], cursor: 'pointer' }}
          onPointerDown={(event) => {
            if (event.button !== 0) return;
            event.stopPropagation();
            onPointerDown?.(event, tileId);
          }}
        />
      </svg>
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
          }}
        />
      ))}
    </div>
  );
}

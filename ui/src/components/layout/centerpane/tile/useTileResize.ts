// useTileResize handles corner-drag resizing for canvas tiles.
// Tracks pointer delta against zoom to produce canvas-unit size deltas.
// Keeps the opposite corner fixed by adjusting the tile's (x, y) center accordingly.
import { useState, useCallback } from 'react';

export type ResizeCorner = 'tl' | 'tr' | 'bl' | 'br';
const RESIZE_COMMIT_EPSILON = 0.01;

const X_SIGN: Record<ResizeCorner, number> = { tl: -1, tr: 1, bl: -1, br: 1 };
const Y_SIGN: Record<ResizeCorner, number> = { tl: -1, tr: -1, bl: 1, br: 1 };

interface ResizeDragState {
  corner: ResizeCorner;
  startPointerX: number;
  startPointerY: number;
  startBoxW: number;
  startBoxH: number;
  startTileX: number;
  startTileY: number;
}

interface LiveValues {
  liveW: number;
  liveH: number;
  liveX: number;
  liveY: number;
}

function isValidAspectRatio(value: number | undefined): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0;
}

function clampToAspectRatio(
  proposedWidth: number,
  proposedHeight: number,
  minWidth: number,
  minHeight: number,
  aspectRatio: number,
  insetPerSide: number,
) {
  const safeRatio = Math.max(aspectRatio, 0.0001);
  const safeInset = Math.max(0, insetPerSide);
  const insetTotal = safeInset * 2;

  const rawContentWidth = Math.max(1, proposedWidth - insetTotal);
  const rawContentHeight = Math.max(1, proposedHeight - insetTotal);
  const minContentWidth = Math.max(1, minWidth - insetTotal);
  const minContentHeight = Math.max(1, minHeight - insetTotal);

  const minHeightFromRatio = Math.max(minContentHeight, minContentWidth / safeRatio);
  const minWidthFromRatio = minHeightFromRatio * safeRatio;

  const widthDrivenContentWidth = Math.max(rawContentWidth, minWidthFromRatio);
  const widthDrivenContentHeight = widthDrivenContentWidth / safeRatio;

  const heightDrivenContentHeight = Math.max(rawContentHeight, minHeightFromRatio);
  const heightDrivenContentWidth = heightDrivenContentHeight * safeRatio;

  const widthDrivenError = Math.abs(widthDrivenContentHeight - rawContentHeight);
  const heightDrivenError = Math.abs(heightDrivenContentWidth - rawContentWidth);

  const useWidthDriven = widthDrivenError <= heightDrivenError;
  const lockedContentWidth = useWidthDriven ? widthDrivenContentWidth : heightDrivenContentWidth;
  const lockedContentHeight = useWidthDriven ? widthDrivenContentHeight : heightDrivenContentHeight;

  return {
    width: lockedContentWidth + insetTotal,
    height: lockedContentHeight + insetTotal,
  };
}

function computeLive(
  drag: ResizeDragState,
  pointerX: number,
  pointerY: number,
  zoom: number,
  minWidth: number,
  minHeight: number,
  isCentered: boolean,
  lockAspectRatio?: number,
  lockAspectRatioInset = 0,
): LiveValues {
  const safeZoom = Math.max(zoom, 0.01);
  const dx = (pointerX - drag.startPointerX) / safeZoom;
  const dy = (pointerY - drag.startPointerY) / safeZoom;
  const xs = X_SIGN[drag.corner];
  const ys = Y_SIGN[drag.corner];

  const proposedWidth = drag.startBoxW + dx * xs;
  const proposedHeight = drag.startBoxH + dy * ys;
  let liveW = Math.max(minWidth, proposedWidth);
  let liveH = Math.max(minHeight, proposedHeight);

  if (isValidAspectRatio(lockAspectRatio)) {
    const locked = clampToAspectRatio(
      proposedWidth,
      proposedHeight,
      minWidth,
      minHeight,
      lockAspectRatio,
      lockAspectRatioInset,
    );
    liveW = locked.width;
    liveH = locked.height;
  }

  const dw = liveW - drag.startBoxW;
  const dh = liveH - drag.startBoxH;

  let liveX: number;
  let liveY: number;

  if (isCentered) {
    // Center moves by half the size delta in the direction of the dragged corner.
    liveX = drag.startTileX + (dw / 2) * xs;
    liveY = drag.startTileY + (dh / 2) * ys;
  } else {
    // Non-centered (text tiles): top-left origin. Keep opposite edge fixed.
    liveX = xs < 0 ? drag.startTileX + drag.startBoxW - liveW : drag.startTileX;
    liveY = ys < 0 ? drag.startTileY + drag.startBoxH - liveH : drag.startTileY;
  }

  return { liveW, liveH, liveX, liveY };
}

interface UseTileResizeOptions {
  tileId: string;
  tileX: number;
  tileY: number;
  isCentered: boolean;
  zoom: number;
  minWidth: number;
  minHeight: number;
  lockAspectRatio?: number;
  lockAspectRatioInset?: number;
  onResizeEnd: (tileId: string, x: number, y: number, width: number, height: number) => void;
  onResizeInteractionStart?: () => void;
  onResizeInteractionEnd?: (_didResize: boolean) => void;
}

export function useTileResize({
  tileId,
  tileX,
  tileY,
  isCentered,
  zoom,
  minWidth,
  minHeight,
  lockAspectRatio,
  lockAspectRatioInset = 0,
  onResizeEnd,
  onResizeInteractionStart,
  onResizeInteractionEnd,
}: UseTileResizeOptions) {
  const [dragState, setDragState] = useState<ResizeDragState | null>(null);
  const [currentPointer, setCurrentPointer] = useState({ x: 0, y: 0 });

  const handleCornerPointerDown = useCallback(
    (e: React.PointerEvent, corner: ResizeCorner, boxW: number, boxH: number) => {
      e.preventDefault();
      e.stopPropagation();

      const el = e.currentTarget as HTMLElement;
      el.setPointerCapture(e.pointerId);

      const drag: ResizeDragState = {
        corner,
        startPointerX: e.clientX,
        startPointerY: e.clientY,
        startBoxW: boxW,
        startBoxH: boxH,
        startTileX: tileX,
        startTileY: tileY,
      };

      setDragState(drag);
      setCurrentPointer({ x: e.clientX, y: e.clientY });
      onResizeInteractionStart?.();

      const onMove = (ev: PointerEvent) => {
        setCurrentPointer({ x: ev.clientX, y: ev.clientY });
      };

      const onUp = (ev: PointerEvent) => {
        el.removeEventListener('pointermove', onMove);
        el.removeEventListener('pointerup', onUp);
        el.removeEventListener('pointercancel', onCancel);
        el.releasePointerCapture(ev.pointerId);
        setDragState(null);

        const { liveW, liveH, liveX, liveY } = computeLive(
          drag,
          ev.clientX,
          ev.clientY,
          zoom,
          minWidth,
          minHeight,
          isCentered,
          lockAspectRatio,
          lockAspectRatioInset,
        );
        const hasGeometryChanged =
          Math.abs(liveX - drag.startTileX) > RESIZE_COMMIT_EPSILON
          || Math.abs(liveY - drag.startTileY) > RESIZE_COMMIT_EPSILON
          || Math.abs(liveW - drag.startBoxW) > RESIZE_COMMIT_EPSILON
          || Math.abs(liveH - drag.startBoxH) > RESIZE_COMMIT_EPSILON;

        if (hasGeometryChanged) {
          onResizeEnd(tileId, liveX, liveY, liveW, liveH);
        }
        onResizeInteractionEnd?.(hasGeometryChanged);
      };

      const onCancel = () => {
        el.removeEventListener('pointermove', onMove);
        el.removeEventListener('pointerup', onUp);
        el.removeEventListener('pointercancel', onCancel);
        setDragState(null);
        onResizeInteractionEnd?.(false);
      };

      el.addEventListener('pointermove', onMove);
      el.addEventListener('pointerup', onUp);
      el.addEventListener('pointercancel', onCancel);
    },
    [
      tileId,
      tileX,
      tileY,
      isCentered,
      zoom,
      minWidth,
      minHeight,
      lockAspectRatio,
      lockAspectRatioInset,
      onResizeEnd,
      onResizeInteractionStart,
      onResizeInteractionEnd,
    ],
  );

  if (!dragState) {
    return { isResizing: false, liveX: tileX, liveY: tileY, liveW: 0, liveH: 0, handleCornerPointerDown };
  }

  const live = computeLive(
    dragState,
    currentPointer.x,
    currentPointer.y,
    zoom,
    minWidth,
    minHeight,
    isCentered,
    lockAspectRatio,
    lockAspectRatioInset,
  );
  return { isResizing: true, liveX: live.liveX, liveY: live.liveY, liveW: live.liveW, liveH: live.liveH, handleCornerPointerDown };
}

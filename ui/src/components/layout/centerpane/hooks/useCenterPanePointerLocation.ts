import { useCallback, useEffect, useRef } from 'react';

interface PointerLocationParams {
  paneRef: React.RefObject<HTMLDivElement | null>;
  zoom: number;
}

export const useCenterPanePointerLocation = ({ paneRef, zoom }: PointerLocationParams) => {
  const lastPointerRef = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const updatePointer = (event: PointerEvent) => {
      lastPointerRef.current = { x: event.clientX, y: event.clientY };
    };

    window.addEventListener('pointermove', updatePointer, true);
    window.addEventListener('pointerdown', updatePointer, true);
    return () => {
      window.removeEventListener('pointermove', updatePointer, true);
      window.removeEventListener('pointerdown', updatePointer, true);
    };
  }, []);

  const getCursorCanvasPosition = useCallback(() => {
    const last = lastPointerRef.current;
    if (!last || !paneRef.current) return null;

    const rect = paneRef.current.getBoundingClientRect();
    const isInside =
      last.x >= rect.left &&
      last.x <= rect.right &&
      last.y >= rect.top &&
      last.y <= rect.bottom;

    if (!isInside) return null;

    const scrollLeft = paneRef.current.scrollLeft;
    const scrollTop = paneRef.current.scrollTop;
    const safeZoom = Math.max(zoom, 0.01);

    return {
      x: (last.x - rect.left + scrollLeft) / safeZoom,
      y: (last.y - rect.top + scrollTop) / safeZoom,
    };
  }, [paneRef, zoom]);

  return { getCursorCanvasPosition };
};

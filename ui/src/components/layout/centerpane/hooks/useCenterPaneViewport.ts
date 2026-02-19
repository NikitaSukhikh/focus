// useCenterPaneViewport keeps canvas coordinate math and zoom gesture bindings in one place to reduce CenterPane coupling.
import { useCallback, useEffect, useRef } from 'react';
import type React from 'react';

interface UseCenterPaneViewportProps {
  zoom: number;
  onZoomIn?: () => void;
  onZoomOut?: () => void;
}

interface UseCenterPaneViewportResult {
  paneRef: React.RefObject<HTMLDivElement | null>;
  getCenterCanvasPos: () => { x: number; y: number };
  getCanvasPosFromClient: (_position: { x: number; y: number }) => { x: number; y: number };
  toCanvasCoords: (_clientX: number, _clientY: number) => { x: number; y: number };
  handleWheel: (_event: React.WheelEvent<HTMLDivElement>) => void;
}

export const useCenterPaneViewport = ({
  zoom,
  onZoomIn,
  onZoomOut,
}: UseCenterPaneViewportProps): UseCenterPaneViewportResult => {
  const paneRef = useRef<HTMLDivElement | null>(null);

  const getCenterCanvasPos = useCallback(() => {
    if (!paneRef.current) return { x: 200, y: 200 };
    const rect = paneRef.current.getBoundingClientRect();
    const scrollLeft = paneRef.current.scrollLeft;
    const scrollTop = paneRef.current.scrollTop;
    return {
      x: (rect.width / 2 + scrollLeft) / Math.max(zoom, 0.01),
      y: (rect.height / 2 + scrollTop) / Math.max(zoom, 0.01),
    };
  }, [zoom]);

  const getCanvasPosFromClient = useCallback((position: { x: number; y: number }) => {
    if (!paneRef.current) return getCenterCanvasPos();
    const rect = paneRef.current.getBoundingClientRect();
    const scrollLeft = paneRef.current.scrollLeft;
    const scrollTop = paneRef.current.scrollTop;
    const paneStyle = window.getComputedStyle(paneRef.current);
    const paddingLeft = Number.parseFloat(paneStyle.paddingLeft) || 0;
    const paddingTop = Number.parseFloat(paneStyle.paddingTop) || 0;
    const safeZoom = Math.max(zoom, 0.01);
    return {
      x: (position.x - rect.left - paddingLeft + scrollLeft) / safeZoom,
      y: (position.y - rect.top - paddingTop + scrollTop) / safeZoom,
    };
  }, [getCenterCanvasPos, zoom]);

  const toCanvasCoords = useCallback((clientX: number, clientY: number) => {
    const safeZoom = Math.max(zoom, 0.01);
    if (!paneRef.current) return { x: clientX / safeZoom, y: clientY / safeZoom };
    const rect = paneRef.current.getBoundingClientRect();
    const scrollLeft = paneRef.current.scrollLeft;
    const scrollTop = paneRef.current.scrollTop;
    const paneStyle = window.getComputedStyle(paneRef.current);
    const paddingLeft = Number.parseFloat(paneStyle.paddingLeft) || 0;
    const paddingTop = Number.parseFloat(paneStyle.paddingTop) || 0;
    return {
      x: (clientX - rect.left - paddingLeft + scrollLeft) / safeZoom,
      y: (clientY - rect.top - paddingTop + scrollTop) / safeZoom,
    };
  }, [zoom]);

  useEffect(() => {
    const handleKeyZoom = (event: KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey)) return;
      const target = event.target as HTMLElement;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) return;

      if (event.key === '+' || event.key === '=') {
        event.preventDefault();
        onZoomIn?.();
      } else if (event.key === '-' || event.key === '_') {
        event.preventDefault();
        onZoomOut?.();
      }
    };

    window.addEventListener('keydown', handleKeyZoom, true);
    return () => window.removeEventListener('keydown', handleKeyZoom, true);
  }, [onZoomIn, onZoomOut]);

  const handleWheel = useCallback((event: React.WheelEvent<HTMLDivElement>) => {
    if (!event.ctrlKey) return;
    event.preventDefault();
    if (event.deltaY < 0) {
      onZoomIn?.();
    } else if (event.deltaY > 0) {
      onZoomOut?.();
    }
  }, [onZoomIn, onZoomOut]);

  return {
    paneRef,
    getCenterCanvasPos,
    getCanvasPosFromClient,
    toCanvasCoords,
    handleWheel,
  };
};

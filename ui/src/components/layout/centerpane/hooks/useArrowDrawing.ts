import { useEffect, useMemo, useRef, useState } from 'react';
import type React from 'react';
import { objectsApi } from '../../../../api/objects';
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
const cloneSegments = (segments: ArrowSegment[]): ArrowSegment[] =>
  segments.map((s) => ({
    id: s.id,
    start: { ...s.start },
    end: { ...s.end },
  }));

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
  const historyRef = useRef<Record<string, ArrowSegment[][]>>({});
  const arrowStartRef = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    setDraftArrow(null);
    setIsDrawingArrow(false);
    setHasArrowMovement(false);
    setSelectedArrowId(null);
    if (selectedIslandId) {
      historyRef.current[selectedIslandId] = [];
    }
    arrowStartRef.current = null;
  }, [selectedIslandId]);

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
    historyRef.current[islandId] = [
      ...(historyRef.current[islandId] || []),
      cloneSegments(currentArrows),
    ];

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
    const handleDeleteArrow = (e: KeyboardEvent) => {
      if (!(e.key === 'Delete' || e.key === 'Backspace')) return;
      if (!selectedArrowId || !selectedIslandId) return;
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return;
      e.preventDefault();
      e.stopPropagation();

      historyRef.current[selectedIslandId] = [
        ...(historyRef.current[selectedIslandId] || []),
        cloneSegments(arrowsByIsland[selectedIslandId] || []),
      ];

      setArrowsByIsland((prev) => {
        const current = prev[selectedIslandId] || [];
        return { ...prev, [selectedIslandId]: current.filter((segment) => segment.id !== selectedArrowId) };
      });
      const arrowIdToDelete = selectedArrowId;
      setSelectedArrowId(null);
      objectsApi.delete(arrowIdToDelete).catch((err) => {
        console.error('Failed to delete arrow', err);
      });
      window.dispatchEvent(new CustomEvent('arrow:deleted', { detail: { arrowId: arrowIdToDelete } }));
    };

    window.addEventListener('keydown', handleDeleteArrow, true);
    return () => window.removeEventListener('keydown', handleDeleteArrow, true);
  }, [selectedArrowId, selectedIslandId, setArrowsByIsland, arrowsByIsland]);

  useEffect(() => {
    const handleUndoArrow = (e: KeyboardEvent) => {
      if (!selectedIslandId) return;
      if (!(e.key === 'z' && (e.ctrlKey || e.metaKey) && !e.shiftKey)) return;
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return;
      const stack = historyRef.current[selectedIslandId] || [];
      if (stack.length === 0) return;
      e.preventDefault();
      const snapshot = stack.pop() || [];
      historyRef.current[selectedIslandId] = stack;

      const previousState = cloneSegments(snapshot);
      const currentState = arrowsByIsland[selectedIslandId] || [];
      const currentIds = new Set(currentState.map((a) => a.id));
      const targetIds = new Set(previousState.map((a) => a.id));
      const toDelete = currentState.filter((a) => !targetIds.has(a.id));
      const toAdd = previousState.filter((a) => !currentIds.has(a.id));

      setArrowsByIsland((prev) => ({
        ...prev,
        [selectedIslandId]: previousState,
      }));
      setSelectedArrowId(null);

      void Promise.all(
        toDelete.map(async (arrow) => {
          try {
            await objectsApi.delete(arrow.id);
            window.dispatchEvent(new CustomEvent('arrow:deleted', { detail: { arrowId: arrow.id, undo: true } }));
          } catch (err) {
            console.error('Failed to delete arrow during undo', err);
          }
        })
      );

      void Promise.all(
        toAdd.map(async (arrow) => {
          const tempId = crypto.randomUUID ? crypto.randomUUID() : `arrow-${Date.now()}`;
          const tempArrow: ArrowSegment = { ...arrow, id: tempId };
          setArrowsByIsland((prev) => {
            const current = prev[selectedIslandId] || [];
            return { ...prev, [selectedIslandId]: [...current, tempArrow] };
          });
          try {
            const created = await objectsApi.create(selectedIslandId, {
              type: 'text',
              title: 'Arrow',
              content: 'Arrow connection',
            });
            await objectsApi.updateMetadata(created.id, {
              arrow: true,
              start_x: arrow.start.x,
              start_y: arrow.start.y,
              end_x: arrow.end.x,
              end_y: arrow.end.y,
              content: 'Arrow connection',
            });
            setArrowsByIsland((prev) => {
              const current = prev[selectedIslandId] || [];
              return {
                ...prev,
                [selectedIslandId]: current.map((segment) =>
                  segment.id === tempId ? { ...segment, id: created.id } : segment
                ),
              };
            });
            window.dispatchEvent(new CustomEvent('arrow:created', { detail: { arrowId: created.id, restored: true } }));
          } catch (err) {
            console.error('Failed to restore arrow during undo', err);
            setArrowsByIsland((prev) => {
              const current = prev[selectedIslandId] || [];
              return { ...prev, [selectedIslandId]: current.filter((segment) => segment.id !== tempId) };
            });
          }
        })
      );
    };

    window.addEventListener('keydown', handleUndoArrow, true);
    return () => window.removeEventListener('keydown', handleUndoArrow, true);
  }, [selectedIslandId, setArrowsByIsland]);

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
    clearArrowSelection: () => setSelectedArrowId(null),
    handleCanvasMouseDown,
    handleCanvasMouseMove,
    handleCanvasMouseUp,
    allArrowSegments,
    svgWidth,
    svgHeight,
    contentHeightWithArrows,
  };
};

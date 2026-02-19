// useCanvasContextMenu encapsulates menu positioning and keyboard navigation so canvas surface handlers stay minimal.
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type React from 'react';

export interface CanvasContextMenuState {
  x: number;
  y: number;
  index: number;
  canvasX: number;
  canvasY: number;
}

export interface CanvasMenuItem {
  label: string;
  action: (_contextMenu: CanvasContextMenuState) => void | Promise<void>;
}

interface UseCanvasContextMenuResult {
  contextMenu: CanvasContextMenuState | null;
  setContextMenu: React.Dispatch<React.SetStateAction<CanvasContextMenuState | null>>;
  canvasMenuRef: React.RefObject<HTMLDivElement | null>;
  canvasMenuPosition: { x: number; y: number } | null;
}

const VIEWPORT_MENU_MARGIN = 8;

const clampMenuToViewport = (x: number, y: number, width: number, height: number): { x: number; y: number } => {
  const clampedX = Math.min(
    Math.max(x, VIEWPORT_MENU_MARGIN),
    Math.max(VIEWPORT_MENU_MARGIN, window.innerWidth - width - VIEWPORT_MENU_MARGIN)
  );
  const clampedY = Math.min(
    Math.max(y, VIEWPORT_MENU_MARGIN),
    Math.max(VIEWPORT_MENU_MARGIN, window.innerHeight - height - VIEWPORT_MENU_MARGIN)
  );
  return { x: clampedX, y: clampedY };
};

export const useCanvasContextMenu = (menuItems: CanvasMenuItem[]): UseCanvasContextMenuResult => {
  const [contextMenu, setContextMenu] = useState<CanvasContextMenuState | null>(null);
  const canvasMenuRef = useRef<HTMLDivElement | null>(null);
  const [canvasMenuSize, setCanvasMenuSize] = useState({ width: 0, height: 0 });

  useLayoutEffect(() => {
    if (!contextMenu || !canvasMenuRef.current) return;
    const { width, height } = canvasMenuRef.current.getBoundingClientRect();
    setCanvasMenuSize({ width, height });
  }, [contextMenu]);

  const canvasMenuPosition = useMemo(() => {
    if (!contextMenu) return null;
    return clampMenuToViewport(contextMenu.x, contextMenu.y, canvasMenuSize.width, canvasMenuSize.height);
  }, [canvasMenuSize.height, canvasMenuSize.width, contextMenu]);

  useEffect(() => {
    if (!contextMenu) return;

    const handleKey = (event: KeyboardEvent) => {
      if (!contextMenu) return;
      if (event.key === 'Escape') {
        setContextMenu(null);
        return;
      }
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault();
        if (!menuItems.length) return;
        const delta = event.key === 'ArrowDown' ? 1 : -1;
        const nextIndex = (contextMenu.index + delta + menuItems.length) % menuItems.length;
        setContextMenu({ ...contextMenu, index: nextIndex });
      }
      if (event.key === 'Enter') {
        event.preventDefault();
        const item = menuItems[contextMenu.index];
        if (item) {
          void Promise.resolve(item.action(contextMenu)).finally(() => setContextMenu(null));
        }
      }
    };

    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [contextMenu, menuItems]);

  return {
    contextMenu,
    setContextMenu,
    canvasMenuRef,
    canvasMenuPosition,
  };
};

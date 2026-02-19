// ArrowContextMenuPortal owns arrow-menu placement and right-click forwarding so arrow menu behavior stays isolated.
import React, { useLayoutEffect, useMemo, useRef, useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import type { ArrowContextMenuState } from '@/components/layout/centerpane/arrows/arrowTypes';
import { Z_INDEX } from '@/constants/zIndex';
import { FONT_ROLES } from '@/styles/fontManager';

interface ArrowContextMenuPortalProps {
  menu: ArrowContextMenuState | null;
  onClose: () => void;
  onDelete: (arrowId: string) => void;
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

export const ArrowContextMenuPortal = ({ menu, onClose, onDelete }: ArrowContextMenuPortalProps) => {
  const arrowMenuBackdropRef = useRef<HTMLDivElement | null>(null);
  const arrowMenuRef = useRef<HTMLDivElement | null>(null);
  const [arrowMenuSize, setArrowMenuSize] = useState({ width: 0, height: 0 });

  useLayoutEffect(() => {
    if (!menu || !arrowMenuRef.current) return;
    const { width, height } = arrowMenuRef.current.getBoundingClientRect();
    setArrowMenuSize({ width, height });
  }, [menu]);

  useEffect(() => {
    if (!menu) return;

    const handleArrowMenuKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleArrowMenuKey, true);
    return () => window.removeEventListener('keydown', handleArrowMenuKey, true);
  }, [menu, onClose]);

  const arrowMenuPosition = useMemo(() => {
    if (!menu) return null;
    return clampMenuToViewport(menu.x, menu.y, arrowMenuSize.width, arrowMenuSize.height);
  }, [menu, arrowMenuSize.height, arrowMenuSize.width]);

  const closeAndForwardContextMenu = (event: React.MouseEvent<HTMLElement>) => {
    event.preventDefault();
    event.stopPropagation();

    const { clientX, clientY } = event;
    const menuElement = arrowMenuRef.current;
    const backdropElement = arrowMenuBackdropRef.current;
    const forwardTarget = document
      .elementsFromPoint(clientX, clientY)
      .find((element) => {
        if (!(element instanceof HTMLElement)) return false;
        if (menuElement?.contains(element)) return false;
        if (backdropElement && element === backdropElement) return false;
        return true;
      });

    onClose();

    if (!(forwardTarget instanceof HTMLElement)) return;

    // Re-dispatch after close so follow-up right-click targets the real element under the cursor.
    window.requestAnimationFrame(() => {
      forwardTarget.dispatchEvent(new MouseEvent('contextmenu', {
        bubbles: true,
        cancelable: true,
        clientX,
        clientY,
        button: 2,
        buttons: 2,
        view: window,
      }));
    });
  };

  if (!menu || !arrowMenuPosition) return null;

  return ReactDOM.createPortal(
    <>
      <div
        ref={arrowMenuBackdropRef}
        className="fixed inset-0"
        style={{ zIndex: Z_INDEX.CONTEXT_MENU_BACKDROP }}
        onClick={(event) => {
          event.stopPropagation();
          onClose();
        }}
        onContextMenu={closeAndForwardContextMenu}
      />
      <div
        ref={arrowMenuRef}
        className="fixed w-40 bg-white rounded-lg shadow-xl border border-slate-200 py-1"
        style={{
          zIndex: Z_INDEX.CONTEXT_MENU,
          left: arrowMenuPosition.x,
          top: arrowMenuPosition.y,
        }}
        onContextMenu={closeAndForwardContextMenu}
      >
        <button
          onClick={(event) => {
            event.stopPropagation();
            onDelete(menu.arrowId);
            onClose();
          }}
          className="w-full px-3.5 py-2 text-left text-sm flex items-center gap-2 text-red-600 hover:bg-red-50"
          style={FONT_ROLES.topbarControl}
        >
          Delete
        </button>
      </div>
    </>,
    document.body
  );
};

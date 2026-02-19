// CanvasContextMenuPortal keeps the canvas menu overlay rendering isolated from center-pane orchestration logic.
import React from 'react';
import ReactDOM from 'react-dom';
import { FONT_ROLES } from '@/styles/fontManager';
import { Z_INDEX } from '@/constants/zIndex';
import type { CanvasContextMenuState, CanvasMenuItem } from '@/components/layout/centerpane/hooks/useCanvasContextMenu';

interface CanvasContextMenuPortalProps {
  contextMenu: CanvasContextMenuState | null;
  canvasMenuPosition: { x: number; y: number } | null;
  canvasMenuRef: React.RefObject<HTMLDivElement | null>;
  menuItems: CanvasMenuItem[];
  onClose: () => void;
}

export const CanvasContextMenuPortal = ({
  contextMenu,
  canvasMenuPosition,
  canvasMenuRef,
  menuItems,
  onClose,
}: CanvasContextMenuPortalProps) => {
  if (!contextMenu || !canvasMenuPosition) return null;

  return ReactDOM.createPortal(
    <>
      <div
        className="fixed inset-0"
        style={{ zIndex: Z_INDEX.CONTEXT_MENU_BACKDROP }}
        onClick={onClose}
        onContextMenu={(event) => {
          event.preventDefault();
          onClose();
        }}
      />
      <div
        ref={canvasMenuRef}
        className="fixed w-56 bg-white rounded-lg shadow-xl border border-slate-200 py-1"
        style={{
          zIndex: Z_INDEX.CONTEXT_MENU,
          left: canvasMenuPosition.x,
          top: canvasMenuPosition.y,
        }}
      >
        {menuItems.map((item, idx) => (
          <button
            key={item.label}
            onClick={() => {
              void Promise.resolve(item.action(contextMenu)).finally(onClose);
            }}
            className="w-full px-3.5 py-2 text-left text-sm flex items-center gap-2"
            style={{
              ...FONT_ROLES.topbarControl,
              background: contextMenu.index === idx ? 'var(--glass-bg)' : 'transparent',
              color: 'var(--color-text-primary)',
            }}
          >
            {item.label}
          </button>
        ))}
      </div>
    </>,
    document.body
  );
};

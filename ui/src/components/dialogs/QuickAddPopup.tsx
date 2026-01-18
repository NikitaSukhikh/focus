import React, { useEffect, useMemo, useState, useRef, useLayoutEffect } from 'react';
import { FilePlus, Plus } from 'lucide-react';
import { Z_INDEX } from '../../constants/zIndex';

interface QuickAddPopupProps {
  isOpen: boolean;
  onClose: () => void;
  onAddFiles: () => void;
  onAddLink: () => void;
  position?: { x: number; y: number } | null;
}

type ActionType = 'files' | 'link';

interface Action {
  type: ActionType;
  label: string;
  icon: React.ReactNode;
  handler: () => void;
}

export function QuickAddPopup({ isOpen, onClose, onAddFiles, onAddLink, position }: QuickAddPopupProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const popupRef = useRef<HTMLDivElement>(null);
  const [popupStyle, setPopupStyle] = useState<React.CSSProperties | null>(null);
  const hasPosition = Boolean(position && Number.isFinite(position.x) && Number.isFinite(position.y));

  const actions: Action[] = useMemo(
    () => [
      { type: 'files', label: 'Add Local Files', icon: <FilePlus size={16} />, handler: onAddFiles },
      { type: 'link', label: 'Add Link', icon: <Plus size={16} />, handler: onAddLink },
    ],
    [onAddFiles, onAddLink]
  );

  useEffect(() => {
    if (!isOpen) {
      setSelectedIndex(0);
      setPopupStyle(null);
      return;
    }

    if (!hasPosition) {
      setPopupStyle(null);
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        onClose();
        return;
      }

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        e.stopPropagation();
        setSelectedIndex((prev) => (prev + 1) % actions.length);
        return;
      }

      if (e.key === 'ArrowUp') {
        e.preventDefault();
        e.stopPropagation();
        setSelectedIndex((prev) => (prev - 1 + actions.length) % actions.length);
        return;
      }

      if (e.key === 'Enter') {
        e.preventDefault();
        e.stopPropagation();
        actions[selectedIndex].handler();
        onClose();
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [isOpen, selectedIndex, actions, onClose, hasPosition]);

  useLayoutEffect(() => {
    if (!isOpen || !hasPosition || !popupRef.current || !position) return;
    const offset = 8;
    const padding = 8;
    const rect = popupRef.current.getBoundingClientRect();
    const rawLeft = position.x + offset;
    const rawTop = position.y + offset;
    const maxLeft = window.innerWidth - rect.width - padding;
    const maxTop = window.innerHeight - rect.height - padding;
    const nextLeft = Math.min(Math.max(padding, rawLeft), Math.max(padding, maxLeft));
    const nextTop = Math.min(Math.max(padding, rawTop), Math.max(padding, maxTop));
    setPopupStyle((prev) => {
      const prevLeft = typeof prev?.left === 'number' ? prev.left : null;
      const prevTop = typeof prev?.top === 'number' ? prev.top : null;
      if (prevLeft === nextLeft && prevTop === nextTop && prev?.transform === 'none') {
        return prev;
      }
      return { left: nextLeft, top: nextTop, transform: 'none' };
    });
  }, [isOpen, hasPosition, position?.x, position?.y]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/20"
        style={{ zIndex: Z_INDEX.OVERLAY_BACKDROP }}
        onClick={onClose}
      />

      {/* Popup */}
      <div
        ref={popupRef}
        className="fixed bg-white rounded-lg shadow-2xl border border-slate-200 overflow-hidden"
        style={{
          zIndex: Z_INDEX.OVERLAY_DIALOG,
          width: '280px',
          ...(popupStyle ?? (hasPosition && position
            ? { left: position.x + 8, top: position.y + 8, transform: 'none' }
            : { left: '50%', top: '50%', transform: 'translate(-50%, -50%)' })),
        }}
      >
        <div className="p-2">
          {actions.map((action, index) => (
            <button
              key={action.type}
              onClick={() => {
                action.handler();
                onClose();
              }}
              className={`w-full px-4 py-2.5 flex items-center gap-3 text-left text-sm rounded transition-colors focus:outline-none focus-visible:outline-none ${
                index === selectedIndex
                  ? 'bg-blue-500 text-white'
                  : 'text-slate-700 hover:bg-slate-100'
              }`}
              style={{ outline: 'none', boxShadow: 'none' }}
              tabIndex={-1}
              onMouseDown={(e) => e.preventDefault()}
              onFocus={(e) => e.currentTarget.blur()}
            >
              {action.icon}
              <span className="font-medium">{action.label}</span>
            </button>
          ))}
        </div>
      </div>
    </>
  );
}

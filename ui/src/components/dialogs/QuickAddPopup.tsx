// QuickAddPopup renders keyboard-first quick actions and mirrors center-pane focus ring colors per action type.
import React, { useEffect, useMemo, useState, useRef, useLayoutEffect } from 'react';
import type { MouseEvent as ReactMouseEvent } from 'react';
import { Clipboard, FilePlus, Plus, BookOpen, Pencil } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Z_INDEX } from '@/constants/zIndex';
import { tileRingOutline, TILE_RING } from '@/styles/tileStyles';

interface QuickAddPopupProps {
  isOpen: boolean;
  onClose: () => void;
  onAddFiles: () => void;
  onAddLink: () => void;
  onAddWebArticle: () => void;
  onPaste: () => void;
  position?: { x: number; y: number } | null;
}

type ActionType = 'files' | 'link' | 'web_article' | 'paste';
type FocusRingType = 'file' | 'link' | 'neutral';

interface Action {
  type: ActionType;
  label: string;
  icon: React.ReactNode;
  handler: () => void;
  focusRing: FocusRingType;
}

export function QuickAddPopup({ isOpen, onClose, onAddFiles, onAddLink, onAddWebArticle, onPaste, position }: QuickAddPopupProps) {
  const { t } = useTranslation();
  const [selectedIndex, setSelectedIndex] = useState(0);
  const backdropRef = useRef<HTMLDivElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  const [popupStyle, setPopupStyle] = useState<React.CSSProperties | null>(null);
  const hasPosition = Boolean(position && Number.isFinite(position.x) && Number.isFinite(position.y));

  const actions: Action[] = useMemo(
    () => [
      { type: 'files', label: t('quickAddPopup.addFile'), icon: <FilePlus size={16} />, handler: onAddFiles, focusRing: 'file' },
      { type: 'link', label: t('quickAddPopup.addLink'), icon: <Plus size={16} />, handler: onAddLink, focusRing: 'link' },
      { type: 'web_article', label: t('quickAddPopup.addWebArticle'), icon: <BookOpen size={16} />, handler: onAddWebArticle, focusRing: 'link' },
      { type: 'paste', label: t('quickAddPopup.paste'), icon: <Clipboard size={16} />, handler: onPaste, focusRing: 'neutral' },
    ],
    [onAddFiles, onAddLink, onAddWebArticle, onPaste, t]
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
  }, [isOpen, hasPosition, position?.x, position?.y]); // eslint-disable-line react-hooks/exhaustive-deps -- position.x/y already tracked individually

  if (!isOpen) return null;

  const closeAndForwardContextMenu = (e: ReactMouseEvent<HTMLElement>) => {
    e.preventDefault();
    e.stopPropagation();

    const { clientX, clientY } = e;
    const popupElement = popupRef.current;
    const backdropElement = backdropRef.current;
    const forwardTarget = document
      .elementsFromPoint(clientX, clientY)
      .find((element) => {
        if (!(element instanceof HTMLElement)) return false;
        if (popupElement?.contains(element)) return false;
        if (backdropElement && element === backdropElement) return false;
        return true;
      });

    onClose();

    if (!(forwardTarget instanceof HTMLElement)) return;

    // Re-dispatch after close so the next context action targets the real element under the cursor.
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

  return (
    <>
      {/* Backdrop */}
      <div
        ref={backdropRef}
        className="fixed inset-0 bg-black/20"
        style={{ zIndex: Z_INDEX.OVERLAY_BACKDROP }}
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        onContextMenu={closeAndForwardContextMenu}
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
        onContextMenu={closeAndForwardContextMenu}
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
                  ? 'text-slate-700'
                  : 'text-slate-700 hover:bg-slate-100'
              }`}
              style={index === selectedIndex
                ? {
                  outline: action.focusRing === 'neutral'
                    ? `${TILE_RING.strokeWidth}px solid var(--color-border-strong)`
                    : tileRingOutline(action.focusRing),
                  outlineOffset: '0px',
                  boxShadow: 'none',
                  background: 'transparent',
                }
                : { outline: 'none', boxShadow: 'none' }}
              tabIndex={-1}
              onMouseDown={(e) => e.preventDefault()}
              onFocus={(e) => e.currentTarget.blur()}
            >
              {action.icon}
              <span className="font-medium">{action.label}</span>
            </button>
          ))}
          <div className="w-full px-4 py-2.5 flex items-center gap-3 text-left text-sm text-slate-500">
            <span className="w-4 h-4 flex items-center justify-center shrink-0" aria-hidden="true">
              <Pencil size={14} />
            </span>
            <span className="font-medium">{t('quickAddPopup.doubleClickHint')}</span>
          </div>
        </div>
      </div>
    </>
  );
}

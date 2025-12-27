import React, { useEffect, useMemo, useState, useRef } from 'react';
import { FilePlus, Plus } from 'lucide-react';
import { Z_INDEX } from '../../constants/zIndex';

interface QuickAddPopupProps {
  isOpen: boolean;
  onClose: () => void;
  onAddFiles: () => void;
  onAddLink: () => void;
  onAddTelegram: () => void;
}

type ActionType = 'files' | 'link' | 'telegram';

interface Action {
  type: ActionType;
  label: string;
  icon: React.ReactNode;
  handler: () => void;
}

export function QuickAddPopup({ isOpen, onClose, onAddFiles, onAddLink, onAddTelegram }: QuickAddPopupProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const popupRef = useRef<HTMLDivElement>(null);

  const actions: Action[] = useMemo(
    () => [
      { type: 'files', label: 'Add Local Files', icon: <FilePlus size={16} />, handler: onAddFiles },
      { type: 'link', label: 'Add Link', icon: <Plus size={16} />, handler: onAddLink },
      { type: 'telegram', label: 'Add Telegram account', icon: <Plus size={16} />, handler: onAddTelegram },
    ],
    [onAddFiles, onAddLink, onAddTelegram]
  );

  useEffect(() => {
    if (!isOpen) {
      setSelectedIndex(0);
      return;
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
  }, [isOpen, selectedIndex, actions, onClose]);

  useEffect(() => {
    if (isOpen && popupRef.current) {
      popupRef.current.focus();
    }
  }, [isOpen]);

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
        className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white rounded-lg shadow-2xl border border-slate-200 overflow-hidden"
        style={{ zIndex: Z_INDEX.OVERLAY_DIALOG, width: '280px' }}
        tabIndex={-1}
      >
        <div className="p-2">
          {actions.map((action, index) => (
            <button
              key={action.type}
              onClick={() => {
                action.handler();
                onClose();
              }}
              className={`w-full px-4 py-2.5 flex items-center gap-3 text-left text-sm rounded transition-colors ${
                index === selectedIndex
                  ? 'bg-blue-500 text-white'
                  : 'text-slate-700 hover:bg-slate-100'
              }`}
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

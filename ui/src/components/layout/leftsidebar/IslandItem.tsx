import React, { useState, useRef, useEffect } from 'react';
import { Edit2, Trash2, Copy } from 'lucide-react';
import { IslandItemProps } from './types';

export function IslandItem({
  id,
  name,
  count,
  isActive,
  isEditing,
  onRename,
  onDuplicate,
  onDelete,
  onStartEdit,
  onCancelEdit,
  onClick
}: IslandItemProps) {
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [contextMenuPosition, setContextMenuPosition] = useState({ x: 0, y: 0 });
  const [editValue, setEditValue] = useState(name);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    setContextMenuPosition({ x: e.clientX, y: e.clientY });
    setShowContextMenu(true);
  };

  useEffect(() => {
    if (!showContextMenu) return;
    const handleAnyDown = (event: Event) => {
      const target = event.target as HTMLElement | null;
      const insideMenu = menuRef.current?.contains(target ?? null);
      if (!insideMenu || !menuRef.current) {
        setShowContextMenu(false);
      }
    };
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setShowContextMenu(false);
      }
    };
    const handleScroll = () => setShowContextMenu(false);
    const handleBlur = () => setShowContextMenu(false);

    window.addEventListener('pointerdown', handleAnyDown, true);
    window.addEventListener('mousedown', handleAnyDown, true);
    window.addEventListener('click', handleAnyDown, true);
    window.addEventListener('scroll', handleScroll, true);
    window.addEventListener('blur', handleBlur);
    document.addEventListener('keydown', handleEsc, true);
    return () => {
      window.removeEventListener('pointerdown', handleAnyDown, true);
      window.removeEventListener('mousedown', handleAnyDown, true);
      window.removeEventListener('click', handleAnyDown, true);
      window.removeEventListener('scroll', handleScroll, true);
      window.removeEventListener('blur', handleBlur);
      document.removeEventListener('keydown', handleEsc, true);
    };
  }, [showContextMenu]);

  useEffect(() => {
    setEditValue(name);
  }, [name]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleRenameClick = () => {
    onStartEdit();
    setShowContextMenu(false);
  };

  const handleDeleteClick = () => {
    onDelete(id);
    setShowContextMenu(false);
  };

  const handleDuplicateClick = () => {
    onDuplicate(id);
    setShowContextMenu(false);
  };

  const handleSubmit = async () => {
    const trimmedValue = editValue.trim();
    const shouldCommit = trimmedValue && (trimmedValue !== name || id.startsWith('temp-'));
    if (shouldCommit) {
      await onRename(id, trimmedValue);
    } else {
      setEditValue(name);
      onCancelEdit();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSubmit();
    } else if (e.key === 'Escape') {
      setEditValue(name);
      onCancelEdit();
    }
  };

  return (
    <>
      <div
        onClick={onClick}
        onContextMenu={handleContextMenu}
        onDoubleClick={(e) => {
          e.stopPropagation();
          onStartEdit();
        }}
        className={`
          w-full text-left px-3 py-2.5 rounded-lg
          transition-all duration-150 cursor-pointer
          ${
            isActive
              ? 'bg-slate-700 text-slate-100'
              : 'text-slate-300 hover:bg-slate-700/50 hover:text-slate-100'
          }
        `}
      >
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              {isEditing ? (
                <input
                  ref={inputRef}
                  type="text"
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  onBlur={handleSubmit}
                  onKeyDown={handleKeyDown}
                  className="w-full text-sm font-medium bg-slate-600 text-slate-100 px-2 py-0.5 rounded outline-none focus:ring-2 focus:ring-blue-500"
                />
              ) : (
                <span className="block text-sm font-medium truncate">{name}</span>
              )}
            </div>
            <span className="text-xs text-slate-400 ml-2 shrink-0">{count}</span>
          </div>
        </div>

      {/* Context Menu */}
      {showContextMenu && (
        <>
          {/* Menu */}
          <div
            ref={menuRef}
            className="fixed z-50 w-40 bg-white rounded-lg shadow-lg border border-slate-200 py-1"
            style={{ left: `${contextMenuPosition.x}px`, top: `${contextMenuPosition.y}px` }}
          >
            <button
              onClick={handleRenameClick}
              className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-100 transition-colors flex items-center gap-2"
            >
              <Edit2 size={14} />
              Rename
            </button>
            <button
              onClick={handleDuplicateClick}
              className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-100 transition-colors flex items-center gap-2"
            >
              <Copy size={14} />
              Duplicate
            </button>
            <button
              onClick={handleDeleteClick}
              className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 transition-colors flex items-center gap-2"
            >
              <Trash2 size={14} />
              Delete
            </button>
          </div>
        </>
      )}
    </>
  );
}

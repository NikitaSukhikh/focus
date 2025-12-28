import React, { useState, useRef, useEffect } from 'react';
import { Edit2, Trash2, Copy, ChevronDown } from 'lucide-react';
import { Z_INDEX } from '../../../constants/zIndex';
import { FONT_ROLES } from '../../../styles/fontManager';
import { IslandItemProps } from './types';

// IslandItem renders a single island row with inline rename, selection, and context menu actions used inside the sidebar list.
export function IslandItem({
  id,
  name,
  isActive,
  isEditing,
  onRename,
  onDuplicate,
  onDelete,
  onStartEdit,
  onCancelEdit,
  onClick,
  showLinksToggle = false,
  isLinksExpanded = false,
  onToggleLinks
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
        onClick={(e) => {
          if (isActive && showLinksToggle) {
            onToggleLinks?.();
          } else {
            onClick();
          }
        }}
        onContextMenu={handleContextMenu}
        onDoubleClick={(e) => {
          e.stopPropagation();
          onStartEdit();
        }}
        className="w-full text-left px-3 py-2.5 rounded-lg transition-all duration-150 cursor-pointer"
        style={{
          background: isActive ? 'var(--glass-bg)' : 'transparent',
          color: isActive ? 'var(--primary-color)' : 'var(--color-text-secondary)',
          border: isActive ? '1px solid var(--color-border-strong)' : '1px solid transparent',
          boxShadow: isActive ? '0 0 15px var(--shadow)' : 'none',
        }}
        onMouseEnter={(e) => {
          if (!isActive) {
            e.currentTarget.style.background = 'var(--glass-bg)';
            e.currentTarget.style.color = 'var(--color-text-primary)';
            e.currentTarget.style.borderColor = 'var(--color-border-subtle)';
          }
        }}
        onMouseLeave={(e) => {
          if (!isActive) {
            e.currentTarget.style.background = 'transparent';
            e.currentTarget.style.color = 'var(--color-text-secondary)';
            e.currentTarget.style.borderColor = 'transparent';
          }
        }}
      >
          <div className="flex items-center justify-between gap-2">
            <div className="flex-1 min-w-0">
              {isEditing ? (
                <input
                  ref={inputRef}
                  type="text"
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  onBlur={handleSubmit}
                  onKeyDown={handleKeyDown}
                  onClick={(e) => e.stopPropagation()}
                  className="w-full px-2 py-0.5 rounded outline-none"
                  style={{
                    ...FONT_ROLES.sidebarItem,
                    background: 'var(--background-dark)',
                    color: 'var(--text-color)',
                    border: '1px solid var(--primary-color)',
                    boxShadow: '0 0 10px var(--shadow)',
                  }}
                />
              ) : (
                <span className="block truncate" style={FONT_ROLES.sidebarItem}>{name}</span>
              )}
            </div>

            {/* Links toggle chevron */}
            {showLinksToggle && (
              <ChevronDown
                size={14}
                className={`shrink-0 transition-transform text-slate-400 ${isLinksExpanded ? 'rotate-0' : '-rotate-90'}`}
              />
            )}
          </div>
        </div>

      {/* Context Menu */}
      {showContextMenu && (
        <>
          {/* Menu */}
          <div
            ref={menuRef}
            className="fixed w-40 glass-panel py-1"
            style={{
              zIndex: Z_INDEX.CONTEXT_MENU,
              left: `${contextMenuPosition.x}px`,
              top: `${contextMenuPosition.y}px`,
            }}
          >
            <button
              onClick={handleRenameClick}
              className="w-full px-4 py-2 text-left text-slate-700 hover:bg-slate-100 transition-colors flex items-center gap-2"
              style={FONT_ROLES.sidebarItem}
            >
              <Edit2 size={14} />
              Rename
            </button>
            <button
              onClick={handleDuplicateClick}
              className="w-full px-4 py-2 text-left text-slate-700 hover:bg-slate-100 transition-colors flex items-center gap-2"
              style={FONT_ROLES.sidebarItem}
            >
              <Copy size={14} />
              Duplicate
            </button>
            <button
              onClick={handleDeleteClick}
              className="w-full px-4 py-2 text-left text-red-600 hover:bg-red-50 transition-colors flex items-center gap-2"
              style={FONT_ROLES.sidebarItem}
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

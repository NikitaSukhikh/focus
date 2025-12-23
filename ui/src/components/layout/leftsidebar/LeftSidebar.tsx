import React, { useEffect, useState, useRef } from 'react';
import { ChevronLeft, Plus, Edit2, Trash2, Copy } from 'lucide-react';
import { useIslandStore } from '../../../stores/islandStore';
import { objectsApi, ObjectResponse, ObjectCreatePayload } from '../../../api/objects';

interface LeftSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  width: number;
  onResizeStart: React.MouseEventHandler<HTMLDivElement>;
}

export function LeftSidebar({ isOpen, onClose, width, onResizeStart }: LeftSidebarProps) {
  const [editingId, setEditingId] = useState<string | null>(null);

  const islands = useIslandStore((state) => state.islands);
  const selectedIslandId = useIslandStore((state) => state.selectedIslandId);
  const selectIsland = useIslandStore((state) => state.selectIsland);
  const addLocalIsland = useIslandStore((state) => state.addLocalIsland);
  const commitIsland = useIslandStore((state) => state.commitIsland);
  const deleteIsland = useIslandStore((state) => state.deleteIsland);
  const createIsland = useIslandStore((state) => state.createIsland);
  const loadIslands = useIslandStore((state) => state.loadIslands);
  const initialize = useIslandStore((state) => state.initialize);

  useEffect(() => {
    initialize();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleAddIsland = async () => {
    const defaultName = 'My First Island';
    const tempId = addLocalIsland(defaultName);
    setEditingId(tempId);
    selectIsland(tempId);
  };

  const handleRenameIsland = async (id: string, newName: string) => {
    await commitIsland(id, newName);
    setEditingId(null);
  };

  const handleDeleteIsland = async (id: string) => {
    await deleteIsland(id);
  };

  const mapObjectToPayload = (obj: ObjectResponse): ObjectCreatePayload | null => {
    const meta = (obj.metadata || {}) as Record<string, any>;
    const base: ObjectCreatePayload = {
      type: obj.type,
      title: obj.title,
      description: obj.description,
      tags: (obj as any).tags || [],
      x: typeof meta.x === 'number' ? meta.x : undefined,
      y: typeof meta.y === 'number' ? meta.y : undefined,
    };

    switch (obj.type) {
      case 'link':
        base.url = meta.url as string | undefined;
        base.favicon_url = meta.favicon_url as string | undefined;
        base.thumbnail_url = meta.thumbnail_url as string | undefined;
        break;
      case 'file':
        base.file_path = meta.file_path as string | undefined;
        base.mime_type = meta.mime_type as string | undefined;
        break;
      case 'google_drive':
        base.drive_file_id = meta.drive_file_id as string | undefined;
        base.drive_file_name = meta.drive_file_name as string | undefined;
        base.mime_type = meta.mime_type as string | undefined;
        base.web_view_link = meta.web_view_link as string | undefined;
        break;
      case 'gmail':
        base.thread_id = meta.thread_id as string | undefined;
        base.message_id = meta.message_id as string | undefined;
        base.subject = (meta.subject as string | undefined) || obj.title;
        base.sender = meta.sender as string | undefined;
        base.snippet = meta.snippet as string | undefined;
        break;
      case 'text':
        base.content = meta.content as string | undefined;
        if (meta.service) base.service = meta.service as string;
        break;
      default:
        break;
    }

    // If required type-specific data is missing, skip duplication for that object.
    if (obj.type === 'link' && !base.url) return null;
    if (obj.type === 'file' && !base.file_path) return null;
    if (obj.type === 'google_drive' && !base.drive_file_id) return null;
    if (obj.type === 'gmail' && !base.thread_id) return null;
    if (obj.type === 'text' && !base.content) return null;

    return base;
  };

  const handleDuplicateIsland = async (id: string) => {
    const source = islands.find((i) => i.id === id);
    if (!source) return;

    const existingNames = new Set(islands.map((i) => i.name.toLowerCase()));
    const base = `${source.name} Copy`;
    let candidate = base;
    let suffix = 2;
    while (existingNames.has(candidate.toLowerCase())) {
      candidate = `${base} ${suffix}`;
      suffix += 1;
    }

    const newIsland = await createIsland(candidate);
    if (!newIsland) return;

    try {
      const objects = await objectsApi.list(id);
      for (const obj of objects) {
        const payload = mapObjectToPayload(obj);
        if (!payload) continue;
        try {
          await objectsApi.create(newIsland.id, payload);
        } catch (err) {
          console.error('Failed to duplicate object', { obj, err });
        }
      }
    } catch (err) {
      console.error('Failed to duplicate island objects', err);
    } finally {
      await loadIslands(newIsland.id);
      selectIsland(newIsland.id);
    }
  };

  const handleSelectIsland = (id: string) => {
    selectIsland(id);
  };

  return (
    <>
      <aside
        className={`
          fixed top-0 left-0 h-full
          bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900
          border-r border-slate-700
          flex flex-col
          transition-transform duration-200 ease-in-out
          z-30
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
        data-testid="left-sidebar"
        id="left-sidebar"
        style={{ width: `${width}px` }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-700">
          <h2 className="text-lg font-semibold text-slate-100">Islands</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={handleAddIsland}
              className="p-1.5 rounded-lg hover:bg-slate-700/50 text-slate-300 hover:text-slate-100 transition-colors"
              title="New Island"
            >
              <Plus size={18} />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-slate-700/50 text-slate-300 hover:text-slate-100 transition-colors"
              title="Close sidebar"
            >
              <ChevronLeft size={18} />
            </button>
          </div>
        </div>

        {/* Islands List */}
        <div className="flex-1 overflow-y-auto sidebar-scroll p-3">
          {islands.length === 0 ? (
            <div className="text-sm text-slate-400 text-center py-4">
              No islands yet. Click + to create one.
            </div>
          ) : (
            <div className="space-y-2">
              {islands.map((island) => (
                <IslandItem
                  key={island.id}
                  id={island.id}
                  name={island.name}
                  count={island.object_count}
                  isActive={island.id === selectedIslandId}
                  isEditing={editingId === island.id}
                  onRename={handleRenameIsland}
                  onDelete={handleDeleteIsland}
                  onDuplicate={handleDuplicateIsland}
                  onStartEdit={() => setEditingId(island.id)}
                  onCancelEdit={() => setEditingId(null)}
                  onClick={() => handleSelectIsland(island.id)}
                />
              ))}
            </div>
          )}
        </div>
      </aside>

      {/* Resize handle */}
      {isOpen && (
        <div
          className="fixed top-0 h-full w-1 cursor-col-resize z-40 hover:bg-blue-500/50 transition-colors"
          style={{ left: `${width}px` }}
          onMouseDown={onResizeStart}
        />
      )}
    </>
  );
}

interface IslandItemProps {
  id: string;
  name: string;
  count: number;
  isActive?: boolean;
  isEditing?: boolean;
  onRename: (_id: string, _newName: string) => void;
  onDuplicate: (_id: string) => void;
  onDelete: (_id: string) => void;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onClick: () => void;
}

function IslandItem({
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

  const _handleCloseContextMenu = () => {
    setShowContextMenu(false);
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

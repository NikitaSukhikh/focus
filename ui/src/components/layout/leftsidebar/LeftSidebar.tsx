import React, { useEffect, useState } from 'react';
import { ChevronLeft, Plus } from 'lucide-react';
import { useIslandStore } from '../../../stores/islandStore';
import { objectsApi } from '../../../api/objects';
import { Z_INDEX } from '../../../constants/zIndex';
import { FONT_ROLES } from '../../../styles/fontManager';
import { IslandItem } from './IslandItem';
import { LeftSidebarProps } from './types';
import { mapObjectToPayload, generateUniqueName } from './utils';

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

  const handleDuplicateIsland = async (id: string) => {
    const source = islands.find((i) => i.id === id);
    if (!source) return;

    const existingNames = new Set(islands.map((i) => i.name.toLowerCase()));
    const base = `${source.name} Copy`;
    const newName = generateUniqueName(base, existingNames);

    const newIsland = await createIsland(newName);
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
          glass-panel
          flex flex-col
          transition-transform duration-200 ease-in-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
        data-testid="left-sidebar"
        id="left-sidebar"
        style={{
          width: `${width}px`,
          zIndex: Z_INDEX.SIDEBAR,
          background: 'var(--background-light)',
          borderRight: '1px solid var(--color-border-strong)',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4" style={{ borderBottom: '1px solid var(--color-border-subtle)' }}>
          <h2 style={{ ...FONT_ROLES.sidebarTitle, color: 'var(--primary-color)' }}>Islands</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={handleAddIsland}
              className="p-1.5 rounded-lg transition-colors"
              style={{
                color: 'var(--color-text-secondary)',
                transition: 'all var(--transition-base)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'var(--glass-bg)';
                e.currentTarget.style.color = 'var(--primary-color)';
                e.currentTarget.style.boxShadow = '0 0 10px var(--shadow)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.color = 'var(--color-text-secondary)';
                e.currentTarget.style.boxShadow = 'none';
              }}
              title="New Island"
            >
              <Plus size={18} />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg transition-colors"
              style={{
                color: 'var(--color-text-secondary)',
                transition: 'all var(--transition-base)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'var(--glass-bg)';
                e.currentTarget.style.color = 'var(--primary-color)';
                e.currentTarget.style.boxShadow = '0 0 10px var(--shadow)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.color = 'var(--color-text-secondary)';
                e.currentTarget.style.boxShadow = 'none';
              }}
              title="Close sidebar"
            >
              <ChevronLeft size={18} />
            </button>
          </div>
        </div>

        {/* Islands List */}
        <div className="flex-1 overflow-y-auto sidebar-scroll p-3">
          {islands.length === 0 ? (
            <div className="text-center py-4" style={{ ...FONT_ROLES.sidebarHint, color: 'var(--color-text-muted)' }}>
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
          className="fixed top-0 h-full w-1 cursor-col-resize hover:bg-blue-500/50 transition-colors"
          style={{ zIndex: Z_INDEX.RESIZE_HANDLE, left: `${width}px` }}
          onMouseDown={onResizeStart}
        />
      )}
    </>
  );
}

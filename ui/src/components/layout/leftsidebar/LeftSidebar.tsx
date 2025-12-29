import React, { useEffect, useRef, useState } from 'react';
import ReactDOM from 'react-dom';
import { ChevronLeft, Plus, Settings } from 'lucide-react';
import { useIslandStore } from '../../../stores/islandStore';
import { objectsApi } from '../../../api/objects';
import { Z_INDEX } from '../../../constants/zIndex';
import { FONT_ROLES } from '../../../styles/fontManager';
import { IslandItem } from './IslandItem';
import { LeftSidebarProps } from './types';
import { mapObjectToPayload, generateUniqueName } from './utils';

// LeftSidebar lists available islands and handles basic island CRUD/duplication.
export function LeftSidebar({ isOpen, onClose, width, onResizeStart }: LeftSidebarProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const noButtonRef = useRef<HTMLButtonElement>(null);
  const yesButtonRef = useRef<HTMLButtonElement>(null);

  const islands = useIslandStore((state) => state.islands);
  const selectedIslandId = useIslandStore((state) => state.selectedIslandId);
  const selectIsland = useIslandStore((state) => state.selectIsland);
  const addLocalIsland = useIslandStore((state) => state.addLocalIsland);
  const commitIsland = useIslandStore((state) => state.commitIsland);
  const deleteIsland = useIslandStore((state) => state.deleteIsland);
  const createIsland = useIslandStore((state) => state.createIsland);
  const loadIslands = useIslandStore((state) => state.loadIslands);
  const initialize = useIslandStore((state) => state.initialize);
  const setDuplicating = useIslandStore((state) => state.setDuplicating);

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

  const handleDeleteIsland = (id: string) => {
    setPendingDeleteId(id);
  };

  const handleConfirmDeleteIsland = async () => {
    if (!pendingDeleteId) return;

    setIsDeleting(true);
    try {
      await deleteIsland(pendingDeleteId);
    } catch (err) {
      console.error('Failed to delete island', err);
    } finally {
      setIsDeleting(false);
      setPendingDeleteId(null);
    }
  };

  const handleCloseDeleteDialog = () => {
    if (isDeleting) return;
    setPendingDeleteId(null);
  };

  useEffect(() => {
    if (!pendingDeleteId) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (!['Escape', 'ArrowLeft', 'ArrowRight', 'Enter'].includes(event.key)) return;

      event.preventDefault();

      if (event.key === 'Escape') {
        handleCloseDeleteDialog();
      } else if (event.key === 'ArrowLeft') {
        noButtonRef.current?.focus();
      } else if (event.key === 'ArrowRight') {
        yesButtonRef.current?.focus();
      } else if (event.key === 'Enter') {
        if (document.activeElement === yesButtonRef.current) {
          handleConfirmDeleteIsland();
        } else {
          handleCloseDeleteDialog();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [pendingDeleteId, isDeleting]);

  useEffect(() => {
    if (!pendingDeleteId || isDeleting) return;
    requestAnimationFrame(() => noButtonRef.current?.focus());
  }, [pendingDeleteId, isDeleting]);

  const handleDuplicateIsland = async (id: string) => {
    const source = islands.find((i) => i.id === id);
    if (!source) return;

    const existingNames = new Set(islands.map((i) => i.name.toLowerCase()));
    const base = `${source.name} Copy`;
    const newName = generateUniqueName(base, existingNames);

    const newIsland = await createIsland(newName);
    if (!newIsland) return;

    // Set duplicating state to show loading spinner
    setDuplicating(true);

    // Preserve the current selection before duplication
    const currentSelection = selectedIslandId;

    try {
      const objects = await objectsApi.list(id);

      // Create all objects in parallel for faster duplication
      const createPromises = objects.map(async (obj) => {
        const payload = mapObjectToPayload(obj);
        if (!payload) return null;
        try {
          return await objectsApi.create(newIsland.id, payload);
        } catch (err) {
          console.error('Failed to duplicate object', { obj, err });
          return null;
        }
      });

      await Promise.all(createPromises);
    } catch (err) {
      console.error('Failed to duplicate island objects', err);
    } finally {
      // Clear duplicating state
      setDuplicating(false);
    }

    // Reload islands list to show the new duplicated island, maintaining the original selection
    if (currentSelection) {
      await loadIslands(currentSelection);
    } else {
      await loadIslands();
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
          top: '56px',
          height: 'calc(100% - 56px)',
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
              {islands.map((island) => {
                const isSelected = island.id === selectedIslandId;

                return (
                  <IslandItem
                    key={island.id}
                    id={island.id}
                    name={island.name}
                    isActive={isSelected}
                    isEditing={editingId === island.id}
                    onRename={handleRenameIsland}
                    onDelete={handleDeleteIsland}
                    onDuplicate={handleDuplicateIsland}
                    onStartEdit={() => setEditingId(island.id)}
                    onCancelEdit={() => setEditingId(null)}
                    onClick={() => handleSelectIsland(island.id)}
                  />
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          className="px-4 py-3 border-t border-slate-200 flex items-center justify-start"
          style={{ background: 'var(--background-light)' }}
        >
          <button
            className="p-2 rounded-lg transition-colors"
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
            title="Settings"
          >
            <Settings size={20} />
          </button>
        </div>
      </aside>

      {/* Resize handle */}
      {isOpen && (
        <div
          className="fixed w-1 cursor-col-resize hover:bg-blue-500/50 transition-colors"
          style={{
            zIndex: Z_INDEX.RESIZE_HANDLE,
            left: `${width}px`,
            top: '56px',
            height: 'calc(100% - 56px)',
          }}
          onMouseDown={onResizeStart}
        />
      )}

      {/* Delete Confirmation Dialog */}
      {pendingDeleteId &&
        ReactDOM.createPortal(
          <>
            <div
              className="fixed inset-0 bg-black/50 transition-opacity"
              style={{ zIndex: Z_INDEX.MODAL_BACKDROP }}
              onClick={handleCloseDeleteDialog}
            />

            <div
              className="fixed inset-0 flex items-center justify-center p-4"
              style={{ zIndex: Z_INDEX.MODAL_DIALOG }}
              onClick={handleCloseDeleteDialog}
            >
              <div
                className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-6"
                onClick={(e) => e.stopPropagation()}
              >
                <h3 className="text-lg font-semibold text-slate-900 mb-2">Delete Island</h3>
                <p className="text-sm text-slate-700 mb-6">Are you sure you wnat to delete this island with all data?</p>

                <div className="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={handleCloseDeleteDialog}
                    className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2"
                    disabled={isDeleting}
                    ref={noButtonRef}
                  >
                    No
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmDeleteIsland}
                    className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-red-200 focus-visible:ring-offset-2"
                    disabled={isDeleting}
                    ref={yesButtonRef}
                  >
                    Yes
                  </button>
                </div>
              </div>
            </div>
          </>,
          document.body
        )}
    </>
  );
}

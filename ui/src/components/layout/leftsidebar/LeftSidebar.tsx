import React, { useEffect, useRef, useState } from 'react';
import ReactDOM from 'react-dom';
import { ChevronLeft, Plus, Settings } from 'lucide-react';
import { useSpaceStore } from '../../../stores/spaceStore';
import { objectsApi } from '../../../api/objects';
import { Z_INDEX } from '../../../constants/zIndex';
import { DIMENSIONS } from '../../../constants/panelDimensions';
import { FONT_ROLES } from '../../../styles/fontManager';
import { SpaceItem } from './SpaceItem';
import { LeftSidebarProps } from './types';
import { mapObjectToPayload, generateUniqueName } from './utils';
import { SHORTCUT_HINT_LINES } from '../../../constants/shortcutHints';

// LeftSidebar lists available spaces and handles basic space CRUD/duplication.
export function LeftSidebar({ isOpen, onClose, width, onResizeStart }: LeftSidebarProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const noButtonRef = useRef<HTMLButtonElement>(null);
  const yesButtonRef = useRef<HTMLButtonElement>(null);
  const topBarHeight = DIMENSIONS.TOPBAR.HEIGHT;
  const sidebarTop = `${topBarHeight}px`;
  const sidebarHeight = `calc(100% - ${topBarHeight}px)`;

  const spaces = useSpaceStore((state) => state.spaces);
  const selectedSpaceId = useSpaceStore((state) => state.selectedSpaceId);
  const selectSpace = useSpaceStore((state) => state.selectSpace);
  const addLocalSpace = useSpaceStore((state) => state.addLocalSpace);
  const commitSpace = useSpaceStore((state) => state.commitSpace);
  const deleteSpace = useSpaceStore((state) => state.deleteSpace);
  const createSpace = useSpaceStore((state) => state.createSpace);
  const loadSpaces = useSpaceStore((state) => state.loadSpaces);
  const initialize = useSpaceStore((state) => state.initialize);
  const setDuplicating = useSpaceStore((state) => state.setDuplicating);

  useEffect(() => {
    initialize();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleAddSpace = async () => {
    const defaultName = 'My First Space';
    const tempId = addLocalSpace(defaultName);
    setEditingId(tempId);
    selectSpace(tempId);
  };

  const handleRenameSpace = async (id: string, newName: string) => {
    await commitSpace(id, newName);
    setEditingId(null);
  };

  const handleDeleteSpace = (id: string) => {
    setPendingDeleteId(id);
  };

  const handleConfirmDeleteSpace = async () => {
    if (!pendingDeleteId) return;

    setIsDeleting(true);
    try {
      await deleteSpace(pendingDeleteId);
    } catch (err) {
      console.error('Failed to delete space', err);
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
          handleConfirmDeleteSpace();
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

  const handleDuplicateSpace = async (id: string) => {
    const source = spaces.find((i) => i.id === id);
    if (!source) return;

    const existingNames = new Set(spaces.map((i) => i.name.toLowerCase()));
    const base = `${source.name} Copy`;
    const newName = generateUniqueName(base, existingNames);

    const newSpace = await createSpace(newName);
    if (!newSpace) return;

    // Set duplicating state to show loading spinner
    setDuplicating(true);

    // Preserve the current selection before duplication
    const currentSelection = selectedSpaceId;

    try {
      const objects = await objectsApi.list(id);

      // Create all objects in parallel for faster duplication
      const createPromises = objects.map(async (obj) => {
        const payload = mapObjectToPayload(obj);
        if (!payload) return null;
        try {
          return await objectsApi.create(newSpace.id, payload);
        } catch (err) {
          console.error('Failed to duplicate object', { obj, err });
          return null;
        }
      });

      await Promise.all(createPromises);
    } catch (err) {
      console.error('Failed to duplicate space objects', err);
    } finally {
      // Clear duplicating state
      setDuplicating(false);
    }

    // Reload spaces list to show the new duplicated space, maintaining the original selection
    if (currentSelection) {
      await loadSpaces(currentSelection);
    } else {
      await loadSpaces();
    }
  };

  const handleSelectSpace = (id: string) => {
    selectSpace(id);
  };

  return (
    <>
      <aside
        className={`
          fixed left-0
          glass-panel
          flex flex-col
          transition-transform duration-200 ease-in-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
        data-testid="left-sidebar"
        id="left-sidebar"
        style={{
          width: `${width}px`,
          top: sidebarTop,
          height: sidebarHeight,
          zIndex: Z_INDEX.SIDEBAR,
          background: 'var(--background-light)',
          borderRight: '1px solid var(--color-border-strong)',
          color: 'var(--color-text-secondary)',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-3 py-2" style={{ borderBottom: '1px solid var(--color-border-subtle)' }}>
          <h2 style={{ ...FONT_ROLES.sidebarTitle, color: 'var(--color-text-secondary)', opacity: 0.5 }}>Spaces</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={handleAddSpace}
              className="p-1.5 rounded-lg transition-colors"
              style={{
                color: 'var(--color-text-muted)',
                transition: 'all var(--transition-base)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'var(--glass-bg)';
                e.currentTarget.style.color = 'var(--color-text-secondary)';
                e.currentTarget.style.boxShadow = '0 0 10px var(--shadow)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.color = 'var(--color-text-muted)';
                e.currentTarget.style.boxShadow = 'none';
              }}
              title="New Space"
            >
              <Plus size={18} />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg transition-colors"
              style={{
                color: 'var(--color-text-muted)',
                transition: 'all var(--transition-base)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'var(--glass-bg)';
                e.currentTarget.style.color = 'var(--color-text-secondary)';
                e.currentTarget.style.boxShadow = '0 0 10px var(--shadow)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.color = 'var(--color-text-muted)';
                e.currentTarget.style.boxShadow = 'none';
              }}
              title="Close sidebar"
            >
              <ChevronLeft size={18} />
            </button>
          </div>
        </div>

        {/* Spaces List */}
        <div className="flex-1 overflow-y-auto sidebar-scroll p-3">
          {spaces.length === 0 ? (
            <div className="text-center py-4" style={{ ...FONT_ROLES.sidebarHint, color: 'var(--color-text-muted)' }}>
              No spaces yet. Click '+' or press 'Ctrl+Y' to create one
            </div>
          ) : (
            <div className="space-y-2">
              {spaces.map((space) => {
                const isSelected = space.id === selectedSpaceId;

                return (
                  <SpaceItem
                    key={space.id}
                    id={space.id}
                    name={space.name}
                    isActive={isSelected}
                    isEditing={editingId === space.id}
                    onRename={handleRenameSpace}
                    onDelete={handleDeleteSpace}
                    onDuplicate={handleDuplicateSpace}
                    onStartEdit={() => setEditingId(space.id)}
                    onCancelEdit={() => setEditingId(null)}
                    onClick={() => handleSelectSpace(space.id)}
                  />
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          className="px-4 py-3 border-t border-slate-200 flex flex-col items-start gap-2"
          style={{ background: 'var(--background-light)' }}
        >
          <div
            className="text-sm"
            style={{ ...FONT_ROLES.sidebarHint, color: 'var(--color-text-muted)', textAlign: 'left' }}
          >
            {SHORTCUT_HINT_LINES.map((line) => (
              <div key={line}>{line}</div>
            ))}
          </div>
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
            top: sidebarTop,
            height: sidebarHeight,
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
                <h3 className="text-lg font-semibold text-slate-900 mb-2">Delete Space</h3>
                <p className="text-sm text-slate-700 mb-6">Are you sure you wnat to delete this space with all data?</p>

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
                    onClick={handleConfirmDeleteSpace}
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

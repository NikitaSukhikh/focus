import React, { useRef, useImperativeHandle, forwardRef, useMemo, useState, useEffect } from 'react';
import { IconTile } from './IconTile';
import { CenterPaneProps, CenterPaneHandle } from './types';
import { useCenterPaneLogic } from './useCenterPaneLogic';
import { FONT_ROLES } from '../../../styles/fontManager';
import { getVideoEmbed } from '../../../utils/videoEmbeds';
import { Z_INDEX } from '../../../constants/zIndex';
import { AddLinkDialog } from '../../dialogs/AddLinkDialog';

const CenterPaneComponent = (props: CenterPaneProps, ref: React.Ref<CenterPaneHandle>) => {
  const { onObjectClick, onCanvasEmptyClick } = props;
  const paneRef = useRef<HTMLDivElement | null>(null);

  const logic = useCenterPaneLogic(paneRef);

  // Expose methods to parent via ref
  useImperativeHandle(ref, () => ({
    addFiles: logic.handleAddFiles,
  }), [logic.handleAddFiles]);

  const selectedIcons = useMemo(() => {
    if (!logic.selectedIsland) return [];
    const icons = logic.iconsByIsland[logic.selectedIsland.id] || [];
    return icons.filter((icon) => logic.selectedIconIds.includes(icon.id));
  }, [logic.iconsByIsland, logic.selectedIconIds, logic.selectedIsland]);

  const ghostSize = useMemo(() => {
    const fallback = { width: 128, height: 128 };
    if (!logic.dragGhost) return fallback;
    const isLink = logic.dragGhost.type === 'link';
    return {
      width: isLink ? 360 : fallback.width,
      height: isLink ? 240 : fallback.height,
    };
  }, [logic.dragGhost]);

  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; index: number } | null>(null);

  const menuItems = useMemo(() => [
    {
      label: 'Add local files',
      action: async () => {
        await logic.handleAddFiles();
      }
    },
    {
      label: 'Add link',
      action: () => {
        if (contextMenu && paneRef.current) {
          logic.openAddLinkDialog(contextMenu.x, contextMenu.y);
        }
      }
    },
    {
      label: 'Add Telegram account',
      action: () => {
        window.dispatchEvent(new CustomEvent('centerpane:add-telegram'));
      }
    }
  ], [logic, contextMenu, paneRef]);

  useEffect(() => {
    if (!contextMenu) return;

    const handleKey = (e: KeyboardEvent) => {
      if (!contextMenu) return;
      if (e.key === 'Escape') {
        setContextMenu(null);
        return;
      }
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        const delta = e.key === 'ArrowDown' ? 1 : -1;
        const nextIndex = (contextMenu.index + delta + menuItems.length) % menuItems.length;
        setContextMenu({ ...contextMenu, index: nextIndex });
      }
      if (e.key === 'Enter') {
        e.preventDefault();
        const item = menuItems[contextMenu.index];
        if (item) {
          void Promise.resolve(item.action()).finally(() => setContextMenu(null));
        }
      }
    };

    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [contextMenu, menuItems]);

  const handleCanvasContextMenu = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    if (target.closest('[data-icon-tile]')) return;
    e.preventDefault();
    e.stopPropagation();

    if (!paneRef.current) return;
    const rect = paneRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left + paneRef.current.scrollLeft;
    const y = e.clientY - rect.top + paneRef.current.scrollTop;
    setContextMenu({ x, y, index: 0 });
  };

  return (
    <div className="flex-1 flex flex-col h-full" style={{ background: 'var(--background-dark)' }}>
      {/* Canvas - Freeform icons */}
      <div
        className="flex-1 overflow-y-auto custom-scroll p-6 transition-colors"
        style={{
          background: logic.isDragOver ? 'rgba(76, 175, 80, 0.1)' : 'transparent',
          border: logic.isDragOver ? '2px solid var(--primary-color)' : '2px solid transparent',
          boxShadow: logic.isDragOver ? '0 0 20px var(--shadow)' : 'none',
          position: 'relative',
        }}
        ref={paneRef}
        onDragEnter={logic.handleDragEnter}
        onDragOver={logic.handleDragOver}
        onDragLeave={logic.handleDragLeave}
        onDrop={logic.handleDrop}
        onClick={(e) => logic.handleCanvasClick(e, onCanvasEmptyClick)}
        onContextMenu={handleCanvasContextMenu}
      >
        <div className="relative" style={{ minHeight: `${logic.contentHeight}px` }}>
          {(logic.selectedIsland && logic.iconsByIsland[logic.selectedIsland.id]?.length) ? null : (
            <div style={{ ...FONT_ROLES.paneBodyMuted, color: 'var(--color-text-muted)' }}>Drop integrations or links here. Use the + button to add files.</div>
          )}

          {logic.dragGhost && (
            <div
              style={{
                position: 'absolute',
                left: logic.dragGhost.x,
                top: logic.dragGhost.y,
                transform: 'translate(-50%, -50%)',
                width: `${ghostSize.width}px`,
                height: `${ghostSize.height}px`,
                border: '2px dashed rgba(59,130,246,0.5)',
                borderRadius: '12px',
                background: 'rgba(59,130,246,0.08)',
                boxShadow: '0 8px 18px rgba(59,130,246,0.15)',
                pointerEvents: 'none',
                zIndex: Z_INDEX.CONTENT_DRAGGING,
              }}
            />
          )}

          {contextMenu && (
            <>
              <div
                className="absolute inset-0"
                style={{ zIndex: Z_INDEX.CONTEXT_MENU_BACKDROP }}
                onClick={() => setContextMenu(null)}
                onContextMenu={(e) => {
                  e.preventDefault();
                  setContextMenu(null);
                }}
              />
              <div
                className="absolute w-56 bg-white rounded-lg shadow-xl border border-slate-200 py-1"
                style={{
                  zIndex: Z_INDEX.CONTEXT_MENU,
                  left: contextMenu.x,
                  top: contextMenu.y,
                }}
              >
                {menuItems.map((item, idx) => (
                  <button
                    key={item.label}
                    onClick={() => {
                      void Promise.resolve(item.action()).finally(() => setContextMenu(null));
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
            </>
          )}

          {(logic.iconsByIsland[logic.selectedIsland?.id ?? ''] || []).map((icon) => (
            <IconTile
              key={icon.id}
              id={icon.id}
              type={icon.type}
              title={icon.title}
              x={icon.x}
              y={icon.y}
              url={icon.url}
              description={icon.description}
              faviconUrl={icon.faviconUrl}
              filePath={icon.filePath}
              isSelected={logic.selectedIconIds.includes(icon.id)}
              onClick={(event) => {
                const isToggle = event.metaKey || event.ctrlKey;
                if (isToggle) {
                  const isAlreadySelected = logic.selectedIconIds.includes(icon.id);
                  const next = isAlreadySelected
                    ? logic.selectedIconIds.filter((id) => id !== icon.id)
                    : [...logic.selectedIconIds, icon.id];
                  logic.setSelectedIconIds(next);
                  if (next.length === 1) {
                    const single = icon;
                    onObjectClick?.({
                      url: single.url,
                      title: single.title,
                      tileId: single.id,
                      filePath: single.filePath,
                      type: single.type,
                    });
                  }
                } else {
                  logic.setSelectedIconId(icon.id);
                  onObjectClick?.({
                    url: icon.url,
                    title: icon.title,
                    tileId: icon.id,
                    filePath: icon.filePath,
                    type: icon.type,
                  });
                }
              }}
              onRename={(newTitle) => logic.handleIconRename(icon.id, newTitle)}
              onDelete={() => logic.handleIconDelete(icon.id)}
              onRefreshMetadata={() => logic.handleIconRefreshMetadata(icon.id, icon.url)}
            />
          ))}
        </div>
      </div>

      {/* Inline preview grid for multi-selected links (YouTube/Vimeo embeds) */}
      {selectedIcons.length > 1 && (
        <div
          className="border-t border-slate-200 bg-white/70 backdrop-blur-sm p-4 space-y-4"
          style={{ boxShadow: 'inset 0 1px 0 rgba(0,0,0,0.04)' }}
        >
          <div style={{ ...FONT_ROLES.paneSubtitle, color: 'var(--color-text-muted)' }}>
            Inline previews ({selectedIcons.length})
          </div>
          <div
            className="grid gap-4"
            style={{
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            }}
          >
            {selectedIcons.map((icon) => {
              const embed = getVideoEmbed(icon.url);
              if (!embed) {
                return (
                  <div
                    key={icon.id}
                    className="rounded-xl border border-slate-200 bg-white shadow-sm p-3 flex flex-col gap-2"
                  >
                    <div className="text-sm font-semibold text-slate-800 line-clamp-2">{icon.title}</div>
                    <div className="text-xs text-slate-500">No inline preview available for this link.</div>
                  </div>
                );
              }

              return (
                <div
                  key={icon.id}
                  className="rounded-xl border border-slate-200 bg-white shadow-lg overflow-hidden"
                >
                  <div className="relative w-full" style={{ paddingTop: '56.25%' }}>
                    <iframe
                      src={embed.embedUrl}
                      title={icon.title || 'Preview'}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                      allowFullScreen
                      style={{
                        position: 'absolute',
                        inset: 0,
                        width: '100%',
                        height: '100%',
                        border: 0,
                        background: '#000'
                      }}
                    />
                  </div>
                  <div className="p-3 text-sm font-semibold text-slate-800 line-clamp-2">{icon.title}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Add Link Dialog */}
      <AddLinkDialog
        isOpen={logic.isAddLinkDialogOpen}
        onClose={logic.closeAddLinkDialog}
        onAdd={logic.handleAddLink}
      />
    </div>
  );
};

export const CenterPane = forwardRef(CenterPaneComponent);
CenterPane.displayName = 'CenterPane';

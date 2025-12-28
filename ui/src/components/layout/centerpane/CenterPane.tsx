import React, { useRef, useImperativeHandle, forwardRef, useMemo, useState, useEffect } from 'react';
import { Tile } from './tile/Tile';
import { CenterPaneProps, CenterPaneHandle } from './types';
import { useCenterPaneLogic } from './useCenterPaneLogic';
import { FONT_ROLES } from '../../../styles/fontManager';
import { getVideoEmbed } from '../../../utils/videoEmbeds';
import { Z_INDEX } from '../../../constants/zIndex';
import { AddLinkDialog } from '../../dialogs/AddLinkDialog';
import { AddTextDialog } from '../../dialogs/AddTextDialog';
import { InlineTextEditor } from './InlineTextEditor';
import { useIslandStore } from '../../../stores/islandStore';
import { Loader2 } from 'lucide-react';
import { useArrowDrawing } from './hooks/useArrowDrawing';
import { ARROW_SETTINGS } from './arrowSettings';

// CenterPane renders the freeform canvas of tiles/arrows for the selected island, wiring user input to the composable center-pane logic hooks.
const CenterPaneComponent = (props: CenterPaneProps, ref: React.Ref<CenterPaneHandle>) => {
  const { onObjectClick, onCanvasEmptyClick, showGrid, zoom: zoomProp, onZoomIn, onZoomOut, onOpenQuickAdd } = props;
  const zoom = zoomProp ?? 1;
  const paneRef = useRef<HTMLDivElement | null>(null);
  // Throttle opening text previews so inline edits don't immediately pop the preview pane
  const textPreviewTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const logic = useCenterPaneLogic(paneRef, zoom);
  const isDuplicating = useIslandStore((state) => state.isDuplicating);

  // Expose methods to parent via ref
  useImperativeHandle(ref, () => ({
    addFiles: logic.handleAddFiles,
    getTilesForIsland: (islandId: string) => logic.iconsByIsland[islandId] || [],
  }), [logic.handleAddFiles, logic.iconsByIsland]);

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

  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; index: number; canvasX: number; canvasY: number } | null>(null);
  const [arrowContextMenu, setArrowContextMenu] = useState<{ x: number; y: number; arrowId: string } | null>(null);
  useEffect(() => {
    const handleKeyZoom = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      const target = e.target as HTMLElement;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) return;

      if (e.key === '+' || e.key === '=') {
        e.preventDefault();
        onZoomIn?.();
      } else if (e.key === '-' || e.key === '_') {
        e.preventDefault();
        onZoomOut?.();
      }
    };

    window.addEventListener('keydown', handleKeyZoom, true);
    return () => window.removeEventListener('keydown', handleKeyZoom, true);
  }, [onZoomIn, onZoomOut]);

  const toCanvasCoords = (clientX: number, clientY: number) => {
    if (!paneRef.current) return { x: clientX, y: clientY };
    const rect = paneRef.current.getBoundingClientRect();
    const scrollLeft = paneRef.current.scrollLeft;
    const scrollTop = paneRef.current.scrollTop;
    return {
      x: (clientX - rect.left + scrollLeft) / Math.max(zoom, 0.01),
      y: (clientY - rect.top + scrollTop) / Math.max(zoom, 0.01),
    };
  };

  const toPaneCoords = (clientX: number, clientY: number) => {
    if (!paneRef.current) return { x: clientX, y: clientY };
    const rect = paneRef.current.getBoundingClientRect();
    const scrollLeft = paneRef.current.scrollLeft;
    const scrollTop = paneRef.current.scrollTop;
    return {
      x: clientX - rect.left + scrollLeft,
      y: clientY - rect.top + scrollTop,
    };
  };

  const {
    selectedArrowId,
    setSelectedArrowId,
    deleteArrow,
    clearArrowSelection,
    handleCanvasMouseDown,
    handleCanvasMouseMove,
    handleCanvasMouseUp,
    handleArrowPointerDown,
    allArrowSegments,
    svgWidth,
    svgHeight,
    contentHeightWithArrows,
  } = useArrowDrawing({
    zoom,
    paneRef,
    selectedIslandId: logic.selectedIsland?.id,
    arrowsByIsland: logic.arrowsByIsland,
    setArrowsByIsland: logic.setArrowsByIsland,
    contentHeight: logic.contentHeight,
    toCanvasCoords,
    contextMenuOpen: !!contextMenu || !!arrowContextMenu,
    isTargetBlocked: (el) => Boolean(el.closest('[data-icon-tile]') || el.closest('[data-inline-editor]')),
  });

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
          logic.openAddLinkDialog(contextMenu.canvasX, contextMenu.canvasY);
        }
      }
    },
  ], [logic, contextMenu, paneRef]);

  useEffect(() => {
    if (!arrowContextMenu) return;

    const handleArrowMenuKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setArrowContextMenu(null);
      }
    };

    window.addEventListener('keydown', handleArrowMenuKey, true);
    return () => window.removeEventListener('keydown', handleArrowMenuKey, true);
  }, [arrowContextMenu]);

  useEffect(() => {
    setArrowContextMenu(null);
  }, [logic.selectedIsland?.id]);

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

  const handleArrowContextMenu = (e: React.MouseEvent<SVGLineElement>, arrowId: string) => {
    e.preventDefault();
    e.stopPropagation();
    // Right-click on arrow opens a focused delete-only context menu
    const pos = toPaneCoords(e.clientX, e.clientY);
    setArrowContextMenu({ ...pos, arrowId });
    setSelectedArrowId(arrowId);
    setContextMenu(null);
    logic.setSelectedIconIds([]);
  };

  const handleCanvasContextMenu = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    if (target.closest('[data-icon-tile]')) return;
    e.preventDefault();
    e.stopPropagation();
    setContextMenu(null);
    setArrowContextMenu(null);
    onOpenQuickAdd?.();
  };

  const handleCanvasDoubleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    if (target.closest('[data-icon-tile]')) return;

    e.preventDefault();
    e.stopPropagation();

    if (!paneRef.current) return;

    // Calculate position and apply offset to align cursor with caret
    const base = toCanvasCoords(e.clientX, e.clientY);
    const x = base.x - 26 / Math.max(zoom, 0.01);
    const y = base.y - 34 / Math.max(zoom, 0.01);

    logic.openInlineEditor(x, y);
  };

  const clearTextPreviewTimeout = () => {
    if (textPreviewTimeoutRef.current) {
      clearTimeout(textPreviewTimeoutRef.current);
      textPreviewTimeoutRef.current = null;
    }
  };

  const openPreviewForIcon = (icon: { url?: string; title?: string; id: string; filePath?: string; type?: string; content?: string; }) => {
    onObjectClick?.({
      url: icon.url,
      title: icon.title,
      tileId: icon.id,
      filePath: icon.filePath,
      type: icon.type,
      content: icon.content,
    });
  };

  const schedulePreviewForText = (icon: { url?: string; title?: string; id: string; filePath?: string; type?: string; content?: string; }) => {
    clearTextPreviewTimeout();
    textPreviewTimeoutRef.current = setTimeout(() => {
      // Skip opening preview if inline editor already active for this note
      if (logic.inlineEditorState.isActive && logic.inlineEditorState.editingId === icon.id) return;
      openPreviewForIcon(icon);
    }, 180);
  };

  useEffect(() => {
    return () => clearTextPreviewTimeout();
  }, []);

  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    if (!e.ctrlKey) return;
    e.preventDefault();
    if (e.deltaY < 0) {
      onZoomIn?.();
    } else if (e.deltaY > 0) {
      onZoomOut?.();
    }
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
        onClick={(e) => {
          setArrowContextMenu(null);
          clearArrowSelection();
          logic.handleCanvasClick(e, onCanvasEmptyClick);
        }}
        onContextMenu={handleCanvasContextMenu}
        onDoubleClick={handleCanvasDoubleClick}
        onWheel={handleWheel}
        onMouseDown={handleCanvasMouseDown}
        onMouseMove={handleCanvasMouseMove}
        onMouseUp={handleCanvasMouseUp}
      >
        {/* Loading Spinner Overlay */}
        {isDuplicating && (
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(107, 107, 107, 0.5)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: Z_INDEX.OVERLAY_DIALOG,
              backdropFilter: 'blur(4px)',
            }}
          >
            <Loader2 size={48} className="animate-spin" style={{ color: 'var(--primary-color)' }} />
            <div
              style={{
                ...FONT_ROLES.paneTitle,
                color: 'white',
                marginTop: '16px',
                textAlign: 'center',
              }}
            >
              Please wait until all elements get loaded
            </div>
          </div>
        )}
        <div className="relative" style={{ minHeight: `${contentHeightWithArrows}px` }}>
          <div
            className="relative"
            style={{
              transform: `scale(${zoom})`,
              transformOrigin: 'top left',
              width: `${100 / Math.max(zoom, 0.01)}%`,
              minHeight: `${contentHeightWithArrows / Math.max(zoom, 0.01)}px`,
            }}
          >
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

            {(allArrowSegments.length > 0) && (
              <svg
                aria-hidden
                width={svgWidth}
                height={svgHeight}
                viewBox={`0 0 ${svgWidth} ${svgHeight}`}
                style={{
                  position: 'absolute',
                  inset: 0,
                  pointerEvents: 'auto',
                  overflow: 'visible',
                  zIndex: Z_INDEX.CONTENT_DEFAULT - 1,
                }}
              >
                <defs>
                  <marker
                    id={ARROW_SETTINGS.marker.id}
                    markerWidth={ARROW_SETTINGS.marker.width}
                    markerHeight={ARROW_SETTINGS.marker.height}
                    refX={ARROW_SETTINGS.marker.refX}
                    refY={ARROW_SETTINGS.marker.refY}
                    orient="auto"
                    markerUnits="userSpaceOnUse"
                  >
                    <path d={ARROW_SETTINGS.marker.path} fill={ARROW_SETTINGS.color} />
                  </marker>
                </defs>
                {allArrowSegments.map((segment) => {
                  const isDraft = segment.id === 'arrow-draft';
                  const clickableWidth = ARROW_SETTINGS.strokeWidth + (ARROW_SETTINGS.clickAreaPadding * 2);
                  return (
                    <g key={segment.id}>
                      {/* Invisible wider line for click area */}
                      <line
                        x1={segment.start.x}
                        y1={segment.start.y}
                        x2={segment.end.x}
                        y2={segment.end.y}
                        stroke="transparent"
                        strokeWidth={clickableWidth}
                        strokeLinecap="round"
                        style={{ cursor: 'pointer', pointerEvents: 'stroke' as any }}
                        onPointerDown={(e) => {
                          // Kick off arrow drag/move handling and clear tile selection
                          handleArrowPointerDown(segment, e);
                          logic.setSelectedIconIds([]);
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                        }}
                        onContextMenu={(e) => handleArrowContextMenu(e, segment.id)}
                      />
                      {/* Visible arrow line */}
                      <line
                        x1={segment.start.x}
                        y1={segment.start.y}
                        x2={segment.end.x}
                        y2={segment.end.y}
                        stroke={ARROW_SETTINGS.color}
                        strokeOpacity={isDraft ? ARROW_SETTINGS.opacity.draft : ARROW_SETTINGS.opacity.normal}
                        strokeWidth={ARROW_SETTINGS.strokeWidth}
                        strokeLinecap="round"
                        markerEnd={`url(#${ARROW_SETTINGS.marker.id})`}
                        style={{ pointerEvents: 'none' }}
                      />
                    </g>
                  );
                })}
              </svg>
            )}

            {showGrid && (
              <div
                aria-hidden
                className="absolute inset-0 pointer-events-none"
                style={{
                  zIndex: Z_INDEX.BASE,
                  backgroundImage: `
                    linear-gradient(to right, rgba(126,136,151,0.18) 1px, transparent 1px),
                    linear-gradient(to bottom, rgba(126,136,151,0.18) 1px, transparent 1px)
                  `,
                  backgroundSize: '32px 32px',
                  mixBlendMode: 'normal',
                }}
              />
            )}

            {/* Inline Text Editor */}
            {logic.inlineEditorState.isActive && (
              <InlineTextEditor
                x={logic.inlineEditorState.x}
                y={logic.inlineEditorState.y}
                content={logic.inlineEditorState.content}
                onContentChange={logic.updateInlineContent}
                onSave={logic.saveInlineNote}
                onCancel={logic.cancelInlineEdit}
              />
            )}

            {(logic.iconsByIsland[logic.selectedIsland?.id ?? ''] || []).map((icon) => (
              logic.inlineEditorState.isActive && logic.inlineEditorState.editingId === icon.id ? null : (
                <Tile
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
                  content={icon.content}
                  isSelected={logic.selectedIconIds.includes(icon.id)}
                  onClick={(event) => {
                    clearTextPreviewTimeout();
                    const isToggle = event.metaKey || event.ctrlKey;
                    if (isToggle) {
                      const isAlreadySelected = logic.selectedIconIds.includes(icon.id);
                      const next = isAlreadySelected
                        ? logic.selectedIconIds.filter((id) => id !== icon.id)
                        : [...logic.selectedIconIds, icon.id];
                      logic.setSelectedIconIds(next);
                      if (next.length === 1) {
                        const single = icon;
                        if (single.type === 'text') {
                          schedulePreviewForText(single);
                        } else {
                          openPreviewForIcon(single);
                        }
                      }
                    } else {
                      logic.setSelectedIconId(icon.id);
                      if (icon.type === 'text') {
                        schedulePreviewForText(icon);
                      } else {
                        openPreviewForIcon(icon);
                      }
                    }
                  }}
                  onRename={(newTitle) => logic.handleIconRename(icon.id, newTitle)}
                  onDelete={() => logic.handleIconDelete(icon.id)}
                  onRefreshMetadata={() => logic.handleIconRefreshMetadata(icon.id, icon.url)}
                  onEdit={(x, y, content, id) => {
                    clearTextPreviewTimeout();
                    logic.openInlineEditor(x, y, content, id);
                  }}
                />
              )
            ))}
          </div>

          {arrowContextMenu && (
            <>
              <div
                className="absolute inset-0"
                style={{ zIndex: Z_INDEX.CONTEXT_MENU_BACKDROP }}
                onClick={() => setArrowContextMenu(null)}
                onContextMenu={(e) => {
                  e.preventDefault();
                  setArrowContextMenu(null);
                }}
              />
              <div
                className="absolute w-40 bg-white rounded-lg shadow-xl border border-slate-200 py-1"
                style={{
                  zIndex: Z_INDEX.CONTEXT_MENU,
                  left: arrowContextMenu.x,
                  top: arrowContextMenu.y,
                }}
              >
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteArrow(arrowContextMenu.arrowId);
                    setArrowContextMenu(null);
                  }}
                  className="w-full px-3.5 py-2 text-left text-sm flex items-center gap-2 text-red-600 hover:bg-red-50"
                  style={FONT_ROLES.topbarControl}
                >
                  Delete
                </button>
              </div>
            </>
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

      {/* Add Text Dialog */}
      <AddTextDialog
        isOpen={logic.isAddTextDialogOpen}
        onClose={logic.closeAddTextDialog}
        onAdd={logic.handleAddText}
      />
    </div>
  );
};

export const CenterPane = forwardRef(CenterPaneComponent);
CenterPane.displayName = 'CenterPane';

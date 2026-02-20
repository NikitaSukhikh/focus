import React, { useRef, forwardRef, useMemo, useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { objectsApi } from '@/api/objects';
import { undoApi } from '@/api/undo';
import { ArrowContextMenuPortal, ArrowSvgLayer, useArrowRouting, usePersistReanchoredArrows } from '@/components/layout/centerpane/arrows';
import type { ArrowContextMenuState, TileMetricsSnapshot } from '@/components/layout/centerpane/arrows';
import { CanvasContextMenuPortal } from '@/components/layout/centerpane/CanvasContextMenuPortal';
import { Tile } from '@/components/layout/centerpane/tile/Tile';
import { CenterPaneProps, CenterPaneHandle, DroppedIcon } from '@/components/layout/centerpane/types';
import { InlinePreviewsPanel } from '@/components/layout/centerpane/InlinePreviewsPanel';
import { useCanvasContextMenu } from '@/components/layout/centerpane/hooks/useCanvasContextMenu';
import type { CanvasMenuItem } from '@/components/layout/centerpane/hooks/useCanvasContextMenu';
import { useCenterPaneHandle } from '@/components/layout/centerpane/hooks/useCenterPaneHandle';
import { useCenterPanePreview } from '@/components/layout/centerpane/hooks/useCenterPanePreview';
import { useCenterPaneViewport } from '@/components/layout/centerpane/hooks/useCenterPaneViewport';
import { useCenterPaneLogic } from '@/components/layout/centerpane/useCenterPaneLogic';
import { FONT_ROLES } from '@/styles/fontManager';
import { Z_INDEX } from '@/constants/zIndex';
import { AddLinkDialog } from '@/components/dialogs/AddLinkDialog';
import { AddTextDialog } from '@/components/dialogs/AddTextDialog';
import { AddWebArticleDialog } from '@/components/dialogs/AddWebArticleDialog';
import { InlineTextEditor } from '@/components/layout/centerpane/InlineTextEditor';
import { useSpaceStore } from '@/stores/spaceStore';
import { Loader2 } from 'lucide-react';
import { useArrowDrawing } from '@/components/layout/centerpane/hooks/useArrowDrawing';
import { useSearchFilter } from '@/components/layout/centerpane/hooks/useSearchFilter';
import { useSearchStore } from '@/stores/searchStore';
import { SHORTCUT_HINT_TEXT } from '@/constants/shortcutHints';
import { TILE_RING_COLORS } from '@/styles/tileStyles';
import { useThemeToggle } from '@/hooks/useThemeToggle';
import { DEFAULT_TILE_SIZES } from '@/constants/objectsDimensions';

const TILE_CLICK_SUPPRESS_AFTER_RESIZE_MS = 250;
const TILE_PREVIEW_SKIP_AFTER_DOUBLE_CLICK_MS = 400;
type TileRingType = keyof typeof TILE_RING_COLORS;
const LINK_LIKE_TYPES = new Set<DroppedIcon['type']>(['link', 'web_article', 'gmail', 'google_drive']);

const toTileRingType = (iconType: DroppedIcon['type']): TileRingType => {
  if (iconType === 'text') return 'text';
  if (LINK_LIKE_TYPES.has(iconType)) return 'link';
  return 'file';
};

// CenterPane renders the freeform canvas of tiles/arrows for the selected space, wiring user input to the composable center-pane logic hooks.
const CenterPaneComponent = (props: CenterPaneProps, ref: React.Ref<CenterPaneHandle>) => {
  const { onObjectClick, onSuppressPreview, onCanvasEmptyClick, showGrid, zoom: zoomProp, onZoomIn, onZoomOut, onOpenQuickAdd } = props;
  const { t } = useTranslation();
  const zoom = zoomProp ?? 1;
  const {
    paneRef,
    getCenterCanvasPos,
    getCanvasPosFromClient,
    toCanvasCoords,
    handleWheel,
  } = useCenterPaneViewport({
    zoom,
    onZoomIn,
    onZoomOut,
  });

  const logic = useCenterPaneLogic(paneRef, zoom);
  const selectedSpaceId = logic.selectedSpace?.id;
  const arrowsBySpace = logic.arrowsBySpace;
  const setArrowsBySpace = logic.setArrowsBySpace;
  const setIconsBySpace = logic.setIconsBySpace;
  const isDuplicating = useSpaceStore((state) => state.isDuplicating);
  const searchQuery = useSearchStore((state) => state.searchQuery);
  const isSearchMode = searchQuery.trim().length > 0;
  const { isDark } = useThemeToggle();
  const currentSpaceIcons = useMemo(
    () => logic.iconsBySpace[logic.selectedSpace?.id ?? ''] || [],
    [logic.iconsBySpace, logic.selectedSpace?.id]
  );
  const filteredIcons = useSearchFilter(currentSpaceIcons);
  const [tileMetricsById, setTileMetricsById] = useState<Record<string, TileMetricsSnapshot>>({});
  const iconsById = useMemo(
    () => new Map(currentSpaceIcons.map((icon) => [icon.id, icon])),
    [currentSpaceIcons]
  );

  const getArrowColorForTile = useCallback((tileId?: string | null): string | null => {
    if (!tileId) return null;
    const icon = iconsById.get(tileId);
    if (!icon) return null;
    return TILE_RING_COLORS[toTileRingType(icon.type)];
  }, [iconsById]);

  useCenterPaneHandle({
    ref,
    iconsBySpace: logic.iconsBySpace,
    getCenterCanvasPos,
    getCanvasPosFromClient,
    addFilesAtPosition: logic.handleAddFiles,
    openAddLinkDialogAtPosition: (position) => {
      logic.openAddLinkDialog(position.x, position.y);
    },
    openAddWebArticleDialogAtPosition: (position) => {
      logic.openAddWebArticleDialog(position.x, position.y);
    },
    pasteFromClipboardAtPosition: logic.pasteFromClipboard,
  });

  const selectedIcons = useMemo(() => {
    return filteredIcons.filter((icon) => logic.selectedIconIds.includes(icon.id));
  }, [filteredIcons, logic.selectedIconIds]);
  const isEmptyState = !(logic.selectedSpace && (logic.iconsBySpace[logic.selectedSpace.id]?.length ?? 0) > 0);

  const ghostSize = useMemo(() => {
    const fallback = DEFAULT_TILE_SIZES.file;
    if (!logic.dragGhost) return fallback;
    const isLink = logic.dragGhost.type === 'link';
    return {
      width: isLink ? DEFAULT_TILE_SIZES.linkGhost.width : fallback.width,
      height: isLink ? DEFAULT_TILE_SIZES.linkGhost.height : fallback.height,
    };
  }, [logic.dragGhost]);

  const suppressTileClickUntilRef = useRef(0);
  const suppressTilePreviewUntilRef = useRef<{ tileId: string; untilTs: number } | null>(null);
  const [arrowContextMenu, setArrowContextMenu] = useState<ArrowContextMenuState | null>(null);

  const menuItems = useMemo<CanvasMenuItem[]>(() => [
    {
      label: 'Add local files',
      action: async () => {
        await logic.handleAddFiles();
      },
    },
    {
      label: 'Add link',
      action: (menuState) => {
        if (!paneRef.current) return;
        logic.openAddLinkDialog(menuState.canvasX, menuState.canvasY);
      },
    },
  ], [logic, paneRef]);

  const {
    contextMenu,
    setContextMenu,
    canvasMenuRef,
    canvasMenuPosition,
  } = useCanvasContextMenu(menuItems);

  const {
    selectedArrowId,
    setSelectedArrowId,
    deleteArrow,
    clearArrowSelection,
    handleFocusRingPointerDown,
    handleArrowPointerDown,
    handleArrowEndpointPointerDown,
    allArrowSegments,
    svgWidth,
    svgHeight,
    contentHeightWithArrows,
    isDrawingArrow,
    draggingEndpoint,
    draftTargetTileId,
  } = useArrowDrawing({
    zoom,
    paneRef,
    selectedSpaceId,
    arrowsBySpace,
    setArrowsBySpace,
    contentHeight: logic.contentHeight,
    toCanvasCoords,
    contextMenuOpen: !!contextMenu || !!arrowContextMenu,
  });

  const handleTileMetricsChange = useCallback((tileId: string, metrics: TileMetricsSnapshot) => {
    setTileMetricsById((prev) => {
      const existing = prev[tileId];
      if (
        existing &&
        existing.width === metrics.width &&
        existing.height === metrics.height &&
        existing.contentInset === metrics.contentInset &&
        existing.ringOutlineOffset === metrics.ringOutlineOffset &&
        existing.isCentered === metrics.isCentered
      ) {
        return prev;
      }
      return { ...prev, [tileId]: metrics };
    });
  }, []);

  const handleTileSizeChange = useCallback((tileId: string, newX: number, newY: number, newWidth: number, newHeight: number) => {
    if (!selectedSpaceId) return;
    const existing = iconsById.get(tileId);
    if (!existing) return;
    if (
      existing.x === newX
      && existing.y === newY
      && existing.width === newWidth
      && existing.height === newHeight
    ) {
      return;
    }

    setIconsBySpace((prev) => ({
      ...prev,
      [selectedSpaceId]: (prev[selectedSpaceId] || []).map((icon) =>
        icon.id === tileId ? { ...icon, x: newX, y: newY, width: newWidth, height: newHeight } : icon
      ),
    }));

    undoApi
      .createEvent(selectedSpaceId, {
        event_type: 'tile_move',
        event_data: {
          tile: {
            id: existing.id,
            type: existing.type,
            title: existing.title,
            x: newX,
            y: newY,
            width: newWidth,
            height: newHeight,
            url: existing.url,
            description: existing.description,
            faviconUrl: existing.faviconUrl,
            filePath: existing.filePath,
            serviceKey: existing.serviceKey,
            service: existing.service,
            content: existing.content,
          },
          from: {
            x: existing.x,
            y: existing.y,
            width: existing.width ?? null,
            height: existing.height ?? null,
          },
          to: {
            x: newX,
            y: newY,
            width: newWidth,
            height: newHeight,
          },
        },
      })
      .catch((err) => {
        console.error('[Tile] Failed to create resize undo event:', err);
      });

    objectsApi.updateSize(tileId, newX, newY, newWidth, newHeight).catch((err) => {
      console.error('[Tile] Failed to persist resize:', err);
    });
  }, [iconsById, selectedSpaceId, setIconsBySpace]);

  useEffect(() => {
    const validIds = new Set(currentSpaceIcons.map((icon) => icon.id));
    setTileMetricsById((prev) => {
      let changed = false;
      const next: Record<string, TileMetricsSnapshot> = {};
      Object.entries(prev).forEach(([tileId, metrics]) => {
        if (!validIds.has(tileId)) {
          changed = true;
          return;
        }
        next[tileId] = metrics;
      });
      return changed ? next : prev;
    });
  }, [currentSpaceIcons]);

  const { arrowTileObstacles, renderArrowSegments } = useArrowRouting({
    iconsById,
    currentSpaceIcons,
    tileMetricsById,
    allArrowSegments,
  });

  usePersistReanchoredArrows({
    selectedSpaceId,
    dragGhostActive: Boolean(logic.dragGhost),
    isDrawingArrow,
    draggingEndpoint,
    allArrowSegments,
    renderArrowSegments,
    setArrowsBySpace,
  });

  const {
    clearPreviewTimeout,
    queuePreviewForIcon,
    handleTileResizeInteractionStart,
    handleTileResizeInteractionEnd,
  } = useCenterPanePreview({
    onObjectClick,
    inlineEditorState: logic.inlineEditorState,
    suppressTileClickUntilRef,
    tileClickSuppressAfterResizeMs: TILE_CLICK_SUPPRESS_AFTER_RESIZE_MS,
    previewDelayMs: 300,
  });

  useEffect(() => {
    setArrowContextMenu(null);
  }, [logic.selectedSpace?.id]);

  useEffect(() => {
    if (!isSearchMode) return;
    setArrowContextMenu(null);
    clearArrowSelection();
  }, [clearArrowSelection, isSearchMode]);

  const handleArrowContextMenu = (e: React.MouseEvent<SVGPathElement>, arrowId: string) => {
    e.preventDefault();
    e.stopPropagation();
    // Right-click on arrow opens a focused delete-only context menu
    setArrowContextMenu({ x: e.clientX, y: e.clientY, arrowId });
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
    onOpenQuickAdd?.({ x: e.clientX, y: e.clientY });
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
        data-center-pane-scroll
        ref={paneRef}
        onDragEnter={logic.handleDragEnter}
        onDragEnterCapture={logic.handleDragEnter}
        onDragOver={logic.handleDragOver}
        onDragOverCapture={logic.handleDragOver}
        onDragLeave={logic.handleDragLeave}
        onDragLeaveCapture={logic.handleDragLeave}
        onDrop={logic.handleDrop}
        onClick={(e) => {
          setArrowContextMenu(null);
          clearArrowSelection();
          logic.handleCanvasClick(e, onCanvasEmptyClick);
        }}
        onContextMenu={handleCanvasContextMenu}
        onDoubleClick={handleCanvasDoubleClick}
        onWheel={handleWheel}
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

            {(!isSearchMode && renderArrowSegments.length > 0) && (
              <ArrowSvgLayer
                segments={renderArrowSegments}
                svgWidth={svgWidth}
                svgHeight={svgHeight}
                isDrawingArrow={isDrawingArrow}
                selectedArrowId={selectedArrowId}
                draggingEndpoint={draggingEndpoint}
                isDark={isDark}
                arrowTileObstacles={arrowTileObstacles}
                getArrowColorForTile={getArrowColorForTile}
                onArrowPointerDown={handleArrowPointerDown}
                onArrowEndpointPointerDown={handleArrowEndpointPointerDown}
                onArrowContextMenu={handleArrowContextMenu}
                onClearTileSelection={() => logic.setSelectedIconIds([])}
              />
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

            {filteredIcons.map((icon) => (
              logic.inlineEditorState.isActive && logic.inlineEditorState.editingId === icon.id ? null : (
                <Tile
                  key={icon.renderKey ?? icon.id}
                  id={icon.id}
                  type={icon.type}
                  title={icon.title}
                  x={icon.x}
                  y={icon.y}
                  width={icon.width}
                  height={icon.height}
                  zoom={zoom}
                  url={icon.url}
                  description={icon.description}
                  channelName={icon.channelName}
                  faviconUrl={icon.faviconUrl}
                  filePath={icon.filePath}
                  content={icon.content}
                  isSelected={logic.selectedIconIds.includes(icon.id)}
                  onClick={(event) => {
                    if (performance.now() < suppressTileClickUntilRef.current) {
                      event.preventDefault();
                      event.stopPropagation();
                      return;
                    }
                    const suppressedPreview = suppressTilePreviewUntilRef.current;
                    if (suppressedPreview && suppressedPreview.tileId === icon.id) {
                      if (performance.now() <= suppressedPreview.untilTs) {
                        return;
                      }
                      suppressTilePreviewUntilRef.current = null;
                    }
                    clearPreviewTimeout();
                    if (icon.type === 'web_article') return;
                    const isToggle = event.metaKey || event.ctrlKey;
                    if (isToggle) {
                      const isAlreadySelected = logic.selectedIconIds.includes(icon.id);
                      const next = isAlreadySelected
                        ? logic.selectedIconIds.filter((id) => id !== icon.id)
                        : [...logic.selectedIconIds, icon.id];
                      logic.setSelectedIconIds(next);
                      if (next.length === 1) {
                        queuePreviewForIcon(icon);
                      }
                    } else {
                      logic.setSelectedIconId(icon.id);
                      queuePreviewForIcon(icon);
                    }
                  }}
                  onDoubleClick={() => {
                    clearPreviewTimeout();
                    suppressTilePreviewUntilRef.current = {
                      tileId: icon.id,
                      untilTs: performance.now() + TILE_PREVIEW_SKIP_AFTER_DOUBLE_CLICK_MS,
                    };
                    onSuppressPreview?.();
                  }}
                  onDelete={() => logic.handleIconDelete(icon.id)}
                  onRefreshMetadata={() => logic.handleIconRefreshMetadata(icon.id, icon.url)}
                  onEditLink={
                    icon.type === 'link'
                      ? () => logic.openLinkEditDialog(icon)
                      : icon.type === 'web_article'
                        ? () => logic.openWebArticleEditDialog(icon)
                        : undefined
                  }
                  onEdit={(x, y, content, id) => {
                    clearPreviewTimeout();
                    logic.openInlineEditor(x, y, content, id);
                  }}
                  onSizeChange={handleTileSizeChange}
                  onResizeInteractionStart={handleTileResizeInteractionStart}
                  onResizeInteractionEnd={handleTileResizeInteractionEnd}
                  onFocusRingPointerDown={handleFocusRingPointerDown}
                  suppressFocusRingGhostArrow={isDrawingArrow && draftTargetTileId === icon.id}
                  onMetricsChange={handleTileMetricsChange}
                />
              )
            ))}
          </div>

          <ArrowContextMenuPortal
            menu={arrowContextMenu}
            onClose={() => setArrowContextMenu(null)}
            onDelete={deleteArrow}
          />

          <CanvasContextMenuPortal
            contextMenu={contextMenu}
            canvasMenuPosition={canvasMenuPosition}
            canvasMenuRef={canvasMenuRef}
            menuItems={menuItems}
            onClose={() => setContextMenu(null)}
          />
        </div>

        {isEmptyState && (
          <div
            className="absolute inset-0 pointer-events-none flex items-center justify-center px-4"
            style={{ zIndex: Z_INDEX.CONTENT_PREVIEW_EMPTY }}
          >
            <div
              style={{
                ...FONT_ROLES.paneBodyMuted,
                color: 'var(--color-text-muted)',
                textAlign: 'left',
                whiteSpace: 'pre-line',
                fontSize: '18px',
                lineHeight: '38px',
              }}
            >
              {SHORTCUT_HINT_TEXT}
            </div>
          </div>
        )}
      </div>

      <InlinePreviewsPanel selectedIcons={selectedIcons} />

      {/* Add Link Dialog */}
      <AddLinkDialog
        isOpen={logic.isAddLinkDialogOpen}
        onClose={logic.closeAddLinkDialog}
        onAdd={logic.handleAddLink}
        submitLabel={logic.editingLink ? t('common.save') : t('addLinkDialog.title')}
        initialValues={logic.editingLink ? {
          id: logic.editingLink.id,
          url: logic.editingLink.url,
          defaultTitle: logic.editingLink.defaultTitle,
          defaultDescription: logic.editingLink.defaultDescription,
          customTitle: logic.editingLink.customTitle,
          customDescription: logic.editingLink.customDescription,
        } : undefined}
      />

      {/* Add Text Dialog */}
      <AddTextDialog
        isOpen={logic.isAddTextDialogOpen}
        onClose={logic.closeAddTextDialog}
        onAdd={logic.handleAddText}
      />

      {/* Add Web Article Dialog */}
      <AddWebArticleDialog
        isOpen={logic.isAddWebArticleDialogOpen}
        onClose={logic.closeAddWebArticleDialog}
        onAdd={logic.handleAddWebArticle}
        submitLabel={logic.editingArticle ? t('common.save') : t('addWebArticleDialog.title')}
        initialValues={logic.editingArticle ? {
          id: logic.editingArticle.id,
          url: logic.editingArticle.url,
          title: logic.editingArticle.title,
        } : undefined}
      />
    </div>
  );
};

export const CenterPane = forwardRef(CenterPaneComponent);
CenterPane.displayName = 'CenterPane';

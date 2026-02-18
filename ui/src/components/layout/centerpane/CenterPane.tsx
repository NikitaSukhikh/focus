import React, { useRef, useImperativeHandle, forwardRef, useMemo, useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Tile } from '@/components/layout/centerpane/tile/Tile';
import { ArrowSegment, CenterPaneProps, CenterPaneHandle, DroppedIcon } from '@/components/layout/centerpane/types';
import { useCenterPaneLogic } from '@/components/layout/centerpane/useCenterPaneLogic';
import { FONT_ROLES } from '@/styles/fontManager';
import { getVideoEmbed } from '@/utils/videoEmbeds';
import { detectFileType, isHtmlCodeFile } from '@/utils/fileTypes';
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
import { ARROW_SETTINGS } from '@/styles/arrowSettings';
import { SHORTCUT_HINT_TEXT } from '@/constants/shortcutHints';
import { buildArrowPath } from '@/components/layout/centerpane/arrowGeometry';
import { TILE_RING } from '@/constants/objectsDimensions';
import { TILE_RING_COLORS } from '@/styles/tileStyles';
import { useThemeToggle } from '@/hooks/useThemeToggle';

interface TileMetricsSnapshot {
  width: number;
  height: number;
  contentInset: number;
  isCentered: boolean;
}

const FOCUS_RING_DOTS_PER_EDGE = 3;
const ARROW_ENDPOINT_DOT_OPACITY = 0;
type TileRingType = keyof typeof TILE_RING_COLORS;
const LINK_LIKE_TYPES = new Set<DroppedIcon['type']>(['link', 'web_article', 'gmail', 'google_drive']);
const sanitizeSvgId = (value: string) => value.replace(/[^a-zA-Z0-9_-]/g, '-');

const toTileRingType = (iconType: DroppedIcon['type']): TileRingType => {
  if (iconType === 'text') return 'text';
  if (LINK_LIKE_TYPES.has(iconType)) return 'link';
  return 'file';
};

// CenterPane renders the freeform canvas of tiles/arrows for the selected space, wiring user input to the composable center-pane logic hooks.
const CenterPaneComponent = (props: CenterPaneProps, ref: React.Ref<CenterPaneHandle>) => {
  const { onObjectClick, onCanvasEmptyClick, showGrid, zoom: zoomProp, onZoomIn, onZoomOut, onOpenQuickAdd } = props;
  const { t } = useTranslation();
  const zoom = zoomProp ?? 1;
  const paneRef = useRef<HTMLDivElement | null>(null);
  const previewTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const FILE_PREVIEW_DELAY_MS = 300;
  const TEXT_PREVIEW_DELAY_MS = 180;
  const PLAIN_TEXT_FILE_PREVIEW_ENABLED = false;

  const logic = useCenterPaneLogic(paneRef, zoom);
  const selectedSpaceId = logic.selectedSpace?.id;
  const arrowsBySpace = logic.arrowsBySpace;
  const setArrowsBySpace = logic.setArrowsBySpace;
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

  // Expose methods to parent via ref
  const getCenterCanvasPos = () => {
    if (!paneRef.current) return { x: 200, y: 200 };
    const rect = paneRef.current.getBoundingClientRect();
    const scrollLeft = paneRef.current.scrollLeft;
    const scrollTop = paneRef.current.scrollTop;
    return {
      x: (rect.width / 2 + scrollLeft) / Math.max(zoom, 0.01),
      y: (rect.height / 2 + scrollTop) / Math.max(zoom, 0.01),
    };
  };

  useImperativeHandle(ref, () => ({
    addFiles: logic.handleAddFiles,
    getTilesForSpace: (spaceId: string) => logic.iconsBySpace[spaceId] || [],
    openAddLinkDialog: () => {
      const { x, y } = getCenterCanvasPos();
      logic.openAddLinkDialog(x, y);
    },
    openAddWebArticleDialog: () => {
      const { x, y } = getCenterCanvasPos();
      logic.openAddWebArticleDialog(x, y);
    },
    pasteFromClipboard: logic.pasteFromClipboard,
  // eslint-disable-next-line react-hooks/exhaustive-deps -- individual logic.* properties tracked; logic object reference is not meaningful
  }), [
    getCenterCanvasPos,
    logic.handleAddFiles,
    logic.iconsBySpace,
    logic.openAddLinkDialog,
    logic.openAddWebArticleDialog,
    logic.pasteFromClipboard,
    zoom,
  ]);

  const selectedIcons = useMemo(() => {
    return filteredIcons.filter((icon) => logic.selectedIconIds.includes(icon.id));
  }, [filteredIcons, logic.selectedIconIds]);
  const INLINE_PREVIEW_LIMIT = 6;
  const inlinePreviewIcons = useMemo(
    () => selectedIcons.slice(0, INLINE_PREVIEW_LIMIT),
    [selectedIcons]
  );
  const hiddenInlinePreviewCount = Math.max(0, selectedIcons.length - inlinePreviewIcons.length);
  const isEmptyState = !(logic.selectedSpace && (logic.iconsBySpace[logic.selectedSpace.id]?.length ?? 0) > 0);

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

  const toCanvasCoords = useCallback((clientX: number, clientY: number) => {
    const safeZoom = Math.max(zoom, 0.01);
    if (!paneRef.current) return { x: clientX / safeZoom, y: clientY / safeZoom };
    const rect = paneRef.current.getBoundingClientRect();
    const scrollLeft = paneRef.current.scrollLeft;
    const scrollTop = paneRef.current.scrollTop;
    const paneStyle = window.getComputedStyle(paneRef.current);
    const paddingLeft = Number.parseFloat(paneStyle.paddingLeft) || 0;
    const paddingTop = Number.parseFloat(paneStyle.paddingTop) || 0;
    return {
      x: (clientX - rect.left - paddingLeft + scrollLeft) / safeZoom,
      y: (clientY - rect.top - paddingTop + scrollTop) / safeZoom,
    };
  }, [zoom]);

  const toPaneCoords = useCallback((clientX: number, clientY: number) => {
    if (!paneRef.current) return { x: clientX, y: clientY };
    const rect = paneRef.current.getBoundingClientRect();
    const scrollLeft = paneRef.current.scrollLeft;
    const scrollTop = paneRef.current.scrollTop;
    return {
      x: clientX - rect.left + scrollLeft,
      y: clientY - rect.top + scrollTop,
    };
  }, []);

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
        existing.isCentered === metrics.isCentered
      ) {
        return prev;
      }
      return { ...prev, [tileId]: metrics };
    });
  }, []);

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

  const resolveAnchorFromTileState = useCallback(
    (
      anchorRef: ArrowSegment['startAnchor'],
      fallback: { x: number; y: number }
    ): { x: number; y: number } => {
      if (!anchorRef) return fallback;

      const icon = iconsById.get(anchorRef.tileId);
      const metrics = tileMetricsById[anchorRef.tileId];
      if (!icon || !metrics) return fallback;
      if (metrics.width <= 0 || metrics.height <= 0) return fallback;
      if (anchorRef.edgeIndex < 0 || anchorRef.edgeIndex >= FOCUS_RING_DOTS_PER_EDGE) return fallback;

      const originLeft = metrics.isCentered ? icon.x - (metrics.width / 2) : icon.x;
      const originTop = metrics.isCentered ? icon.y - (metrics.height / 2) : icon.y;
      const ringOffset = TILE_RING.margin + (TILE_RING.strokeWidth / 2);
      const safeContentWidth = Math.max(1, metrics.width - (metrics.contentInset * 2));
      const safeContentHeight = Math.max(1, metrics.height - (metrics.contentInset * 2));
      const ringLeft = originLeft + metrics.contentInset - ringOffset;
      const ringTop = originTop + metrics.contentInset - ringOffset;
      const ringWidth = safeContentWidth + (ringOffset * 2);
      const ringHeight = safeContentHeight + (ringOffset * 2);
      const fraction = (anchorRef.edgeIndex + 1) / (FOCUS_RING_DOTS_PER_EDGE + 1);
      const edgeX = ringLeft + (ringWidth * fraction);
      const edgeY = ringTop + (ringHeight * fraction);

      if (anchorRef.edge === 'top') return { x: edgeX, y: ringTop };
      if (anchorRef.edge === 'right') return { x: ringLeft + ringWidth, y: edgeY };
      if (anchorRef.edge === 'bottom') return { x: edgeX, y: ringTop + ringHeight };
      return { x: ringLeft, y: edgeY };
    },
    [iconsById, tileMetricsById]
  );

  const renderArrowSegments: ArrowSegment[] = useMemo(
    () =>
      allArrowSegments.map((segment) => {
        const resolvedStart = resolveAnchorFromTileState(segment.startAnchor, segment.start);
        const resolvedEnd = resolveAnchorFromTileState(segment.endAnchor, segment.end);
        return {
          ...segment,
          start: resolvedStart,
          end: resolvedEnd,
        };
      }),
    [allArrowSegments, resolveAnchorFromTileState]
  );

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
  }, [logic.selectedSpace?.id]);

  useEffect(() => {
    if (!isSearchMode) return;
    setArrowContextMenu(null);
    clearArrowSelection();
  }, [clearArrowSelection, isSearchMode]);

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

  const handleArrowContextMenu = (e: React.MouseEvent<SVGPathElement>, arrowId: string) => {
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

  const clearPreviewTimeout = () => {
    if (previewTimeoutRef.current) {
      clearTimeout(previewTimeoutRef.current);
      previewTimeoutRef.current = null;
    }
  };

  const openPreviewForIcon = (icon: DroppedIcon) => {
    onObjectClick?.({
      url: icon.url,
      title: icon.title,
      tileId: icon.id,
      filePath: icon.filePath,
      type: icon.type,
      content: icon.content,
      gmailEmail: icon.gmailEmail,
    });
  };

  const schedulePreviewForIcon = (icon: DroppedIcon, delayMs: number) => {
    clearPreviewTimeout();
    previewTimeoutRef.current = setTimeout(() => {
      // Skip opening preview if inline editor already active for this note
      if (icon.type === 'text' && logic.inlineEditorState.isActive && logic.inlineEditorState.editingId === icon.id) return;
      openPreviewForIcon(icon);
    }, delayMs);
  };

  const isPlainTextFileTarget = (filePath?: string): boolean => {
    if (!filePath) return false;
    const isMarkdown = /\.(md|markdown)$/i.test(filePath);
    const isHtmlExtension = /\.(html|htm)$/i.test(filePath);
    const isRenderedHtml = isHtmlExtension && !isHtmlCodeFile(filePath);
    return detectFileType(filePath).category === 'text' && !isRenderedHtml && !isMarkdown;
  };

  const queuePreviewForIcon = (icon: DroppedIcon) => {
    if (icon.type === 'text') {
      schedulePreviewForIcon(icon, TEXT_PREVIEW_DELAY_MS);
      return;
    }

    if (icon.type === 'file') {
      if (!PLAIN_TEXT_FILE_PREVIEW_ENABLED && isPlainTextFileTarget(icon.filePath)) return;
      schedulePreviewForIcon(icon, FILE_PREVIEW_DELAY_MS);
      return;
    }

    openPreviewForIcon(icon);
  };

  useEffect(() => {
    return () => clearPreviewTimeout();
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
              <svg
                aria-hidden
                width={svgWidth}
                height={svgHeight}
                viewBox={`0 0 ${svgWidth} ${svgHeight}`}
                style={{
                  position: 'absolute',
                  inset: 0,
                  pointerEvents: isDrawingArrow ? 'none' : 'auto',
                  overflow: 'visible',
                  zIndex: Z_INDEX.CONTENT_DEFAULT - 1,
                }}
              >
                {renderArrowSegments.map((segment) => {
                  const isDraft = segment.id === 'arrow-draft';
                  const isSelectedArrow = selectedArrowId === segment.id && !isDraft;
                  const isDraggingStart = draggingEndpoint?.arrowId === segment.id && draggingEndpoint.endpoint === 'start';
                  const isDraggingEnd = draggingEndpoint?.arrowId === segment.id && draggingEndpoint.endpoint === 'end';
                  const clickableWidth = ARROW_SETTINGS.strokeWidth + (ARROW_SETTINGS.clickAreaPadding * 2);
                  const arrowOpacity = isDraft
                    ? ARROW_SETTINGS.opacity.draft
                    : (isDark ? ARROW_SETTINGS.opacity.normal : 'var(--tile-ring-opacity, 0.8)');
                  const startRingColor = getArrowColorForTile(segment.startAnchor?.tileId);
                  const endRingColor = getArrowColorForTile(segment.endAnchor?.tileId);
                  const fallbackArrowColor = startRingColor ?? endRingColor ?? ARROW_SETTINGS.color;
                  const arrowStartColor = startRingColor ?? fallbackArrowColor;
                  const arrowEndColor = endRingColor ?? fallbackArrowColor;
                  const hasSplitGradient = arrowStartColor !== arrowEndColor;
                  const svgSafeId = sanitizeSvgId(segment.id);
                  const gradientId = `center-pane-arrow-gradient-${svgSafeId}`;
                  const markerId = `center-pane-arrowhead-${svgSafeId}`;
                  const visibleStroke = hasSplitGradient ? `url(#${gradientId})` : arrowStartColor;
                  const pathData = buildArrowPath(segment.start, segment.end, {
                    startEdge: segment.startAnchor?.edge,
                    endEdge: segment.endAnchor?.edge,
                  });
                  return (
                    <g key={segment.id} style={{ opacity: arrowOpacity }}>
                      <defs>
                        {hasSplitGradient && (
                          <linearGradient
                            id={gradientId}
                            gradientUnits="userSpaceOnUse"
                            x1={segment.start.x}
                            y1={segment.start.y}
                            x2={segment.end.x}
                            y2={segment.end.y}
                          >
                            <stop offset="0%" stopColor={arrowStartColor} />
                            <stop offset="33.333%" stopColor={arrowStartColor} />
                            <stop offset="66.667%" stopColor={arrowEndColor} />
                            <stop offset="100%" stopColor={arrowEndColor} />
                          </linearGradient>
                        )}
                        <marker
                          id={markerId}
                          markerWidth={ARROW_SETTINGS.marker.width}
                          markerHeight={ARROW_SETTINGS.marker.height}
                          refX={ARROW_SETTINGS.marker.refX}
                          refY={ARROW_SETTINGS.marker.refY}
                          orient="auto"
                          markerUnits="userSpaceOnUse"
                        >
                          <path d={ARROW_SETTINGS.marker.path} fill={arrowEndColor} />
                        </marker>
                      </defs>
                      {/* Invisible wider line for click area */}
                      <path
                        d={pathData}
                        stroke="transparent"
                        fill="none"
                        strokeWidth={clickableWidth}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        style={{
                          cursor: isDraft ? 'default' : 'pointer',
                          pointerEvents: isDraft ? 'none' : ('stroke' as any),
                        }}
                        onPointerDown={
                          isDraft
                            ? undefined
                            : (e) => {
                                // Select arrow without affecting tile selection flow.
                                handleArrowPointerDown(segment, e);
                                logic.setSelectedIconIds([]);
                              }
                        }
                        onClick={isDraft ? undefined : (e) => e.stopPropagation()}
                        onContextMenu={isDraft ? undefined : (e) => handleArrowContextMenu(e, segment.id)}
                      />
                      {/* Visible arrow line */}
                      <path
                        d={pathData}
                        stroke={visibleStroke}
                        strokeWidth={ARROW_SETTINGS.strokeWidth}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        fill="none"
                        markerEnd={`url(#${markerId})`}
                        style={{ pointerEvents: 'none' }}
                      />
                      {isSelectedArrow && (
                        <>
                          <circle
                            cx={segment.start.x}
                            cy={segment.start.y}
                            r={10}
                            fill="transparent"
                            style={{ cursor: 'grab', pointerEvents: 'all' }}
                            onPointerDown={(e) => handleArrowEndpointPointerDown(segment, 'start', e)}
                          />
                          <circle
                            cx={segment.start.x}
                            cy={segment.start.y}
                            r={4.2}
                            fill={isDraggingStart ? '#38BDF8' : arrowStartColor}
                            stroke="#0f172a"
                            strokeWidth={1}
                            style={{ pointerEvents: 'none', opacity: ARROW_ENDPOINT_DOT_OPACITY }}
                          />
                          <circle
                            cx={segment.end.x}
                            cy={segment.end.y}
                            r={10}
                            fill="transparent"
                            style={{ cursor: 'grab', pointerEvents: 'all' }}
                            onPointerDown={(e) => handleArrowEndpointPointerDown(segment, 'end', e)}
                          />
                          <circle
                            cx={segment.end.x}
                            cy={segment.end.y}
                            r={4.8}
                            fill={isDraggingEnd ? '#38BDF8' : arrowEndColor}
                            stroke="#0f172a"
                            strokeWidth={1}
                            style={{ pointerEvents: 'none', opacity: ARROW_ENDPOINT_DOT_OPACITY }}
                          />
                        </>
                      )}
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

            {filteredIcons.map((icon) => (
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
                  channelName={icon.channelName}
                  faviconUrl={icon.faviconUrl}
                  filePath={icon.filePath}
                  content={icon.content}
                  isSelected={logic.selectedIconIds.includes(icon.id)}
                  onClick={(event) => {
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
                    window.dispatchEvent(new CustomEvent('preview:suppress', { detail: { tileId: icon.id } }));
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
                  onFocusRingPointerDown={handleFocusRingPointerDown}
                  onMetricsChange={handleTileMetricsChange}
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

      {/* Inline preview grid for multi-selected links (YouTube/Vimeo embeds) */}
      {selectedIcons.length > 1 && (
        <div
          className="border-t border-slate-200 bg-white/70 backdrop-blur-sm p-4 space-y-4"
          style={{ boxShadow: 'inset 0 1px 0 rgba(0,0,0,0.04)' }}
        >
          <div style={{ ...FONT_ROLES.paneSubtitle, color: 'var(--color-text-muted)' }}>
            Inline previews ({selectedIcons.length})
          </div>
          {hiddenInlinePreviewCount > 0 && (
            <div className="text-xs text-slate-500" style={{ ...FONT_ROLES.paneBodyMuted }}>
              Showing first {INLINE_PREVIEW_LIMIT} items — {hiddenInlinePreviewCount} more selected.
            </div>
          )}
          <div
            className="grid gap-4"
            style={{
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            }}
          >
            {inlinePreviewIcons.map((icon) => {
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

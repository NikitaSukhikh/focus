import React, { useState, useEffect, useRef } from 'react';
import { TopBar, TopBarHandle } from '@/components/layout/topbar';
import { LeftSidebar } from '@/components/layout/leftsidebar';
import { CenterPane, CenterPaneHandle } from '@/components/layout/centerpane';
import { PreviewPane } from '@/components/layout/previewpane';
import { AssistantPane } from '@/components/layout/assistantpane';
import { QuickAddPopup } from '@/components/dialogs/QuickAddPopup';
import { SpaceShareDialog } from '@/components/dialogs/SpaceShareDialog';
import { FullWindowPreview } from '@/components/layout/fullwindowpreview/FullWindowPreview';
import { PreviewTarget } from '@/components/layout/centerpane/types';
import { SpaceShareFilters, createDefaultSpaceShareFilters } from '@/components/dialogs/share/types';
import { detectFileType } from '@/utils/fileTypes';
import { isPreviewPaneTargetAllowed } from '@/utils/previewTargets';
import { previewApi } from '@/api/preview';
import { Z_INDEX } from '@/constants/zIndex';
import { PANEL_DIMENSIONS } from '@/constants/panesDimensions';
import { useSpaceStore } from '@/stores/spaceStore';
import { AppLoadingScreen } from '@/components/AppLoadingScreen';
import { IntroSlideshow } from '@/components/IntroSlideshow';
import { usePersistedSpace } from '@/stores/hooks/usePersistedSpace';
import { useIntroSeen } from '@/hooks/useIntroSeen';
import { useAppShortcuts } from '@/hooks/useAppShortcuts';
import { useSpaceNavigationShortcut } from '@/hooks/useSpaceNavigationShortcut';
import { useTelegramEventListener } from '@/hooks/useTelegramEventListener';
import { usePersistedNumber } from '@/hooks/usePersistedNumber';
import { useBeforeUnload } from '@/hooks/useBeforeUnload';

type ResizeHandler = React.MouseEventHandler<HTMLDivElement>;

export function App() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [sidebarWidth, setSidebarWidth] = usePersistedNumber(
    PANEL_DIMENSIONS.SIDEBAR.STORAGE_KEY,
    PANEL_DIMENSIONS.SIDEBAR.DEFAULT_WIDTH
  );
  const [previewWidth, setPreviewWidth] = usePersistedNumber(
    PANEL_DIMENSIONS.PREVIEW.STORAGE_KEY,
    PANEL_DIMENSIONS.PREVIEW.DEFAULT_WIDTH
  );
  const [isPreviewOpen, setIsPreviewOpen] = useState(true);
  const [isConversationOpen, setIsConversationOpen] = useState(false);
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [quickAddPosition, setQuickAddPosition] = useState<{ x: number; y: number } | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isAddLinkDialogOpen, setIsAddLinkDialogOpen] = useState(false);
  const [isGridMode, setIsGridMode] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [previewData, setPreviewData] = useState<{
    url?: string;
    title?: string;
    tileId?: string;
    filePath?: string;
    type?: string;
    content?: string;
    gmailEmail?: string;
  }>({});
  const [isFullWindowOpen, setIsFullWindowOpen] = useState(false);
  const [fullWindowData, setFullWindowData] = useState<{
    url?: string;
    title?: string;
    tileId?: string;
    filePath?: string;
    type?: string;
    content?: string;
  }>({});
  const [spaceShareState, setSpaceShareState] = useState<{
    spaceId: string;
    spaceName: string;
    filters: SpaceShareFilters;
  } | null>(null);
  const centerPaneRef = useRef<CenterPaneHandle>(null);
  const topBarRef = useRef<TopBarHandle>(null);
  const textFilePreviewCache = useRef<Record<string, string>>({});

  const selectedSpaceId = useSpaceStore((state) => state.selectedSpaceId);
  const selectedSpace = useSpaceStore((state) => state.getSelectedSpace());
  const initialize = useSpaceStore((state) => state.initialize);
  const spacesLoaded = useSpaceStore((state) => state.spacesLoaded);

  usePersistedSpace();

  const { introSeen, markIntroSeen } = useIntroSeen();
  const [showIntro, setShowIntro] = useState(false);

  // Show intro on first launch once settings are loaded
  useEffect(() => {
    if (spacesLoaded && introSeen === false) setShowIntro(true);
  }, [spacesLoaded, introSeen]);

  const handleCloseIntro = () => {
    setShowIntro(false);
    void markIntroSeen();
  };

  // Initialize space store on mount to load persisted selected space
  useEffect(() => {
    void initialize();
  }, [initialize]);

  // Calculate if any dialog is open
  const isAnyDialogOpen = isQuickAddOpen || isDeleteDialogOpen || isAddLinkDialogOpen;

  // Setup all keyboard shortcuts
  const toggleQuickAdd = () => {
    setIsQuickAddOpen((prev) => !prev);
    setQuickAddPosition(null);
  };

  useAppShortcuts({
    isSidebarOpen,
    openSidebar: () => setIsSidebarOpen(true),
    closeSidebar: () => setIsSidebarOpen(false),
    toggleConversation: () => setIsConversationOpen((prev) => !prev),
    togglePreview: () => setIsPreviewOpen((prev) => !prev),
    toggleQuickAdd,
    isDialogOpen: isAnyDialogOpen,
  });

  // Setup space navigation shortcuts
  const { highlightedSpaceId, renameRequestedSpaceId, renameRequestTimestamp, deleteRequestedSpaceId, deleteRequestTimestamp } = useSpaceNavigationShortcut(isSidebarOpen, isAnyDialogOpen);

  // Setup custom event listeners
  useTelegramEventListener(() => {
    // TODO: Implement Telegram account dialog
    console.log('Add Telegram account - coming soon');
  });

  // Ensure pending requests are flushed before app closes
  useBeforeUnload();

  // Track dialog states
  useEffect(() => {
    const handleDeleteDialogChange = (e: Event) => {
      const customEvent = e as CustomEvent<{ isOpen: boolean }>;
      setIsDeleteDialogOpen(customEvent.detail.isOpen);
    };

    const handleAddLinkDialogChange = (e: Event) => {
      const customEvent = e as CustomEvent<{ isOpen: boolean }>;
      setIsAddLinkDialogOpen(customEvent.detail.isOpen);
    };

    window.addEventListener('dialog:delete', handleDeleteDialogChange);
    window.addEventListener('dialog:addlink', handleAddLinkDialogChange);

    return () => {
      window.removeEventListener('dialog:delete', handleDeleteDialogChange);
      window.removeEventListener('dialog:addlink', handleAddLinkDialogChange);
    };
  }, []);

  // Clear preview when switching spaces
  useEffect(() => {
    setPreviewData({});
    setIsPreviewOpen(false);
    setFullWindowData({});
    setIsFullWindowOpen(false);
    textFilePreviewCache.current = {};
  }, [selectedSpaceId]);

  // Close preview when tile is deleted
  useEffect(() => {
    const handleTileDeleted = (e: Event) => {
      const customEvent = e as CustomEvent<{ tileId: string }>;
      const deletedTileId = customEvent.detail.tileId;

      setPreviewData((currentPreviewData) => {
        if (currentPreviewData.tileId === deletedTileId) {
          setIsPreviewOpen(false);
          return {};
        }
        return currentPreviewData;
      });

      setFullWindowData((currentFullWindowData) => {
        if (currentFullWindowData.tileId === deletedTileId) {
          setIsFullWindowOpen(false);
          return {};
        }
        return currentFullWindowData;
      });
    };

    window.addEventListener('tile:deleted', handleTileDeleted);
    return () => window.removeEventListener('tile:deleted', handleTileDeleted);
  }, []);

  useEffect(() => {
    const handleContentChanged = (e: Event) => {
      const customEvent = e as CustomEvent<{ tileId: string; title: string; content: string }>;
      const { tileId: updatedTileId, title: newTitle, content: newContent } = customEvent.detail;

      setPreviewData((prev) => prev.tileId === updatedTileId ? { ...prev, title: newTitle, content: newContent } : prev);
      setFullWindowData((prev) => prev.tileId === updatedTileId ? { ...prev, title: newTitle, content: newContent } : prev);
    };

    window.addEventListener('text:content-changed', handleContentChanged);
    return () => window.removeEventListener('text:content-changed', handleContentChanged);
  }, []);

  // Listen for full window preview requests
  useEffect(() => {
    const handleOpenFullWindow = (e: Event) => {
      const customEvent = e as CustomEvent<PreviewTarget>;
      const target = customEvent.detail;

      const nextData = normalizePreviewTarget(target);

      setPreviewData(nextData);
      setIsPreviewOpen(false);
      setFullWindowData(nextData);
      setIsFullWindowOpen(true);
      void hydrateTextFilePreview(nextData, true);
    };

    window.addEventListener('open:fullwindow', handleOpenFullWindow);
    return () => window.removeEventListener('open:fullwindow', handleOpenFullWindow);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps -- intentionally run once; functions only use stable setters

  useEffect(() => {
    window.desktopAPI?.setFullWindowPreviewState?.(isFullWindowOpen);
  }, [isFullWindowOpen]);

  const toFileUrl = (filePath: string): string => {
    if (!filePath) return '';
    if (/^file:\/\//i.test(filePath)) {
      return filePath;
    }
    const normalized = filePath.replace(/\\/g, '/');
    const needsLeadingSlash = normalized.startsWith('/') ? '' : '/';
    return `file://${needsLeadingSlash}${encodeURI(normalized)}`;
  };

  const isTextFileTarget = (target: PreviewTarget) =>
    target.type === 'file' && target.filePath && detectFileType(target.filePath).category === 'text';

  const canOpenPreviewPane = (target: PreviewTarget): boolean => isPreviewPaneTargetAllowed(target);

  const normalizePreviewTarget = (target: PreviewTarget): PreviewTarget => {
    const normalized: PreviewTarget = { ...target };
    const isGoogleDriveFamily =
      normalized.type === 'google_drive'
      || normalized.type === 'google_docs'
      || normalized.type === 'google_sheets'
      || normalized.type === 'google_slides';

    if (!normalized.url) {
      if (normalized.type === 'gmail') {
        normalized.url = 'https://mail.google.com/';
      } else if (isGoogleDriveFamily) {
        normalized.url = 'https://drive.google.com/';
      }
    }

    if (target.filePath && target.type === 'file') {
      const { category } = detectFileType(target.filePath);
      if (category === 'pdf') {
        normalized.url = toFileUrl(target.filePath);
      }
    }

    if (isTextFileTarget(normalized) && normalized.tileId) {
      const cached = textFilePreviewCache.current[normalized.tileId];
      if (cached && !normalized.content) {
        normalized.content = cached;
      }
    }

    return normalized;
  };

  const hydrateTextFilePreview = async (target: PreviewTarget, updateFullWindow: boolean) => {
    if (!isTextFileTarget(target) || !target.tileId) return;

    const cached = textFilePreviewCache.current[target.tileId];
    if (cached) {
      setPreviewData((prev) => prev.tileId === target.tileId ? { ...prev, content: cached } : prev);
      if (updateFullWindow) {
        setFullWindowData((prev) => prev.tileId === target.tileId ? { ...prev, content: cached } : prev);
      }
      return;
    }

    try {
      const preview = await previewApi.getObjectPreview(target.tileId);
      const textContent = preview.text_preview || preview.content_preview;

      if (textContent) {
        textFilePreviewCache.current[target.tileId] = textContent;
        setPreviewData((prev) => prev.tileId === target.tileId ? { ...prev, content: textContent } : prev);
        if (updateFullWindow) {
          setFullWindowData((prev) => prev.tileId === target.tileId ? { ...prev, content: textContent } : prev);
        }
      }
    } catch (err) {
      console.error('Failed to load text preview', err);
      const fallback = 'Preview unavailable.';
      setPreviewData((prev) => prev.tileId === target.tileId ? { ...prev, content: prev.content ?? fallback } : prev);
      if (updateFullWindow) {
        setFullWindowData((prev) => prev.tileId === target.tileId ? { ...prev, content: prev.content ?? fallback } : prev);
      }
    }
  };


  const startResizingSidebar: ResizeHandler = (e) => {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = sidebarWidth;
    const minWidth = PANEL_DIMENSIONS.SIDEBAR.MIN_WIDTH;
    const maxWidth = PANEL_DIMENSIONS.SIDEBAR.MAX_WIDTH;

    const onMouseMove = (moveEvent: MouseEvent) => {
      const delta = moveEvent.clientX - startX;
      const nextWidth = Math.min(maxWidth, Math.max(minWidth, startWidth + delta));
      setSidebarWidth(nextWidth);
    };

    const onMouseUp = () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  const startResizingPreview: ResizeHandler = (e) => {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = previewWidth;
    const minWidth = PANEL_DIMENSIONS.PREVIEW.MIN_WIDTH;
    const maxWidth = PANEL_DIMENSIONS.PREVIEW.MAX_WIDTH;

    const onMouseMove = (moveEvent: MouseEvent) => {
      const delta = startX - moveEvent.clientX;
      const nextWidth = Math.min(maxWidth, Math.max(minWidth, startWidth + delta));
      setPreviewWidth(nextWidth);
    };

    const onMouseUp = () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  const handleCanvasEmptyClick = () => {
    if (isSidebarOpen) {
      setIsSidebarOpen(false);
    }
  };

  const handleNavigateToTile = (tileId: string) => {
    const tiles = centerPaneRef.current?.getTilesForSpace(selectedSpaceId || '');
    if (!tiles) return;

    const tile = tiles.find((t) => t.id === tileId);
    if (!tile) return;

    const tileData = normalizePreviewTarget({
      url: tile.url,
      title: tile.title,
      tileId: tile.id,
      filePath: tile.filePath,
      type: tile.type,
      content: tile.content,
    });

    if (!canOpenPreviewPane(tileData)) {
      setIsPreviewOpen(false);
      return;
    }

    setPreviewData(tileData);
    setIsPreviewOpen(true);

    // Also update full window data if it's open
    if (isFullWindowOpen) {
      setFullWindowData(tileData);
    }

    void hydrateTextFilePreview(tileData, isFullWindowOpen);
  };

  const openQuickAdd = (position?: { x: number; y: number }) => {
    setQuickAddPosition(position ?? null);
    setIsQuickAddOpen(true);
  };

  const closeQuickAdd = () => {
    setIsQuickAddOpen(false);
    setQuickAddPosition(null);
  };

  const handleQuickAddFiles = () => {
    centerPaneRef.current?.addFiles(quickAddPosition ?? undefined);
  };

  const handleQuickAddLink = () => {
    centerPaneRef.current?.openAddLinkDialog(quickAddPosition ?? undefined);
  };

  const handleQuickAddWebArticle = () => {
    centerPaneRef.current?.openAddWebArticleDialog(quickAddPosition ?? undefined);
  };

  const handleQuickAddPaste = () => {
    void centerPaneRef.current?.pasteFromClipboard?.(quickAddPosition ?? undefined);
  };


  const handleZoomIn = () => {
    setZoom((prev) => Math.min(2, parseFloat((prev + 0.1).toFixed(2))));
  };

  const handleZoomOut = () => {
    setZoom((prev) => Math.max(0.5, parseFloat((prev - 0.1).toFixed(2))));
  };

  const handleTopBarSpaceShareDialogOpen = (filters: SpaceShareFilters) => {
    const spaceId = selectedSpaceId || '';
    if (!spaceId) return;

    setSpaceShareState({
      spaceId,
      spaceName: selectedSpace?.name || 'Current Space',
      filters,
    });
  };

  return (
    <div className="h-screen flex flex-col" style={{ background: 'var(--background-dark)' }}>
      <AppLoadingScreen visible={!spacesLoaded} />
      {showIntro && <IntroSlideshow onDone={handleCloseIntro} />}
      <TopBar
        ref={topBarRef}
        onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
        isSidebarOpen={isSidebarOpen}
        onTogglePreview={() => setIsPreviewOpen(!isPreviewOpen)}
        isPreviewOpen={isPreviewOpen}
        onToggleConversation={() => setIsConversationOpen(!isConversationOpen)}
        isConversationOpen={isConversationOpen}
        sidebarWidth={sidebarWidth}
        centerPaneRef={centerPaneRef}
        onToggleGrid={() => setIsGridMode((prev) => !prev)}
        isGridMode={isGridMode}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        zoom={zoom}
        onOpenQuickAdd={openQuickAdd}
        onViewTutorial={() => setShowIntro(true)}
        onOpenSpaceShareDialog={handleTopBarSpaceShareDialogOpen}
      />

      <div className="flex-1 flex overflow-hidden">
        <LeftSidebar
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
          width={sidebarWidth}
          onResizeStart={startResizingSidebar}
          highlightedSpaceId={highlightedSpaceId}
          renameRequestedSpaceId={renameRequestedSpaceId}
          renameRequestTimestamp={renameRequestTimestamp}
          deleteRequestedSpaceId={deleteRequestedSpaceId}
          deleteRequestTimestamp={deleteRequestTimestamp}
          onViewTutorial={() => setShowIntro(true)}
        />

        <main
          className="flex-1 flex relative"
        >
          <div className="flex flex-1 min-w-0 h-full">
            <div className="flex-1 min-w-0 h-full">
              <CenterPane
                ref={centerPaneRef}
                showGrid={isGridMode}
                zoom={zoom}
                onZoomIn={handleZoomIn}
                onZoomOut={handleZoomOut}
                onOpenQuickAdd={openQuickAdd}
                onSuppressPreview={() => setIsPreviewOpen(false)}
                onObjectClick={(target: PreviewTarget) => {
                  const normalized = normalizePreviewTarget(target || {});
                  if (!canOpenPreviewPane(normalized)) {
                    setIsPreviewOpen(false);
                    return;
                  }
                  setPreviewData(normalized);
                  setIsPreviewOpen(true);

                  if (isFullWindowOpen) {
                    setFullWindowData(normalized);
                  }

                  void hydrateTextFilePreview(normalized, isFullWindowOpen);
                }}
                onCanvasEmptyClick={handleCanvasEmptyClick}
              />
            </div>

          {isPreviewOpen && (
            <div
              className="absolute right-0 top-0"
              style={{
                height: 'calc(100% - 12px)',
                width: `${previewWidth}px`,
                zIndex: Z_INDEX.CONTENT_PREVIEW,
              }}
            >
              <div
                className="absolute left-0 top-0 w-1 cursor-col-resize hover:bg-white/20 transition-colors"
                style={{
                  height: '100%',
                  zIndex: Z_INDEX.RESIZE_HANDLE,
                }}
                onMouseDown={startResizingPreview}
              />
              <PreviewPane
                isOpen={isPreviewOpen && !isFullWindowOpen}
                onClose={() => setIsPreviewOpen(false)}
                url={previewData.url}
                title={previewData.title}
                tileId={previewData.tileId}
                filePath={previewData.filePath}
                type={previewData.type}
                content={previewData.content}
                tiles={centerPaneRef.current?.getTilesForSpace(selectedSpaceId || '') || []}
                onNavigateToTile={handleNavigateToTile}
                gmailEmail={previewData.gmailEmail}
              />
            </div>
          )}
        </div>
        {/* To be implemented: assistant pane (hidden) */}
        {isConversationOpen && (
          <div
            className="absolute right-0 bottom-0 drop-shadow-2xl"
            style={{
              width: '33.333%',
              maxWidth: '800px',
              minWidth: '360px',
              height: `${PANEL_DIMENSIONS.ASSISTANT.HEIGHT}px`,
              pointerEvents: 'auto',
              zIndex: Z_INDEX.ASSISTANT_PANE,
              display: 'none',
            }}
            aria-hidden="true"
          >
            <AssistantPane
              isOpen={isConversationOpen}
              onClose={() => setIsConversationOpen(false)}
              onResizeStart={() => {}}
            />
          </div>
        )}
      </main>
    </div>

      <QuickAddPopup
        isOpen={isQuickAddOpen}
        onClose={closeQuickAdd}
        onAddFiles={handleQuickAddFiles}
        onAddLink={handleQuickAddLink}
        onAddWebArticle={handleQuickAddWebArticle}
        onPaste={handleQuickAddPaste}
        position={quickAddPosition}
      />

      <SpaceShareDialog
        isOpen={!!spaceShareState}
        onClose={() => setSpaceShareState(null)}
        spaceId={spaceShareState?.spaceId}
        spaceName={spaceShareState?.spaceName || 'Current Space'}
        filters={spaceShareState?.filters || createDefaultSpaceShareFilters()}
      />

      <FullWindowPreview
        isOpen={isFullWindowOpen}
        onClose={() => setIsFullWindowOpen(false)}
        url={fullWindowData.url}
        title={fullWindowData.title}
        tileId={fullWindowData.tileId}
        filePath={fullWindowData.filePath}
        type={fullWindowData.type}
        content={fullWindowData.content}
        tiles={centerPaneRef.current?.getTilesForSpace(selectedSpaceId || '') || []}
        onNavigateToTile={handleNavigateToTile}
      />
    </div>
  );
}

export default App;


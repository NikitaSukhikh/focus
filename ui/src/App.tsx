import React, { useState, useEffect, useRef } from 'react';
import { TopBar, TopBarHandle } from './components/layout/topbar';
import { LeftSidebar } from './components/layout/leftsidebar';
import { CenterPane, CenterPaneHandle } from './components/layout/centerpane';
import { PreviewPane } from './components/layout/previewpane';
import { AssistantPane } from './components/layout/assistantpane';
import { QuickAddPopup } from './components/dialogs/QuickAddPopup';
import { FullWindowPreview } from './components/layout/fullwindowpreview/FullWindowPreview';
import { PreviewTarget } from './components/layout/centerpane/types';
import { detectFileType } from './utils/fileTypes';
import { previewApi } from './api/preview';
import { Z_INDEX } from './constants/zIndex';
import { PANEL_DIMENSIONS } from './constants/panelDimensions';
import { useSpaceStore } from './stores/spaceStore';
import { usePersistedSpace } from './stores/hooks/usePersistedSpace';
import { useAppShortcuts } from './hooks/useAppShortcuts';
import { useSpaceNavigationShortcut } from './hooks/useSpaceNavigationShortcut';
import { useTelegramEventListener } from './hooks/useTelegramEventListener';
import { usePersistedNumber } from './hooks/usePersistedNumber';
import { useBeforeUnload } from './hooks/useBeforeUnload';

type ResizeHandler = React.MouseEventHandler<HTMLDivElement>;

export function App() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [sidebarWidth, setSidebarWidth] = usePersistedNumber(
    PANEL_DIMENSIONS.SIDEBAR.STORAGE_KEY,
    PANEL_DIMENSIONS.SIDEBAR.DEFAULT_WIDTH
  );
  const [isPreviewOpen, setIsPreviewOpen] = useState(true);
  const [isConversationOpen, setIsConversationOpen] = useState(false);
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [isGridMode, setIsGridMode] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [previewData, setPreviewData] = useState<{
    url?: string;
    title?: string;
    tileId?: string;
    filePath?: string;
    type?: string;
    content?: string;
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
  const centerPaneRef = useRef<CenterPaneHandle>(null);
  const topBarRef = useRef<TopBarHandle>(null);
  const textFilePreviewCache = useRef<Record<string, string>>({});

  const selectedSpaceId = useSpaceStore((state) => state.selectedSpaceId);

  usePersistedSpace();

  // Setup all keyboard shortcuts
  useAppShortcuts({
    isSidebarOpen,
    openSidebar: () => setIsSidebarOpen(true),
    closeSidebar: () => setIsSidebarOpen(false),
    toggleConversation: () => setIsConversationOpen((prev) => !prev),
    togglePreview: () => setIsPreviewOpen((prev) => !prev),
    toggleQuickAdd: () => setIsQuickAddOpen((prev) => !prev),
  });

  // Setup space navigation shortcuts
  const { highlightedSpaceId } = useSpaceNavigationShortcut(isSidebarOpen);

  // Setup custom event listeners
  useTelegramEventListener(() => {
    // TODO: Implement Telegram account dialog
    console.log('Add Telegram account - coming soon');
  });

  // Ensure pending requests are flushed before app closes
  useBeforeUnload();

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
  }, []);

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

  const normalizePreviewTarget = (target: PreviewTarget): PreviewTarget => {
    const normalized: PreviewTarget = { ...target };

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


  const handleCanvasEmptyClick = () => {
    if (isSidebarOpen) {
      setIsSidebarOpen(false);
    }
    if (isPreviewOpen) {
      setIsPreviewOpen(false);
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

    setPreviewData(tileData);
    setIsPreviewOpen(true);

    // Also update full window data if it's open
    if (isFullWindowOpen) {
      setFullWindowData(tileData);
    }

    void hydrateTextFilePreview(tileData, isFullWindowOpen);
  };

  const handleQuickAddFiles = () => {
    centerPaneRef.current?.addFiles();
  };

  const handleQuickAddLink = () => {
    centerPaneRef.current?.openAddLinkDialog();
  };

  const handleQuickAddTelegram = () => {
    // Placeholder: Telegram dialog not yet implemented
  };

  const handleZoomIn = () => {
    setZoom((prev) => Math.min(2, parseFloat((prev + 0.1).toFixed(2))));
  };

  const handleZoomOut = () => {
    setZoom((prev) => Math.max(0.5, parseFloat((prev - 0.1).toFixed(2))));
  };

  return (
    <div className="h-screen flex flex-col" style={{ background: 'var(--background-dark)' }}>
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
      />

      <div className="flex-1 flex overflow-hidden">
        <LeftSidebar
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
          width={sidebarWidth}
          onResizeStart={startResizingSidebar}
          highlightedSpaceId={highlightedSpaceId}
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
                onOpenQuickAdd={() => setIsQuickAddOpen(true)}
                 onObjectClick={(target: PreviewTarget) => {
                  const normalized = normalizePreviewTarget(target || {});
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
              className="absolute right-0 top-0 h-full"
              style={{
                width: '33.333%',
                maxWidth: '800px',
                minWidth: '360px',
                zIndex: Z_INDEX.CONTENT_PREVIEW,
              }}
            >
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
        onClose={() => setIsQuickAddOpen(false)}
        onAddFiles={handleQuickAddFiles}
        onAddLink={handleQuickAddLink}
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

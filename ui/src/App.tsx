import React, { useState, useEffect, useRef } from 'react';
import { TopBar, TopBarHandle } from './components/layout/topbar';
import { LeftSidebar } from './components/layout/leftsidebar';
import { CenterPane, CenterPaneHandle } from './components/layout/centerpane';
import { PreviewPane } from './components/layout/previewpane';
import { AssistantPane } from './components/layout/assistantpane';
import { QuickAddPopup } from './components/dialogs/QuickAddPopup';
import { PreviewTarget } from './components/layout/centerpane/types';
import { detectFileType } from './utils/fileTypes';
import { Z_INDEX } from './constants/zIndex';
import { PANEL_DIMENSIONS } from './constants/panelDimensions';
import { useIslandStore } from './stores/islandStore';
import { usePersistedIsland } from './stores/hooks/usePersistedIsland';
import { useAppShortcuts } from './hooks/useAppShortcuts';
import { useTelegramEventListener } from './hooks/useTelegramEventListener';
import { usePersistedNumber } from './hooks/usePersistedNumber';

type ResizeHandler = React.MouseEventHandler<HTMLDivElement>;

export function App() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [sidebarWidth, setSidebarWidth] = usePersistedNumber(
    PANEL_DIMENSIONS.SIDEBAR.STORAGE_KEY,
    PANEL_DIMENSIONS.SIDEBAR.DEFAULT_WIDTH
  );
  const [isPreviewOpen, setIsPreviewOpen] = useState(true);
  const [isConversationOpen, setIsConversationOpen] = useState(true);
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [previewData, setPreviewData] = useState<{
    url?: string;
    title?: string;
    tileId?: string;
    filePath?: string;
    type?: string;
    content?: string;
  }>({});
  const centerPaneRef = useRef<CenterPaneHandle>(null);
  const topBarRef = useRef<TopBarHandle>(null);

  const selectedIslandId = useIslandStore((state) => state.selectedIslandId);

  usePersistedIsland();

  // Setup all keyboard shortcuts
  useAppShortcuts({
    toggleSidebar: () => setIsSidebarOpen((prev) => !prev),
    toggleConversation: () => setIsConversationOpen((prev) => !prev),
    togglePreview: () => setIsPreviewOpen((prev) => !prev),
    toggleQuickAdd: () => setIsQuickAddOpen((prev) => !prev),
  });

  // Setup custom event listeners
  useTelegramEventListener(() => {
    // TODO: Implement Telegram account dialog
    console.log('Add Telegram account - coming soon');
  });

  // Clear preview when switching islands
  useEffect(() => {
    setPreviewData({});
    setIsPreviewOpen(false);
  }, [selectedIslandId]);

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
    };

    window.addEventListener('tile:deleted', handleTileDeleted);
    return () => window.removeEventListener('tile:deleted', handleTileDeleted);
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

  const handleQuickAddFiles = () => {
    centerPaneRef.current?.addFiles();
  };

  const handleQuickAddLink = () => {
    topBarRef.current?.openAddLinkDialog();
  };

  const handleQuickAddTelegram = () => {
    topBarRef.current?.openAddTelegramDialog();
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
      />

      <div className="flex-1 flex overflow-hidden">
        <LeftSidebar
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
          width={sidebarWidth}
          onResizeStart={startResizingSidebar}
        />

        <main
          className="flex-1 flex relative"
        >
          <div className="flex flex-1 min-w-0 h-full">
            <div className="flex-1 min-w-0 h-full">
              <CenterPane
                ref={centerPaneRef}
                onObjectClick={(target: PreviewTarget) => {
                  const { url, title, tileId, filePath, type, content } = target || {};

                  if (filePath && type === 'file') {
                    const { category } = detectFileType(filePath);
                    if (category === 'pdf') {
                      setPreviewData({
                        url: toFileUrl(filePath),
                        title,
                        tileId,
                        filePath,
                        type,
                        content,
                      });
                      setIsPreviewOpen(true);
                      return;
                    }
                  }

                  setPreviewData({
                    url,
                    title,
                    tileId,
                    filePath,
                    type,
                    content,
                  });
                  setIsPreviewOpen(true);
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
                  borderLeft: '2px solid var(--color-border-subtle)',
                }}
              >
                <PreviewPane
                  isOpen={isPreviewOpen}
                  onClose={() => setIsPreviewOpen(false)}
                  url={previewData.url}
                  title={previewData.title}
                  tileId={previewData.tileId}
                  filePath={previewData.filePath}
                  type={previewData.type}
                  content={previewData.content}
                />
              </div>
            )}
          </div>
          {isConversationOpen && (
            <div
              className="absolute left-1/2 bottom-0 drop-shadow-2xl"
              style={{
                width: `${PANEL_DIMENSIONS.ASSISTANT.DEFAULT_WIDTH}px`,
                height: `${PANEL_DIMENSIONS.ASSISTANT.HEIGHT}px`,
                pointerEvents: 'auto',
                transform: 'translateX(-50%)',
                zIndex: Z_INDEX.ASSISTANT_PANE,
              }}
            >
              <AssistantPane
                isOpen={isConversationOpen}
                onClose={() => setIsConversationOpen(false)}
                width={PANEL_DIMENSIONS.ASSISTANT.DEFAULT_WIDTH}
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
        onAddTelegram={handleQuickAddTelegram}
      />
    </div>
  );
}

export default App;

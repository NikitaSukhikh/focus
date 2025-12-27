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

type ResizeHandler = React.MouseEventHandler<HTMLDivElement>;

const usePersistedNumber = (storageKey: string, fallback: number) => {
  const [value, setValue] = useState(() => {
    const saved = localStorage.getItem(storageKey);
    return saved ? parseInt(saved, 10) : fallback;
  });

  useEffect(() => {
    localStorage.setItem(storageKey, value.toString());
  }, [storageKey, value]);

  return [value, setValue] as const;
};

const useSidebarShortcut = (toggleSidebar: () => void) => {
  useEffect(() => {
    const handleShortcut = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName;
      const isTextField =
        target?.isContentEditable ||
        tag === 'INPUT' ||
        tag === 'TEXTAREA' ||
        tag === 'SELECT';
      const isModifierOnly = (e.ctrlKey || e.metaKey) && !e.altKey && !e.shiftKey;
      const isSidebarHotkey = isModifierOnly && e.code === 'KeyL';

      if (!isSidebarHotkey || isTextField) return;

      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation?.();
      e.returnValue = false;
      toggleSidebar();
    };

    window.addEventListener('keydown', handleShortcut, true);
    document.addEventListener('keydown', handleShortcut, true);
    return () => {
      window.removeEventListener('keydown', handleShortcut, true);
      document.removeEventListener('keydown', handleShortcut, true);
    };
  }, [toggleSidebar]);
};

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
  }>({});
  const centerPaneRef = useRef<CenterPaneHandle>(null);
  const topBarRef = useRef<TopBarHandle>(null);

  const selectedIslandId = useIslandStore((state) => state.selectedIslandId);

  useSidebarShortcut(() => setIsSidebarOpen((prev) => !prev));

  // Clear preview when switching islands
  useEffect(() => {
    setPreviewData({});
    setIsPreviewOpen(false);
  }, [selectedIslandId]);

  useEffect(() => {
    const handleToggleConversation = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName;
      const isTextField =
        target?.isContentEditable ||
        tag === 'INPUT' ||
        tag === 'TEXTAREA' ||
        tag === 'SELECT';
      const isModifierOnly = (e.ctrlKey || e.metaKey) && !e.altKey && !e.shiftKey;
      if (!isModifierOnly || isTextField) return;
      if (e.code !== 'KeyO') return;

      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation?.();
      e.returnValue = false;
      setIsConversationOpen((prev) => !prev);
    };

    window.addEventListener('keydown', handleToggleConversation, true);
    document.addEventListener('keydown', handleToggleConversation, true);
    return () => {
      window.removeEventListener('keydown', handleToggleConversation, true);
      document.removeEventListener('keydown', handleToggleConversation, true);
    };
  }, []);

  useEffect(() => {
    const handleQuickAdd = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName;
      const isTextField =
        target?.isContentEditable ||
        tag === 'INPUT' ||
        tag === 'TEXTAREA' ||
        tag === 'SELECT';
      const isModifierOnly = (e.ctrlKey || e.metaKey) && !e.altKey && !e.shiftKey;
      if (!isModifierOnly || isTextField) return;
      // Check for "+" key (both regular and numpad)
      if (e.key !== '+' && e.key !== '=') return;

      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation?.();
      e.returnValue = false;
      setIsQuickAddOpen(true);
    };

    window.addEventListener('keydown', handleQuickAdd, true);
    document.addEventListener('keydown', handleQuickAdd, true);
    return () => {
      window.removeEventListener('keydown', handleQuickAdd, true);
      document.removeEventListener('keydown', handleQuickAdd, true);
    };
  }, []);

  useEffect(() => {
    const handleAddTelegram = () => {
      // TODO: Implement Telegram account dialog
      console.log('Add Telegram account - coming soon');
    };

    window.addEventListener('centerpane:add-telegram', handleAddTelegram);

    return () => {
      window.removeEventListener('centerpane:add-telegram', handleAddTelegram);
    };
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
                  const { url, title, tileId, filePath, type } = target || {};

                  if (filePath && type === 'file') {
                    const { category } = detectFileType(filePath);
                    if (category === 'pdf') {
                      setPreviewData({
                        url: toFileUrl(filePath),
                        title,
                        tileId,
                        filePath,
                        type,
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

import React, { useState, useEffect, useRef } from 'react';
import './styles/globals.css';
import { TopBar, TopBarHandle } from './components/layout/topbar';
import { LeftSidebar } from './components/layout/leftsidebar';
import { CenterPane, CenterPaneHandle } from './components/layout/centerpane';
import { PreviewPane } from './components/layout/previewpane';
import { AssistantPane } from './components/layout/assistantpane';
import { QuickAddPopup } from './components/dialogs/QuickAddPopup';

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
  const [sidebarWidth, setSidebarWidth] = usePersistedNumber('ocean-sidebar-width', 220);
  const [isPreviewOpen, setIsPreviewOpen] = useState(true);
  const [previewWidth, setPreviewWidth] = usePersistedNumber('ocean-preview-width', 320);
  const [isConversationOpen, setIsConversationOpen] = useState(true);
  const [conversationWidth, setConversationWidth] = usePersistedNumber('ocean-conversation-width', 256);
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const centerPaneRef = useRef<CenterPaneHandle>(null);
  const topBarRef = useRef<TopBarHandle>(null);

  useSidebarShortcut(() => setIsSidebarOpen((prev) => !prev));

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


  const startResizingSidebar: ResizeHandler = (e) => {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = sidebarWidth;
    const minWidth = 200;
    const maxWidth = 400;

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
    const minWidth = 280;
    const maxWidth = 600;

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

  const startResizingConversation: ResizeHandler = (e) => {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = conversationWidth;
    const minWidth = 200;
    const maxWidth = 500;

    const onMouseMove = (moveEvent: MouseEvent) => {
      const delta = startX - moveEvent.clientX;
      const nextWidth = Math.min(maxWidth, Math.max(minWidth, startWidth + delta));
      setConversationWidth(nextWidth);
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
    <div className="h-screen flex flex-col bg-slate-50">
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
          className="flex-1 flex transition-all duration-200"
          style={{ marginLeft: isSidebarOpen ? sidebarWidth : 0 }}
        >
          <CenterPane
            ref={centerPaneRef}
            onObjectClick={() => setIsPreviewOpen(true)}
            onCanvasEmptyClick={handleCanvasEmptyClick}
          />
          <PreviewPane
            isOpen={isPreviewOpen}
            onClose={() => setIsPreviewOpen(false)}
            width={previewWidth}
            onResizeStart={startResizingPreview}
          />
          <AssistantPane
            isOpen={isConversationOpen}
            onClose={() => setIsConversationOpen(false)}
            width={conversationWidth}
            onResizeStart={startResizingConversation}
          />
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

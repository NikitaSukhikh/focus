// Root app component with sidebar and chat

import React, { useState } from 'react';
import './styles/globals.css';
import { MainLayout } from './components/Layout';
import { Sidebar } from './components/Sidebar';
import { ChatWindow } from './components/Chat';
import { Menu } from 'lucide-react';
import { GoogleAuthModal, IntegrationsSettings } from './components/Settings';

export function App() {
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [sidebarKey, setSidebarKey] = useState(0); // Force sidebar refresh
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(300);
  const [showGoogleAuth, setShowGoogleAuth] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const startResizing: React.MouseEventHandler<HTMLDivElement> = (e) => {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = sidebarWidth;
    const minWidth = 200;
    const maxWidth = 420;

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

  const handleSelectConversation = (id: string | null) => {
    setCurrentConversationId(id);
  };

  const handleNewConversation = () => {
    setCurrentConversationId(null);
    setIsSidebarOpen(true);
  };

  const handleConversationCreated = (id: string) => {
    // When a new conversation is created, update sidebar
    setCurrentConversationId(id);
    setSidebarKey(prev => prev + 1); // Force sidebar to reload conversations
  };

  return (
    <MainLayout
      onLinkGoogle={() => setShowGoogleAuth(true)}
      onOpenSettings={() => setShowSettings(true)}
    >
      <div className="flex h-full relative">
        {!isSidebarOpen && (
          <div className="fixed left-3 top-12 z-40 flex items-center space-x-2">
            <button
              onClick={() => setIsSidebarOpen(true)}
            className="
              inline-flex items-center space-x-2 px-3 h-10
              bg-gray-900/90 text-gray-100 text-sm
              border border-gray-700 shadow-lg rounded-full
              hover:border-gray-500 hover:bg-gray-900 transition-colors
            "
            title="Open sidebar"
          >
            <Menu size={18} />
          </button>
         </div>
        )}
        {isSidebarOpen && (
          <div
            className="fixed inset-0 bg-black/30 md:hidden z-20"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}
        <Sidebar
          key={sidebarKey}
          currentConversationId={currentConversationId}
          onSelectConversation={handleSelectConversation}
          onNewConversation={handleNewConversation}
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
          width={sidebarWidth}
          onResizeStart={startResizing}
        />
        <div
          className="flex-1 relative transition-all duration-200 px-4 md:px-8 flex justify-end"
          style={{ marginLeft: isSidebarOpen ? sidebarWidth : 0 }}
        >
          <div className="w-full max-w-6xl">
            <ChatWindow
              conversationId={currentConversationId}
              onConversationCreated={handleConversationCreated}
            />
          </div>
        </div>
      </div>
      <GoogleAuthModal open={showGoogleAuth} onClose={() => setShowGoogleAuth(false)} />
      {showSettings && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Settings</h2>
              <button
                onClick={() => setShowSettings(false)}
                className="text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 text-2xl"
                aria-label="Close"
              >
                ×
              </button>
            </div>
            <div className="overflow-y-auto max-h-[calc(90vh-4rem)]">
              <IntegrationsSettings />
            </div>
          </div>
        </div>
      )}
    </MainLayout>
  );
}

export default App;

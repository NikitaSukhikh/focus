import React, { useEffect, useRef, useState } from 'react';
import { X, MessageCircle, ChevronDown, Edit2, Trash2 } from 'lucide-react';
import { Message } from '../../../features/assistant/models/assistant';
import { MessageList } from '../../../features/assistant/components/MessageList';
import { AssistantInput } from '../../../features/assistant/components/AssistantInput';

interface AssistantPaneProps {
  isOpen: boolean;
  onClose: () => void;
  width: number;
  onResizeStart: React.MouseEventHandler<HTMLDivElement>;
}

export function AssistantPane({ isOpen, onClose, width, onResizeStart }: AssistantPaneProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [isChatListExpanded, setIsChatListExpanded] = useState(false);
  const [contextMenuChatId, setContextMenuChatId] = useState<number | null>(null);
  const [contextMenuPosition, setContextMenuPosition] = useState<{ x: number; y: number }>({
    x: 0,
    y: 0,
  });
  const chatListRef = useRef<HTMLDivElement | null>(null);
  const contextMenuRef = useRef<HTMLDivElement | null>(null);

  const handleSendMessage = async (text: string) => {
    // Add user message
    const userMessage: Message = { role: 'user', content: text };
    setMessages((prev) => [...prev, userMessage]);
    setIsSending(false);
    console.info('[Ocean] Wire up real assistant calls here.');
  };

  const openContextMenu = (chatId: number, x: number, y: number) => {
    setContextMenuChatId(chatId);
    setContextMenuPosition({ x, y });
  };

  const _handleChatContextMenu = (e: React.MouseEvent, chatId: number) => {
    e.preventDefault();
    openContextMenu(chatId, e.clientX, e.clientY);
  };

  const handleCloseContextMenu = () => {
    setContextMenuChatId(null);
  };

  const handleRenameChat = (chatId: number) => {
    console.log('Rename chat:', chatId);
    setContextMenuChatId(null);
  };

  const handleDeleteChat = (chatId: number) => {
    console.log('Delete chat:', chatId);
    setContextMenuChatId(null);
  };

  useEffect(() => {
    if (contextMenuChatId === null) return;

    const handleClickOutside = (event: MouseEvent) => {
      const menu = contextMenuRef.current;
      if (!menu || !menu.contains(event.target as Node)) {
        handleCloseContextMenu();
      }
    };

    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        handleCloseContextMenu();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEsc);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEsc);
    };
  }, [contextMenuChatId]);

  // Reset transient UI state when pane is closed to avoid stale overlays/listeners.
  useEffect(() => {
    if (!isOpen) {
      setIsChatListExpanded(false);
      setContextMenuChatId(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <>
      {/* Resize handle */}
      <div
        className="w-1 cursor-col-resize hover:bg-blue-500/50 transition-colors"
        onMouseDown={onResizeStart}
      />

      <aside className="bg-slate-50 border-l border-slate-200 flex flex-col h-full relative" style={{ width: `${width}px` }}>
      {/* Header */}
      <div className="bg-white border-b border-slate-200 relative z-10">
        <div className="flex items-center justify-between p-4">
          <button
            onClick={() => setIsChatListExpanded(!isChatListExpanded)}
            className="flex items-center gap-2 flex-1 text-left hover:bg-slate-50 -m-2 p-2 rounded-lg transition-colors"
          >
            <MessageCircle size={18} className="text-blue-600" />
            <h2 className="text-lg font-semibold text-slate-900">Assistant</h2>
            <ChevronDown size={16} className={`text-slate-600 transition-transform ${isChatListExpanded ? 'rotate-180' : ''}`} />
          </button>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600 hover:text-slate-900 transition-colors"
            title="Close assistant"
          >
            <X size={18} />
          </button>
        </div>

        {/* Chat List Dropdown - Positioned below header */}
        {isChatListExpanded && (
          <div
            ref={chatListRef}
            className="absolute top-full left-0 right-0 max-h-[50vh] overflow-y-auto bg-white shadow-lg border-b border-slate-200 rounded-b-lg z-20"
          >
            <div className="px-4 py-3 text-sm text-slate-500">No chats available.</div>
          </div>
        )}
      </div>

      {/* Messages Area */}
      <MessageList messages={messages} isSending={isSending} />

      {/* Input Area */}
      <AssistantInput
        onSendMessage={handleSendMessage}
        disabled={isSending}
        placeholder="Ask me anything..."
      />

      {/* Chat context menu */}
      {contextMenuChatId !== null && (
        <div
          ref={contextMenuRef}
          className="fixed z-50 w-40 max-h-60 overflow-y-auto bg-white rounded-lg shadow-lg border border-slate-200 py-1"
          style={{ left: `${contextMenuPosition.x}px`, top: `${contextMenuPosition.y}px` }}
        >
          <button
            onClick={() => handleRenameChat(contextMenuChatId)}
            className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-100 transition-colors flex items-center gap-2"
          >
            <Edit2 size={14} />
            Rename
          </button>
          <button
            onClick={() => handleDeleteChat(contextMenuChatId)}
            className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 transition-colors flex items-center gap-2"
          >
            <Trash2 size={14} />
            Delete
          </button>
        </div>
      )}
    </aside>
    </>
  );
}

// Sidebar with conversation history (Claude-style)

import React, { useState, useEffect } from 'react';
import { MessageSquare, Plus, Trash2, Edit2, Check, X, Folder, ChevronDown, ChevronRight } from 'lucide-react';
import { BACKEND_URL } from '../../config/backend';

interface ConversationSummary {
  id: string;
  title: string;
  preview: string;
  updated_at: string;
  message_count: number;
}

interface SidebarProps {
  currentConversationId: string | null;
  onSelectConversation: (id: string | null) => void;
  onNewConversation: () => void;
  isOpen: boolean;
  onClose: () => void;
  width: number;
  onResizeStart: (e: React.MouseEvent<HTMLDivElement>) => void;
}

export function Sidebar({
  currentConversationId,
  onSelectConversation,
  onNewConversation,
  isOpen,
  onClose,
  width,
  onResizeStart
}: SidebarProps) {
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [showChats, setShowChats] = useState(true);

  async function loadConversations() {
    try {
      const response = await fetch(`${BACKEND_URL}/conversations`);
      if (response.ok) {
        const data = await response.json();
        setConversations(data);
      } else {
        console.error('Failed to load conversations:', response.status);
      }
    } catch (error) {
      console.error('Failed to load conversations:', error);
    } finally {
      setLoading(false);
    }
  }

  // Load conversations on mount
  useEffect(() => {
    loadConversations();
  }, []);

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Delete this conversation?')) return;

    try {
      const response = await fetch(`${BACKEND_URL}/conversations/${id}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        setConversations(conversations.filter(c => c.id !== id));
        if (currentConversationId === id) {
          onSelectConversation(null);
        }
      }
    } catch (error) {
      console.error('Failed to delete conversation:', error);
    }
  };

  const startEdit = (conv: ConversationSummary, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(conv.id);
    setEditTitle(conv.title);
  };

  const saveEdit = async (id: string) => {
    try {
      const response = await fetch(`${BACKEND_URL}/conversations/${id}/title`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: editTitle }),
      });
      if (response.ok) {
        setConversations(conversations.map(c =>
          c.id === id ? { ...c, title: editTitle } : c
        ));
        setEditingId(null);
      }
    } catch (error) {
      console.error('Failed to update title:', error);
    }
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditTitle('');
  };

  const formatDate = (isoDate: string): string => {
    const date = new Date(isoDate);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <div
      className={`
        bg-gray-900 text-gray-100 flex flex-col h-screen
        transform transition-transform duration-200 fixed left-0 z-30
        overflow-hidden
        ${isOpen ? 'translate-x-0 top-8 h-[calc(100vh-2rem)]' : 'w-[120px] translate-x-0 top-8 h-[calc(100vh-2rem)]'}
      `}
      style={{ width: isOpen ? width : 70 }}
    >
      {isOpen && (
        <>
          <div
            className="absolute right-0 top-0 h-full w-1 cursor-col-resize z-30"
            onMouseDown={onResizeStart}
            title="Drag to resize"
          />
          <div
            className="absolute top-0 h-full w-1 cursor-col-resize z-30"
            style={{ right: 8 }}
            onMouseDown={onResizeStart}
            title="Drag to resize"
          />
        </>
      )}
      {/* Header */}
      <div className="p-4 flex items-center space-x-2 sticky top-0 z-20 bg-gray-900">
        {isOpen && (
          <>
            <button
              onClick={onNewConversation}
              className="flex-1 flex items-center justify-center space-x-2 px-4 h-10 rounded-lg transition-colors
                bg-gray-900/90 text-gray-100 border border-gray-700
                hover:border-gray-500 hover:bg-gray-800"
            >
              <Plus size={18} />
              <span className="text-sm font-medium">New Chat</span>
            </button>
            <button
              onClick={onClose}
              className="px-3 h-10 w-28 rounded-lg transition-colors flex items-center space-x-2
                bg-gray-900/90 text-gray-100 border border-gray-700
                hover:border-gray-500 hover:bg-gray-800"
              title="Close sidebar"
            >
              <X size={16} />
              <span className="text-sm font-medium">Close</span>
            </button>
          </>
        )}
      </div>

      {/* Conversations List */}
      {isOpen && (
        <div className="flex-1 overflow-y-auto sidebar-scroll">
          <button
            onClick={() => setShowChats(!showChats)}
            className="w-full px-3 py-2 flex items-center space-x-2 text-left text-gray-200 hover:bg-gray-800 transition-colors"
          >
            {showChats ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            <Folder size={16} />
            <span className="text-sm font-medium">Chats</span>
          </button>

          {showChats && (
            <>
              {loading ? (
                <div className="p-4 text-center text-gray-500">
                  Loading...
                </div>
              ) : conversations.length === 0 ? (
                <div className="p-4 text-center text-gray-500">
                  No conversations yet
                </div>
              ) : (
                <div className="py-2 pl-6 pr-0">
                  {conversations.map((conv) => (
                    <div
                      key={conv.id}
                      onClick={() => onSelectConversation(conv.id)}
                      className={`
                        group px-2 py-2 mx-0 my-1 rounded-lg cursor-pointer pr-0
                        transition-colors relative
                        ${currentConversationId === conv.id
                          ? 'bg-gray-800 text-white'
                          : 'hover:bg-gray-800/50 text-gray-300'
                        }
                      `}
                    >
                      {editingId === conv.id ? (
                        <div className="flex items-center space-x-1" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="text"
                            value={editTitle}
                            onChange={(e) => setEditTitle(e.target.value)}
                            className="flex-1 bg-gray-700 text-white px-2 py-1 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') saveEdit(conv.id);
                              if (e.key === 'Escape') cancelEdit();
                            }}
                          />
                          <button
                            onClick={() => saveEdit(conv.id)}
                            className="p-1 hover:bg-gray-600 rounded"
                          >
                            <Check size={14} />
                          </button>
                          <button
                            onClick={cancelEdit}
                            className="p-1 hover:bg-gray-600 rounded"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-start justify-between">
                            <div className="flex items-center space-x-1 flex-1 min-w-0">
                              <MessageSquare size={14} className="flex-shrink-0" />
                              <div className="flex-1 min-w-0">
                                <div className="text-sm font-semibold text-gray-100 truncate">
                                  {conv.title}
                                </div>
                            <div className="text-xs text-gray-500 mt-0.5"></div>
                          </div>
                        </div>
                            <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={(e) => startEdit(conv, e)}
                                className="p-1 hover:bg-gray-700 rounded"
                                title="Rename"
                              >
                                <Edit2 size={14} />
                              </button>
                              <button
                                onClick={(e) => handleDelete(conv.id, e)}
                                className="p-1 hover:bg-red-600 rounded"
                                title="Delete"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Footer */}
      {isOpen && (
        <div className="p-4 text-xs text-gray-500">
          <div className="flex items-center justify-between">
            <span>Alfy v0.1</span>
            <span>{conversations.length} chats</span>
          </div>
        </div>
      )}
    </div>
  );
}

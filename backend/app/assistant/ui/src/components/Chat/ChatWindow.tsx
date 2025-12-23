// Simplified Chat window with direct LLM chat and conversation persistence

import React, { useEffect, useRef, useState } from 'react';
import { Sparkles, AlertCircle } from 'lucide-react';
import { BACKEND_URL } from '../../config/backend';
import { InputBar } from './InputBar';
import type { AttachedFile } from './FileAttachment';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface ChatWindowProps {
  conversationId: string | null;
  onConversationCreated?: (id: string) => void;
}

export function ChatWindow({ conversationId, onConversationCreated }: ChatWindowProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [backendOnline, setBackendOnline] = useState<boolean | null>(null);
  const [currentConvId, setCurrentConvId] = useState<string | null>(conversationId);
  const listRef = useRef<HTMLDivElement>(null);

  async function loadConversation(id: string) {
    try {
      // Ensure no "thinking" indicator shows when loading old conversations
      setIsSending(false);
      const response = await fetch(`${BACKEND_URL}/conversations/${id}`);
      if (response.ok) {
        const conversation = await response.json();
        setMessages(conversation.messages);
      }
    } catch (error) {
      console.error('Failed to load conversation:', error);
    }
  }

  // Load conversation when conversationId changes
  useEffect(() => {
    if (conversationId) {
      loadConversation(conversationId);
      setCurrentConvId(conversationId);
    } else {
      // New conversation - clear messages
      setMessages([]);
      setCurrentConvId(null);
    }
  }, [conversationId]);

  // Check backend health on mount
  useEffect(() => {
    fetch(`${BACKEND_URL}/health`)
      .then(res => setBackendOnline(res.ok))
      .catch(() => setBackendOnline(false));
  }, []);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSendMessage = async (text: string, files: AttachedFile[] = []) => {
    if (isSending) return;

    const attachmentLines =
      files.length > 0
        ? files.map((file) => {
            const location = file.uploadedPath ? ` (${file.uploadedPath})` : '';
            return `- ${file.name}${location}`;
          })
        : [];

    const content =
      text.trim() ||
      (files.length > 0
        ? "I've attached some files for you to analyze."
        : '');

    const fullMessage =
      attachmentLines.length > 0
        ? `${content}\n\nAttached files:\n${attachmentLines.join('\n')}`
        : content;

    if (!fullMessage) return;

    setIsSending(true);
    const userMessage: Message = { role: 'user', content: fullMessage };
    setMessages((prev) => [...prev, userMessage]);

    try {
      const response = await fetch(`${BACKEND_URL}/chat-with-tools`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: fullMessage,
          conversation_id: currentConvId,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setMessages((prev) => [...prev, { role: 'assistant', content: data.reply }]);
        setBackendOnline(true);

        // If this was a new conversation, update the ID
        if (!currentConvId) {
          setCurrentConvId(data.conversation_id);
          onConversationCreated?.(data.conversation_id);
        }
      } else {
        throw new Error(`HTTP ${response.status}`);
      }
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Failed to reach backend';
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: `Backend error: ${error}` }
      ]);
      setBackendOnline(false);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-white">
      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Backend status banner */}
        {backendOnline === false && (
          <div className="bg-red-50 text-red-700 border-b border-red-200 px-4 py-2 flex items-center space-x-2">
            <AlertCircle size={16} />
            <span>Backend unreachable. Is FastAPI running at {BACKEND_URL}?</span>
          </div>
        )}

        {/* Messages Container */}
        <div className="flex-1 overflow-y-auto px-4 py-6 pb-44" ref={listRef}>
          <div className="max-w-4xl ml-auto space-y-4">
            {messages.length === 0 ? (
              <div className="text-center py-12">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 text-white mb-4">
                  <Sparkles size={32} />
                </div>
                <h2 className="text-2xl font-semibold text-gray-900 mb-2">
                  Welcome to Alfy
                </h2>
                <p className="text-gray-600 max-w-md mx-auto">
                  Your AI assistant with file system access.
                  <br />
                  I can search for files, read documents, and help you organize your files!
                </p>
              </div>
            ) : (
              messages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`max-w-3xl px-4 py-3 rounded-xl shadow-sm ${
                    msg.role === 'user'
                      ? 'ml-auto bg-white text-gray-900 border border-gray-200 text-right'
                      : 'mr-auto bg-white text-gray-900 border border-gray-200'
                  }`}
                >
                  <div className="whitespace-pre-wrap">{msg.content}</div>
                </div>
              ))
            )}
            {isSending && (
              <div className="max-w-3xl mr-auto bg-white text-gray-900 border border-gray-200 px-4 py-3 rounded-xl shadow-sm">
                <div className="flex items-center space-x-2">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                  </div>
                  <span className="text-sm text-gray-500">Thinking...</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Input Area */}
        <div className="border-t border-gray-200 bg-white p-4 sticky bottom-36">
          <div className="max-w-3xl ml-auto">
            <InputBar
              onSendMessage={handleSendMessage}
              disabled={isSending}
              placeholder="Ask Alfy anything..."
            />
          </div>
        </div>
      </div>
    </div>
  );
}

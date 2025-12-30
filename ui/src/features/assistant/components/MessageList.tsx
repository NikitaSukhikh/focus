import React, { useEffect, useRef } from 'react';
import { MessageCircle } from 'lucide-react';
import { Message } from '../models/assistant';
import { MessageBubble } from './MessageBubble';

interface MessageListProps {
  messages: Message[];
  isSending: boolean;
}

export function MessageList({ messages, isSending }: MessageListProps) {
  const listRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages, isSending]);

  return (
    <div className="flex-1 overflow-y-auto custom-scroll px-4 py-4" ref={listRef}>
      <div className="space-y-3">
        {messages.length === 0 ? (
          <div className="text-center py-12">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 text-white mb-3">
              <MessageCircle size={24} />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 mb-1">
              Start a Chat
            </h3>
            <p className="text-sm text-slate-600 max-w-xs mx-auto">
              Ask questions about your spaces and objects
            </p>
          </div>
        ) : (
          messages.map((msg, idx) => <MessageBubble key={idx} message={msg} />)
        )}
        {isSending && (
          <div className="max-w-[85%] mr-auto bg-white text-slate-900 border border-slate-200 px-4 py-3 rounded-xl shadow-sm">
            <div className="flex items-center space-x-2">
              <div className="flex space-x-1">
                <div
                  className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"
                  style={{ animationDelay: '0ms' }}
                ></div>
                <div
                  className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"
                  style={{ animationDelay: '150ms' }}
                ></div>
                <div
                  className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"
                  style={{ animationDelay: '300ms' }}
                ></div>
              </div>
              <span className="text-sm text-slate-500">Thinking...</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

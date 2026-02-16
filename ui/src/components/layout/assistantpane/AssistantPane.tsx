import React, { useState } from 'react';
import { X, MessageCircle } from 'lucide-react';
import { Z_INDEX } from '@/constants/zIndex';
import { Message } from '@/features/assistant/models/assistant';
import { MessageList } from '@/features/assistant/components/MessageList';
import { AssistantInput } from '@/features/assistant/components/AssistantInput';
import { FONT_ROLES } from '@/styles/fontManager';

interface AssistantPaneProps {
  isOpen: boolean;
  onClose: () => void;
  onResizeStart: React.MouseEventHandler<HTMLDivElement>;
}

// AssistantPane renders the right-side assistant chat column with message history and input when the assistant panel is open.
export function AssistantPane({ isOpen, onClose, onResizeStart }: AssistantPaneProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isSending, setIsSending] = useState(false);

  const handleSendMessage = async (text: string) => {
    // Add user message
    const userMessage: Message = { role: 'user', content: text };
    setMessages((prev) => [...prev, userMessage]);
    setIsSending(false);
    console.info('[Focus] Wire up real assistant calls here.');
  };

  if (!isOpen) return null;

  return (
    <div className="flex h-full w-full">
      {/* Resize handle */}
      <div
        className="w-1 cursor-col-resize hover:bg-blue-500/50 transition-colors"
        onMouseDown={onResizeStart}
      />

      <aside
        className="glass-panel flex flex-col h-full relative flex-1 min-w-0 pb-6"
        style={{
          flex: '1 1 auto',
          background: 'var(--background-light)',
          borderLeft: '1px solid var(--color-border-strong)',
        }}
      >
      {/* Header */}
      <div className="relative" style={{ zIndex: Z_INDEX.BASE_RAISED, borderBottom: '1px solid var(--color-border-subtle)' }}>
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-2 flex-1 text-left -m-2 p-2">
            <MessageCircle size={18} style={{ color: 'var(--primary-color)' }} />
            <h2
              style={{
                ...FONT_ROLES.paneTitle,
                color: 'var(--primary-color)',
                textShadow: '0 0 10px var(--glow)',
              }}
            >
              Assistant
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg transition-colors"
            style={{
              color: 'var(--color-text-secondary)',
              transition: 'all var(--transition-base)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--glass-bg)';
              e.currentTarget.style.color = 'var(--primary-color)';
              e.currentTarget.style.boxShadow = '0 0 10px var(--shadow)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.color = 'var(--color-text-secondary)';
              e.currentTarget.style.boxShadow = 'none';
            }}
            title="Close assistant"
          >
            <X size={18} />
          </button>
        </div>

      </div>

      {/* Messages Area */}
      <MessageList messages={messages} isSending={isSending} />

      {/* Input Area */}
      <AssistantInput
        onSendMessage={handleSendMessage}
        disabled={isSending}
        placeholder="Ask me anything..."
      />
      </aside>
    </div>
  );
}

import React, { useState } from 'react';
import { X, MessageCircle } from 'lucide-react';
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

  const handleSendMessage = async (text: string) => {
    // Add user message
    const userMessage: Message = { role: 'user', content: text };
    setMessages((prev) => [...prev, userMessage]);
    setIsSending(false);
    console.info('[Ocean] Wire up real assistant calls here.');
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Resize handle */}
      <div
        className="w-1 cursor-col-resize hover:bg-blue-500/50 transition-colors"
        onMouseDown={onResizeStart}
      />

      <aside
        className="bg-slate-50 border-l border-slate-200 flex flex-col h-full relative flex-none"
        style={{ width: `${width}px`, flex: '0 0 auto' }}
      >
      {/* Header */}
      <div className="bg-white border-b border-slate-200 relative z-10">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-2 flex-1 text-left -m-2 p-2">
            <MessageCircle size={18} className="text-blue-600" />
            <h2 className="text-lg font-semibold text-slate-900">Assistant</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600 hover:text-slate-900 transition-colors"
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
    </>
  );
}

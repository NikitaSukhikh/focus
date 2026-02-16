import React from 'react';
import { Message } from '@/features/assistant/models/assistant';

interface MessageBubbleProps {
  message: Message;
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === 'user';

  return (
    <div
      className={`max-w-[85%] px-4 py-3 rounded-xl shadow-sm ${
        isUser
          ? 'ml-auto bg-blue-600 text-white'
          : 'mr-auto bg-white text-slate-900 border border-slate-200'
      }`}
    >
      <div className="whitespace-pre-wrap text-sm leading-relaxed">
        {message.content}
      </div>
    </div>
  );
}

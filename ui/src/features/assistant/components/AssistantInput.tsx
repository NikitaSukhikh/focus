import React, { useState, useRef, useEffect } from 'react';
import { Send } from 'lucide-react';

interface AssistantInputProps {
  onSendMessage: (_message: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

export function AssistantInput({
  onSendMessage,
  disabled = false,
  placeholder = 'Type your message...',
}: AssistantInputProps) {
  const [message, setMessage] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`;
    }
  }, [message]);

  const handleSend = () => {
    const trimmedMessage = message.trim();
    if (trimmedMessage && !disabled) {
      onSendMessage(trimmedMessage);
      setMessage('');
      // Reset textarea height
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Send on Enter (without Shift)
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="p-3" style={{ borderTop: '1px solid var(--color-border-subtle)', background: 'var(--background-light)' }}>
      <div className="flex items-end gap-2">
        <textarea
          ref={textareaRef}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          className="flex-1 resize-none rounded-lg px-3 py-2 text-sm focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed min-h-[40px] max-h-[120px]"
          style={{
            background: 'var(--glass-bg)',
            color: 'var(--color-text-primary)',
            border: '1px solid var(--color-border-subtle)',
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = 'var(--primary-color)';
            e.currentTarget.style.boxShadow = '0 0 10px var(--shadow)';
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = 'var(--color-border-subtle)';
            e.currentTarget.style.boxShadow = 'none';
          }}
          rows={1}
        />
        <button
          onClick={handleSend}
          disabled={!message.trim() || disabled}
          className="flex-shrink-0 p-2.5 rounded-lg transition-colors"
          style={{
            background: !message.trim() || disabled ? 'var(--glass-bg)' : 'var(--primary-color)',
            color: !message.trim() || disabled ? 'var(--color-text-muted)' : 'var(--background-dark)',
            border: '1px solid var(--color-border-subtle)',
            cursor: !message.trim() || disabled ? 'not-allowed' : 'pointer',
            opacity: !message.trim() || disabled ? 0.5 : 1,
          }}
          onMouseEnter={(e) => {
            if (message.trim() && !disabled) {
              e.currentTarget.style.boxShadow = '0 0 15px var(--glow)';
              e.currentTarget.style.transform = 'scale(1.05)';
            }
          }}
          onMouseLeave={(e) => {
            if (message.trim() && !disabled) {
              e.currentTarget.style.boxShadow = 'none';
              e.currentTarget.style.transform = 'scale(1)';
            }
          }}
          title="Send message (Enter)"
        >
          <Send size={18} />
        </button>
      </div>
      <div className="mt-1.5 text-xs" style={{ color: 'var(--color-text-muted)' }}>
        Press Enter to send, Shift+Enter for new line
      </div>
    </div>
  );
}

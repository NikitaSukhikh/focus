import React, { useRef, useEffect } from 'react';
import { Z_INDEX } from '../../../constants/zIndex';

interface InlineTextEditorProps {
  x: number;
  y: number;
  content: string;
  onContentChange: (content: string) => void;
  onSave: () => void;
  onCancel: () => void;
}

export const InlineTextEditor: React.FC<InlineTextEditorProps> = ({
  x,
  y,
  content,
  onContentChange,
  onSave,
  onCancel,
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.focus();
      // Place cursor at the end
      textareaRef.current.setSelectionRange(content.length, content.length);
      // Initial auto-resize
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
      textareaRef.current.style.width = 'auto';
      const contentWidth = textareaRef.current.scrollWidth;
      textareaRef.current.style.width = Math.max(200, contentWidth + 20) + 'px';
    }
  }, [content.length, x, y]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Escape to cancel
    if (e.key === 'Escape') {
      e.preventDefault();
      onCancel();
      return;
    }

    // Ctrl/Cmd + Enter to save
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      onSave();
      return;
    }
  };

  const handleBlur = () => {
    // Auto-save on blur if there's content
    if (content.trim()) {
      onSave();
    } else {
      onCancel();
    }
  };

  return (
    <textarea
      ref={textareaRef}
      data-inline-editor
      value={content}
      onChange={(e) => onContentChange(e.target.value)}
      onKeyDown={handleKeyDown}
      onBlur={handleBlur}
      placeholder="Start typing..."
      maxLength={10000}
      style={{
        position: 'absolute',
        left: x,
        top: y,
        border: 'none',
        outline: 'none',
        resize: 'none',
        padding: '0',
        margin: '0',
        fontFamily: 'inherit',
        fontSize: '16px',
        fontWeight: 500,
        lineHeight: '1.6',
        background: 'transparent',
        color: 'var(--color-text-primary)',
        width: 'auto',
        minWidth: '200px',
        height: 'auto',
        overflow: 'hidden',
        zIndex: Z_INDEX.CONTENT_DRAGGING,
      }}
      rows={1}
      onInput={(e) => {
        // Auto-resize textarea based on content
        const target = e.target as HTMLTextAreaElement;
        target.style.height = 'auto';
        target.style.height = target.scrollHeight + 'px';
        target.style.width = 'auto';
        const contentWidth = target.scrollWidth;
        target.style.width = Math.max(200, contentWidth + 20) + 'px';
      }}
    />
  );
};

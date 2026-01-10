import React, { useRef, useEffect } from 'react';
import { Z_INDEX } from '../../../constants/zIndex';
import { TEXT_WIDTH, TEXT_FONT_SIZE, TEXT_FONT_WEIGHT, TEXT_LINE_HEIGHT } from './tile/dimensionHelpers';

interface InlineTextEditorProps {
  x: number;
  y: number;
  content: string;
  onContentChange: (content: string) => void;
  onSave: () => void;
  onCancel: () => void;
}

// InlineTextEditor is an absolutely positioned textarea used to edit or create text notes directly on the canvas.
export const InlineTextEditor: React.FC<InlineTextEditorProps> = ({
  x,
  y,
  content,
  onContentChange,
  onSave,
  onCancel,
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const isSavingRef = useRef(false);
  const blurTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Reset saving flag when component mounts
    isSavingRef.current = false;

    if (textareaRef.current) {
      textareaRef.current.focus();
      // Place cursor at the end (only on mount)
      textareaRef.current.setSelectionRange(content.length, content.length);
      // Initial auto-resize
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
      // Set initial width
      textareaRef.current.style.width = `${TEXT_WIDTH}px`;
    }

    // Cleanup on unmount
    return () => {
      if (blurTimeoutRef.current) {
        clearTimeout(blurTimeoutRef.current);
      }
    };
    // Only run on mount (x, y change = new editor instance)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [x, y]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Escape to cancel
    if (e.key === 'Escape') {
      e.preventDefault();
      isSavingRef.current = true;
      onCancel();
      return;
    }

    // Ctrl/Cmd + Enter to save
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      isSavingRef.current = true;
      onSave();
      // Blur to exit edit mode after explicit save
      requestAnimationFrame(() => {
        textareaRef.current?.blur();
      });
      return;
    }
  };

  const handleBlur = () => {
    // Prevent double-save if already saving
    if (isSavingRef.current) return;

    // Clear any existing timeout
    if (blurTimeoutRef.current) {
      clearTimeout(blurTimeoutRef.current);
    }

    // Use setTimeout to ensure blur happens after any click events
    blurTimeoutRef.current = setTimeout(() => {
      if (isSavingRef.current) return;

      isSavingRef.current = true;

      // Auto-save on blur if there's content
      if (content.trim()) {
        onSave();
      } else {
        onCancel();
      }
    }, 0);
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
        outline: 'none',
        resize: 'none',
        padding: '6px 8px',
        margin: '0',
        fontFamily: 'inherit',
        fontSize: `${TEXT_FONT_SIZE}px`,
        fontWeight: TEXT_FONT_WEIGHT,
        lineHeight: TEXT_LINE_HEIGHT,
        background: 'white',
        borderRadius: '8px',
        boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
        border: '1px solid var(--color-border-strong)',
        color: 'var(--color-text-primary)',
        width: `${TEXT_WIDTH}px`,
        height: 'auto',
        overflow: 'hidden',
        whiteSpace: 'pre-wrap',
        wordWrap: 'break-word',
        zIndex: Z_INDEX.CONTENT_DRAGGING,
      }}
      rows={1}
      onInput={(e) => {
        // Auto-resize height only (width is fixed)
        const target = e.target as HTMLTextAreaElement;
        target.style.height = 'auto';
        target.style.height = target.scrollHeight + 'px';
      }}
    />
  );
};

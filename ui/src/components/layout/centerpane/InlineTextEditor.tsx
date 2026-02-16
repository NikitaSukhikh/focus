import React, { useRef, useEffect } from 'react';
import { Z_INDEX } from '@/constants/zIndex';
import { INLINE_EDITOR, TEXT_NOTE_BOX } from '@/constants/objectsDimensions';
import { TYPOGRAPHY_SIZES, TYPOGRAPHY_WEIGHTS } from '@/styles/typographics';

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
      textareaRef.current.style.width = `${INLINE_EDITOR.width}px`;
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
        fontSize: TYPOGRAPHY_SIZES.TEXT_TILE.fontSize,
        fontWeight: TYPOGRAPHY_WEIGHTS.TILE_TITLE,
        lineHeight: TYPOGRAPHY_SIZES.TEXT_TILE.lineHeight,
        background: TEXT_NOTE_BOX.background,
        borderRadius: `${TEXT_NOTE_BOX.borderRadius}px`,
        boxShadow: TEXT_NOTE_BOX.boxShadow,
        border: TEXT_NOTE_BOX.border,
        color: 'var(--color-text-primary)',
        width: `${INLINE_EDITOR.width}px`,
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

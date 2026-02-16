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

const SHARED_TEXT_STYLE = {
  fontFamily: 'inherit',
  fontSize: TYPOGRAPHY_SIZES.TEXT_TILE.fontSize,
  fontWeight: TYPOGRAPHY_WEIGHTS.TILE_TITLE,
  lineHeight: TYPOGRAPHY_SIZES.TEXT_TILE.lineHeight,
  whiteSpace: 'pre',
  padding: `${INLINE_EDITOR.padding.y}px ${INLINE_EDITOR.padding.x}px`,
} as const;

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
  const rulerRef = useRef<HTMLSpanElement>(null);
  const isSavingRef = useRef(false);
  const blurTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const resize = (textarea: HTMLTextAreaElement) => {
    // Height: let scrollHeight drive it
    textarea.style.height = 'auto';
    textarea.style.height = textarea.scrollHeight + 'px';

    // Width: measure longest line via hidden ruler span
    if (rulerRef.current) {
      const longestLine = textarea.value.split('\n').reduce(
        (a, b) => (b.length > a.length ? b : a),
        ''
      );
      rulerRef.current.textContent = longestLine || textarea.placeholder;
      const measured = rulerRef.current.offsetWidth;
      const padX = INLINE_EDITOR.padding.x * 2;
      const clamped = Math.min(
        Math.max(measured + padX, parseFloat(INLINE_EDITOR.minWidth) * 9),
        INLINE_EDITOR.maxWidth
      );
      textarea.style.width = clamped + 'px';
    }
  };

  useEffect(() => {
    isSavingRef.current = false;

    if (textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.setSelectionRange(content.length, content.length);
      resize(textareaRef.current);
    }

    return () => {
      if (blurTimeoutRef.current) clearTimeout(blurTimeoutRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [x, y]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      isSavingRef.current = true;
      onCancel();
      return;
    }
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      isSavingRef.current = true;
      onSave();
      requestAnimationFrame(() => textareaRef.current?.blur());
      return;
    }
  };

  const handleBlur = () => {
    if (isSavingRef.current) return;
    if (blurTimeoutRef.current) clearTimeout(blurTimeoutRef.current);
    blurTimeoutRef.current = setTimeout(() => {
      if (isSavingRef.current) return;
      isSavingRef.current = true;
      if (content.trim()) onSave();
      else onCancel();
    }, 0);
  };

  return (
    <>
      {/* Hidden ruler span used to measure text width */}
      <span
        ref={rulerRef}
        aria-hidden
        style={{
          ...SHARED_TEXT_STYLE,
          position: 'fixed',
          visibility: 'hidden',
          pointerEvents: 'none',
          top: 0,
          left: 0,
        }}
      />
      <textarea
        ref={textareaRef}
        data-inline-editor
        value={content}
        onChange={(e) => onContentChange(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        placeholder="Start typing..."
        maxLength={10000}
        rows={1}
        style={{
          ...SHARED_TEXT_STYLE,
          position: 'absolute',
          left: x,
          top: y,
          resize: 'none',
          margin: '0',
          background: TEXT_NOTE_BOX.background,
          borderRadius: `${TEXT_NOTE_BOX.borderRadius}px`,
          boxShadow: TEXT_NOTE_BOX.boxShadow,
          outline: TEXT_NOTE_BOX.outline,
          outlineOffset: `${TEXT_NOTE_BOX.outlineOffset}px`,
          color: 'var(--color-text-primary)',
          minWidth: INLINE_EDITOR.minWidth,
          maxWidth: `${INLINE_EDITOR.maxWidth}px`,
          width: 'auto',
          height: 'auto',
          overflow: 'hidden',
          zIndex: Z_INDEX.CONTENT_DRAGGING,
        }}
        onInput={(e) => resize(e.target as HTMLTextAreaElement)}
      />
    </>
  );
};

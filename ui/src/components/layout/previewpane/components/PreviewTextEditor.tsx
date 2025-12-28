import React, { useRef, useEffect } from 'react';
import { FONT_ROLES } from '../../../../styles/fontManager';

interface PreviewTextEditorProps {
  content: string;
  onContentChange: (content: string) => void;
  onSave: () => void;
  onCancel: () => void;
  onSaveAndClose?: () => void;
  isFullWindow?: boolean;
  isClosingRef?: React.MutableRefObject<boolean>;
}

// PreviewTextEditor is a textarea for editing text notes within the preview pane
export const PreviewTextEditor: React.FC<PreviewTextEditorProps> = ({
  content,
  onContentChange,
  onSave,
  onCancel,
  onSaveAndClose,
  isFullWindow = false,
  isClosingRef,
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const isSavingRef = useRef(false);
  const hasInitializedSelection = useRef(false);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.focus();

      // Check if there's a stored caret position from double-click
      const storedPosition = (window as any).__previewCaretPosition;
      if (typeof storedPosition === 'number') {
        const position = Math.min(storedPosition, content.length);
        textareaRef.current.setSelectionRange(position, position);
        // Clear the stored position
        delete (window as any).__previewCaretPosition;
        hasInitializedSelection.current = true;
      } else if (!hasInitializedSelection.current) {
        // Default: place cursor at the end
        textareaRef.current.setSelectionRange(content.length, content.length);
        hasInitializedSelection.current = true;
      }
    }
  }, [content.length]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Escape to cancel
    if (e.key === 'Escape') {
      e.preventDefault();
      isSavingRef.current = true;
      onCancel();
      return;
    }

    // Ctrl/Cmd + S to save without closing
    if (e.key === 's' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      onSave();
      return;
    }

    // Ctrl/Cmd + Enter to save and close preview
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      isSavingRef.current = true;
      if (isClosingRef) {
        isClosingRef.current = true;
      }
      if (onSaveAndClose) {
        onSaveAndClose();
      } else {
        onSave();
      }
      return;
    }
  };

  const handleBlur = () => {
    // Prevent double-save if already saving
    if (isSavingRef.current || isClosingRef?.current) return;

    // Use setTimeout to ensure blur happens after any click events
    setTimeout(() => {
      if (isSavingRef.current || isClosingRef?.current) return;

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
    <div className="flex-1 overflow-auto bg-white">
      <div className={isFullWindow ? "p-12 max-w-4xl mx-auto" : "p-8 max-w-4xl mx-auto"}>
        <textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => onContentChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          placeholder="Start typing..."
          maxLength={10000}
          className="w-full resize-none outline-none border-none"
          style={{
            ...FONT_ROLES.paneBody,
            fontSize: isFullWindow ? '20px' : '18px',
            lineHeight: isFullWindow ? '2' : '1.8',
            color: '#1f2937',
            minHeight: isFullWindow ? '500px' : '400px',
            background: 'transparent',
          }}
        />
        <div
          className="mt-4 text-sm"
          style={{
            color: 'var(--color-text-muted)',
            ...FONT_ROLES.paneBodyMuted
          }}
        >
          Press Ctrl+S to save, Ctrl+Enter to save & close preview, Esc to cancel
        </div>
      </div>
    </div>
  );
};

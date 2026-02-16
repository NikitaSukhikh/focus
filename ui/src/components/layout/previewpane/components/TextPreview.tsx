import { useCallback, useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import { FONT_ROLES } from '@/styles/fontManager';
import { usePreviewTextEditor } from '@/components/layout/previewpane/hooks/usePreviewTextEditor';
import { PreviewTextEditor } from '@/components/layout/previewpane/components/PreviewTextEditor';
import { formatTextWithLinks } from '@/utils/linkFormatter';

export interface TextPreviewHandle {
  save: () => Promise<void>;
  saveAndClose: () => Promise<void>;
  cancel: () => void;
}

interface TextPreviewProps {
  title?: string;
  content: string;
  tileId?: string;
  onContentUpdated?: (newTitle: string, newContent: string) => void;
  isEditing: boolean;
  onStartEdit: () => void;
  onStopEdit: () => void;
  onClosePreview?: () => void;
  paneContainerRef?: React.RefObject<HTMLElement | null>;
  isFullWindow?: boolean;
}

// TextPreview formats text note content selected from the canvas, showing the title and pre-wrapped body text.
export const TextPreview = forwardRef<TextPreviewHandle, TextPreviewProps>(({
  title,
  content,
  tileId,
  onContentUpdated,
  isEditing,
  onStartEdit,
  onStopEdit,
  onClosePreview,
  paneContainerRef,
  isFullWindow = false,
}: TextPreviewProps, ref) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const isClosingRef = useRef(false);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const titleSize = isFullWindow ? '36px' : '28px';
  const bodyFontSize = isFullWindow ? '20px' : '18px';
  const bodyLineHeight = isFullWindow ? '2' : '1.8';
  const containerPaddingClass = isFullWindow ? 'p-12' : 'p-8';
  const contentWidthClass = isFullWindow ? 'max-w-4xl w-full mx-auto' : '';

  const trimmedTitle = (title || '').trim();
  const firstContentLine = content
    ? (content.split(/\r?\n/).find((line) => line.trim().length > 0) || '').trim()
    : '';
  const displayTitle = trimmedTitle || firstContentLine || 'Untitled Note';

  // Reconstruct full content with title as first line
  const fullContent = title && content
    ? `${title}\n${content}`
    : content || title || '';

  const getCaretPositionFromClick = (e: React.MouseEvent<HTMLDivElement | HTMLHeadingElement>): number => {
    const titleText = title || '';
    const newlineLength = title && content ? 1 : 0;
    const range = document.caretRangeFromPoint(e.clientX, e.clientY);

    if (titleRef.current && titleRef.current.contains(e.target as Node)) {
      if (!range) return 0;
      const preCaretRange = range.cloneRange();
      preCaretRange.selectNodeContents(titleRef.current);
      preCaretRange.setEnd(range.endContainer, range.endOffset);
      return preCaretRange.toString().length;
    }

    if (contentRef.current && range) {
      const preCaretRange = range.cloneRange();
      preCaretRange.selectNodeContents(contentRef.current);
      preCaretRange.setEnd(range.endContainer, range.endOffset);
      const bodyOffset = preCaretRange.toString().length;
      return titleText.length + newlineLength + bodyOffset;
    }

    return fullContent.length;
  };

  const editor = usePreviewTextEditor({
    tileId,
    initialContent: fullContent,
    initialTitle: title,
    onContentUpdated: (newTitle, newContent) => {
      onStopEdit();
      onContentUpdated?.(newTitle, newContent);
    },
  });

  const handleSave = async () => {
    await editor.saveEdit();
    onStopEdit();
  };

  const handleSaveAndClose = useCallback(async () => {
    if (isClosingRef.current) return;
    isClosingRef.current = true;
    try {
      await editor.saveEdit();
      onStopEdit();
      if (onClosePreview) {
        onClosePreview();
      }
    } finally {
      isClosingRef.current = false;
    }
  }, [editor, onClosePreview, onStopEdit]);

  const handleCancel = () => {
    editor.cancelEdit();
    onStopEdit();
  };

  const handleDoubleClick = (e: React.MouseEvent<HTMLDivElement | HTMLHeadingElement>) => {
    const caretPosition = getCaretPositionFromClick(e);
    isClosingRef.current = false;
    editor.startEditing();
    onStartEdit();
    (window as any).__previewCaretPosition = caretPosition;
  };

  useImperativeHandle(ref, () => ({
    save: async () => {
      await handleSave();
    },
    saveAndClose: async () => {
      await handleSaveAndClose();
    },
    cancel: () => {
      handleCancel();
    },
  }), [handleSave, handleSaveAndClose, handleCancel]);

  useEffect(() => {
    if (!isEditing) return;
    // Auto-save and close when clicks land outside the preview container
    const handleClickOutside = (e: MouseEvent) => {
      const boundaryEl = paneContainerRef?.current ?? containerRef.current;
      if (!boundaryEl) return;
      if (boundaryEl.contains(e.target as Node)) return;
      void handleSaveAndClose();
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isEditing, handleSaveAndClose, paneContainerRef]);

  if (isEditing) {
    return (
      <div
        ref={containerRef}
        className="absolute inset-0 flex flex-col"
        style={{ background: 'var(--background-dark)' }}
      >
        <PreviewTextEditor
          content={editor.editorState.editedContent}
          onContentChange={editor.updateContent}
          onSave={handleSave}
          onSaveAndClose={handleSaveAndClose}
          onCancel={handleCancel}
          isFullWindow={isFullWindow}
          isClosingRef={isClosingRef}
        />
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 flex flex-col"
      style={{ background: 'var(--background-dark)' }}
    >
      <div className="flex-1 min-h-0 overflow-auto custom-scroll">
        <div
          className={`${containerPaddingClass} ${contentWidthClass} min-h-full`}
          style={{ overflowX: 'auto', color: 'var(--color-text-secondary)' }}
        >
          <h1
            ref={titleRef}
            className={`${isFullWindow ? 'text-4xl' : 'text-3xl'} font-bold mb-6 cursor-text`}
            style={{ ...FONT_ROLES.paneTitle, fontSize: titleSize, color: 'var(--color-text-primary)' }}
            onDoubleClick={handleDoubleClick}
          >
            {formatTextWithLinks(displayTitle)}
          </h1>
          <div
            ref={contentRef}
            className="leading-loose cursor-text"
            style={{
              ...FONT_ROLES.paneBody,
              fontSize: bodyFontSize,
              lineHeight: bodyLineHeight,
              whiteSpace: 'pre',
              overflowX: 'auto',
              color: 'var(--color-text-secondary)',
            }}
            onDoubleClick={handleDoubleClick}
          >
            {formatTextWithLinks(content)}
          </div>
        </div>
      </div>
    </div>
  );
});

TextPreview.displayName = 'TextPreview';

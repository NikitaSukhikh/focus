/**
 * Preview Text Editor Hook
 *
 * Purpose: Manages text editing state in the preview pane
 * Responsibilities:
 * - Toggling edit mode on/off
 * - Managing edited content state
 * - Handling save and cancel actions
 * - API calls to update text objects
 */

import { useState, useCallback, useEffect } from 'react';
import { objectsApi } from '@/api/objects';

interface PreviewTextEditorParams {
  tileId?: string;
  initialContent: string;
  initialTitle?: string;
  onContentUpdated?: (newTitle: string, newContent: string) => void;
}

export interface PreviewTextEditorState {
  isEditing: boolean;
  editedContent: string;
}

export const usePreviewTextEditor = ({
  tileId,
  initialContent,
  initialTitle,
  onContentUpdated,
}: PreviewTextEditorParams) => {
  const [editorState, setEditorState] = useState<PreviewTextEditorState>({
    isEditing: false,
    editedContent: initialContent,
  });

  // Keep editor content in sync when external updates arrive while not actively editing
  useEffect(() => {
    setEditorState((prev) => {
      if (prev.isEditing || prev.editedContent === initialContent) return prev;
      return { ...prev, editedContent: initialContent };
    });
  }, [initialContent]);

  const startEditing = useCallback(() => {
    setEditorState({
      isEditing: true,
      editedContent: initialContent,
    });
  }, [initialContent]);

  const updateContent = useCallback((content: string) => {
    setEditorState((prev) => ({ ...prev, editedContent: content }));
  }, []);

  const generateTitleFromContent = useCallback((content: string): string => {
    const trimmed = content.trim();
    if (!trimmed) return initialTitle || 'Untitled Note';

    // Take first line or first 50 characters
    const firstLine = trimmed.split('\n')[0];
    if (firstLine.length <= 50) return firstLine;
    return firstLine.substring(0, 47) + '...';
  }, [initialTitle]);

  const saveEdit = useCallback(async () => {
    if (!tileId) {
      setEditorState({ isEditing: false, editedContent: initialContent });
      return;
    }

    const trimmedContent = editorState.editedContent.trim();
    if (!trimmedContent) {
      // Don't save empty content
      setEditorState({ isEditing: false, editedContent: initialContent });
      return;
    }

    const title = generateTitleFromContent(trimmedContent);

    try {
      await objectsApi.patchObject(tileId, {
        title,
        metadata: { content: trimmedContent },
      });

      setEditorState({ isEditing: false, editedContent: trimmedContent });

      // Notify parent of the update
      if (onContentUpdated) {
        onContentUpdated(title, trimmedContent);
      }

      // Emit event to update other preview modes immediately
      window.dispatchEvent(new CustomEvent('text:content-changed', {
        detail: {
          tileId,
          title,
          content: trimmedContent,
        },
      }));
    } catch (err) {
      console.error('Failed to save text note:', err);
      alert('Failed to save note. Please try again.');
    }
  }, [tileId, editorState.editedContent, initialContent, onContentUpdated, generateTitleFromContent]);

  const cancelEdit = useCallback(() => {
    setEditorState({ isEditing: false, editedContent: initialContent });
  }, [initialContent]);

  return {
    editorState,
    startEditing,
    updateContent,
    saveEdit,
    cancelEdit,
  };
};

/**
 * Inline Text Editor Hook
 *
 * Purpose: Manages inline text editing state directly on the canvas
 * Responsibilities:
 * - Showing/hiding inline editor at specific positions
 * - Managing text content during editing
 * - Handling save and cancel actions
 * - Auto-generating title from content
 */

import { useState, useCallback } from 'react';
import { objectsApi } from '../../../../api/objects';
import { undoApi } from '../../../../api/undo';
import { DroppedIcon } from '../types';
import { normalizeTag } from '../../../../types/tags';
import { autoWrapText } from '../utils';

interface InlineEditorParams {
  selectedIsland: any;
  setIconsByIsland: React.Dispatch<React.SetStateAction<Record<string, DroppedIcon[]>>>;
  clampToBoundaries: (x: number, y: number) => { x: number; y: number };
}

export interface InlineEditorState {
  isActive: boolean;
  x: number;
  y: number;
  content: string;
  editingId?: string; // If set, we're editing an existing note
}

export const useInlineTextEditor = ({
  selectedIsland,
  setIconsByIsland,
  clampToBoundaries,
}: InlineEditorParams) => {
  const [editorState, setEditorState] = useState<InlineEditorState>({
    isActive: false,
    x: 0,
    y: 0,
    content: '',
  });

  const openInlineEditor = useCallback((x: number, y: number, content = '', editingId?: string) => {
    setEditorState({
      isActive: true,
      x,
      y,
      content,
      editingId,
    });
  }, []);

  const updateContent = useCallback((content: string) => {
    setEditorState((prev) => ({ ...prev, content }));
  }, []);

  const generateTitleFromContent = (content: string): string => {
    const trimmed = content.trim();
    if (!trimmed) return 'Untitled Note';

    // Take first line or first 50 characters
    const firstLine = trimmed.split('\n')[0];
    if (firstLine.length <= 50) return firstLine;
    return firstLine.substring(0, 47) + '...';
  };

  const saveNote = useCallback(async () => {
    if (!selectedIsland || !editorState.content.trim()) {
      setEditorState({ isActive: false, x: 0, y: 0, content: '' });
      return;
    }

    const { x, y, content, editingId } = editorState;
    const clamped = clampToBoundaries(x, y);
    const formattedContent = autoWrapText(content, 22);
    const title = generateTitleFromContent(formattedContent);

    try {
      if (editingId) {
        // Update existing note - update both title and content in metadata
        const response = await fetch(`/api/objects/${editingId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title,
            metadata: { content: formattedContent },
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to update text note');
        }

        setIconsByIsland((prev) => {
          const current = prev[selectedIsland.id] || [];
          return {
            ...prev,
            [selectedIsland.id]: current.map((icon) =>
              icon.id === editingId
                ? { ...icon, title, content: formattedContent, description: formattedContent.substring(0, 100) }
                : icon
            ),
          };
        });
      } else {
        // Create new note
        const created = await objectsApi.create(selectedIsland.id, {
          type: 'text',
          title,
          content: formattedContent,
          x: clamped.x,
          y: clamped.y,
        });

        const newIcon: DroppedIcon = {
          id: created.id,
          type: 'text',
          title: created.title,
          x: clamped.x,
          y: clamped.y,
          tag: normalizeTag(created.tag),
          description: formattedContent.substring(0, 100),
          content: formattedContent,
        };

        setIconsByIsland((prev) => {
          const current = prev[selectedIsland.id] || [];
          return { ...prev, [selectedIsland.id]: [...current, newIcon] };
        });

        // Add to backend undo history
        undoApi
          .createEvent(selectedIsland.id, {
            event_type: 'text_create',
            event_data: {
            text: {
              id: created.id,
              title: created.title,
              content: formattedContent,
              x: clamped.x,
              y: clamped.y,
              tag: normalizeTag(created.tag),
            },
          },
        })
          .catch((err) => console.error('Failed to create undo event:', err));
      }

      setEditorState({ isActive: false, x: 0, y: 0, content: '' });
    } catch (err) {
      console.error('Failed to save text note:', err);
      alert('Failed to save note. Please try again.');
    }
  }, [selectedIsland, editorState, clampToBoundaries, setIconsByIsland]);

  const cancelEdit = useCallback(() => {
    setEditorState({ isActive: false, x: 0, y: 0, content: '' });
  }, []);

  return {
    editorState,
    openInlineEditor,
    updateContent,
    saveNote,
    cancelEdit,
  };
};

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
import { DroppedIcon } from '../types';

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
    const title = generateTitleFromContent(content);

    try {
      if (editingId) {
        // Update existing note
        await objectsApi.update(editingId, {
          title,
          content,
        });

        setIconsByIsland((prev) => {
          const current = prev[selectedIsland.id] || [];
          return {
            ...prev,
            [selectedIsland.id]: current.map((icon) =>
              icon.id === editingId
                ? { ...icon, title, content, description: content.substring(0, 100) }
                : icon
            ),
          };
        });
      } else {
        // Create new note
        const created = await objectsApi.create(selectedIsland.id, {
          type: 'text',
          title,
          content,
          x: clamped.x,
          y: clamped.y,
        });

        const newIcon: DroppedIcon = {
          id: created.id,
          type: 'text',
          title: created.title,
          x: clamped.x,
          y: clamped.y,
          description: content.substring(0, 100),
          content: content,
        };

        setIconsByIsland((prev) => {
          const current = prev[selectedIsland.id] || [];
          return { ...prev, [selectedIsland.id]: [...current, newIcon] };
        });
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

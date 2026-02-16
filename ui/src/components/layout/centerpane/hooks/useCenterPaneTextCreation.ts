/**
 * CenterPane Text/Note Creation Hook
 *
 * Purpose: Manages text note creation directly from the center pane
 * Responsibilities:
 * - Showing/hiding the Add Text dialog
 * - Creating new text notes at specific canvas positions
 * - Adding newly created text notes to the canvas
 */

import { useState } from 'react';
import { objectsApi } from '@/api/objects';
import { undoApi } from '@/api/undo';
import { DroppedIcon } from '@/components/layout/centerpane/types';
import { normalizeTag } from '@/types/tags';
import { autoWrapText } from '@/components/layout/centerpane/utils';
import { TEXT_TILE } from '@/constants/objectsDimensions';

interface TextCreationParams {
  selectedSpace: any;
  setIconsBySpace: React.Dispatch<React.SetStateAction<Record<string, DroppedIcon[]>>>;
  clampToBoundaries: (x: number, y: number) => { x: number; y: number };
}

export const useCenterPaneTextCreation = ({
  selectedSpace,
  setIconsBySpace,
  clampToBoundaries,
}: TextCreationParams) => {
  const [isAddTextDialogOpen, setIsAddTextDialogOpen] = useState(false);
  const [pendingTextPosition, setPendingTextPosition] = useState<{ x: number; y: number } | null>(null);

  const openAddTextDialog = (x: number, y: number) => {
    setPendingTextPosition({ x, y });
    setIsAddTextDialogOpen(true);
  };

  const handleAddText = async (title: string, content: string) => {
    if (!selectedSpace || !pendingTextPosition) {
      alert('Please select an space first');
      return;
    }

    const formattedContent = autoWrapText(content, TEXT_TILE.charLimit);
    const { x, y } = pendingTextPosition;
    const clamped = clampToBoundaries(x, y);

    try {
      const created = await objectsApi.create(selectedSpace.id, {
        type: 'text',
        title,
        content: formattedContent,
        x: clamped.x,
        y: clamped.y,
      });

      // Add to canvas immediately
      const newIcon: DroppedIcon = {
        id: created.id,
        type: 'text',
        title: created.title,
        x: clamped.x,
        y: clamped.y,
        tag: normalizeTag(created.tag),
        description: formattedContent.substring(0, 100), // Preview snippet
        content: formattedContent,
      };

      setIconsBySpace((prev) => {
        const current = prev[selectedSpace.id] || [];
        return { ...prev, [selectedSpace.id]: [...current, newIcon] };
      });

      // Add to backend undo history
      undoApi
        .createEvent(selectedSpace.id, {
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

      setIsAddTextDialogOpen(false);
      setPendingTextPosition(null);
    } catch (err) {
      console.error('Failed to create text note:', err);
      alert('Failed to add note. Please try again.');
    }
  };

  const closeAddTextDialog = () => {
    setIsAddTextDialogOpen(false);
    setPendingTextPosition(null);
  };

  return {
    isAddTextDialogOpen,
    openAddTextDialog,
    handleAddText,
    closeAddTextDialog,
  };
};

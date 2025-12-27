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
import { objectsApi } from '../../../../api/objects';
import { DroppedIcon } from '../types';
import { autoWrapText } from '../utils';

interface TextCreationParams {
  selectedIsland: any;
  setIconsByIsland: React.Dispatch<React.SetStateAction<Record<string, DroppedIcon[]>>>;
  clampToBoundaries: (x: number, y: number) => { x: number; y: number };
}

export const useCenterPaneTextCreation = ({
  selectedIsland,
  setIconsByIsland,
  clampToBoundaries,
}: TextCreationParams) => {
  const [isAddTextDialogOpen, setIsAddTextDialogOpen] = useState(false);
  const [pendingTextPosition, setPendingTextPosition] = useState<{ x: number; y: number } | null>(null);

  const openAddTextDialog = (x: number, y: number) => {
    setPendingTextPosition({ x, y });
    setIsAddTextDialogOpen(true);
  };

  const handleAddText = async (title: string, content: string) => {
    if (!selectedIsland || !pendingTextPosition) {
      alert('Please select an island first');
      return;
    }

    const formattedContent = autoWrapText(content, 22);
    const { x, y } = pendingTextPosition;
    const clamped = clampToBoundaries(x, y);

    try {
      const created = await objectsApi.create(selectedIsland.id, {
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
        description: formattedContent.substring(0, 100), // Preview snippet
        content: formattedContent,
      };

      setIconsByIsland((prev) => {
        const current = prev[selectedIsland.id] || [];
        return { ...prev, [selectedIsland.id]: [...current, newIcon] };
      });

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

/**
 * Island Name Editor Hook
 *
 * Purpose: Manages inline editing of the island name
 * Responsibilities:
 * - Toggling edit mode for island name
 * - Syncing editing state with selected island changes
 * - Handling keyboard interactions (Enter to save, Escape to cancel)
 * - Auto-focusing and selecting input text when edit mode starts
 * - Saving updated island name to the store
 */

import { useState, useEffect, useRef } from 'react';
import { Island } from '../../../../api/islands';

interface IslandNameEditorParams {
  selectedIsland: Island | null;
  updateIsland: (id: string, name: string) => Promise<void>;
}

export const useIslandNameEditor = ({ selectedIsland, updateIsland }: IslandNameEditorParams) => {
  const [isEditingIslandName, setIsEditingIslandName] = useState(false);
  const [editingIslandName, setEditingIslandName] = useState('');
  const islandNameInputRef = useRef<HTMLInputElement | null>(null);

  const handleIslandNameSubmit = async () => {
    if (selectedIsland && editingIslandName.trim() && editingIslandName.trim() !== selectedIsland.name) {
      await updateIsland(selectedIsland.id, editingIslandName.trim());
    } else {
      setEditingIslandName(selectedIsland?.name || '');
    }
    setIsEditingIslandName(false);
  };

  const handleIslandNameKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleIslandNameSubmit();
    } else if (e.key === 'Escape') {
      setEditingIslandName(selectedIsland?.name || '');
      setIsEditingIslandName(false);
    }
  };

  // Sync island name with editing state
  useEffect(() => {
    setEditingIslandName(selectedIsland?.name || '');
  }, [selectedIsland?.name]);

  // Focus input when editing starts
  useEffect(() => {
    if (isEditingIslandName && islandNameInputRef.current) {
      islandNameInputRef.current.focus();
      islandNameInputRef.current.select();
    }
  }, [isEditingIslandName]);

  return {
    isEditingIslandName,
    setIsEditingIslandName,
    editingIslandName,
    setEditingIslandName,
    islandNameInputRef,
    handleIslandNameSubmit,
    handleIslandNameKeyDown,
  };
};

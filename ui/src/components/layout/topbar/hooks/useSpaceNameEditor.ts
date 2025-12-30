/**
 * Space Name Editor Hook
 *
 * Purpose: Manages inline editing of the space name
 * Responsibilities:
 * - Toggling edit mode for space name
 * - Syncing editing state with selected space changes
 * - Handling keyboard interactions (Enter to save, Escape to cancel)
 * - Auto-focusing and selecting input text when edit mode starts
 * - Saving updated space name to the store
 */

import { useState, useEffect, useRef } from 'react';
import { Space } from '../../../../api/spaces';

interface SpaceNameEditorParams {
  selectedSpace: Space | null;
  updateSpace: (id: string, name: string) => Promise<void>;
}

export const useSpaceNameEditor = ({ selectedSpace, updateSpace }: SpaceNameEditorParams) => {
  const [isEditingSpaceName, setIsEditingSpaceName] = useState(false);
  const [editingSpaceName, setEditingSpaceName] = useState('');
  const spaceNameInputRef = useRef<HTMLInputElement | null>(null);

  const handleSpaceNameSubmit = async () => {
    if (selectedSpace && editingSpaceName.trim() && editingSpaceName.trim() !== selectedSpace.name) {
      await updateSpace(selectedSpace.id, editingSpaceName.trim());
    } else {
      setEditingSpaceName(selectedSpace?.name || '');
    }
    setIsEditingSpaceName(false);
  };

  const handleSpaceNameKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSpaceNameSubmit();
    } else if (e.key === 'Escape') {
      setEditingSpaceName(selectedSpace?.name || '');
      setIsEditingSpaceName(false);
    }
  };

  // Sync space name with editing state
  useEffect(() => {
    setEditingSpaceName(selectedSpace?.name || '');
  }, [selectedSpace?.name]);

  // Focus input when editing starts
  useEffect(() => {
    if (isEditingSpaceName && spaceNameInputRef.current) {
      spaceNameInputRef.current.focus();
      spaceNameInputRef.current.select();
    }
  }, [isEditingSpaceName]);

  return {
    isEditingSpaceName,
    setIsEditingSpaceName,
    editingSpaceName,
    setEditingSpaceName,
    spaceNameInputRef,
    handleSpaceNameSubmit,
    handleSpaceNameKeyDown,
  };
};

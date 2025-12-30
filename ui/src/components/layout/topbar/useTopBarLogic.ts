/**
 * TopBar Logic Composition Hook
 *
 * Purpose: Composes all TopBar business logic hooks into a unified interface
 * Responsibilities:
 * - Composing specialized hooks (integrations, links, space editor, context menu)
 * - Providing a single unified API to the TopBar presentation component
 * - Managing dependencies between different TopBar features
 *
 * This is a composition hook that doesn't contain business logic itself,
 * but orchestrates other specialized hooks following the separation of concerns pattern.
 */

import { CenterPaneHandle } from '../centerpane/types';
import { useSpaceStore } from '../../../stores/spaceStore';
import { useSpaceNameEditor } from './hooks/useSpaceNameEditor';

export const useTopBarLogic = (_centerPaneRef: React.RefObject<CenterPaneHandle>) => {
  const selectedSpace = useSpaceStore((state) => state.getSelectedSpace());
  const updateSpace = useSpaceStore((state) => state.updateSpace);

  // Space name editor
  const spaceEditor = useSpaceNameEditor({
    selectedSpace,
    updateSpace,
  });

  return {
    // Space state
    selectedSpace,

    // Space name editor
    isEditingSpaceName: spaceEditor.isEditingSpaceName,
    setIsEditingSpaceName: spaceEditor.setIsEditingSpaceName,
    editingSpaceName: spaceEditor.editingSpaceName,
    setEditingSpaceName: spaceEditor.setEditingSpaceName,
    spaceNameInputRef: spaceEditor.spaceNameInputRef,
    handleSpaceNameSubmit: spaceEditor.handleSpaceNameSubmit,
    handleSpaceNameKeyDown: spaceEditor.handleSpaceNameKeyDown,
  };
};

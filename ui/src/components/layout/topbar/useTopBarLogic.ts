/**
 * TopBar Logic Composition Hook
 *
 * Purpose: Composes all TopBar business logic hooks into a unified interface
 * Responsibilities:
 * - Composing specialized hooks (integrations, links, island editor, context menu)
 * - Providing a single unified API to the TopBar presentation component
 * - Managing dependencies between different TopBar features
 *
 * This is a composition hook that doesn't contain business logic itself,
 * but orchestrates other specialized hooks following the separation of concerns pattern.
 */

import { CenterPaneHandle } from '../centerpane/types';
import { useIslandStore } from '../../../stores/islandStore';
import { useIslandNameEditor } from './hooks/useIslandNameEditor';

export const useTopBarLogic = (_centerPaneRef: React.RefObject<CenterPaneHandle>) => {
  const selectedIsland = useIslandStore((state) => state.getSelectedIsland());
  const updateIsland = useIslandStore((state) => state.updateIsland);

  // Island name editor
  const islandEditor = useIslandNameEditor({
    selectedIsland,
    updateIsland,
  });

  return {
    // Island state
    selectedIsland,

    // Island name editor
    isEditingIslandName: islandEditor.isEditingIslandName,
    setIsEditingIslandName: islandEditor.setIsEditingIslandName,
    editingIslandName: islandEditor.editingIslandName,
    setEditingIslandName: islandEditor.setEditingIslandName,
    islandNameInputRef: islandEditor.islandNameInputRef,
    handleIslandNameSubmit: islandEditor.handleIslandNameSubmit,
    handleIslandNameKeyDown: islandEditor.handleIslandNameKeyDown,
  };
};

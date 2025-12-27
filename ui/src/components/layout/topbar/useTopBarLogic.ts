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
import { useIntegrationsDropdown } from './hooks/useIntegrationsDropdown';
import { useSavedLinks } from './hooks/useSavedLinks';
import { useIslandNameEditor } from './hooks/useIslandNameEditor';
import { useLinkContextMenu } from './hooks/useLinkContextMenu';

export const useTopBarLogic = (_centerPaneRef: React.RefObject<CenterPaneHandle>) => {
  const selectedIsland = useIslandStore((state) => state.getSelectedIsland());
  const updateIsland = useIslandStore((state) => state.updateIsland);

  // Integrations dropdown management
  const dropdown = useIntegrationsDropdown();

  // Saved links management
  const links = useSavedLinks(selectedIsland?.id, dropdown.isIntegrationsOpen);

  // Island name editor
  const islandEditor = useIslandNameEditor({
    selectedIsland,
    updateIsland,
  });

  // Link context menu
  const contextMenu = useLinkContextMenu({
    savedLinks: links.savedLinks,
    handleUpdateLink: links.handleUpdateLink,
    handleDeleteLink: links.handleDeleteLink,
  });

  return {
    // Island state
    selectedIsland,

    // Integrations dropdown
    isIntegrationsOpen: dropdown.isIntegrationsOpen,
    setIsIntegrationsOpen: dropdown.setIsIntegrationsOpen,
    searchQuery: dropdown.searchQuery,
    setSearchQuery: dropdown.setSearchQuery,
    dropdownMaxHeight: dropdown.dropdownMaxHeight,
    integrationsTriggerRef: dropdown.integrationsTriggerRef,
    integrationsDropdownRef: dropdown.integrationsDropdownRef,

    // Saved links
    savedLinks: links.savedLinks,

    // Island name editor
    isEditingIslandName: islandEditor.isEditingIslandName,
    setIsEditingIslandName: islandEditor.setIsEditingIslandName,
    editingIslandName: islandEditor.editingIslandName,
    setEditingIslandName: islandEditor.setEditingIslandName,
    islandNameInputRef: islandEditor.islandNameInputRef,
    handleIslandNameSubmit: islandEditor.handleIslandNameSubmit,
    handleIslandNameKeyDown: islandEditor.handleIslandNameKeyDown,

    // Link context menu
    linkContextMenu: contextMenu.linkContextMenu,
    setLinkContextMenu: contextMenu.setLinkContextMenu,
    editingLinkId: contextMenu.editingLinkId,
    setEditingLinkId: contextMenu.setEditingLinkId,
    editingLinkData: contextMenu.editingLinkData,
    handleLinkContextMenu: contextMenu.handleLinkContextMenu,
    handleDeleteLink: contextMenu.handleDeleteLinkClick,
    handleEditLink: contextMenu.handleEditLink,
    handleSaveEditedLink: contextMenu.handleSaveEditedLink,
  };
};

/**
 * Sidebar Logic Composition Hook
 *
 * Purpose: Composes all Sidebar business logic hooks into a unified interface
 * Responsibilities:
 * - Composing specialized hooks (saved links, context menu)
 * - Providing a single unified API to the LeftSidebar presentation component
 * - Managing dependencies between different Sidebar features
 */

import { useState } from 'react';
import { useSavedLinks } from '../topbar/hooks/useSavedLinks';
import { useLinkContextMenu } from '../topbar/hooks/useLinkContextMenu';
import { useIslandStore } from '../../../stores/islandStore';

export const useSidebarLogic = () => {
  const selectedIsland = useIslandStore((state) => state.getSelectedIsland());
  const [expandedIslands, setExpandedIslands] = useState<Record<string, boolean>>({});

  // Saved links management - always load for selected island
  const links = useSavedLinks(selectedIsland?.id, true);

  // Link context menu
  const contextMenu = useLinkContextMenu({
    savedLinks: links.savedLinks,
    handleUpdateLink: links.handleUpdateLink,
    handleDeleteLink: links.handleDeleteLink,
  });

  const toggleIslandExpansion = (islandId: string) => {
    setExpandedIslands((prev) => ({
      ...prev,
      [islandId]: !prev[islandId]
    }));
  };

  const isIslandExpanded = (islandId: string) => {
    return expandedIslands[islandId] ?? false;
  };

  return {
    // Selected island state
    selectedIsland,

    // Links expansion state
    expandedIslands,
    toggleIslandExpansion,
    isIslandExpanded,

    // Saved links
    savedLinks: links.savedLinks,

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

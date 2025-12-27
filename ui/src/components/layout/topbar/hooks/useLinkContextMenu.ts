/**
 * Link Context Menu Hook
 *
 * Purpose: Manages right-click context menu for saved links
 * Responsibilities:
 * - Context menu state and positioning
 * - Edit dialog state management
 * - Handling edit link action (opens edit dialog)
 * - Handling delete link action
 * - Coordinating with parent hooks for actual CRUD operations
 */

import { useState } from 'react';
import { SavedLink } from '../types';

interface LinkContextMenuParams {
  savedLinks: SavedLink[];
  handleUpdateLink: (linkId: string, url: string, title: string, description: string) => Promise<void>;
  handleDeleteLink: (linkId: string) => Promise<void>;
}

export const useLinkContextMenu = ({ savedLinks, handleUpdateLink, handleDeleteLink }: LinkContextMenuParams) => {
  const [linkContextMenu, setLinkContextMenu] = useState<{ linkId: string; x: number; y: number } | null>(null);
  const [editingLinkId, setEditingLinkId] = useState<string | null>(null);
  const [editingLinkData, setEditingLinkData] = useState<{ url: string; title: string; description: string }>({
    url: '',
    title: '',
    description: ''
  });

  const handleLinkContextMenu = (e: React.MouseEvent, linkId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setLinkContextMenu({ linkId, x: e.clientX, y: e.clientY });
  };

  const handleDeleteLinkClick = async (linkId: string) => {
    await handleDeleteLink(linkId);
    setLinkContextMenu(null);
  };

  const handleEditLink = (linkId: string) => {
    const link = savedLinks.find(l => l.id === linkId);
    if (link) {
      setEditingLinkId(linkId);
      setEditingLinkData({
        url: link.url,
        title: link.title,
        description: link.description ?? ''
      });
    }
    setLinkContextMenu(null);
  };

  const handleSaveEditedLink = async (url: string, title: string, description: string) => {
    if (!editingLinkId) return;

    await handleUpdateLink(editingLinkId, url, title, description);
    setEditingLinkId(null);
  };

  return {
    linkContextMenu,
    setLinkContextMenu,
    editingLinkId,
    setEditingLinkId,
    editingLinkData,
    handleLinkContextMenu,
    handleDeleteLinkClick,
    handleEditLink,
    handleSaveEditedLink,
  };
};

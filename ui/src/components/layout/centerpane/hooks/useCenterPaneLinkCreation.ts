/**
 * CenterPane Link Creation Hook
 *
 * Purpose: Manages link creation directly from the center pane
 * Responsibilities:
 * - Showing/hiding the Add Link dialog
 * - Creating new links at specific canvas positions
 * - Adding newly created links to the canvas
 */

import { useState } from 'react';
import { objectsApi } from '../../../../api/objects';
import { buildFaviconUrl } from '../../../../utils/favicon';
import { DroppedIcon } from '../types';
import { isGmailUrl } from '../utils';

interface LinkCreationParams {
  selectedIsland: any;
  setIconsByIsland: React.Dispatch<React.SetStateAction<Record<string, DroppedIcon[]>>>;
}

export const useCenterPaneLinkCreation = ({ selectedIsland, setIconsByIsland }: LinkCreationParams) => {
  const [isAddLinkDialogOpen, setIsAddLinkDialogOpen] = useState(false);
  const [pendingLinkPosition, setPendingLinkPosition] = useState<{ x: number; y: number } | null>(null);

  const openAddLinkDialog = (x: number, y: number) => {
    setPendingLinkPosition({ x, y });
    setIsAddLinkDialogOpen(true);
  };

  const handleAddLink = async (url: string, title: string, description: string) => {
    if (!selectedIsland || !pendingLinkPosition) {
      alert('Please select an island first');
      return;
    }

    const { x, y } = pendingLinkPosition;
    const favicon_url = buildFaviconUrl(url);
    const isGmail = isGmailUrl(url);

    try {
      const created = await objectsApi.create(selectedIsland.id, {
        type: isGmail ? 'gmail' : 'link',
        title,
        url,
        description,
        favicon_url,
        x,
        y,
      });

      // Add to canvas immediately
      const newIcon: DroppedIcon = {
        id: created.id,
        type: isGmail ? 'gmail' : 'link',
        title: created.title,
        x,
        y,
        url,
        description,
        faviconUrl: isGmail ? undefined : favicon_url,
      };

      setIconsByIsland((prev) => {
        const current = prev[selectedIsland.id] || [];
        return { ...prev, [selectedIsland.id]: [...current, newIcon] };
      });

      setIsAddLinkDialogOpen(false);
      setPendingLinkPosition(null);
    } catch (err) {
      console.error('Failed to create link:', err);
      alert('Failed to add link. Please try again.');
    }
  };

  const closeAddLinkDialog = () => {
    setIsAddLinkDialogOpen(false);
    setPendingLinkPosition(null);
  };

  return {
    isAddLinkDialogOpen,
    openAddLinkDialog,
    handleAddLink,
    closeAddLinkDialog,
  };
};

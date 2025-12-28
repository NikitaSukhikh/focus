import { useState } from 'react';

export function useContextMenu() {
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [contextMenuPosition, setContextMenuPosition] = useState({ x: 0, y: 0 });

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenuPosition({ x: e.clientX, y: e.clientY - 140 });
    setShowContextMenu(true);
  };

  const handleCloseContextMenu = () => {
    setShowContextMenu(false);
  };

  return {
    showContextMenu,
    contextMenuPosition,
    handleContextMenu,
    handleCloseContextMenu,
    setShowContextMenu,
  };
}

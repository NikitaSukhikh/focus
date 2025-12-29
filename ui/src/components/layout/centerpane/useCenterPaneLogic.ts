/**
 * CenterPane Logic Composition Hook
 *
 * Purpose: Composes all CenterPane business logic hooks into a unified interface
 * Responsibilities:
 * - Composing specialized hooks (state, drag-drop, icon actions, file handling)
 * - Providing a single unified API to the CenterPane presentation component
 * - Managing dependencies between different canvas features
 * - Creating the position clamping helper used by multiple hooks
 *
 * This is a composition hook that doesn't contain business logic itself,
 * but orchestrates other specialized hooks following the separation of concerns pattern.
 */

import { useCallback } from 'react';
import { clampToBoundaries as clampPosition } from './boundaries';
import { useCenterPaneState } from './hooks/useCenterPaneState';
import { useCenterPaneDragDrop } from './hooks/useCenterPaneDragDrop';
import { useCenterPaneIconActions } from './hooks/useCenterPaneIconActions';
import { useCenterPaneFileHandling } from './hooks/useCenterPaneFileHandling';
import { useCenterPaneLinkCreation } from './hooks/useCenterPaneLinkCreation';
import { useCenterPaneTextCreation } from './hooks/useCenterPaneTextCreation';
import { useInlineTextEditor } from './hooks/useInlineTextEditor';
import { useUndo } from './hooks/useUndo';

export const useCenterPaneLogic = (paneRef: React.RefObject<HTMLDivElement | null>, zoom: number = 1) => {
  // State management
  const {
    isDragOver,
    setIsDragOver,
    iconsByIsland,
    setIconsByIsland,
    arrowsByIsland,
    setArrowsByIsland,
    selectedIconId,
    setSelectedIconId,
    selectedIconIds,
    setSelectedIconIds,
    dragGhost,
    setDragGhost,
    selectedIsland,
    contentHeight,
  } = useCenterPaneState(paneRef);

  // Clamp position helper
  const clampToBoundaries = useCallback((x: number, y: number): { x: number; y: number } => {
    if (!paneRef.current) return { x, y };
    const rect = paneRef.current.getBoundingClientRect();
    const logicalWidth = rect.width / Math.max(zoom, 0.01);
    return clampPosition(x, y, logicalWidth);
  }, [paneRef, zoom]);

  // Drag & drop handlers
  const dragDropHandlers = useCenterPaneDragDrop({
    selectedIsland,
    paneRef,
    setIsDragOver,
    setIconsByIsland,
    clampToBoundaries,
    getIconById: (id: string) => {
      if (!selectedIsland) return undefined;
      return (iconsByIsland[selectedIsland.id] || []).find((i) => i.id === id);
    },
    setDragGhost,
    zoom,
  });

  // Icon action handlers
  const iconActions = useCenterPaneIconActions({
    selectedIsland,
    setIconsByIsland,
  });

  // File handling
  const fileHandlers = useCenterPaneFileHandling({
    selectedIsland,
    paneRef,
    setIconsByIsland,
    clampToBoundaries,
  });

  // Link creation
  const linkCreation = useCenterPaneLinkCreation({
    selectedIsland,
    setIconsByIsland,
  });

  // Text creation
  const textCreation = useCenterPaneTextCreation({
    selectedIsland,
    setIconsByIsland,
    clampToBoundaries,
  });

  // Inline text editor
  const inlineEditor = useInlineTextEditor({
    selectedIsland,
    setIconsByIsland,
    clampToBoundaries,
  });

  // Undo system
  useUndo({
    selectedIslandId: selectedIsland?.id,
    setIconsByIsland,
    setArrowsByIsland,
  });

  // Canvas click with proper parameters
  const handleCanvasClick = (event: React.MouseEvent<HTMLDivElement>, onCanvasEmptyClick?: () => void) => {
    iconActions.handleCanvasClick(event, onCanvasEmptyClick, setSelectedIconIds);
  };

  return {
    // State
    isDragOver,
    iconsByIsland,
    arrowsByIsland,
    selectedIconId,
    selectedIconIds,
    selectedIsland,
    contentHeight,
    setSelectedIconId,
    setSelectedIconIds,
    dragGhost,
    setDragGhost,
    setArrowsByIsland,

    // Drag & Drop
    handleDragEnter: dragDropHandlers.handleDragEnter,
    handleDragOver: dragDropHandlers.handleDragOver,
    handleDragLeave: dragDropHandlers.handleDragLeave,
    handleDrop: dragDropHandlers.handleDrop,

    // Canvas interaction
    handleCanvasClick,

    // Icon actions
    handleIconRename: iconActions.handleIconRename,
    handleIconDelete: iconActions.handleIconDelete,
    handleIconRefreshMetadata: iconActions.handleIconRefreshMetadata,

    // File handling
    handleAddFiles: fileHandlers.handleAddFiles,

    // Link creation
    isAddLinkDialogOpen: linkCreation.isAddLinkDialogOpen,
    openAddLinkDialog: linkCreation.openAddLinkDialog,
    openLinkEditDialog: linkCreation.openLinkEditDialog,
    handleAddLink: linkCreation.handleAddLink,
    closeAddLinkDialog: linkCreation.closeAddLinkDialog,
    editingLink: linkCreation.editingLink,

    // Text creation
    isAddTextDialogOpen: textCreation.isAddTextDialogOpen,
    openAddTextDialog: textCreation.openAddTextDialog,
    handleAddText: textCreation.handleAddText,
    closeAddTextDialog: textCreation.closeAddTextDialog,

    // Inline text editor
    inlineEditorState: inlineEditor.editorState,
    openInlineEditor: inlineEditor.openInlineEditor,
    updateInlineContent: inlineEditor.updateContent,
    saveInlineNote: inlineEditor.saveNote,
    cancelInlineEdit: inlineEditor.cancelEdit,
  };
};

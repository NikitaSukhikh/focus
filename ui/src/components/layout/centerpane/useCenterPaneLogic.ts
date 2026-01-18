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
import { useCenterPanePaste } from './hooks/useCenterPanePaste';

export const useCenterPaneLogic = (paneRef: React.RefObject<HTMLDivElement | null>, zoom: number = 1) => {
  // State management
  const {
    isDragOver,
    setIsDragOver,
    iconsBySpace,
    setIconsBySpace,
    arrowsBySpace,
    setArrowsBySpace,
    selectedIconId,
    setSelectedIconId,
    selectedIconIds,
    setSelectedIconIds,
    dragGhost,
    setDragGhost,
    selectedSpace,
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
    selectedSpace,
    paneRef,
    setIsDragOver,
    setIconsBySpace,
    clampToBoundaries,
    getIconById: (id: string) => {
      if (!selectedSpace) return undefined;
      return (iconsBySpace[selectedSpace.id] || []).find((i) => i.id === id);
    },
    setDragGhost,
    zoom,
  });

  // Icon action handlers
  const iconActions = useCenterPaneIconActions({
    selectedSpace,
    setIconsBySpace,
  });

  // File handling
  const fileHandlers = useCenterPaneFileHandling({
    selectedSpace,
    paneRef,
    setIconsBySpace,
    clampToBoundaries,
  });

  // Link creation
  const linkCreation = useCenterPaneLinkCreation({
    selectedSpace,
    setIconsBySpace,
  });

  // Text creation
  const textCreation = useCenterPaneTextCreation({
    selectedSpace,
    setIconsBySpace,
    clampToBoundaries,
  });

  // Inline text editor
  const inlineEditor = useInlineTextEditor({
    selectedSpace,
    setIconsBySpace,
    clampToBoundaries,
  });

  // Undo system
  useUndo({
    selectedSpaceId: selectedSpace?.id,
    setIconsBySpace,
    setArrowsBySpace,
  });

  // Paste handling
  const pasteHandlers = useCenterPanePaste({
    selectedSpace,
    paneRef,
    setIconsBySpace,
    clampToBoundaries,
    zoom,
  });

  // Canvas click with proper parameters
  const handleCanvasClick = (event: React.MouseEvent<HTMLDivElement>, onCanvasEmptyClick?: () => void) => {
    iconActions.handleCanvasClick(event, onCanvasEmptyClick, setSelectedIconIds);
  };

  return {
    // State
    isDragOver,
    iconsBySpace,
    arrowsBySpace,
    selectedIconId,
    selectedIconIds,
    selectedSpace,
    contentHeight,
    setSelectedIconId,
    setSelectedIconIds,
    dragGhost,
    setDragGhost,
    setArrowsBySpace,

    // Drag & Drop
    handleDragEnter: dragDropHandlers.handleDragEnter,
    handleDragOver: dragDropHandlers.handleDragOver,
    handleDragLeave: dragDropHandlers.handleDragLeave,
    handleDrop: dragDropHandlers.handleDrop,

    // Canvas interaction
    handleCanvasClick,

    // Icon actions
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

    // Paste handling
    pasteFromClipboard: pasteHandlers.pasteFromClipboard,

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

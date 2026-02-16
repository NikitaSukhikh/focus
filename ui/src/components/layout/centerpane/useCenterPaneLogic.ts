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
import { clampToBoundaries as clampPosition, clampToBoundariesWithPadding as clampPositionWithPadding } from '@/components/layout/centerpane/boundaries';
import { useCenterPaneState } from '@/components/layout/centerpane/hooks/useCenterPaneState';
import { useCenterPaneDragDrop } from '@/components/layout/centerpane/hooks/useCenterPaneDragDrop';
import { useCenterPaneIconActions } from '@/components/layout/centerpane/hooks/useCenterPaneIconActions';
import { useCenterPaneFileHandling } from '@/components/layout/centerpane/hooks/useCenterPaneFileHandling';
import { useCenterPaneLinkCreation } from '@/components/layout/centerpane/hooks/useCenterPaneLinkCreation';
import { useCenterPaneTextCreation } from '@/components/layout/centerpane/hooks/useCenterPaneTextCreation';
import { useInlineTextEditor } from '@/components/layout/centerpane/hooks/useInlineTextEditor';
import { useUndo } from '@/components/layout/centerpane/hooks/useUndo';
import { useCenterPanePaste } from '@/components/layout/centerpane/hooks/useCenterPanePaste';
import { useCenterPanePointerLocation } from '@/components/layout/centerpane/hooks/useCenterPanePointerLocation';

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

  const clampToBoundariesWithPadding = useCallback(
    (x: number, y: number, paddingX: number = 0, paddingY: number = 0): { x: number; y: number } => {
      if (!paneRef.current) return { x, y };
      const rect = paneRef.current.getBoundingClientRect();
      const logicalWidth = rect.width / Math.max(zoom, 0.01);
      return clampPositionWithPadding(x, y, logicalWidth, paddingX, paddingY);
    },
    [paneRef, zoom]
  );

  // Drag & drop handlers
  const dragDropHandlers = useCenterPaneDragDrop({
    selectedSpace,
    paneRef,
    setIsDragOver,
    setIconsBySpace,
    clampToBoundaries,
    clampToBoundariesWithPadding,
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
    clampToBoundaries,
    clampToBoundariesWithPadding,
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
  const pointerLocation = useCenterPanePointerLocation({ paneRef, zoom });

  const pasteHandlers = useCenterPanePaste({
    selectedSpace,
    paneRef,
    setIconsBySpace,
    iconsBySpace,
    clampToBoundaries,
    clampToBoundariesWithPadding,
    zoom,
    getCursorCanvasPosition: pointerLocation.getCursorCanvasPosition,
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

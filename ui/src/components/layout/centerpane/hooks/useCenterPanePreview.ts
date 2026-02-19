// useCenterPanePreview centralizes preview queueing/cancelation so tile interaction handlers stay focused on selection flow.
import { useCallback, useEffect, useRef } from 'react';
import type React from 'react';
import { isPreviewPaneTargetAllowed } from '@/utils/previewTargets';
import type { DroppedIcon, PreviewTarget } from '@/components/layout/centerpane/types';

interface InlineEditorStateSnapshot {
  isActive: boolean;
  editingId?: string | null;
}

interface UseCenterPanePreviewProps {
  onObjectClick?: (_target: PreviewTarget) => void;
  inlineEditorState: InlineEditorStateSnapshot;
  suppressTileClickUntilRef: React.MutableRefObject<number>;
  tileClickSuppressAfterResizeMs: number;
  filePreviewDelayMs: number;
}

interface UseCenterPanePreviewResult {
  clearPreviewTimeout: () => void;
  queuePreviewForIcon: (_icon: DroppedIcon) => void;
  handleTileResizeInteractionEnd: () => void;
}

export const useCenterPanePreview = ({
  onObjectClick,
  inlineEditorState,
  suppressTileClickUntilRef,
  tileClickSuppressAfterResizeMs,
  filePreviewDelayMs,
}: UseCenterPanePreviewProps): UseCenterPanePreviewResult => {
  const previewTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearPreviewTimeout = useCallback(() => {
    if (!previewTimeoutRef.current) return;
    clearTimeout(previewTimeoutRef.current);
    previewTimeoutRef.current = null;
  }, []);

  const openPreviewForIcon = useCallback((icon: DroppedIcon) => {
    onObjectClick?.({
      url: icon.url,
      title: icon.title,
      tileId: icon.id,
      filePath: icon.filePath,
      type: icon.type,
      content: icon.content,
      gmailEmail: icon.gmailEmail,
    });
  }, [onObjectClick]);

  const schedulePreviewForIcon = useCallback((icon: DroppedIcon, delayMs: number) => {
    clearPreviewTimeout();
    previewTimeoutRef.current = setTimeout(() => {
      // Skip opening preview when the tile is currently being edited inline.
      if (icon.type === 'text' && inlineEditorState.isActive && inlineEditorState.editingId === icon.id) return;
      openPreviewForIcon(icon);
    }, delayMs);
  }, [clearPreviewTimeout, inlineEditorState.editingId, inlineEditorState.isActive, openPreviewForIcon]);

  const queuePreviewForIcon = useCallback((icon: DroppedIcon) => {
    if (!isPreviewPaneTargetAllowed(icon)) {
      onObjectClick?.({
        tileId: icon.id,
        type: icon.type,
        filePath: icon.filePath,
      });
      return;
    }

    if (icon.type === 'file') {
      schedulePreviewForIcon(icon, filePreviewDelayMs);
      return;
    }

    openPreviewForIcon(icon);
  }, [filePreviewDelayMs, onObjectClick, openPreviewForIcon, schedulePreviewForIcon]);

  const handleTileResizeInteractionEnd = useCallback(() => {
    suppressTileClickUntilRef.current = performance.now() + tileClickSuppressAfterResizeMs;
    clearPreviewTimeout();
  }, [clearPreviewTimeout, suppressTileClickUntilRef, tileClickSuppressAfterResizeMs]);

  useEffect(() => {
    return () => clearPreviewTimeout();
  }, [clearPreviewTimeout]);

  return {
    clearPreviewTimeout,
    queuePreviewForIcon,
    handleTileResizeInteractionEnd,
  };
};

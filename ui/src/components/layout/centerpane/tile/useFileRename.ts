import { useState, useCallback } from 'react';
import { objectsApi } from '@/api/objects';

interface UseFileRenameOptions {
  objectId: string;
  filePath: string;
  onSuccess?: (newPath: string, newTitle: string) => void;
  onError?: (error: string) => void;
}

// Hook for renaming files on disk via context menu
export function useFileRename({ objectId, filePath, onSuccess, onError }: UseFileRenameOptions) {
  const [isRenaming, setIsRenaming] = useState(false);
  const [showRenameDialog, setShowRenameDialog] = useState(false);

  const getCurrentFileName = useCallback(() => {
    const parts = filePath.split(/[/\\]/);
    return parts[parts.length - 1] || '';
  }, [filePath]);

  const handleRename = useCallback(async (newName: string) => {
    if (!newName.trim()) {
      onError?.('Filename cannot be empty');
      return;
    }

    setIsRenaming(true);
    try {
      const result = await objectsApi.renameFile(objectId, newName.trim());
      setShowRenameDialog(false);
      onSuccess?.(result.new_path, result.new_title);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to rename file';
      onError?.(message);
    } finally {
      setIsRenaming(false);
    }
  }, [objectId, onSuccess, onError]);

  const openRenameDialog = useCallback(() => {
    setShowRenameDialog(true);
  }, []);

  const closeRenameDialog = useCallback(() => {
    setShowRenameDialog(false);
  }, []);

  return {
    isRenaming,
    showRenameDialog,
    currentFileName: getCurrentFileName(),
    openRenameDialog,
    closeRenameDialog,
    handleRename,
  };
}

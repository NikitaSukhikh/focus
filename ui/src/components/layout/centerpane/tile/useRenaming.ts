import { useState, useEffect, useRef } from 'react';

export function useRenaming(title: string, onRename?: (newTitle: string) => void) {
  const [isRenaming, setIsRenaming] = useState(false);
  const [renamingValue, setRenamingValue] = useState(title);
  const renameInputRef = useRef<HTMLInputElement>(null);

  // Manages inline rename mode for a tile and syncs the new title via the provided callback.
  useEffect(() => {
    setRenamingValue(title);
  }, [title]);

  const handleRenameClick = () => {
    setIsRenaming(true);
    setRenamingValue(title);
    setTimeout(() => {
      renameInputRef.current?.focus();
      renameInputRef.current?.select();
    }, 0);
  };

  const handleRenameSubmit = () => {
    const newTitle = renamingValue.trim();
    if (newTitle && newTitle !== title && onRename) {
      onRename(newTitle);
    }
    setIsRenaming(false);
  };

  const handleRenameKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleRenameSubmit();
    } else if (e.key === 'Escape') {
      setIsRenaming(false);
      setRenamingValue(title);
    }
  };

  return {
    isRenaming,
    renamingValue,
    renameInputRef,
    setRenamingValue,
    handleRenameClick,
    handleRenameSubmit,
    handleRenameKeyDown,
  };
}

import { useEffect, useRef, useState } from 'react';

interface UseTagsDropdownOptions {
  isOpenProp?: boolean;
  onToggle?: () => void;
}

/**
 * Manages the open/close state and outside click handling for the Tags dropdown.
 * Supports optional controlled mode when `isOpenProp` is provided.
 */
export const useTagsDropdown = ({ isOpenProp, onToggle }: UseTagsDropdownOptions) => {
  const isControlled = typeof isOpenProp === 'boolean';
  const [isOpenInternal, setIsOpenInternal] = useState(false);

  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const isOpen = isControlled ? (isOpenProp as boolean) : isOpenInternal;

  const toggleOpen = () => {
    if (isControlled) {
      onToggle?.();
    } else {
      setIsOpenInternal((prev) => !prev);
      onToggle?.();
    }
  };

  const close = () => {
    if (isControlled) {
      if (isOpen) onToggle?.();
    } else {
      setIsOpenInternal(false);
    }
  };

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      const insideButton = triggerRef.current && triggerRef.current.contains(target);
      const insideMenu = menuRef.current && menuRef.current.contains(target);
      if (insideButton || insideMenu) return;
      close();
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;

    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        close();
      }
    };

    window.addEventListener('keydown', handleKey, true);
    return () => window.removeEventListener('keydown', handleKey, true);
  }, [isOpen]);

  return {
    isOpen,
    toggleOpen,
    close,
    triggerRef,
    menuRef,
  };
};

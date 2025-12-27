/**
 * Sidebar Links Dropdown Management Hook
 *
 * Purpose: Manages the links dropdown UI and interactions in the sidebar
 * Responsibilities:
 * - Dropdown visibility state
 * - Auto-closing dropdown on outside clicks
 * - Dynamic dropdown height calculation based on viewport
 */

import { useState, useEffect, useRef } from 'react';

export const useSidebarLinksDropdown = () => {
  const [isLinksDropdownOpen, setIsLinksDropdownOpen] = useState(false);
  const [dropdownMaxHeight, setDropdownMaxHeight] = useState<number | undefined>(undefined);

  const linksTriggerRef = useRef<HTMLButtonElement | null>(null);
  const linksDropdownRef = useRef<HTMLDivElement | null>(null);

  // Update dropdown max height
  useEffect(() => {
    if (!isLinksDropdownOpen) return;
    const updateMaxHeight = () => {
      const trigger = linksTriggerRef.current;
      if (!trigger) return;
      const rect = trigger.getBoundingClientRect();
      const available = window.innerHeight - rect.bottom - 12;
      setDropdownMaxHeight(available > 0 ? available : undefined);
    };
    updateMaxHeight();
    window.addEventListener('resize', updateMaxHeight);
    return () => window.removeEventListener('resize', updateMaxHeight);
  }, [isLinksDropdownOpen]);

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!isLinksDropdownOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const insideDropdown = linksDropdownRef.current && linksDropdownRef.current.contains(target);
      const insideTrigger = linksTriggerRef.current && linksTriggerRef.current.contains(target);

      if (insideDropdown || insideTrigger) return;
      setIsLinksDropdownOpen(false);
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isLinksDropdownOpen]);

  return {
    isLinksDropdownOpen,
    setIsLinksDropdownOpen,
    dropdownMaxHeight,
    linksTriggerRef,
    linksDropdownRef,
  };
};

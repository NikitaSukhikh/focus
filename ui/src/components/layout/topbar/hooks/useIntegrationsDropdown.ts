/**
 * Integrations Dropdown Management Hook
 *
 * Purpose: Manages the integrations dropdown UI and interactions
 * Responsibilities:
 * - Dropdown visibility and search state
 * - Auto-closing dropdown on outside clicks
 * - Keyboard shortcut (Ctrl/Cmd+I) to toggle dropdown
 * - Dynamic dropdown height calculation based on viewport
 * - Opening add link and Telegram dialogs
 */

import { useState, useEffect, useRef } from 'react';

export const useIntegrationsDropdown = () => {
  const [isIntegrationsOpen, setIsIntegrationsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [dropdownMaxHeight, setDropdownMaxHeight] = useState<number | undefined>(undefined);

  const integrationsTriggerRef = useRef<HTMLButtonElement | null>(null);
  const integrationsDropdownRef = useRef<HTMLDivElement | null>(null);

  // Update dropdown max height
  useEffect(() => {
    if (!isIntegrationsOpen) return;
    const updateMaxHeight = () => {
      const trigger = integrationsTriggerRef.current;
      if (!trigger) return;
      const rect = trigger.getBoundingClientRect();
      const available = window.innerHeight - rect.bottom - 12;
      setDropdownMaxHeight(available > 0 ? available : undefined);
    };
    updateMaxHeight();
    window.addEventListener('resize', updateMaxHeight);
    return () => window.removeEventListener('resize', updateMaxHeight);
  }, [isIntegrationsOpen]);

  // Close integrations dropdown when clicking outside
  useEffect(() => {
    if (!isIntegrationsOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const insideDropdown = integrationsDropdownRef.current && integrationsDropdownRef.current.contains(target);
      const insideTrigger = integrationsTriggerRef.current && integrationsTriggerRef.current.contains(target);

      if (insideDropdown || insideTrigger) return;
      setIsIntegrationsOpen(false);
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isIntegrationsOpen]);

  // Keyboard shortcut for integrations
  useEffect(() => {
    const handleShortcut = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName;
      const isTextField =
        target?.isContentEditable ||
        tag === 'INPUT' ||
        tag === 'TEXTAREA' ||
        tag === 'SELECT';

      const isModifierOnly = (e.ctrlKey || e.metaKey) && !e.altKey && !e.shiftKey;
      const isIntegrationsHotkey = isModifierOnly && e.code === 'KeyI';
      if (!isIntegrationsHotkey || isTextField) return;

      e.preventDefault();
      e.stopPropagation();
      setIsIntegrationsOpen((prev) => !prev);
    };

    window.addEventListener('keydown', handleShortcut, true);
    return () => window.removeEventListener('keydown', handleShortcut, true);
  }, []);

  return {
    isIntegrationsOpen,
    setIsIntegrationsOpen,
    searchQuery,
    setSearchQuery,
    dropdownMaxHeight,
    integrationsTriggerRef,
    integrationsDropdownRef,
  };
};

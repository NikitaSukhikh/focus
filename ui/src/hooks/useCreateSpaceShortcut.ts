/**
 * Create Space Shortcut Hook
 *
 * Purpose: Adds a global keyboard shortcut (Ctrl/Cmd + Y) to create a new space
 * Responsibilities:
 * - Listen for the shortcut while avoiding text inputs
 * - Generate a unique default space name
 * - Call the space store to create and select the new space
 */

import { useEffect, useRef } from 'react';
import { useSpaceStore } from '../stores/spaceStore';
import { isModifierOnlyKey, isTextFieldTarget, preventDefaultAndStop } from './keyboardUtils';

const DEFAULT_SPACE_NAME = 'New Space';

const buildUniqueName = (baseName: string, existingNames: Set<string>): string => {
  let candidate = baseName;
  let suffix = 2;
  while (existingNames.has(candidate.toLowerCase())) {
    candidate = `${baseName} ${suffix}`;
    suffix += 1;
  }
  return candidate;
};

export const useCreateSpaceShortcut = () => {
  const spaces = useSpaceStore((state) => state.spaces);
  const createSpace = useSpaceStore((state) => state.createSpace);
  const selectSpace = useSpaceStore((state) => state.selectSpace);
  const isCreatingRef = useRef(false);

  useEffect(() => {
    const handleShortcut = async (e: KeyboardEvent) => {
      if (!isModifierOnlyKey(e) || e.code !== 'KeyY') return;

      const target = e.target as HTMLElement | null;
      if (isTextFieldTarget(target) || isCreatingRef.current) return;

      preventDefaultAndStop(e);
      isCreatingRef.current = true;

      try {
        const existingNames = new Set(spaces.map((space) => space.name.toLowerCase()));
        const name = buildUniqueName(DEFAULT_SPACE_NAME, existingNames);
        const created = await createSpace(name);
        if (created?.id) {
          selectSpace(created.id);
        }
      } catch (err) {
        console.error('Failed to create space via shortcut', err);
      } finally {
        isCreatingRef.current = false;
      }
    };

    window.addEventListener('keydown', handleShortcut, true);
    document.addEventListener('keydown', handleShortcut, true);
    return () => {
      window.removeEventListener('keydown', handleShortcut, true);
      document.removeEventListener('keydown', handleShortcut, true);
    };
  }, [spaces, createSpace, selectSpace]);
};

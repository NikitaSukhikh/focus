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
import { useSpaceStore } from '@/stores/spaceStore';
import { isModifierOnlyKey, isTextFieldTarget, preventDefaultAndStop } from '@/hooks/keyboardUtils';

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

export const useCreateSpaceShortcut = (isDialogOpen: boolean = false) => {
  const spaces = useSpaceStore((state) => state.spaces);
  const createSpace = useSpaceStore((state) => state.createSpace);
  const selectSpace = useSpaceStore((state) => state.selectSpace);
  const isCreatingRef = useRef(false);

  useEffect(() => {
    if (isDialogOpen) {
      console.log('[CREATE_SPACE_SHORTCUT] Skipping - dialog is open');
      return;
    }

    const handleShortcut = async (e: KeyboardEvent) => {
      console.log('[CREATE_SPACE_SHORTCUT] Key pressed:', {
        key: e.key,
        code: e.code,
        ctrl: e.ctrlKey,
        meta: e.metaKey,
        alt: e.altKey,
        shift: e.shiftKey,
        isModifierOnly: isModifierOnlyKey(e),
        isKeyY: e.code === 'KeyY'
      });

      if (!isModifierOnlyKey(e) || e.code !== 'KeyY') return;

      const target = e.target as HTMLElement | null;
      if (isTextFieldTarget(target)) {
        console.log('[CREATE_SPACE_SHORTCUT] Skipping - target is text field');
        return;
      }

      if (isCreatingRef.current) {
        console.log('[CREATE_SPACE_SHORTCUT] Skipping - already creating');
        return;
      }

      console.log('[CREATE_SPACE_SHORTCUT] Creating new space...');
      preventDefaultAndStop(e);
      isCreatingRef.current = true;

      try {
        const existingNames = new Set(spaces.map((space) => space.name.toLowerCase()));
        const name = buildUniqueName(DEFAULT_SPACE_NAME, existingNames);
        console.log('[CREATE_SPACE_SHORTCUT] Calling createSpace with name:', name);
        const created = await createSpace(name);
        console.log('[CREATE_SPACE_SHORTCUT] Created space:', created);
        if (created?.id) {
          selectSpace(created.id);
        }
      } catch (err) {
        console.error('[CREATE_SPACE_SHORTCUT] Failed to create space via shortcut', err);
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
  }, [spaces, createSpace, selectSpace, isDialogOpen]);
};

/**
 * Keyboard Utilities
 *
 * Purpose: Shared utilities for keyboard event handling
 * Responsibilities:
 * - Detecting text field targets to avoid shortcut conflicts
 * - Checking modifier key combinations
 * - Providing consistent keyboard event handling across the app
 */

/**
 * Checks if the event target is a text input field where keyboard shortcuts should be disabled
 */
export const isTextFieldTarget = (target: HTMLElement | null): boolean => {
  if (!target) return false;

  const tag = target.tagName;
  return (
    target.isContentEditable ||
    tag === 'INPUT' ||
    tag === 'TEXTAREA' ||
    tag === 'SELECT'
  );
};

/**
 * Checks if only Ctrl/Cmd modifier is pressed (no Alt or Shift)
 */
export const isModifierOnlyKey = (e: KeyboardEvent): boolean => {
  return (e.ctrlKey || e.metaKey) && !e.altKey && !e.shiftKey;
};

/**
 * Prevents default behavior and stops event propagation
 */
export const preventDefaultAndStop = (e: KeyboardEvent): void => {
  e.preventDefault();
  e.stopPropagation();
  e.stopImmediatePropagation?.();
  e.returnValue = false;
};

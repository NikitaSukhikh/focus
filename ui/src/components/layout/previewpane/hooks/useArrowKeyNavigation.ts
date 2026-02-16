import { useEffect } from 'react';
import { isTextFieldTarget } from '@/hooks/keyboardUtils';

export interface UseArrowKeyNavigationParams {
  navigateNext: () => void;
  navigatePrevious: () => void;
  canNavigateNext: boolean;
  canNavigatePrevious: boolean;
  isEnabled: boolean;
}

/**
 * Hook for handling arrow key navigation between tiles.
 *
 * Listens for ArrowLeft and ArrowRight keyboard events and triggers
 * navigation callbacks. These keys are ALWAYS captured for tile navigation,
 * even when webview/iframe has focus (PDF viewers use Up/Down instead).
 *
 * Guards against:
 * - Text input fields (INPUT, TEXTAREA, contentEditable)
 * - Modifier key combinations (Ctrl, Cmd, Alt, Shift)
 *
 * @param params - Navigation callbacks and state
 */
export function useArrowKeyNavigation(params: UseArrowKeyNavigationParams): void {
  const { navigateNext, navigatePrevious, canNavigateNext, canNavigatePrevious, isEnabled } = params;

  useEffect(() => {
    // Only register listener when preview is open
    if (!isEnabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Guard: Don't interfere with text fields
      const target = e.target as HTMLElement;
      if (isTextFieldTarget(target)) return;

      // Guard: Don't interfere with modifier key combinations
      if (e.ctrlKey || e.metaKey || e.altKey || e.shiftKey) return;

      // Handle arrow keys - always capture Left/Right for tile navigation
      // (webviews/iframes like PDF viewers should use Up/Down for page navigation)
      if (e.key === 'ArrowRight' && canNavigateNext) {
        e.preventDefault();
        e.stopPropagation();
        navigateNext();
      } else if (e.key === 'ArrowLeft' && canNavigatePrevious) {
        e.preventDefault();
        e.stopPropagation();
        navigatePrevious();
      }
    };

    // Use capture phase to catch events before they reach other handlers
    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [isEnabled, navigateNext, navigatePrevious, canNavigateNext, canNavigatePrevious]);
}

import { useEffect } from 'react';
import { isTextFieldTarget } from '@/hooks/keyboardUtils';

export interface UsePdfPageNavigationParams {
  webviewRef: React.RefObject<HTMLWebViewElement | null>;
  isPdfPreview: boolean;
  isEnabled: boolean;
}

/**
 * Hook for handling Up/Down arrow key navigation within PDF previews.
 *
 * Forwards ArrowUp and ArrowDown key events to the webview for PDF page scrolling.
 * This allows PDF navigation while Left/Right arrows remain reserved for tile navigation.
 *
 * @param params - Webview ref, PDF detection flag, and enabled state
 */
export function usePdfPageNavigation(params: UsePdfPageNavigationParams): void {
  const { webviewRef, isPdfPreview, isEnabled } = params;

  useEffect(() => {
    if (!isEnabled || !isPdfPreview) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Only handle Up/Down arrows
      if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return;

      // Guard: Don't interfere with text fields
      const target = e.target as HTMLElement;
      if (isTextFieldTarget(target)) return;

      // Guard: Don't interfere with modifier key combinations
      if (e.ctrlKey || e.metaKey || e.altKey || e.shiftKey) return;

      const webview = webviewRef.current as any;
      if (!webview) return;

      // Forward the key event to the webview for PDF scrolling
      try {
        // Use sendInputEvent to forward keyboard events to the webview
        webview.sendInputEvent({
          type: 'keyDown',
          keyCode: e.key,
        });
      } catch {
        // Fallback: execute script to scroll the PDF viewer
        const scrollAmount = e.key === 'ArrowDown' ? 100 : -100;
        webview.executeJavaScript(`window.scrollBy(0, ${scrollAmount})`).catch(() => {});
      }

      e.preventDefault();
      e.stopPropagation();
    };

    // Use capture phase to catch events before they reach other handlers
    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [isEnabled, isPdfPreview, webviewRef]);
}

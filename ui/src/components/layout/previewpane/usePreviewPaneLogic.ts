/**
 * PreviewPane Logic Composition Hook
 *
 * Purpose: Composes all PreviewPane webview logic hooks into a unified interface
 * Responsibilities:
 * - Composing specialized hooks (state, navigation, event handlers)
 * - Providing a single unified API to the PreviewPane presentation component
 * - Managing dependencies between webview features
 * - Handling pane open/close state changes
 * - Providing retry functionality for failed loads
 *
 * This is a composition hook that doesn't contain business logic itself,
 * but orchestrates other specialized hooks following the separation of concerns pattern.
 */

import { useEffect } from 'react';
import { useWebviewState } from './hooks/useWebviewState';
import { useWebviewNavigation } from './hooks/useWebviewNavigation';
import { useWebviewEventHandlers } from './hooks/useWebviewEventHandlers';
import { useWebviewPreloader } from './hooks/useWebviewPreloader';
import { useExternalBrowserFallback } from './hooks/useExternalBrowserFallback';

export const usePreviewPaneLogic = (
  webviewRef: React.RefObject<HTMLWebViewElement | null>,
  url: string | undefined,
  isOpen: boolean
) => {
  // State management with caching
  const state = useWebviewState(webviewRef);

  // External browser fallback for problematic URLs
  const externalFallback = useExternalBrowserFallback();

  // Preloader for frequently visited pages
  const frequentPages = state.cache.getFrequentPages();
  useWebviewPreloader(webviewRef, {
    enabled: isOpen,
    frequentPages,
  });

  // Navigation logic (scheduleRetry is defined inside, not returned)
  const { safeLoadURL, scheduleRetry } = useWebviewNavigation(webviewRef, url, state);

  // Event handlers
  useWebviewEventHandlers(webviewRef, {
    ...state,
    scheduleRetry,
    safeLoadURL,
    externalFallback,
  });

  // Reset state when pane closes
  useEffect(() => {
    if (!isOpen) {
      state.resetState();
    }
  }, [isOpen, state]);

  // Retry handler for manual retries
  const handleRetry = () => {
    state.setLoadError(null);
    const view = webviewRef.current as any;
    if (view && state.isReadyRef.current && typeof view.reload === 'function') {
      view.reload();
    } else if (url) {
      // If not ready, try loading the URL again
      state.pendingUrlRef.current = url;
      state.currentUrlRef.current = undefined;
    }
  };

  return {
    isLoading: state.isLoading,
    loadError: state.loadError,
    handleRetry,
  };
};

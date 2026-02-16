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

import { useEffect, useMemo, useRef } from 'react';
import { useWebviewState } from '@/components/layout/previewpane/hooks/useWebviewState';
import { useWebviewNavigation } from '@/components/layout/previewpane/hooks/useWebviewNavigation';
import { useWebviewEventHandlers } from '@/components/layout/previewpane/hooks/useWebviewEventHandlers';
import { useWebviewPreloader } from '@/components/layout/previewpane/hooks/useWebviewPreloader';
import { useExternalBrowserFallback } from '@/components/layout/previewpane/hooks/useExternalBrowserFallback';

export const usePreviewPaneLogic = (
  webviewRef: React.RefObject<HTMLWebViewElement | null>,
  url: string | undefined,
  isOpen: boolean
) => {
  // State management with caching
  const state = useWebviewState(webviewRef);

  // External browser fallback for problematic URLs
  const externalFallback = useExternalBrowserFallback();
  const lastExternalUrlRef = useRef<string | undefined>(undefined);
  const shouldOpenExternal = useMemo(
    () => !!(url && externalFallback.shouldOpenImmediately(url)),
    [url, externalFallback]
  );

  // Preloader for frequently visited pages
  // Memoize to prevent array reference changes on every render
  const frequentPages = useMemo(() => state.cache.getFrequentPages(), [state.cache]);
  useWebviewPreloader(webviewRef, {
    enabled: isOpen,
    frequentPages,
  });

  // Navigation logic (scheduleRetry is defined inside, not returned)
  const { safeLoadURL, scheduleRetry } = useWebviewNavigation(webviewRef, url, state, shouldOpenExternal);

  // Event handlers
  useWebviewEventHandlers(webviewRef, {
    ...state,
    scheduleRetry,
    safeLoadURL,
    externalFallback,
  });

  useEffect(() => {
    if (!isOpen) {
      lastExternalUrlRef.current = undefined;
      return;
    }

    if (!url || !shouldOpenExternal) return;
    if (lastExternalUrlRef.current === url) return;

    lastExternalUrlRef.current = url;
    state.clearRetryTimeout();
    state.setIsLoading(false);
    state.setLoadError('Opening in external browser...');
    externalFallback.openInExternal(url);
  }, [isOpen, url, shouldOpenExternal, state, externalFallback]);

  // Reset state when pane closes
  useEffect(() => {
    if (!isOpen) {
      state.resetState();
    }
  }, [isOpen, state]);

  // Retry handler for manual retries
  const handleRetry = () => {
    if (shouldOpenExternal && url) {
      externalFallback.openInExternal(url);
      return;
    }
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
    isReadyRef: state.isReadyRef,
    currentUrlRef: state.currentUrlRef,
  };
};

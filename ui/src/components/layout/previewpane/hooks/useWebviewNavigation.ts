/**
 * Webview Navigation Hook
 *
 * Purpose: Handles URL loading and navigation logic for the webview
 * Responsibilities:
 * - Safe URL loading with error handling
 * - Detecting and handling URL changes
 * - Managing loading states during navigation
 * - Scheduling retries on load failures
 * - Handling cached vs non-cached URL navigation
 * - Managing pending URL queue when webview not ready
 */

import { useEffect } from 'react';

interface NavigationState {
  setIsLoading: (loading: boolean) => void;
  setLoadError: (error: string | null) => void;
  currentUrlRef: React.MutableRefObject<string | undefined>;
  isReadyRef: React.MutableRefObject<boolean>;
  pendingUrlRef: React.MutableRefObject<string | undefined>;
  cachedUrlsRef: React.MutableRefObject<Set<string>>;
  skipSpinnerRef: React.MutableRefObject<boolean>;
  retryCountRef: React.MutableRefObject<number>;
  retryTimeoutRef: React.MutableRefObject<number | null>;
  RETRY_DELAY_MS: number;
  clearRetryTimeout: () => void;
  markLoadComplete: () => void;
  cache: {
    recordLoadStart: (url: string) => void;
    isCached: (url: string) => boolean;
    isHeavyPage: (url: string) => boolean;
  };
}

export const useWebviewNavigation = (
  webviewRef: React.RefObject<HTMLWebViewElement | null>,
  url: string | undefined,
  state: NavigationState
) => {
  const safeLoadURL = async (targetUrl: string) => {
    const view = webviewRef.current as any;
    if (!view || !targetUrl) return;
    try {
      // Setting src avoids promise rejections from loadURL on redirects/abort.
      if ('src' in view) {
        view.src = targetUrl;
        return;
      } else {
        await view.loadURL(targetUrl);
        return;
      }
    } catch (err: any) {
      const code = err?.code ?? err?.errno;
      if (code === -3) {
        // Abort/redirect; ignore.
        return;
      }
      console.error('[PreviewPane] Failed to load URL:', err);
      state.setLoadError('Failed to load URL');
      state.setIsLoading(false);
    }
  };

  const scheduleRetry = () => {
    state.clearRetryTimeout();
    state.retryTimeoutRef.current = window.setTimeout(() => {
      const targetUrl = state.currentUrlRef.current;
      if (targetUrl) {
        void safeLoadURL(targetUrl);
      }
    }, state.RETRY_DELAY_MS);
  };

  // Navigate to URL when it changes
  useEffect(() => {
    const view = webviewRef.current as any;
    if (!view || !url) return;

    // Safely get the current URL, handling cases where webview isn't ready
    let viewUrl: string | undefined;
    try {
      viewUrl = typeof view.getURL === 'function' ? view.getURL() : undefined;
    } catch (error) {
      // Webview not ready yet, ignore
      viewUrl = undefined;
    }

    if (viewUrl === url) {
      state.markLoadComplete();
      return;
    }

    // Only navigate if URL actually changed
    if (url !== state.currentUrlRef.current) {
      state.clearRetryTimeout();
      state.retryCountRef.current = 0;

      const isCached = state.cache.isCached(url);

      state.cachedUrlsRef.current.add(url);
      state.skipSpinnerRef.current = isCached;
      state.setIsLoading(!isCached);
      state.setLoadError(null);

      state.cache.recordLoadStart(url);

      // If webview is ready, load immediately
      if (state.isReadyRef.current) {
        state.currentUrlRef.current = url;
        void safeLoadURL(url);
      } else {
        // Otherwise, queue it for when dom-ready fires
        state.pendingUrlRef.current = url;
      }
    }
  }, [url, webviewRef, state]);

  return {
    safeLoadURL,
    scheduleRetry,
  };
};

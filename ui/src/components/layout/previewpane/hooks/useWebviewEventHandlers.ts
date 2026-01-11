/**
 * Webview Event Handlers Hook
 *
 * Purpose: Manages webview event listeners and their handlers
 * Responsibilities:
 * - Attaching/detaching webview lifecycle event listeners
 * - Handling load start/stop/finish events
 * - Handling load failures with retry logic
 * - Handling dom-ready event and pending URL queue
 * - Managing URL cache on successful loads
 * - Suppressing unhandled rejection errors for ERR_ABORTED
 */

import { useEffect } from 'react';

interface EventHandlersState {
  setIsLoading: (loading: boolean) => void;
  setLoadError: (error: string | null) => void;
  currentUrlRef: React.MutableRefObject<string | undefined>;
  isReadyRef: React.MutableRefObject<boolean>;
  pendingUrlRef: React.MutableRefObject<string | undefined>;
  cachedUrlsRef: React.MutableRefObject<Set<string>>;
  skipSpinnerRef: React.MutableRefObject<boolean>;
  retryCountRef: React.MutableRefObject<number>;
  MAX_RETRIES: number;
  markLoadComplete: () => void;
  clearRetryTimeout: () => void;
  scheduleRetry: () => void;
  safeLoadURL: (url: string) => Promise<void>;
  cache: {
    recordLoadComplete: (url: string) => void;
    updateAccessTime: (url: string) => void;
  };
  externalFallback: {
    shouldFallbackToExternal: (url: string, errorCode?: number) => boolean;
    recordFailedLoad: (url: string) => void;
    resetFailedLoad: (url: string) => void;
    openInExternal: (url: string) => void;
  };
}

export const useWebviewEventHandlers = (
  webviewRef: React.RefObject<HTMLWebViewElement | null>,
  state: EventHandlersState
) => {
  // Suppress top-level unhandled rejections from the webview navigation to avoid noisy ERR_ABORTED logs.
  useEffect(() => {
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const reason: any = event.reason;
      const code = reason?.code ?? reason?.errno;
      const url = reason?.url;
      // Suppress ERR_ABORTED (-3) for cancelled navigations
      if (code === -3) {
        event.preventDefault();
      }
    };
    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    return () => window.removeEventListener('unhandledrejection', handleUnhandledRejection);
  }, []);

  // Setup event listeners and handle webview ready state
  useEffect(() => {
    const view = webviewRef.current as any;
    if (!view) return;

    const handleLoadStart = () => {
      state.setIsLoading(true);
      state.setLoadError(null);
    };

    const handleLoadStop = () => {
      const loadedUrl = view?.getURL?.() as string | undefined;
      if (loadedUrl) {
        state.cachedUrlsRef.current.add(loadedUrl);
        state.cache.recordLoadComplete(loadedUrl);
        state.cache.updateAccessTime(loadedUrl);
        state.externalFallback.resetFailedLoad(loadedUrl);
      }
      state.setLoadError(null);
      state.markLoadComplete();
    };

    const handleFail = (_event: any, errorCode: number, errorDescription: string) => {
      const currentUrl = state.currentUrlRef.current;

      // Ignore certain non-critical errors (like -3 ERR_ABORTED from redirects)
      if (errorCode === -3 && !currentUrl) {
        state.markLoadComplete();
        return;
      }

      if (currentUrl) {
        state.externalFallback.recordFailedLoad(currentUrl);

        if (state.externalFallback.shouldFallbackToExternal(currentUrl, errorCode)) {
          state.setIsLoading(false);
          state.setLoadError('Opening in external browser...');
          setTimeout(() => {
            state.externalFallback.openInExternal(currentUrl);
            state.markLoadComplete();
          }, 500);
          return;
        }
      }

      // If the load fails, try a couple of quiet retries before showing error
      if (state.retryCountRef.current < state.MAX_RETRIES && currentUrl) {
        state.retryCountRef.current += 1;
        state.scheduleRetry();
        return;
      }

      state.setIsLoading(false);
      state.setLoadError(errorDescription || `Failed to load (${errorCode || 'unknown'})`);
    };

    const handleDomReady = () => {
      state.isReadyRef.current = true;
      state.setLoadError(null);
      state.markLoadComplete();

      // Load pending URL if there is one
      if (state.pendingUrlRef.current && state.pendingUrlRef.current !== state.currentUrlRef.current) {
        const urlToLoad = state.pendingUrlRef.current;
        state.pendingUrlRef.current = undefined;
        state.currentUrlRef.current = urlToLoad;
        state.skipSpinnerRef.current = state.cachedUrlsRef.current.has(urlToLoad);

        void state.safeLoadURL(urlToLoad);
      }
    };

    const handleNewWindow = (e: any) => {
      // Prevent new windows from opening in external browser
      // Instead, navigate within the same webview
      e.preventDefault();
      const targetUrl = e.url;
      if (targetUrl) {
        // Navigate to the URL in the same webview instead of opening externally
        void state.safeLoadURL(targetUrl);
      }
    };

    view.addEventListener('did-start-loading', handleLoadStart);
    view.addEventListener('did-stop-loading', handleLoadStop);
    view.addEventListener('did-finish-load', handleLoadStop);
    view.addEventListener('did-fail-load', handleFail);
    view.addEventListener('dom-ready', handleDomReady);
    view.addEventListener('new-window', handleNewWindow);

    return () => {
      view.removeEventListener('did-start-loading', handleLoadStart);
      view.removeEventListener('did-stop-loading', handleLoadStop);
      view.removeEventListener('did-finish-load', handleLoadStop);
      view.removeEventListener('did-fail-load', handleFail);
      view.removeEventListener('dom-ready', handleDomReady);
      view.removeEventListener('new-window', handleNewWindow);
      state.clearRetryTimeout();
    };
  }, [webviewRef, state]);
};

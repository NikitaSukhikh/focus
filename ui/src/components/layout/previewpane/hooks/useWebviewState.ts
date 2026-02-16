/**
 * Webview State Management Hook
 *
 * Purpose: Manages state for the webview component in PreviewPane
 * Responsibilities:
 * - Managing loading state and error state
 * - Tracking current URL and pending URL
 * - Managing cached URLs for instant navigation
 * - Tracking webview ready state
 * - Managing retry logic state and timeouts
 * - Integrating persistent cache with LRU eviction
 */

import { useState, useRef } from 'react';
import { useWebviewCache } from '@/components/layout/previewpane/hooks/useWebviewCache';

const MAX_RETRIES = 4;
const RETRY_DELAY_MS = 600;

export const useWebviewState = (webviewRef: React.RefObject<HTMLWebViewElement | null>) => {
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const currentUrlRef = useRef<string | undefined>(undefined);
  const isReadyRef = useRef(false);
  const pendingUrlRef = useRef<string | undefined>(undefined);
  const cachedUrlsRef = useRef<Set<string>>(new Set());
  const skipSpinnerRef = useRef(false);
  const retryCountRef = useRef(0);
  const retryTimeoutRef = useRef<number | null>(null);
  const authAttemptedRef = useRef(false);
  const authUrlRef = useRef<string | undefined>(undefined);

  const cache = useWebviewCache(webviewRef);

  const clearRetryTimeout = () => {
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }
  };

  const markLoadComplete = () => {
    setIsLoading(false);
    skipSpinnerRef.current = false;
    retryCountRef.current = 0;
    clearRetryTimeout();
    setLoadError(null);
  };

  const resetState = () => {
    setIsLoading(false);
    setLoadError(null);
    clearRetryTimeout();
    // Reset navigation refs so reopening the pane reloads the same URL
    currentUrlRef.current = undefined;
    pendingUrlRef.current = undefined;
    cachedUrlsRef.current.clear();
    skipSpinnerRef.current = false;
    retryCountRef.current = 0;
    isReadyRef.current = false;
    authAttemptedRef.current = false;
    authUrlRef.current = undefined;
  };

  return {
    // State
    isLoading,
    setIsLoading,
    loadError,
    setLoadError,

    // Refs
    currentUrlRef,
    isReadyRef,
    pendingUrlRef,
    cachedUrlsRef,
    skipSpinnerRef,
    retryCountRef,
    retryTimeoutRef,
    authAttemptedRef,
    authUrlRef,

    // Constants
    MAX_RETRIES,
    RETRY_DELAY_MS,

    // Helpers
    clearRetryTimeout,
    markLoadComplete,
    resetState,

    // Cache
    cache,
  };
};

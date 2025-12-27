import { useRef, useCallback } from 'react';
import { openExternalUrl } from '../../../../platform';

interface FailedLoadAttempt {
  url: string;
  attempts: number;
  lastAttempt: number;
}

const MAX_FAILED_ATTEMPTS = 2;
const PROBLEMATIC_PATTERNS = [
  /github\.com/i,
  /gitlab\.com/i,
  /bitbucket\.org/i,
];

export function useExternalBrowserFallback() {
  const failedLoadsRef = useRef<Map<string, FailedLoadAttempt>>(new Map());

  const isProblematicUrl = useCallback((url: string): boolean => {
    return PROBLEMATIC_PATTERNS.some(pattern => pattern.test(url));
  }, []);

  const shouldFallbackToExternal = useCallback((url: string, errorCode?: number): boolean => {
    const failedLoad = failedLoadsRef.current.get(url);

    if (!failedLoad) return false;

    if (failedLoad.attempts >= MAX_FAILED_ATTEMPTS) {
      return true;
    }

    if (isProblematicUrl(url) && errorCode === -3) {
      return failedLoad.attempts >= 1;
    }

    return false;
  }, [isProblematicUrl]);

  const recordFailedLoad = useCallback((url: string) => {
    const existing = failedLoadsRef.current.get(url);

    if (existing) {
      existing.attempts += 1;
      existing.lastAttempt = Date.now();
    } else {
      failedLoadsRef.current.set(url, {
        url,
        attempts: 1,
        lastAttempt: Date.now(),
      });
    }
  }, []);

  const resetFailedLoad = useCallback((url: string) => {
    failedLoadsRef.current.delete(url);
  }, []);

  const openInExternal = useCallback((url: string) => {
    openExternalUrl(url);
    resetFailedLoad(url);
  }, [resetFailedLoad]);

  const clearOldEntries = useCallback(() => {
    const now = Date.now();
    const FIVE_MINUTES = 5 * 60 * 1000;

    for (const [url, attempt] of failedLoadsRef.current.entries()) {
      if (now - attempt.lastAttempt > FIVE_MINUTES) {
        failedLoadsRef.current.delete(url);
      }
    }
  }, []);

  return {
    isProblematicUrl,
    shouldFallbackToExternal,
    recordFailedLoad,
    resetFailedLoad,
    openInExternal,
    clearOldEntries,
  };
}

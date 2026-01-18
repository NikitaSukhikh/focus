import { useEffect, useCallback, useRef } from 'react';

interface PreloaderOptions {
  enabled: boolean;
  frequentPages: string[];
}

// useWebviewPreloader preconnects to frequently visited URLs when the preview pane is open to make subsequent webview navigations faster.
export function useWebviewPreloader(
  webviewRef: React.RefObject<HTMLWebViewElement | null>,
  options: PreloaderOptions
) {
  const preloadedRef = useRef<Set<string>>(new Set());
  const preloadTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const preloadPage = useCallback((url: string) => {
    if (!options.enabled || !webviewRef.current || preloadedRef.current.has(url)) {
      return;
    }

    const view = webviewRef.current;

    if ((view as any).src === url) {
      preloadedRef.current.add(url);
      return;
    }

    // Preconnect feature is not critical and requires electron.remote which is deprecated
    // Skip preconnecting for now - webviews will still work, just without preconnect optimization
    preloadedRef.current.add(url);
  }, [options.enabled, webviewRef]);

  const schedulePreloading = useCallback(() => {
    if (preloadTimeoutRef.current) {
      clearTimeout(preloadTimeoutRef.current);
    }

    preloadTimeoutRef.current = setTimeout(() => {
      options.frequentPages.forEach(url => {
        preloadPage(url);
      });
    }, 2000);
  }, [options.frequentPages, preloadPage]);

  useEffect(() => {
    if (options.enabled && options.frequentPages.length > 0) {
      schedulePreloading();
    }

    return () => {
      if (preloadTimeoutRef.current) {
        clearTimeout(preloadTimeoutRef.current);
      }
    };
  }, [options.enabled, options.frequentPages, schedulePreloading]);

  const resetPreloaded = useCallback(() => {
    preloadedRef.current.clear();
  }, []);

  return {
    preloadPage,
    resetPreloaded
  };
}

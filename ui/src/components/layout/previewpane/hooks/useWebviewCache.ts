import { useEffect, useRef, useCallback } from 'react';

interface CacheEntry {
  url: string;
  lastAccessed: number;
  loadCount: number;
  averageLoadTime: number;
}

interface CacheConfig {
  maxEntries: number;
  preloadThreshold: number;
  heavyPagePatterns: RegExp[];
}

const DEFAULT_CONFIG: CacheConfig = {
  maxEntries: 50,
  preloadThreshold: 3,
  heavyPagePatterns: [
    /amazon\./i,
    /youtube\./i,
    /netflix\./i,
    /facebook\./i,
    /instagram\./i,
    /twitter\./i,
    /reddit\./i
  ]
};

const CACHE_STORAGE_KEY = 'focus_webview_cache';

// useWebviewCache keeps lightweight load statistics in localStorage to inform caching and preloading decisions for the preview webview.
export function useWebviewCache(_webviewRef: React.RefObject<HTMLWebViewElement | null>) {
  const cacheMapRef = useRef<Map<string, CacheEntry>>(new Map());
  const loadStartTimeRef = useRef<number | null>(null);

  useEffect(() => {
    loadCacheFromStorage();
  }, []);

  const loadCacheFromStorage = () => {
    try {
      const stored = localStorage.getItem(CACHE_STORAGE_KEY);
      if (stored) {
        const entries: [string, CacheEntry][] = JSON.parse(stored);
        cacheMapRef.current = new Map(entries);
      }
    } catch (error) {
      console.error('Failed to load cache from storage:', error);
    }
  };

  const saveCacheToStorage = useCallback(() => {
    try {
      const entries = Array.from(cacheMapRef.current.entries());
      localStorage.setItem(CACHE_STORAGE_KEY, JSON.stringify(entries));
    } catch (error) {
      console.error('Failed to save cache to storage:', error);
    }
  }, []);

  const isHeavyPage = (url: string): boolean => {
    return DEFAULT_CONFIG.heavyPagePatterns.some(pattern => pattern.test(url));
  };

  const evictLRU = () => {
    if (cacheMapRef.current.size < DEFAULT_CONFIG.maxEntries) return;

    let oldestUrl = '';
    let oldestTime = Infinity;

    for (const [url, entry] of cacheMapRef.current.entries()) {
      if (entry.lastAccessed < oldestTime) {
        oldestTime = entry.lastAccessed;
        oldestUrl = url;
      }
    }

    if (oldestUrl) {
      cacheMapRef.current.delete(oldestUrl);
    }
  };

  const recordLoadStart = useCallback((_url: string) => {
    loadStartTimeRef.current = Date.now();
  }, []);

  const recordLoadComplete = useCallback((url: string) => {
    if (!loadStartTimeRef.current) return;

    const loadTime = Date.now() - loadStartTimeRef.current;
    const existing = cacheMapRef.current.get(url);

    if (existing) {
      const newAverage = (existing.averageLoadTime * existing.loadCount + loadTime) / (existing.loadCount + 1);
      cacheMapRef.current.set(url, {
        url,
        lastAccessed: Date.now(),
        loadCount: existing.loadCount + 1,
        averageLoadTime: newAverage
      });
    } else {
      evictLRU();
      cacheMapRef.current.set(url, {
        url,
        lastAccessed: Date.now(),
        loadCount: 1,
        averageLoadTime: loadTime
      });
    }

    loadStartTimeRef.current = null;
    saveCacheToStorage();
  }, [saveCacheToStorage]);

  const updateAccessTime = useCallback((url: string) => {
    const entry = cacheMapRef.current.get(url);
    if (entry) {
      entry.lastAccessed = Date.now();
      saveCacheToStorage();
    }
  }, [saveCacheToStorage]);

  const isCached = useCallback((url: string): boolean => {
    return cacheMapRef.current.has(url);
  }, []);

  const shouldPreload = useCallback((url: string): boolean => {
    const entry = cacheMapRef.current.get(url);
    return !!(entry && entry.loadCount >= DEFAULT_CONFIG.preloadThreshold && isHeavyPage(url));
  }, []);

  const getFrequentPages = useCallback((): string[] => {
    return Array.from(cacheMapRef.current.values())
      .filter(entry => entry.loadCount >= DEFAULT_CONFIG.preloadThreshold)
      .sort((a, b) => b.loadCount - a.loadCount)
      .slice(0, 5)
      .map(entry => entry.url);
  }, []);

  const clearCache = useCallback(() => {
    cacheMapRef.current.clear();
    localStorage.removeItem(CACHE_STORAGE_KEY);
  }, []);

  const getCacheStats = useCallback(() => {
    return {
      totalEntries: cacheMapRef.current.size,
      heavyPages: Array.from(cacheMapRef.current.keys()).filter(isHeavyPage).length,
      mostVisited: getFrequentPages()
    };
  }, [getFrequentPages]);

  return {
    recordLoadStart,
    recordLoadComplete,
    updateAccessTime,
    isCached,
    shouldPreload,
    getFrequentPages,
    clearCache,
    getCacheStats,
    isHeavyPage
  };
}

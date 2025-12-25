import { useEffect, useRef, useState } from 'react';
import { X, ExternalLink } from 'lucide-react';
import { openExternalUrl } from '../../../platform';

/* eslint-disable react/no-unknown-property */

interface PreviewPaneProps {
  isOpen: boolean;
  onClose: () => void;
  url?: string;
  title?: string;
  tileId?: string;
}

export function PreviewPane({ isOpen, onClose, url, title }: PreviewPaneProps) {
  const webviewRef = useRef<HTMLWebViewElement | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const currentUrlRef = useRef<string | undefined>(undefined);
  const isReadyRef = useRef(false);
  const pendingUrlRef = useRef<string | undefined>(undefined);
  const cachedUrlsRef = useRef<Set<string>>(new Set());
  const skipSpinnerRef = useRef(false);

  const markLoadComplete = () => {
    setIsLoading(false);
    skipSpinnerRef.current = false;
  };

  // Setup event listeners and handle webview ready state
  useEffect(() => {
    const view = webviewRef.current as any;
    if (!view) return;

    const handleLoadStart = () => {
      setIsLoading(true);
      setLoadError(null);
    };
    const handleLoadStop = () => {
      const loadedUrl = view?.getURL?.() as string | undefined;
      if (loadedUrl) {
        cachedUrlsRef.current.add(loadedUrl);
      }
      markLoadComplete();
    };
    const handleFail = (_event: any, errorCode: number, errorDescription: string) => {
      // Ignore certain non-critical errors (like -3 ERR_ABORTED from redirects)
      if (errorCode === -3) {
        markLoadComplete();
        return;
      }

      setIsLoading(false);
      setLoadError(errorDescription || `Failed to load (${errorCode})`);
    };
    const handleDomReady = () => {
      isReadyRef.current = true;
      markLoadComplete();

      // Load pending URL if there is one
      if (pendingUrlRef.current && pendingUrlRef.current !== currentUrlRef.current) {
        const urlToLoad = pendingUrlRef.current;
        pendingUrlRef.current = undefined;
        currentUrlRef.current = urlToLoad;
        skipSpinnerRef.current = cachedUrlsRef.current.has(urlToLoad);

        try {
          view.loadURL(urlToLoad);
        } catch (err) {
          console.error('[PreviewPane] Failed to load pending URL:', err);
          setLoadError('Failed to load URL');
          setIsLoading(false);
        }
      }
    };

    view.addEventListener('did-start-loading', handleLoadStart);
    view.addEventListener('did-stop-loading', handleLoadStop);
    view.addEventListener('did-finish-load', handleLoadStop);
    view.addEventListener('did-fail-load', handleFail);
    view.addEventListener('dom-ready', handleDomReady);

    return () => {
      view.removeEventListener('did-start-loading', handleLoadStart);
      view.removeEventListener('did-stop-loading', handleLoadStop);
      view.removeEventListener('did-finish-load', handleLoadStop);
      view.removeEventListener('did-fail-load', handleFail);
      view.removeEventListener('dom-ready', handleDomReady);
    };
  }, []);

  // Navigate to URL when it changes
  useEffect(() => {
    const view = webviewRef.current as any;
    if (!view || !url) return;

    const viewUrl = typeof view.getURL === 'function' ? view.getURL() : undefined;
    if (viewUrl === url) {
      markLoadComplete();
      return;
    }

    // Only navigate if URL actually changed
    if (url !== currentUrlRef.current) {
      const isCached = cachedUrlsRef.current.has(url);
      skipSpinnerRef.current = isCached;
      setIsLoading(!isCached);
      setLoadError(null);

      // If webview is ready, load immediately
      if (isReadyRef.current) {
        currentUrlRef.current = url;
        try {
          view.loadURL(url);
        } catch (err) {
          console.error('[PreviewPane] Failed to load URL:', err);
          setLoadError('Failed to load URL');
          setIsLoading(false);
        }
      } else {
        // Otherwise, queue it for when dom-ready fires
        pendingUrlRef.current = url;
      }
    }
  }, [url]);

  useEffect(() => {
    if (!isOpen) {
      setIsLoading(false);
      setLoadError(null);
    }
  }, [isOpen]);

  const collapsed = !isOpen;

  return (
    <aside
      className="flex-1 bg-white flex flex-col h-full transition-[flex,width,opacity] duration-150"
      style={{
        minWidth: collapsed ? 0 : '360px',
        flex: collapsed ? '0 0 auto' : '1 1 0%',
        width: collapsed ? 0 : 'auto',
        opacity: collapsed ? 0 : 1,
        pointerEvents: collapsed ? 'none' : 'auto',
        overflow: collapsed ? 'hidden' : 'visible'
      }}
      aria-hidden={collapsed}
    >
      <div className="flex items-center justify-between p-4 border-b border-slate-200">
        <div className="flex items-center gap-2 min-w-0">
          <h2 className="text-lg font-semibold text-slate-900">Preview</h2>
          {title && <span className="text-sm text-slate-500 truncate">- {title}</span>}
        </div>
        <div className="flex items-center gap-2">
          {url && (
            <button
              onClick={() => url && openExternalUrl(url)}
              className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600 hover:text-slate-900 transition-colors"
              title="Open in external browser"
            >
              <ExternalLink size={18} />
            </button>
          )}
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600 hover:text-slate-900 transition-colors"
            title="Close preview"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden bg-slate-50 relative flex flex-col">
        {!url && (
          <div className="absolute inset-0 flex items-center justify-center z-30">
            <div className="text-sm text-slate-500">No preview available.</div>
          </div>
        )}
        {/* eslint-disable-next-line react/no-unknown-property */}
        <webview
          ref={webviewRef}
          src="about:blank"
          partition="persist:ocean-webview"
          allowpopups
          useragent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"
          style={{
            flex: 1,
            width: '100%',
            minHeight: 0,
            visibility: url ? 'visible' : 'hidden'
          }}
        />
        {url && loadError && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-white z-20">
            <div className="text-sm text-red-600">{loadError}</div>
            <div className="text-xs text-slate-400 max-w-md text-center break-all">
              {url}
            </div>
            <button
              onClick={() => {
                setLoadError(null);
                const view = webviewRef.current as any;
                if (view && isReadyRef.current && typeof view.reload === 'function') {
                  view.reload();
                } else if (url) {
                  // If not ready, try loading the URL again
                  pendingUrlRef.current = url;
                  currentUrlRef.current = undefined;
                }
              }}
              className="mt-2 px-4 py-2 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              Retry
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}

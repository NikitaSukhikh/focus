import { useEffect, useRef, useState } from 'react';
import { X, ExternalLink, Loader2 } from 'lucide-react';
import { openExternalUrl } from '../../../platform';

/* eslint-disable react/no-unknown-property */

interface PreviewPaneProps {
  isOpen: boolean;
  onClose: () => void;
  url?: string;
  title?: string;
  tileId?: string;
}

export function PreviewPane({ isOpen, onClose, url, title, tileId }: PreviewPaneProps) {
  const webviewRef = useRef<HTMLWebViewElement | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    const view = webviewRef.current as any;
    if (!view) return;

    const handleLoadStart = () => {
      setIsLoading(true);
      setLoadError(null);
    };
    const handleLoadStop = () => {
      setIsLoading(false);
    };
    const handleFail = (_event: any, errorCode: number, errorDescription: string) => {
      setIsLoading(false);
      setLoadError(errorDescription || `Failed to load (${errorCode})`);
    };

    view.addEventListener('did-start-loading', handleLoadStart);
    view.addEventListener('did-stop-loading', handleLoadStop);
    view.addEventListener('did-fail-load', handleFail);

    // Trigger loading state when URL changes
    if (url) {
      setIsLoading(true);
      setLoadError(null);
    }

    return () => {
      view.removeEventListener('did-start-loading', handleLoadStart);
      view.removeEventListener('did-stop-loading', handleLoadStop);
      view.removeEventListener('did-fail-load', handleFail);
    };
  }, [url, tileId]);

  useEffect(() => {
    if (!isOpen) {
      setIsLoading(false);
      setLoadError(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <aside className="flex-1 min-w-0 bg-white flex flex-col h-full">
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

      <div className="flex-1 overflow-hidden bg-slate-50 relative">
        {!url && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-sm text-slate-500">No preview available.</div>
          </div>
        )}
        {url && (
          <>
            {/* eslint-disable-next-line react/no-unknown-property */}
            <webview
              ref={webviewRef}
              key={tileId || 'preview'}
              src={url}
              partition={tileId ? `persist:${tileId}` : 'default'}
              allowpopups
              style={{ width: '100%', height: '100%' }}
            />
          </>
        )}
        {url && isLoading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-white/80 z-10">
            <Loader2 size={32} className="text-blue-500 animate-spin" />
            <div className="text-sm text-slate-500">Loading preview...</div>
          </div>
        )}
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
                if (view && typeof view.reload === 'function') {
                  view.reload();
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

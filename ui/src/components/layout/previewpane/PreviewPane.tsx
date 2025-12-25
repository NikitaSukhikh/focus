import { useEffect, useState, useRef } from 'react';
import { X, ExternalLink, Loader2 } from 'lucide-react';
import { WebviewWindow, appWindow, PhysicalPosition, PhysicalSize } from '@tauri-apps/api/window';

interface PreviewPaneProps {
  isOpen: boolean;
  onClose: () => void;
  url?: string;
  title?: string;
  tileId?: string;
}

// Cache for webview instances by tile ID
const webviewCache = new Map<string, WebviewWindow>();

export function PreviewPane({ isOpen, onClose, url, title, tileId }: PreviewPaneProps) {
  const [webview, setWebview] = useState<WebviewWindow | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const currentTileIdRef = useRef<string | undefined>();
  const containerRef = useRef<HTMLDivElement>(null);
  const positionIntervalRef = useRef<number | null>(null);
  const pageLoadTimeoutRef = useRef<number | null>(null);

  // Position the child webview to overlay the preview pane content area
  const positionWebview = async () => {
    if (!webview || !containerRef.current) return;

    try {
      const container = containerRef.current;
      const rect = container.getBoundingClientRect();
      const mainWindow = appWindow;
      const mainPosition = await mainWindow.outerPosition();
      const scaleFactor = await mainWindow.scaleFactor();

      // Calculate absolute screen position
      const x = Math.round((mainPosition.x + rect.left) * scaleFactor);
      const y = Math.round((mainPosition.y + rect.top) * scaleFactor);
      const width = Math.round(rect.width * scaleFactor);
      const height = Math.round(rect.height * scaleFactor);

      await webview.setPosition(new PhysicalPosition(x, y));
      await webview.setSize(new PhysicalSize(width, height));
    } catch (error) {
      console.error('[PreviewPane] Error positioning webview:', error);
    }
  };

  useEffect(() => {
    if (!isOpen || !url || !tileId) {
      // Hide webview when closing preview (keep it cached)
      if (webview) {
        webview.hide().catch(console.error);
      }
      if (positionIntervalRef.current) {
        clearInterval(positionIntervalRef.current);
        positionIntervalRef.current = null;
      }
      currentTileIdRef.current = undefined;
      return;
    }

    // If tile changed, hide old webview and show cached or create new one
    if (tileId !== currentTileIdRef.current) {
      const previousTileId = currentTileIdRef.current;
      currentTileIdRef.current = tileId;

      // Hide current webview if it exists
      if (webview && previousTileId) {
        webview.hide().catch(console.error);
        // Stop positioning the hidden webview
        if (positionIntervalRef.current) {
          clearInterval(positionIntervalRef.current);
          positionIntervalRef.current = null;
        }
      }

      // Check if we have a cached webview for this tile
      const cachedWebview = webviewCache.get(tileId);

      if (cachedWebview) {
        // Reuse cached webview
        console.log('[PreviewPane] Reusing cached webview for tile:', tileId, 'URL:', url);
        setIsLoading(false);
        setLoadError(null);
        setWebview(cachedWebview);

        // Show and reposition the cached webview
        cachedWebview.show().then(async () => {
          await positionWebview();

          // Resume positioning updates
          positionIntervalRef.current = window.setInterval(() => {
            positionWebview();
          }, 16); // ~60fps for smoother positioning
        }).catch((error) => {
          console.error('[PreviewPane] Error showing cached webview:', error);
          setLoadError('Failed to show cached preview');
        });
      } else {
        // Create new webview
        setIsLoading(true);
        setLoadError(null);

        // Create a unique label for the webview
        const webviewLabel = `preview-${tileId}-${Date.now()}`;

        console.log('[PreviewPane] Creating new webview for tile:', tileId, 'URL:', url);

        // Create the webview window
        const createWebview = async () => {
          try {
            const newWebview = new WebviewWindow(webviewLabel, {
              url,
              title: title || 'Preview',
              width: 800,
              height: 600,
              x: 0,
              y: 0,
              decorations: false,
              resizable: false,
              skipTaskbar: true,
              alwaysOnTop: true, // Keep on top to prevent it from going behind main window
              transparent: false,
              visible: false, // Start hidden to avoid flash
              focus: false, // Don't steal focus from main window
            });

            newWebview.once('tauri://created', async () => {
              console.log('[PreviewPane] Webview window created successfully for tile:', tileId, 'URL:', url);
              setWebview(newWebview);

              // Cache the webview by tile ID
              webviewCache.set(tileId, newWebview);

              // Position the webview first (while still hidden)
              await positionWebview();

              // Set a timeout to hide loader if page takes too long (fallback)
              pageLoadTimeoutRef.current = window.setTimeout(() => {
                console.log('[PreviewPane] Page load timeout, showing webview anyway');
                setIsLoading(false);
                newWebview.show().catch(console.error);
              }, 10000); // 10 second timeout

              // Wait for page to load before showing
              setTimeout(async () => {
                // Hide loader and show webview simultaneously for seamless transition
                setIsLoading(false);
                await newWebview.show();

                if (pageLoadTimeoutRef.current) {
                  clearTimeout(pageLoadTimeoutRef.current);
                  pageLoadTimeoutRef.current = null;
                }
              }, 3000); // Wait 3s for page to fully load before showing

              setLoadError(null);

              // Continuously update position to keep it aligned (faster for smoother tracking)
              positionIntervalRef.current = window.setInterval(() => {
                positionWebview();
              }, 16); // ~60fps for smoother positioning
            });

            newWebview.once('tauri://error', (e) => {
              console.error('[PreviewPane] Webview creation error for:', url, e);
              setIsLoading(false);
              setLoadError(`Failed to load preview: ${e || 'Unknown error'}`);
            });

            // Clean up on destroy
            newWebview.once('tauri://destroyed', () => {
              console.log('[PreviewPane] Webview destroyed for tile:', tileId);
              setWebview(null);
              webviewCache.delete(tileId);
              if (positionIntervalRef.current) {
                clearInterval(positionIntervalRef.current);
                positionIntervalRef.current = null;
              }
            });
          } catch (error) {
            console.error('[PreviewPane] Exception creating webview for:', url, error);
            setIsLoading(false);
            setLoadError(`Failed to create preview: ${error}`);
          }
        };

        createWebview();
      }
    }
  }, [isOpen, url, title, tileId]);

  // Update webview position when it exists
  useEffect(() => {
    if (webview) {
      positionWebview();
    }
  }, [webview]);

  // Clean up on unmount - close all cached webviews
  useEffect(() => {
    return () => {
      if (positionIntervalRef.current) {
        clearInterval(positionIntervalRef.current);
        positionIntervalRef.current = null;
      }

      if (pageLoadTimeoutRef.current) {
        clearTimeout(pageLoadTimeoutRef.current);
        pageLoadTimeoutRef.current = null;
      }

      // Close all cached webviews on unmount
      webviewCache.forEach((cachedWebview) => {
        cachedWebview.close().catch(console.error);
      });
      webviewCache.clear();
    };
  }, []);

  // Clean up preview webviews when main window is closing
  useEffect(() => {
    const cleanup = async () => {
      if (positionIntervalRef.current) {
        clearInterval(positionIntervalRef.current);
        positionIntervalRef.current = null;
      }

      // Close all cached webviews
      const closePromises = Array.from(webviewCache.values()).map(cachedWebview =>
        cachedWebview.close().catch(console.error)
      );
      await Promise.all(closePromises);
      webviewCache.clear();
    };

    const unlisten = appWindow.onCloseRequested(async () => {
      await cleanup();
    });

    return () => {
      unlisten.then(fn => fn());
    };
  }, []);

  // Keep main window focused when interacting with preview pane
  useEffect(() => {
    const handleFocus = async () => {
      // When preview pane area is interacted with, ensure main window stays in front
      if (webview && isOpen) {
        try {
          await appWindow.setFocus();
        } catch (error) {
          // Ignore focus errors
        }
      }
    };

    const container = containerRef.current;
    if (container) {
      container.addEventListener('mouseenter', handleFocus);
      return () => {
        container.removeEventListener('mouseenter', handleFocus);
      };
    }
  }, [webview, isOpen]);

  const handleOpenExternal = async () => {
    if (!url) return;

    const externalWebview = new WebviewWindow(`external-${Date.now()}`, {
      url,
      title: title || 'Browser',
      width: 1200,
      height: 800,
      center: true,
      decorations: true,
      resizable: true,
    });

    externalWebview.once('tauri://error', () => {
      window.open(url, '_blank');
    });
  };

  if (!isOpen) return null;

  return (
    <aside className="flex-1 min-w-0 bg-white flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-200">
        <div className="flex items-center gap-2 min-w-0">
          <h2 className="text-lg font-semibold text-slate-900">Preview</h2>
          {title && <span className="text-sm text-slate-500 truncate">- {title}</span>}
        </div>
        <div className="flex items-center gap-2">
          {url && (
            <button
              onClick={handleOpenExternal}
              className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600 hover:text-slate-900 transition-colors"
              title="Open in separate window"
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

      {/* Preview Content - Webview will be positioned over this */}
      <div
        ref={containerRef}
        className="flex-1 overflow-hidden bg-slate-50 relative"
      >
        {!url && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-sm text-slate-500">No preview available.</div>
          </div>
        )}
        {url && isLoading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-white z-10">
            <Loader2 size={32} className="text-blue-500 animate-spin" />
            <div className="text-sm text-slate-500">Loading preview...</div>
          </div>
        )}
        {url && loadError && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-white">
            <div className="text-sm text-red-600">{loadError}</div>
            <div className="text-xs text-slate-400 max-w-md text-center break-all">
              {url}
            </div>
            <button
              onClick={() => {
                setLoadError(null);
                // Force reload by clearing cache entry and tile ID ref
                if (tileId) {
                  webviewCache.delete(tileId);
                }
                const currentId = currentTileIdRef.current;
                currentTileIdRef.current = undefined;
                setTimeout(() => {
                  currentTileIdRef.current = currentId;
                }, 0);
              }}
              className="mt-2 px-4 py-2 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              Retry
            </button>
          </div>
        )}
        {/* Webview will be positioned over this area once loaded */}
      </div>
    </aside>
  );
}

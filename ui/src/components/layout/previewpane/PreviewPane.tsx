import { useRef, useState, useEffect } from 'react';
import { X, ExternalLink } from 'lucide-react';
import { Z_INDEX } from '../../../constants/zIndex';
import { openExternalUrl } from '../../../platform';
import { usePreviewPaneLogic } from './usePreviewPaneLogic';
import { FONT_ROLES } from '../../../styles/fontManager';
import { getVideoEmbed } from '../../../utils/videoEmbeds';

/* eslint-disable react/no-unknown-property */

interface ImageMetadata {
  width: number;
  height: number;
  aspect_ratio: string;
  file_size: number;
  file_size_human: string;
}

interface PreviewPaneProps {
  isOpen: boolean;
  onClose: () => void;
  url?: string;
  title?: string;
  tileId?: string;
  filePath?: string;
  type?: string;
  content?: string;
}

export function PreviewPane({ isOpen, onClose, url, title, filePath, type, content }: PreviewPaneProps) {
  const webviewRef = useRef<HTMLWebViewElement | null>(null);
  const [documentError, setDocumentError] = useState<string | null>(null);
  const [documentLoading, setDocumentLoading] = useState(false);
  const [imageMetadata, setImageMetadata] = useState<ImageMetadata | null>(null);

  const collapsed = !isOpen;

  // Check if this is an image file
  const isImageFile = type === 'file' && filePath && /\.(png|jpg|jpeg|gif|bmp|webp|svg|tiff|tif|ico|heic|heif)$/i.test(filePath);

  // Check if this is a document file (DOCX, DOC and ODT are supported)
  const isDocumentFile = type === 'file' && filePath && /\.(docx|doc|odt)$/i.test(filePath);

  // Build image preview URL
  const imagePreviewUrl = isImageFile && filePath
    ? `/api/thumbnails/full-image?${new URLSearchParams({ file_path: filePath }).toString()}`
    : null;

  // Build document preview URL
  const documentPreviewUrl = isDocumentFile && filePath
    ? `/api/thumbnails/document-preview?${new URLSearchParams({ file_path: filePath }).toString()}`
    : null;

  const videoEmbed = getVideoEmbed(url);

  // Only use webview logic when not showing an image or document
  const hasNonWebviewPreview = imagePreviewUrl || documentPreviewUrl || videoEmbed;
  // Always keep webview logic active when pane is open to prevent state loss
  const logic = usePreviewPaneLogic(webviewRef, hasNonWebviewPreview ? undefined : url, isOpen);
  const textPreviewBody = (() => {
    if (type !== 'text' || !content) return content;

    const lines = content.split(/\r?\n/);
    if (!lines.length) return content;

    const firstLine = lines[0].trim();
    const normalizedTitle = (title || '').trim();
    const titleMatchesFirstLine =
      normalizedTitle &&
      (firstLine.toLowerCase() === normalizedTitle.toLowerCase() ||
        firstLine.toLowerCase().startsWith(normalizedTitle.toLowerCase()) ||
        normalizedTitle.toLowerCase().startsWith(firstLine.toLowerCase()));

    if (titleMatchesFirstLine) {
      return lines.slice(1).join('\n').replace(/^\n*/, '');
    }

    return content;
  })();

  // Load image metadata
  useEffect(() => {
    if (isImageFile && filePath) {
      const params = new URLSearchParams({ file_path: filePath });
      fetch(`/api/thumbnails/metadata?${params.toString()}`)
        .then(res => res.json())
        .then(data => {
          setImageMetadata(data);
        })
        .catch(err => {
          console.error('[PreviewPane] Failed to fetch image metadata:', err);
          setImageMetadata(null);
        });
    } else {
      setImageMetadata(null);
    }
  }, [isImageFile, filePath]);

  // Reset document error state when preview changes
  useEffect(() => {
    setDocumentError(null);
    setDocumentLoading(!!isDocumentFile);

    // Set a timeout to clear loading state if iframe doesn't fire onLoad
    // This handles cases where iframe loads but onLoad doesn't trigger
    if (isDocumentFile) {
      const timer = setTimeout(() => {
        setDocumentLoading(false);
      }, 2000); // Give it 2 seconds to load

      return () => clearTimeout(timer);
    }
  }, [documentPreviewUrl, isDocumentFile]);

  // Handle document preview load
  const handleDocumentLoad = () => {
    setDocumentLoading(false);
    setDocumentError(null);
  };

  // Handle document preview error
  const handleDocumentError = async () => {
    setDocumentLoading(false);
    if (documentPreviewUrl) {
      try {
        const response = await fetch(documentPreviewUrl);
        if (!response.ok) {
          const errorText = await response.text();
          setDocumentError(errorText || 'Failed to load document preview');
        } else {
          setDocumentError('Failed to render document preview');
        }
      } catch (err) {
        setDocumentError('Failed to load document preview');
      }
    }
  };

  return (
    <aside
      className="glass-panel flex flex-col h-full w-full transition-opacity duration-150"
      style={{
        opacity: collapsed ? 0 : 1,
        pointerEvents: collapsed ? 'none' : 'auto',
        background: 'var(--background-light)',
      }}
      aria-hidden={collapsed}
    >
      <div className="flex flex-col" style={{ borderBottom: '1px solid var(--color-border-subtle)' }}>
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-2 min-w-0">
            <h2 style={{ ...FONT_ROLES.paneTitle, color: 'var(--primary-color)' }}>Preview</h2>
            {title && type !== 'text' && (
              <span className="truncate" style={{ ...FONT_ROLES.paneSubtitle, color: 'var(--color-text-muted)' }}>
                - {title}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {url && (
              <button
                onClick={() => url && openExternalUrl(url)}
                className="p-1.5 rounded-lg transition-colors"
                style={{
                  color: 'var(--color-text-secondary)',
                  transition: 'all var(--transition-base)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'var(--glass-bg)';
                  e.currentTarget.style.color = 'var(--primary-color)';
                  e.currentTarget.style.boxShadow = '0 0 10px var(--shadow)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.color = 'var(--color-text-secondary)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
                title="Open in external browser"
              >
                <ExternalLink size={18} />
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg transition-colors"
              style={{
                color: 'var(--color-text-secondary)',
                transition: 'all var(--transition-base)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'var(--glass-bg)';
                e.currentTarget.style.color = 'var(--primary-color)';
                e.currentTarget.style.boxShadow = '0 0 10px var(--shadow)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.color = 'var(--color-text-secondary)';
                e.currentTarget.style.boxShadow = 'none';
              }}
              title="Close preview"
            >
              <X size={18} />
            </button>
          </div>
        </div>

      </div>

      <div className="flex-1 overflow-auto relative flex flex-col custom-scroll" style={{ background: 'var(--background-dark)', overflowX: 'auto', overflowY: 'auto' }}>
        {!url && !imagePreviewUrl && !documentPreviewUrl && !content && (
          <div className="absolute inset-0 flex items-center justify-center" style={{ zIndex: Z_INDEX.CONTENT_PREVIEW_EMPTY }}>
            <div style={{ ...FONT_ROLES.paneBodyMuted, color: 'var(--color-text-muted)' }}>No preview available.</div>
          </div>
        )}

        {/* Text note preview */}
        {type === 'text' && content && (
          <div className="flex-1 overflow-auto bg-white">
            <div className="p-8 max-w-4xl mx-auto">
              <h1 className="text-3xl font-bold mb-6" style={{ ...FONT_ROLES.paneTitle, fontSize: '28px' }}>
                {title || 'Untitled Note'}
              </h1>
              <div
                className="whitespace-pre-wrap text-gray-800 leading-loose"
                style={{ ...FONT_ROLES.paneBody, fontSize: '18px', lineHeight: '1.8' }}
              >
                {textPreviewBody}
              </div>
            </div>
          </div>
        )}

        {/* Image preview */}
        {imagePreviewUrl && (
          <div className="flex-1 overflow-auto">
            <div className="p-4 flex flex-col items-center">
              <img
                src={imagePreviewUrl}
                alt={title || 'Image preview'}
                className="max-w-full object-contain rounded-lg shadow-lg"
              />
              {imageMetadata && (
                <div className="mt-6 w-full max-w-2xl bg-white rounded-lg shadow-md p-4 border border-slate-200">
                  <div className="space-y-2 text-sm">
                    <div className="flex">
                      <span className="font-semibold text-slate-700 w-24">Location:</span>
                      <span className="text-slate-600 break-all flex-1">{filePath}</span>
                    </div>
                    <div className="flex">
                      <span className="font-semibold text-slate-700 w-24">Size:</span>
                      <span className="text-slate-600">{imageMetadata.file_size_human}</span>
                    </div>
                    <div className="flex">
                      <span className="font-semibold text-slate-700 w-24">Resolution:</span>
                      <span className="text-slate-600">{imageMetadata.height} × {imageMetadata.width} px</span>
                    </div>
                    <div className="flex">
                      <span className="font-semibold text-slate-700 w-24">Ratio:</span>
                      <span className="text-slate-600">{imageMetadata.aspect_ratio}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Document preview */}
        {documentPreviewUrl && (
          <div className="flex-1 w-full relative">
            {documentLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-white" style={{ zIndex: Z_INDEX.CONTENT_PREVIEW }}>
                <div style={{ ...FONT_ROLES.paneBody, color: 'var(--color-text-muted)' }}>Loading document...</div>
              </div>
            )}
            {documentError && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-white" style={{ zIndex: Z_INDEX.CONTENT_PREVIEW }}>
                <div className="text-red-600" style={FONT_ROLES.paneBody}>Document Preview Error</div>
                <div className="text-slate-600 max-w-md text-center break-all px-4" style={FONT_ROLES.paneBodyMuted}>
                  {documentError}
                </div>
                <div className="text-slate-400 max-w-md text-center break-all px-4 text-xs" style={FONT_ROLES.paneBodyMuted}>
                  {filePath}
                </div>
              </div>
            )}
            {!documentError && (
              <iframe
                src={documentPreviewUrl}
                title={title || 'Document preview'}
                className="w-full h-full border-0"
                onLoad={handleDocumentLoad}
                onError={handleDocumentError}
                onContextMenu={(e) => {
                  // Allow default context menu behavior
                  e.stopPropagation();
                }}
              />
            )}
          </div>
        )}

        {/* Video embed preview (YouTube/Vimeo) */}
        {videoEmbed && (
          <div
            className="w-full flex justify-center"
            style={{
              position: 'sticky',
              top: 0,
              zIndex: Z_INDEX.CONTENT_PREVIEW,
              background: 'var(--background-dark)',
            }}
          >
            <div style={{ position: 'relative', width: '100%', maxWidth: '100%', paddingTop: '56.25%' }}>
              <iframe
                src={videoEmbed.embedUrl}
                title={title || 'Video preview'}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                allowFullScreen
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  border: '0',
                  borderRadius: '12px',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
                  background: '#000'
                }}
              />
            </div>
          </div>
        )}

        {/* Web preview */}
        <>
          {/* eslint-disable-next-line react/no-unknown-property */}
          <webview
            ref={webviewRef}
            src="about:blank"
            partition="persist:ocean-webview"
            allowpopups={true as any}
            style={{
              flex: 1,
              width: '100%',
              minHeight: 0,
              display: hasNonWebviewPreview ? 'none' : 'flex',
              visibility: url ? 'visible' : 'hidden'
            }}
          />
          {url && logic.loadError && !hasNonWebviewPreview && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-white" style={{ zIndex: Z_INDEX.CONTENT_PREVIEW }}>
              <div className="text-red-600" style={FONT_ROLES.paneBody}>{logic.loadError}</div>
              <div className="text-slate-400 max-w-md text-center break-all" style={FONT_ROLES.paneBodyMuted}>
                {url}
              </div>
              <button
                onClick={logic.handleRetry}
                className="mt-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                style={FONT_ROLES.paneBody}
              >
                Retry
              </button>
            </div>
          )}
        </>
      </div>
    </aside>
  );
}

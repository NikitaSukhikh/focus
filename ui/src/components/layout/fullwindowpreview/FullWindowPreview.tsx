import { useRef, useState, useEffect } from 'react';
import { X, ExternalLink, Maximize2 } from 'lucide-react';
import { Z_INDEX } from '../../../constants/zIndex';
import { openExternalUrl } from '../../../platform';
import { usePreviewPaneLogic } from '../previewpane/usePreviewPaneLogic';
import { FONT_ROLES } from '../../../styles/fontManager';
import { getVideoEmbed } from '../../../utils/videoEmbeds';
import { AudioPlayer } from '../../media/AudioPlayer';

/* eslint-disable react/no-unknown-property */

interface ImageMetadata {
  width: number;
  height: number;
  aspect_ratio: string;
  file_size: number;
  file_size_human: string;
}

interface FullWindowPreviewProps {
  isOpen: boolean;
  onClose: () => void;
  url?: string;
  title?: string;
  tileId?: string;
  filePath?: string;
  type?: string;
  content?: string;
}

export function FullWindowPreview({
  isOpen,
  onClose,
  url,
  title,
  filePath,
  type,
  content
}: FullWindowPreviewProps) {
  const webviewRef = useRef<HTMLWebViewElement | null>(null);
  const [documentError, setDocumentError] = useState<string | null>(null);
  const [documentLoading, setDocumentLoading] = useState(false);
  const [imageMetadata, setImageMetadata] = useState<ImageMetadata | null>(null);

  // Check if this is an image file
  const isImageFile = type === 'file' && filePath && /\.(png|jpg|jpeg|gif|bmp|webp|svg|tiff|tif|ico|heic|heif)$/i.test(filePath);

  // Check if this is an audio file
  const isAudioFile = type === 'file' && filePath && /\.(mp3|wav|flac|ogg|oga|m4a|aac|wma|opus|aiff|aif|aifc|alac|ape|wv|mka)$/i.test(filePath);

  // Check if this is a document file
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

  // Only use webview logic when not showing an image, audio, or document
  const hasNonWebviewPreview = imagePreviewUrl || isAudioFile || documentPreviewUrl || videoEmbed;
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
          console.error('[FullWindowPreview] Failed to fetch image metadata:', err);
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

    if (isDocumentFile) {
      const timer = setTimeout(() => {
        setDocumentLoading(false);
      }, 2000);

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

  // Handle keyboard shortcuts
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-sm"
        style={{ zIndex: Z_INDEX.MODAL_BACKDROP }}
        onClick={onClose}
      />

      {/* Full window preview */}
      <div
        className="fixed inset-0 flex flex-col"
        style={{
          zIndex: Z_INDEX.MODAL,
          margin: '32px',
          background: 'var(--background-light)',
          borderRadius: '12px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-4 flex-shrink-0"
          style={{ borderBottom: '1px solid var(--color-border-subtle)' }}
        >
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <Maximize2 size={20} style={{ color: 'var(--primary-color)', flexShrink: 0 }} />
            <h2
              className="truncate"
              style={{
                ...FONT_ROLES.paneTitle,
                color: 'var(--primary-color)',
                fontSize: '18px'
              }}
            >
              {title || 'Preview'}
            </h2>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {url && (
              <button
                onClick={() => url && openExternalUrl(url)}
                className="p-2 rounded-lg transition-colors hover:bg-slate-100"
                style={{ color: 'var(--color-text-secondary)' }}
                title="Open in external browser"
              >
                <ExternalLink size={20} />
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 rounded-lg transition-colors hover:bg-slate-100"
              style={{ color: 'var(--color-text-secondary)' }}
              title="Close (Esc)"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div
          className="flex-1 overflow-auto custom-scroll"
          style={{
            background: 'var(--background-dark)',
            minHeight: 0
          }}
        >
          {!url && !imagePreviewUrl && !isAudioFile && !documentPreviewUrl && !content && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div style={{ ...FONT_ROLES.paneBodyMuted, color: 'var(--color-text-muted)' }}>
                No preview available.
              </div>
            </div>
          )}

          {/* Text note preview */}
          {type === 'text' && content && (
            <div className="flex-1 overflow-auto bg-white h-full">
              <div className="p-12 max-w-4xl mx-auto">
                <h1 className="text-4xl font-bold mb-8" style={{ ...FONT_ROLES.paneTitle, fontSize: '36px' }}>
                  {title || 'Untitled Note'}
                </h1>
                <div
                  className="whitespace-pre-wrap text-gray-800 leading-loose"
                  style={{ ...FONT_ROLES.paneBody, fontSize: '20px', lineHeight: '2' }}
                >
                  {textPreviewBody}
                </div>
              </div>
            </div>
          )}

          {/* Audio preview */}
          {isAudioFile && filePath && (
            <div className="flex items-center justify-center h-full p-8">
              <div className="w-full max-w-4xl">
                <AudioPlayer filePath={filePath} title={title} />
              </div>
            </div>
          )}

          {/* Image preview */}
          {imagePreviewUrl && (
            <div className="flex-1 overflow-auto h-full">
              <div className="p-8 flex flex-col items-center min-h-full justify-center">
                <img
                  src={imagePreviewUrl}
                  alt={title || 'Image preview'}
                  className="max-w-full max-h-[calc(100vh-300px)] object-contain rounded-lg shadow-2xl"
                />
                {imageMetadata && (
                  <div className="mt-8 w-full max-w-2xl bg-white rounded-lg shadow-lg p-6 border border-slate-200">
                    <div className="space-y-3 text-base">
                      <div className="flex">
                        <span className="font-semibold text-slate-700 w-32">Location:</span>
                        <span className="text-slate-600 break-all flex-1">{filePath}</span>
                      </div>
                      <div className="flex">
                        <span className="font-semibold text-slate-700 w-32">Size:</span>
                        <span className="text-slate-600">{imageMetadata.file_size_human}</span>
                      </div>
                      <div className="flex">
                        <span className="font-semibold text-slate-700 w-32">Resolution:</span>
                        <span className="text-slate-600">{imageMetadata.height} × {imageMetadata.width} px</span>
                      </div>
                      <div className="flex">
                        <span className="font-semibold text-slate-700 w-32">Ratio:</span>
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
            <div className="flex-1 w-full h-full relative">
              {documentLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-white" style={{ zIndex: Z_INDEX.CONTENT_PREVIEW }}>
                  <div style={{ ...FONT_ROLES.paneBody, color: 'var(--color-text-muted)' }}>Loading document...</div>
                </div>
              )}
              {documentError && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-white" style={{ zIndex: Z_INDEX.CONTENT_PREVIEW }}>
                  <div className="text-red-600 text-xl" style={FONT_ROLES.paneBody}>Document Preview Error</div>
                  <div className="text-slate-600 max-w-2xl text-center break-all px-8" style={FONT_ROLES.paneBody}>
                    {documentError}
                  </div>
                  <div className="text-slate-400 max-w-2xl text-center break-all px-8" style={FONT_ROLES.paneBodyMuted}>
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
                    e.stopPropagation();
                  }}
                />
              )}
            </div>
          )}

          {/* Video embed preview (YouTube/Vimeo) */}
          {videoEmbed && (
            <div className="flex items-center justify-center h-full p-8">
              <div style={{ position: 'relative', width: '100%', maxWidth: '1400px', paddingTop: '56.25%' }}>
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
                    boxShadow: '0 10px 40px rgba(0,0,0,0.3)',
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
                width: '100%',
                height: '100%',
                minHeight: 0,
                display: hasNonWebviewPreview ? 'none' : 'block',
                visibility: url ? 'visible' : 'hidden'
              }}
            />
            {url && logic.loadError && !hasNonWebviewPreview && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-white" style={{ zIndex: Z_INDEX.CONTENT_PREVIEW }}>
                <div className="text-red-600 text-xl" style={FONT_ROLES.paneBody}>{logic.loadError}</div>
                <div className="text-slate-400 max-w-2xl text-center break-all px-8" style={FONT_ROLES.paneBody}>
                  {url}
                </div>
                <button
                  onClick={logic.handleRetry}
                  className="mt-2 px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-base"
                  style={FONT_ROLES.paneBody}
                >
                  Retry
                </button>
              </div>
            )}
          </>
        </div>
      </div>
    </>
  );
}

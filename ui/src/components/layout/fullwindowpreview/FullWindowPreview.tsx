import { useCallback, useEffect, useRef, useState } from 'react';
import { X, ExternalLink, Minimize2 } from 'lucide-react';
import { Z_INDEX } from '@/constants/zIndex';
import { FULL_WINDOW_PREVIEW } from '@/constants/panesDimensions';
import { openExternalUrl } from '@/platform';
import { usePreviewPaneLogic } from '@/components/layout/previewpane/usePreviewPaneLogic';
import { FONT_ROLES } from '@/styles/fontManager';
import { getVideoEmbed, getVideoEmbedRenderOptions } from '@/utils/videoEmbeds';
import { AudioPlayer } from '@/components/media/AudioPlayer';
import { useTileNavigation } from '@/components/layout/previewpane/hooks/useTileNavigation';
import { useArrowKeyNavigation } from '@/components/layout/previewpane/hooks/useArrowKeyNavigation';
import { usePdfPageNavigation } from '@/components/layout/previewpane/hooks/usePdfPageNavigation';
import { TextPreview, TextPreviewHandle } from '@/components/layout/previewpane/components/TextPreview';
import { useFileTypeDetection } from '@/components/layout/previewpane/hooks/useFileTypeDetection';
import { useEbookMetadata } from '@/components/layout/previewpane/hooks/useEbookMetadata';
import { useImageMetadata } from '@/components/layout/previewpane/hooks/useImageMetadata';
import { useDocumentPreview } from '@/components/layout/previewpane/hooks/useDocumentPreview';
import { MarkdownPreview } from '@/components/layout/previewpane/components/MarkdownPreview';
import { HTMLPreview } from '@/components/layout/previewpane/components/HTMLPreview';
import { ImagePreview } from '@/components/layout/previewpane/components/ImagePreview';
import { DocumentPreview } from '@/components/layout/previewpane/components/DocumentPreview';
import { TextFilePreview } from '@/components/layout/previewpane/components/TextFilePreview';
import { VideoFilePreview } from '@/components/layout/previewpane/components/VideoFilePreview';
import { VideoPreview } from '@/components/layout/previewpane/components/VideoPreview';
import { WebviewPreview } from '@/components/layout/previewpane/components/WebviewPreview';
import { GmailExternalPreview } from '@/components/layout/previewpane/components/gmail_external';
import { useGmailDetection } from '@/components/layout/previewpane/hooks/useGmailDetection';
import { DroppedIcon } from '@/components/layout/centerpane/types';
import { API_BASE } from '@/config/api';

/* eslint-disable react/no-unknown-property */

interface FullWindowPreviewProps {
  isOpen: boolean;
  onClose: () => void;
  url?: string;
  title?: string;
  tileId?: string;
  filePath?: string;
  type?: string;
  content?: string;
  tiles?: DroppedIcon[];
  onNavigateToTile?: (tileId: string) => void;
}

// FullWindowPreview is the modal version of the preview pane, showing the selected tile's content in a focused full-window overlay.
export function FullWindowPreview({
  isOpen,
  onClose,
  url,
  title,
  filePath,
  type,
  content,
  tileId,
  tiles = [],
  onNavigateToTile
}: FullWindowPreviewProps) {
  const webviewRef = useRef<HTMLWebViewElement | null>(null);
  const [isEditingText, setIsEditingText] = useState(false);
  const [localTitle, setLocalTitle] = useState(title);
  const [localContent, setLocalContent] = useState(content);
  const [contentWasUpdated, setContentWasUpdated] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  // Guard saves/close so outside clicks and shortcuts share a single path
  const containerRef = useRef<HTMLDivElement>(null);
  const isClosingRef = useRef(false);
  const textPreviewRef = useRef<TextPreviewHandle | null>(null);

  const { isImageFile, isAudioFile, isVideoFile, isDocumentFile, isEbookFile, isPdfFile, isTextFile, isMarkdownFile, isHtmlFile, imagePreviewUrl, videoPreviewUrl, documentPreviewUrl, ebookPreviewUrl, htmlPreviewUrl } = useFileTypeDetection(type, filePath);
  const imageMetadata = useImageMetadata(isImageFile, filePath);
  const ebookMetadata = useEbookMetadata(isEbookFile, filePath);

  const documentPreviewUrlResolved = documentPreviewUrl || ebookPreviewUrl || null;
  const videoEmbed = getVideoEmbed(url);
  const renderOptions = videoEmbed ? getVideoEmbedRenderOptions(videoEmbed) : null;
  const { isGmail } = useGmailDetection({ type, url });

  // Only use webview logic when not showing an image, audio, video, or document
  const hasNonWebviewPreview = imagePreviewUrl || isAudioFile || isVideoFile || documentPreviewUrlResolved || videoEmbed || isTextFile || isMarkdownFile || isHtmlFile || isGmail;
  const logic = usePreviewPaneLogic(webviewRef, hasNonWebviewPreview ? undefined : url, isOpen);

  const currentTitle = localTitle ?? title;
  const currentContent = localContent ?? content;
  const firstContentLine = currentContent
    ? (currentContent.split(/\r?\n/).find((line) => line.trim().length > 0) || '').trim()
    : '';
  const displayTitle = ebookMetadata?.title || (currentTitle || '').trim() || firstContentLine || 'Preview';

  const getBodyWithoutTitle = (rawContent?: string | null, heading?: string | null) => {
    if (type !== 'text' || !rawContent) return rawContent || '';

    const lines = rawContent.split(/\r?\n/);
    if (!lines.length) return rawContent;

    const firstLine = lines[0].trim();
    const normalizedTitle = (heading || '').trim();
    const titleMatchesFirstLine =
      normalizedTitle &&
      (firstLine.toLowerCase() === normalizedTitle.toLowerCase() ||
        firstLine.toLowerCase().startsWith(normalizedTitle.toLowerCase()) ||
        normalizedTitle.toLowerCase().startsWith(firstLine.toLowerCase()));

    if (titleMatchesFirstLine) {
      return lines.slice(1).join('\n').replace(/^\n*/, '');
    }

    return rawContent;
  };


  const { documentError, documentLoading, handleDocumentLoad, handleDocumentError } = useDocumentPreview(
    isDocumentFile || isEbookFile || isPdfFile,
    documentPreviewUrlResolved,
    2000
  );

  // Tile navigation
  const navigation = useTileNavigation({
    tiles,
    currentTileId: tileId,
    onNavigate: onNavigateToTile || (() => {}),
  });

  useArrowKeyNavigation({
    navigateNext: navigation.navigateNext,
    navigatePrevious: navigation.navigatePrevious,
    canNavigateNext: navigation.canNavigateNext,
    canNavigatePrevious: navigation.canNavigatePrevious,
    isEnabled: isOpen && !isEditingText,
  });

  // PDF page navigation with Up/Down arrows (Left/Right reserved for tile navigation)
  usePdfPageNavigation({
    webviewRef,
    isPdfPreview: isPdfFile && !documentPreviewUrlResolved,
    isEnabled: isOpen,
  });

  const handleTextContentUpdated = (newTitle: string, newContent: string) => {
    setLocalTitle(newTitle);
    setLocalContent(newContent);
    setContentWasUpdated(true);
    setHasUnsavedChanges(false);

    // Emit event to update tile on canvas immediately
    if (tileId) {
      window.dispatchEvent(new CustomEvent('tile:updated', {
        detail: {
          tileId,
          title: newTitle,
          content: newContent,
        },
      }));
    }
  };

  // Use processed content that removes duplicate title
  const processedTextContent = getBodyWithoutTitle(
    contentWasUpdated ? localContent || currentContent : currentContent,
    currentTitle
  );

  const handleSaveAndClose = useCallback(async () => {
    if (!isEditingText) {
      onClose();
      return;
    }

    if (isClosingRef.current) return;
    isClosingRef.current = true;
    try {
      if (textPreviewRef.current) {
        await textPreviewRef.current.saveAndClose();
      } else {
        onClose();
      }
    } finally {
      isClosingRef.current = false;
    }
  }, [isEditingText, onClose]);

  // Listen for content changes from other preview modes
  useEffect(() => {
    const handleContentChanged = (e: Event) => {
      const customEvent = e as CustomEvent<{ tileId: string; title: string; content: string }>;
      const { tileId: eventTileId, title: newTitle, content: newContent } = customEvent.detail;

      if (eventTileId === tileId) {
        setLocalTitle(newTitle);
        setLocalContent(newContent);
        setContentWasUpdated(true);
      }
    };

    window.addEventListener('text:content-changed', handleContentChanged);
    return () => window.removeEventListener('text:content-changed', handleContentChanged);
  }, [tileId]);

  // Auto-save on preview close
  useEffect(() => {
    return () => {
      // Cleanup: save if there are unsaved changes when component unmounts
      if (hasUnsavedChanges && tileId && localContent) {
        // Fire async save without waiting
        const title = localTitle || 'Untitled Note';
        fetch(`${API_BASE}/objects/${tileId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title,
            metadata: { content: localContent },
          }),
        }).catch(err => console.error('Failed to auto-save on close:', err));
      }
    };
  }, [hasUnsavedChanges, tileId, localContent, localTitle]);

  useEffect(() => {
    const unsubscribe = window.desktopAPI?.onCloseFullWindowPreviewRequest?.(() => {
      if (!isOpen) return;
      if (isEditingText) {
        void handleSaveAndClose();
      } else {
        onClose();
      }
    });

    return () => {
      unsubscribe?.();
    };
  }, [isOpen, isEditingText, handleSaveAndClose, onClose]);

  const handleBackdropClick = () => {
    if (isEditingText) {
      void handleSaveAndClose();
    } else {
      onClose();
    }
  };

  // Handle keyboard shortcuts
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isEditingText) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, isEditingText]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-sm"
        style={{ zIndex: Z_INDEX.MODAL_BACKDROP }}
        onClick={handleBackdropClick}
      />

      {/* Full window preview */}
      <div
        ref={containerRef}
        className="fixed flex flex-col"
        style={{
          zIndex: Z_INDEX.MODAL,
          top: `${FULL_WINDOW_PREVIEW.margin.top}px`,
          left: `${FULL_WINDOW_PREVIEW.margin.left}px`,
          right: `${FULL_WINDOW_PREVIEW.margin.right}px`,
          bottom: `${FULL_WINDOW_PREVIEW.margin.bottom}px`,
          background: 'var(--background-light)',
          borderRadius: `${FULL_WINDOW_PREVIEW.borderRadius}px`,
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between flex-shrink-0"
          style={{
            padding: `${FULL_WINDOW_PREVIEW.header.paddingY}px ${FULL_WINDOW_PREVIEW.header.paddingX}px`,
            borderBottom: '1px solid var(--color-border-subtle)',
          }}
        >
          <div className="flex items-center gap-4 min-w-0 flex-1">
            <h2
              className="truncate"
              style={{
                ...FONT_ROLES.paneTitle,
                color: 'var(--primary-color)',
                fontSize: `${FULL_WINDOW_PREVIEW.header.titleFontSize}px`,
              }}
            >
              {displayTitle}
            </h2>
            {ebookMetadata?.author && (
              <span className="truncate text-sm whitespace-nowrap" style={{ color: 'var(--color-text-muted)' }}>
                by {ebookMetadata.author}
              </span>
            )}
            {imageMetadata && (
              <span className="text-xs whitespace-nowrap" style={{ color: 'var(--color-text-muted)' }}>
                {imageMetadata.height}×{imageMetadata.width} · {imageMetadata.file_size_human}
              </span>
            )}
            {filePath && (
              <span className="text-xs truncate" style={{ color: 'var(--color-text-muted)', maxWidth: `${FULL_WINDOW_PREVIEW.header.metadataMaxWidth}px` }}>
                {filePath}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={onClose}
              className="p-2 rounded-lg transition-colors hover:bg-slate-100"
              style={{ color: 'var(--color-text-secondary)' }}
              title="Back to normal preview"
            >
              <Minimize2 size={20} />
            </button>
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
          className="flex-1 flex flex-col min-h-0 custom-scroll"
          style={{
            background: 'var(--background-dark)',
            minHeight: 0,
            overflow: 'hidden',
            position: 'relative'
          }}
        >
          {/* Inline tile navigation controls */}
          <button
            onClick={navigation.navigatePrevious}
            disabled={!navigation.canNavigatePrevious}
            className="absolute rounded-full flex items-center justify-center text-2xl"
            style={{
              left: `${FULL_WINDOW_PREVIEW.navButton.offset}px`,
              width: `${FULL_WINDOW_PREVIEW.navButton.size}px`,
              height: `${FULL_WINDOW_PREVIEW.navButton.size}px`,
              top: '50%',
              transform: 'translateY(-50%)',
              background: 'var(--glass-bg)',
              color: 'var(--color-text-primary)',
              opacity: navigation.canNavigatePrevious ? 0.5 : 0.2,
              boxShadow: '0 6px 16px rgba(0,0,0,0.2)',
              zIndex: Z_INDEX.CONTENT_PREVIEW + 2,
              cursor: navigation.canNavigatePrevious ? 'pointer' : 'not-allowed',
            }}
            title="Previous tile (Left arrow)"
          >
            &lt;
          </button>
          <button
            onClick={navigation.navigateNext}
            disabled={!navigation.canNavigateNext}
            className="absolute rounded-full flex items-center justify-center text-2xl"
            style={{
              right: `${FULL_WINDOW_PREVIEW.navButton.offset}px`,
              width: `${FULL_WINDOW_PREVIEW.navButton.size}px`,
              height: `${FULL_WINDOW_PREVIEW.navButton.size}px`,
              top: '50%',
              transform: 'translateY(-50%)',
              background: 'var(--glass-bg)',
              color: 'var(--color-text-primary)',
              opacity: navigation.canNavigateNext ? 0.5 : 0.2,
              boxShadow: '0 6px 16px rgba(0,0,0,0.2)',
              zIndex: Z_INDEX.CONTENT_PREVIEW + 2,
              cursor: navigation.canNavigateNext ? 'pointer' : 'not-allowed',
            }}
            title="Next tile (Right arrow)"
          >
            &gt;
          </button>

          {!url && !imagePreviewUrl && !isAudioFile && !isVideoFile && !documentPreviewUrl && !ebookPreviewUrl && !content && !isTextFile && !isMarkdownFile && !isHtmlFile && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div style={{ ...FONT_ROLES.paneBodyMuted, color: 'var(--color-text-muted)' }}>
                No preview available.
              </div>
            </div>
          )}

          {/* Text note preview */}
          {type === 'text' && content && (
            <TextPreview
              ref={textPreviewRef}
              title={currentTitle}
              content={processedTextContent || ''}
              tileId={tileId}
              onContentUpdated={handleTextContentUpdated}
              isEditing={isEditingText}
              onStartEdit={() => {
                setIsEditingText(true);
                setHasUnsavedChanges(true);
              }}
              onStopEdit={() => setIsEditingText(false)}
              onClosePreview={onClose}
              paneContainerRef={containerRef}
              isFullWindow={true}
            />
          )}

          {isMarkdownFile && (
            <MarkdownPreview
              filePath={filePath}
              content={content}
              title={title}
            />
          )}

          {isHtmlFile && htmlPreviewUrl && (
            <HTMLPreview
              htmlPreviewUrl={htmlPreviewUrl}
              title={title}
            />
          )}

          {isTextFile && (
            <div className="flex-1 overflow-auto h-full article-scroll" style={{ background: 'var(--background-dark)' }}>
              <div className="flex flex-col h-full w-full p-6">
                <div className="text-sm mb-4" style={{ color: 'var(--color-text-muted)' }}>
                  {content ? 'Text file preview' : 'Loading text preview...'}
                  {filePath && (
                    <div className="text-xs break-all mt-1" style={{ color: 'var(--color-text-muted)' }}>{filePath}</div>
                  )}
                </div>
                <pre
                  className="flex-1 whitespace-pre-wrap font-mono text-base leading-7 m-0"
                  style={{
                    background: 'transparent',
                    color: 'var(--color-text-primary)',
                    border: 'none',
                    outline: 'none',
                  }}
                >
                  {content || ''}
                </pre>
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

          {/* Video preview */}
          {isVideoFile && videoPreviewUrl && (
            <div className="flex items-center justify-center h-full p-8">
              <div className="w-full max-w-5xl">
                <video
                  src={videoPreviewUrl}
                  controls
                  controlsList="nodownload"
                  preload="metadata"
                  style={{
                    width: '100%',
                    borderRadius: '12px',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
                    background: '#000'
                  }}
                >
                  Your browser does not support the video tag.
                </video>
              </div>
            </div>
          )}

          {/* Image preview */}
          {imagePreviewUrl && (
            <div className="flex-1 min-h-0 h-full overflow-auto article-scroll">
              <div className="flex flex-col h-full min-h-0">
                <div className="flex-1 min-h-0 w-full">
                  <img
                    src={imagePreviewUrl}
                    alt={title || 'Image preview'}
                    className="w-full h-full object-contain"
                  />
                </div>
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
                  style={{ overflow: 'auto' }}
                  onLoad={handleDocumentLoad}
                  onError={handleDocumentError}
                  onContextMenu={(e) => {
                    e.stopPropagation();
                  }}
                />
              )}
            </div>
          )}

          {/* Ebook preview */}
          {ebookPreviewUrl && (
            <div className="flex-1 w-full h-full relative">
              {documentLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-white" style={{ zIndex: Z_INDEX.CONTENT_PREVIEW }}>
                  <div style={{ ...FONT_ROLES.paneBody, color: 'var(--color-text-muted)' }}>Loading ebook...</div>
                </div>
              )}
              {documentError && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-white" style={{ zIndex: Z_INDEX.CONTENT_PREVIEW }}>
                  <div className="text-red-600 text-xl" style={FONT_ROLES.paneBody}>Ebook Preview Error</div>
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
                  src={ebookPreviewUrl}
                  title={title || 'Ebook preview'}
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

          {/* Gmail preview */}
          {isGmail && (
            <GmailExternalPreview
              url={url}
              title={title}
            />
          )}

          {/* Video embed preview (YouTube/Vimeo) */}
          {videoEmbed && (
            <div className="flex items-center justify-center h-full p-8">
              <div style={{ position: 'relative', width: '100%', maxWidth: '1400px', paddingTop: '56.25%' }}>
                {renderOptions?.useWebview ? (
                  <webview
                    src={renderOptions.src}
                    partition={renderOptions.webviewPartition}
                    httpreferrer={renderOptions.webviewReferrer}
                    allowpopups={'true' as any}
                    webpreferences="autoplayPolicy=document-user-activation-required"
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
                ) : (
                  <iframe
                    src={renderOptions?.src || videoEmbed.embedUrl}
                    title={title || 'Video preview'}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                    allowFullScreen
                    referrerPolicy="origin"
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
                )}
              </div>
            </div>
          )}

          {/* Web preview */}
          <div
            className="flex-1 min-h-0"
            style={{
              display: hasNonWebviewPreview ? 'none' : 'flex',
              position: 'relative'
            }}
          >
            {/* eslint-disable-next-line react/no-unknown-property */}
            <webview
              ref={webviewRef}
              src="about:blank"
              partition="persist:focus-webview"
              allowpopups={'true' as any}
              style={{
                flex: 1,
                width: '100%',
                height: '100%',
                minHeight: 0,
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
          </div>
        </div>
      </div>
    </>
  );
}


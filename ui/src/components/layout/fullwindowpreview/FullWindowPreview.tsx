import { useCallback, useEffect, useRef, useState } from 'react';
import { X, ExternalLink, Minimize2 } from 'lucide-react';
import { Z_INDEX } from '../../../constants/zIndex';
import { openExternalUrl } from '../../../platform';
import { usePreviewPaneLogic } from '../previewpane/usePreviewPaneLogic';
import { FONT_ROLES } from '../../../styles/fontManager';
import { getVideoEmbed, getVideoEmbedRenderOptions } from '../../../utils/videoEmbeds';
import { AudioPlayer } from '../../media/AudioPlayer';
import { useTileNavigation } from '../previewpane/hooks/useTileNavigation';
import { useArrowKeyNavigation } from '../previewpane/hooks/useArrowKeyNavigation';
import { usePdfPageNavigation } from '../previewpane/hooks/usePdfPageNavigation';
import { usePreviewTextEditor } from '../previewpane/hooks/usePreviewTextEditor';
import { PreviewTextEditor } from '../previewpane/components/PreviewTextEditor';
import { useFileTypeDetection } from '../previewpane/hooks/useFileTypeDetection';
import { useEbookMetadata } from '../previewpane/hooks/useEbookMetadata';
import { MarkdownPreview } from '../previewpane/components/MarkdownPreview';
import { DroppedIcon } from '../centerpane/types';
import { API_BASE } from '../../../config/api';

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
  const [documentError, setDocumentError] = useState<string | null>(null);
  const [documentLoading, setDocumentLoading] = useState(false);
  const [imageMetadata, setImageMetadata] = useState<ImageMetadata | null>(null);
  const [isEditingText, setIsEditingText] = useState(false);
  const [localTitle, setLocalTitle] = useState(title);
  const [localContent, setLocalContent] = useState(content);
  const [contentWasUpdated, setContentWasUpdated] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  // Guard saves/close so outside clicks and shortcuts share a single path
  const containerRef = useRef<HTMLDivElement>(null);
  const isClosingRef = useRef(false);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const textContentRef = useRef<HTMLDivElement>(null);

  const { isImageFile, isAudioFile, isVideoFile, isDocumentFile, isEbookFile, isPdfFile, isTextFile, isMarkdownFile, imagePreviewUrl, videoPreviewUrl, documentPreviewUrl, ebookPreviewUrl } = useFileTypeDetection(type, filePath);
  const ebookMetadata = useEbookMetadata(isEbookFile, filePath);

  const videoEmbed = getVideoEmbed(url);
  const renderOptions = videoEmbed ? getVideoEmbedRenderOptions(videoEmbed) : null;

  // Only use webview logic when not showing an image, audio, video, or document
  const hasNonWebviewPreview = imagePreviewUrl || isAudioFile || isVideoFile || documentPreviewUrl || ebookPreviewUrl || videoEmbed || isTextFile || isMarkdownFile;
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

  const textPreviewBody = getBodyWithoutTitle(currentContent, currentTitle);

  // Load image metadata
  useEffect(() => {
    if (isImageFile && filePath) {
      const params = new URLSearchParams({ file_path: filePath });
      fetch(`${API_BASE}/thumbnails/metadata?${params.toString()}`)
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
    setDocumentLoading(!!(isDocumentFile || isEbookFile));

    if (isDocumentFile || isEbookFile) {
      const timer = setTimeout(() => {
        setDocumentLoading(false);
      }, 2000);

      return () => clearTimeout(timer);
    }
  }, [documentPreviewUrl, ebookPreviewUrl, isDocumentFile, isEbookFile]);

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
    isPdfPreview: isPdfFile,
    isEnabled: isOpen,
  });

  const editorInitialContent = currentContent
    || ((currentTitle || textPreviewBody) ? [currentTitle, textPreviewBody].filter(Boolean).join(currentTitle && textPreviewBody ? '\n' : '') : '');

  const textEditor = usePreviewTextEditor({
    tileId,
    initialContent: editorInitialContent,
    initialTitle: currentTitle,
    onContentUpdated: (newTitle, newContent) => {
      setLocalTitle(newTitle);
      setLocalContent(newContent);
      setContentWasUpdated(true);
      setIsEditingText(false);
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
    },
  });

  // Use processed content that removes duplicate title
  const processedTextContent = getBodyWithoutTitle(
    contentWasUpdated ? localContent || currentContent : currentContent,
    currentTitle
  );

  const handleSaveTextEdit = async () => {
    await textEditor.saveEdit();
  };

  const handleSaveAndClose = useCallback(async () => {
    if (isClosingRef.current) return;
    isClosingRef.current = true;
    try {
      await textEditor.saveEdit();
      setIsEditingText(false);
      onClose();
    } finally {
      isClosingRef.current = false;
    }
  }, [textEditor, onClose]);

  const handleCancelTextEdit = () => {
    textEditor.cancelEdit();
    setIsEditingText(false);
  };

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

  const getCaretPositionFromClick = (e: React.MouseEvent<HTMLDivElement | HTMLHeadingElement>): number => {
    const titleText = currentTitle || '';
    const bodyText = processedTextContent || '';
    const newlineLength = titleText && bodyText ? 1 : 0;
    const range = document.caretRangeFromPoint(e.clientX, e.clientY);

    if (titleRef.current && titleRef.current.contains(e.target as Node)) {
      if (!range) return 0;
      const preCaretRange = range.cloneRange();
      preCaretRange.selectNodeContents(titleRef.current);
      preCaretRange.setEnd(range.endContainer, range.endOffset);
      return preCaretRange.toString().length;
    }

    if (textContentRef.current && range) {
      const preCaretRange = range.cloneRange();
      preCaretRange.selectNodeContents(textContentRef.current);
      preCaretRange.setEnd(range.endContainer, range.endOffset);
      const bodyOffset = preCaretRange.toString().length;
      return titleText.length + newlineLength + bodyOffset;
    }

    // Fallback: place caret at start of clicked area instead of forcing end
    if (textContentRef.current?.contains(e.target as Node)) {
      return titleText.length + newlineLength;
    }

    return 0;
  };

  const handleDoubleClick = (e: React.MouseEvent<HTMLDivElement | HTMLHeadingElement>) => {
    const caretPosition = getCaretPositionFromClick(e);
    isClosingRef.current = false;
    textEditor.startEditing();
    setIsEditingText(true);
    setHasUnsavedChanges(true);
    (window as any).__previewCaretPosition = caretPosition;
  };

  useEffect(() => {
    if (!isOpen || !isEditingText) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (!containerRef.current) return;
      if (containerRef.current.contains(e.target as Node)) return;
      void handleSaveAndClose();
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, isEditingText, handleSaveAndClose]);

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
          top: '32px',
          left: '32px',
          right: '32px',
          bottom: '44px', // 32px margin + 12px for scrollbar
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
          <div className="flex flex-col min-w-0 flex-1">
            <h2
              className="truncate"
              style={{
                ...FONT_ROLES.paneTitle,
                color: 'var(--primary-color)',
                fontSize: '18px'
              }}
            >
              {displayTitle}
            </h2>
            {ebookMetadata?.author && (
              <p className="truncate text-sm" style={{ color: 'var(--color-text-muted)', marginTop: '2px' }}>
                by {ebookMetadata.author}
              </p>
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
            className="absolute left-4 rounded-full w-12 h-12 flex items-center justify-center text-2xl"
            style={{
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
            className="absolute right-4 rounded-full w-12 h-12 flex items-center justify-center text-2xl"
            style={{
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

          {!url && !imagePreviewUrl && !isAudioFile && !isVideoFile && !documentPreviewUrl && !ebookPreviewUrl && !content && !isTextFile && !isMarkdownFile && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div style={{ ...FONT_ROLES.paneBodyMuted, color: 'var(--color-text-muted)' }}>
                No preview available.
              </div>
            </div>
          )}

          {/* Text note preview */}
          {type === 'text' && content && (
            <>
              {isEditingText ? (
                <PreviewTextEditor
                  content={textEditor.editorState.editedContent}
                  onContentChange={textEditor.updateContent}
                  onSave={handleSaveTextEdit}
                  onSaveAndClose={handleSaveAndClose}
                  onCancel={handleCancelTextEdit}
                  isFullWindow={true}
                  isClosingRef={isClosingRef}
                />
              ) : (
                <div className="flex-1 overflow-auto bg-white min-h-0">
                  <div className="p-12 max-w-4xl w-full mx-auto min-h-full">
                    <h1
                      ref={titleRef}
                      className="text-4xl font-bold mb-8 cursor-text"
                      style={{ ...FONT_ROLES.paneTitle, fontSize: '36px' }}
                      onDoubleClick={handleDoubleClick}
                    >
                      {displayTitle}
                    </h1>
                    <div
                      ref={textContentRef}
                      className="whitespace-pre-wrap text-gray-800 leading-loose cursor-text"
                      style={{ ...FONT_ROLES.paneBody, fontSize: '20px', lineHeight: '2' }}
                      onDoubleClick={handleDoubleClick}
                    >
                      {processedTextContent}
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          {isMarkdownFile && (
            <MarkdownPreview
              filePath={filePath}
              content={content}
              title={title}
            />
          )}

          {isTextFile && (
            <div className="flex-1 overflow-auto bg-white h-full">
              <div className="p-12 max-w-5xl mx-auto w-full">
                <div className="text-sm text-slate-500 mb-4">
                  {content ? 'Text file preview' : 'Loading text preview...'}
                  {filePath && (
                    <div className="text-xs text-slate-400 break-all mt-1">{filePath}</div>
                  )}
                </div>
                <pre className="whitespace-pre-wrap font-mono text-slate-800 text-base leading-7 bg-slate-50 border border-slate-200 rounded-xl p-6 shadow-sm">
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

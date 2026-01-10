import { useRef, useState, useEffect } from 'react';
import { usePreviewPaneLogic } from './usePreviewPaneLogic';
import { getVideoEmbed } from '../../../utils/videoEmbeds';
import { AudioPlayer } from '../../media/AudioPlayer';
import { useFileTypeDetection } from './hooks/useFileTypeDetection';
import { useImageMetadata } from './hooks/useImageMetadata';
import { useEbookMetadata } from './hooks/useEbookMetadata';
import { useDocumentPreview } from './hooks/useDocumentPreview';
import { useTextPreview } from './hooks/useTextPreview';
import { useTileNavigation } from './hooks/useTileNavigation';
import { useArrowKeyNavigation } from './hooks/useArrowKeyNavigation';
import { PreviewHeader } from './components/PreviewHeader';
import { NavigationControls } from './components/NavigationControls';
import { EmptyPreview } from './components/EmptyPreview';
import { TextPreview } from './components/TextPreview';
import { ImagePreview } from './components/ImagePreview';
import { DocumentPreview } from './components/DocumentPreview';
import { VideoPreview } from './components/VideoPreview';
import { WebviewPreview } from './components/WebviewPreview';
import { HTMLPreview } from './components/HTMLPreview';
import { MarkdownPreview } from './components/MarkdownPreview';
import { DroppedIcon } from '../centerpane/types';
import { API_BASE } from '../../../config/api';

/* eslint-disable react/no-unknown-property */

interface PreviewPaneProps {
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

// PreviewPane renders the right-hand preview area for the selected tile, choosing between media/file previews and the embedded webview while supporting a full-window handoff.
export function PreviewPane({ isOpen, onClose, url, title, filePath, type, content, tileId, tiles = [], onNavigateToTile }: PreviewPaneProps) {
  const webviewRef = useRef<HTMLWebViewElement | null>(null);
  // Used to detect outside clicks while editing text inside the pane
  const previewContainerRef = useRef<HTMLDivElement | null>(null);
  const collapsed = !isOpen;
  const [isEditingText, setIsEditingText] = useState(false);
  const [localTitle, setLocalTitle] = useState(title);
  const [localContent, setLocalContent] = useState(content);
  const [contentWasUpdated, setContentWasUpdated] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleOpenFullWindow = () => {
    const event = new CustomEvent('open:fullwindow', {
      detail: {
        url,
        title: localTitle ?? title,
        tileId,
        filePath,
        type,
        content: localContent ?? content,
      },
    });
    window.dispatchEvent(event);
    // Auto-close normal preview when expanded mode opens
    onClose();
  };

  const { isImageFile, isAudioFile, isVideoFile, isDocumentFile, isEbookFile, isTextFile, isMarkdownFile, isHtmlFile, imagePreviewUrl, videoPreviewUrl, documentPreviewUrl, ebookPreviewUrl, htmlPreviewUrl } = useFileTypeDetection(type, filePath);
  const imageMetadata = useImageMetadata(isImageFile, filePath);
  const ebookMetadata = useEbookMetadata(isEbookFile, filePath);
  const { documentError, documentLoading, handleDocumentLoad, handleDocumentError } = useDocumentPreview(isDocumentFile || isEbookFile, documentPreviewUrl || ebookPreviewUrl);
  const textPreviewBody = useTextPreview(type, content, title);
  const updatedTextPreviewBody = useTextPreview(type, localContent, localTitle);
  const videoEmbed = getVideoEmbed(url);

  const hasNonWebviewPreview = imagePreviewUrl || isAudioFile || isVideoFile || documentPreviewUrl || ebookPreviewUrl || videoEmbed || isTextFile || isMarkdownFile || isHtmlFile;
  const logic = usePreviewPaneLogic(webviewRef, hasNonWebviewPreview ? undefined : url, isOpen);

  const hasNoContent = !url && !imagePreviewUrl && !isAudioFile && !isVideoFile && !documentPreviewUrl && !ebookPreviewUrl && !content && !isTextFile && !isMarkdownFile && !isHtmlFile;

  // Tile navigation
  const navigation = useTileNavigation({
    tiles,
    currentTileId: tileId,
    onNavigate: onNavigateToTile || (() => {}),
  });

  // Keep local state in sync when the selected tile changes (e.g., via navigation controls)
  useEffect(() => {
    setLocalTitle(title);
    setLocalContent(content);
    setContentWasUpdated(false);
    setHasUnsavedChanges(false);
    setIsEditingText(false);
  }, [tileId, title, content]);

  useArrowKeyNavigation({
    navigateNext: navigation.navigateNext,
    navigatePrevious: navigation.navigatePrevious,
    canNavigateNext: navigation.canNavigateNext,
    canNavigatePrevious: navigation.canNavigatePrevious,
    isEnabled: isOpen && !isEditingText,
  });

  const handleContentUpdated = (newTitle: string, newContent: string) => {
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

  // Use processed content that removes duplicate title
  const processedContent = contentWasUpdated
    ? updatedTextPreviewBody
    : textPreviewBody;

  return (
    <aside
      ref={previewContainerRef}
      className="glass-panel flex flex-col h-full w-full transition-opacity duration-150"
      style={{
        opacity: collapsed ? 0 : 1,
        pointerEvents: collapsed ? 'none' : 'auto',
        background: 'var(--background-light)',
        color: 'var(--color-text-secondary)',
      }}
      aria-hidden={collapsed}
    >
      <PreviewHeader
        title={localTitle}
        type={type}
        url={url}
        onClose={onClose}
        onOpenFullWindow={handleOpenFullWindow}
        ebookMetadata={ebookMetadata}
      />

      <div
        className="flex-1 overflow-auto relative flex flex-col custom-scroll"
        style={{ background: 'var(--background-dark)', overflowX: 'auto', overflowY: 'auto', color: 'var(--color-text-secondary)' }}
      >
        <NavigationControls
          onNavigateNext={navigation.navigateNext}
          onNavigatePrevious={navigation.navigatePrevious}
          canNavigateNext={navigation.canNavigateNext}
          canNavigatePrevious={navigation.canNavigatePrevious}
        />

        {hasNoContent && <EmptyPreview />}

        {type === 'text' && content && (
          <TextPreview
            title={localTitle}
            content={processedContent || ''}
            tileId={tileId}
            onContentUpdated={handleContentUpdated}
            isEditing={isEditingText}
            paneContainerRef={previewContainerRef}
            onStartEdit={() => {
              setIsEditingText(true);
              setHasUnsavedChanges(true);
            }}
            onStopEdit={() => setIsEditingText(false)}
            onClosePreview={onClose}
          />
        )}

        {isMarkdownFile && (
          <MarkdownPreview
            filePath={filePath}
            content={content}
            title={title}
          />
        )}

        {isTextFile && (
          <div className="flex-1 overflow-auto bg-white">
            <div className="p-6 max-w-4xl mx-auto">
              <div className="text-xs text-slate-500 mb-3">
                {content ? 'Text file preview' : 'Loading text preview...'}
              </div>
              <pre className="whitespace-pre-wrap font-mono text-slate-800 text-sm leading-6 bg-slate-50 border border-slate-200 rounded-lg p-4">
                {content || ''}
              </pre>
            </div>
          </div>
        )}

        {isAudioFile && filePath && (
          <AudioPlayer filePath={filePath} title={title} />
        )}

        {isVideoFile && videoPreviewUrl && (
          <div className="w-full flex justify-center p-6">
            <div style={{ position: 'relative', width: '100%', maxWidth: '100%' }}>
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

        {imagePreviewUrl && (
          <ImagePreview
            imagePreviewUrl={imagePreviewUrl}
            title={title}
            filePath={filePath}
            imageMetadata={imageMetadata}
          />
        )}

        {documentPreviewUrl && (
          <DocumentPreview
            documentPreviewUrl={documentPreviewUrl}
            title={title}
            filePath={filePath}
            documentLoading={documentLoading}
            documentError={documentError}
            onLoad={handleDocumentLoad}
            onError={handleDocumentError}
          />
        )}

        {ebookPreviewUrl && (
          <DocumentPreview
            documentPreviewUrl={ebookPreviewUrl}
            title={title}
            filePath={filePath}
            documentLoading={documentLoading}
            documentError={documentError}
            onLoad={handleDocumentLoad}
            onError={handleDocumentError}
          />
        )}

        {videoEmbed && (
          <VideoPreview videoEmbed={videoEmbed} title={title} />
        )}

        {htmlPreviewUrl && (
          <HTMLPreview
            htmlPreviewUrl={htmlPreviewUrl}
            title={title}
          />
        )}

        <WebviewPreview
          webviewRef={webviewRef}
          url={url}
          hasNonWebviewPreview={!!hasNonWebviewPreview}
          loadError={logic.loadError}
          onRetry={logic.handleRetry}
        />
      </div>
    </aside>
  );
}

import { useRef, useState, useEffect } from 'react';
import { usePreviewPaneLogic } from '@/components/layout/previewpane/usePreviewPaneLogic';
import { getVideoEmbed } from '@/utils/videoEmbeds';
import { AudioPlayer } from '@/components/media/AudioPlayer';
import { useFileTypeDetection } from '@/components/layout/previewpane/hooks/useFileTypeDetection';
import { useImageMetadata } from '@/components/layout/previewpane/hooks/useImageMetadata';
import { useEbookMetadata } from '@/components/layout/previewpane/hooks/useEbookMetadata';
import { useDocumentPreview } from '@/components/layout/previewpane/hooks/useDocumentPreview';
import { useTextPreview } from '@/components/layout/previewpane/hooks/useTextPreview';
import { useTileNavigation } from '@/components/layout/previewpane/hooks/useTileNavigation';
import { useArrowKeyNavigation } from '@/components/layout/previewpane/hooks/useArrowKeyNavigation';
import { usePdfPageNavigation } from '@/components/layout/previewpane/hooks/usePdfPageNavigation';
import { useVideoEmbedMetadata } from '@/components/layout/previewpane/hooks/useVideoEmbedMetadata';
import { PreviewHeader } from '@/components/layout/previewpane/components/PreviewHeader';
import { NavigationControls } from '@/components/layout/previewpane/components/NavigationControls';
import { EmptyPreview } from '@/components/layout/previewpane/components/EmptyPreview';
import { TextPreview } from '@/components/layout/previewpane/components/TextPreview';
import { ImagePreview } from '@/components/layout/previewpane/components/ImagePreview';
import { DocumentPreview } from '@/components/layout/previewpane/components/DocumentPreview';
import { VideoPreview } from '@/components/layout/previewpane/components/VideoPreview';
import { WebviewPreview } from '@/components/layout/previewpane/components/WebviewPreview';
import { HTMLPreview } from '@/components/layout/previewpane/components/HTMLPreview';
import { MarkdownPreview } from '@/components/layout/previewpane/components/MarkdownPreview';
import { TextFilePreview } from '@/components/layout/previewpane/components/TextFilePreview';
import { VideoFilePreview } from '@/components/layout/previewpane/components/VideoFilePreview';
import { GmailExternalPreview } from '@/components/layout/previewpane/components/gmail_external';
import { useGmailDetection } from '@/components/layout/previewpane/hooks/useGmailDetection';
import { DroppedIcon } from '@/components/layout/centerpane/types';
import { API_BASE } from '@/config/api';

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
  gmailEmail?: string;
}

// PreviewPane renders the right-hand preview area for the selected tile, choosing between media/file previews and the embedded webview while supporting a full-window handoff.
export function PreviewPane({ isOpen, onClose, url, title, filePath, type, content, tileId, tiles = [], onNavigateToTile, gmailEmail }: PreviewPaneProps) {
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

  const { isImageFile, isAudioFile, isVideoFile, isDocumentFile, isEbookFile, isPdfFile, isTextFile, isMarkdownFile, isHtmlFile, imagePreviewUrl, videoPreviewUrl, documentPreviewUrl, ebookPreviewUrl, htmlPreviewUrl } = useFileTypeDetection(type, filePath);
  const imageMetadata = useImageMetadata(isImageFile, filePath);
  const ebookMetadata = useEbookMetadata(isEbookFile, filePath);
  const { documentError, documentLoading, handleDocumentLoad, handleDocumentError } = useDocumentPreview(isDocumentFile || isEbookFile, documentPreviewUrl || ebookPreviewUrl);
  const textPreviewBody = useTextPreview(type, content, title);
  const updatedTextPreviewBody = useTextPreview(type, localContent, localTitle);
  const videoEmbed = getVideoEmbed(url);
  const videoMetadata = useVideoEmbedMetadata(videoEmbed, url);
  const videoTitle = videoMetadata?.title || title;
  const videoDescription = videoMetadata?.description;
  const videoChannelName = videoMetadata?.channelName;
  const videoChannelIconUrl = videoMetadata?.channelIconUrl;

  const isTextNote = type === 'text';
  const { isGmail } = useGmailDetection({ type, url });
  const hasNonWebviewPreview = imagePreviewUrl || isAudioFile || isVideoFile || documentPreviewUrl || ebookPreviewUrl || videoEmbed || isTextFile || isMarkdownFile || isHtmlFile || isGmail;

  const logic = usePreviewPaneLogic(webviewRef, hasNonWebviewPreview ? undefined : url, isOpen);

  // Force webview to about:blank when showing non-webview preview to stop any ongoing navigation
  useEffect(() => {
    const view = webviewRef.current as any;
    if (hasNonWebviewPreview && view) {
      // Reset currentUrlRef so next webview preview triggers fresh load
      logic.currentUrlRef.current = undefined;

      // Check if webview is ready before calling methods that require DOM attachment
      const isReady = view.getWebContentsId && typeof view.getWebContentsId === 'function';
      try {
        // Only call stop/loadURL if the webview is attached and ready
        if (isReady) {
          view.getWebContentsId(); // This throws if not ready
          if (view.stop) view.stop();
          // Webview is ready, keep isReadyRef true
          logic.isReadyRef.current = true;
        }
        // Setting src directly is safe even if not ready
        if (view.src && view.src !== 'about:blank') {
          view.src = 'about:blank';
        }
      } catch {
        // Webview not ready yet, just set src directly
        if (view.src && view.src !== 'about:blank') {
          view.src = 'about:blank';
        }
      }
    }
  }, [hasNonWebviewPreview, logic.currentUrlRef, logic.isReadyRef]);

  const hasNoContent = !url && !imagePreviewUrl && !isAudioFile && !isVideoFile && !documentPreviewUrl && !ebookPreviewUrl && !content && !isTextFile && !isMarkdownFile && !isHtmlFile && !videoEmbed && !isGmail;

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

  // PDF page navigation with Up/Down arrows (Left/Right reserved for tile navigation)
  usePdfPageNavigation({
    webviewRef,
    isPdfPreview: isPdfFile,
    isEnabled: isOpen,
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
        showEditHint={type === 'text' && !isEditingText}
      />

      <div
        className="flex-1 min-h-0 relative flex flex-col custom-scroll"
        style={{
          background: 'var(--background-dark)',
          overflowX: 'auto',
          overflowY: isTextFile || isTextNote ? 'hidden' : 'auto',
          color: 'var(--color-text-secondary)'
        }}
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
          <TextFilePreview content={content} filePath={filePath} />
        )}

        {isAudioFile && filePath && (
          <AudioPlayer filePath={filePath} title={title} />
        )}

        {isVideoFile && videoPreviewUrl && (
          <VideoFilePreview videoPreviewUrl={videoPreviewUrl} />
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
          <VideoPreview
            key={videoEmbed.embedUrl}
            videoEmbed={videoEmbed}
            title={videoTitle}
            description={videoDescription}
            channelName={videoChannelName}
            channelIconUrl={videoChannelIconUrl}
            isPreviewOpen={isOpen}
          />
        )}

        {htmlPreviewUrl && (
          <HTMLPreview
            htmlPreviewUrl={htmlPreviewUrl}
            title={title}
          />
        )}

        {isGmail && (
          <GmailExternalPreview
            url={url}
            title={title}
            gmailEmail={gmailEmail}
          />
        )}

        <WebviewPreview
          webviewRef={webviewRef}
          url={hasNonWebviewPreview ? undefined : url}
          hasNonWebviewPreview={!!hasNonWebviewPreview}
          loadError={logic.loadError}
          onRetry={logic.handleRetry}
        />
      </div>
    </aside>
  );
}

import { useRef, useState, useEffect } from 'react';
import { usePreviewPaneLogic } from './usePreviewPaneLogic';
import { getVideoEmbed } from '../../../utils/videoEmbeds';
import { AudioPlayer } from '../../media/AudioPlayer';
import { useFileTypeDetection } from './hooks/useFileTypeDetection';
import { useImageMetadata } from './hooks/useImageMetadata';
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
import { DroppedIcon } from '../centerpane/types';

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

  const { isImageFile, isAudioFile, isDocumentFile, isTextFile, imagePreviewUrl, documentPreviewUrl } = useFileTypeDetection(type, filePath);
  const imageMetadata = useImageMetadata(isImageFile, filePath);
  const { documentError, documentLoading, handleDocumentLoad, handleDocumentError } = useDocumentPreview(isDocumentFile, documentPreviewUrl);
  const textPreviewBody = useTextPreview(type, content, title);
  const updatedTextPreviewBody = useTextPreview(type, localContent, localTitle);
  const videoEmbed = getVideoEmbed(url);

  const hasNonWebviewPreview = imagePreviewUrl || isAudioFile || documentPreviewUrl || videoEmbed || isTextFile;
  const logic = usePreviewPaneLogic(webviewRef, hasNonWebviewPreview ? undefined : url, isOpen);

  const hasNoContent = !url && !imagePreviewUrl && !isAudioFile && !documentPreviewUrl && !content && !isTextFile;

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
        fetch(`/api/objects/${tileId}`, {
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
      }}
      aria-hidden={collapsed}
    >
      <PreviewHeader
        title={localTitle}
        type={type}
        url={url}
        onClose={onClose}
        onOpenFullWindow={handleOpenFullWindow}
      />

      <div className="flex-1 overflow-auto relative flex flex-col custom-scroll" style={{ background: 'var(--background-dark)', overflowX: 'auto', overflowY: 'auto' }}>
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

        {videoEmbed && (
          <VideoPreview videoEmbed={videoEmbed} title={title} />
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

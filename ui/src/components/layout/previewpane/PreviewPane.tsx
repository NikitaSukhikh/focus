import { useRef } from 'react';
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
  const collapsed = !isOpen;

  const handleOpenFullWindow = () => {
    const event = new CustomEvent('open:fullwindow', {
      detail: {
        url,
        title,
        tileId,
        filePath,
        type,
        content,
      },
    });
    window.dispatchEvent(event);
  };

  const { isImageFile, isAudioFile, isDocumentFile, imagePreviewUrl, documentPreviewUrl } = useFileTypeDetection(type, filePath);
  const imageMetadata = useImageMetadata(isImageFile, filePath);
  const { documentError, documentLoading, handleDocumentLoad, handleDocumentError } = useDocumentPreview(isDocumentFile, documentPreviewUrl);
  const textPreviewBody = useTextPreview(type, content, title);
  const videoEmbed = getVideoEmbed(url);

  const hasNonWebviewPreview = imagePreviewUrl || isAudioFile || documentPreviewUrl || videoEmbed;
  const logic = usePreviewPaneLogic(webviewRef, hasNonWebviewPreview ? undefined : url, isOpen);

  const hasNoContent = !url && !imagePreviewUrl && !isAudioFile && !documentPreviewUrl && !content;

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
    isEnabled: isOpen,
  });

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
      <PreviewHeader
        title={title}
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
          <TextPreview title={title} content={textPreviewBody || ''} />
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

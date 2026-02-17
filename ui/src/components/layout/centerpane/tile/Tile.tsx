// Tile composes each canvas object shell and now exposes visible focus-ring anchor points for graph linking.
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { TileProps } from '@/components/layout/centerpane/types';
import { getVideoEmbed } from '@/utils/videoEmbeds';
import { detectFileType } from '@/utils/fileTypes';
import { Z_INDEX } from '@/constants/zIndex';
import { useDragHandling } from '@/components/layout/centerpane/tile/useDragHandling';
import { useThumbnail } from '@/components/layout/centerpane/tile/useThumbnail';
import { useImageMetadata } from '@/components/layout/centerpane/tile/useImageMetadata';
import { useEbookMetadata } from '@/components/layout/centerpane/tile/useEbookMetadata';
import { useContextMenu } from '@/components/layout/centerpane/tile/useContextMenu';
import { useFileRename } from '@/components/layout/centerpane/tile/useFileRename';
import { TILE, TILE_RING, EMBED_LINK, AUDIO_EMBED, VIDEO_EMBED, WEB_ARTICLE_EMBED } from '@/constants/objectsDimensions';
import { getThumbnailDimensions } from '@/components/layout/centerpane/tile/thumbnailHelpers';
import { VideoEmbedContent } from '@/components/layout/centerpane/tile/VideoEmbedContent';
import { VideoFileEmbedContent } from '@/components/layout/centerpane/tile/VideoFileEmbedContent';
import { AudioEmbedContent } from '@/components/layout/centerpane/tile/AudioEmbedContent';
import { WebArticleContent } from '@/components/layout/centerpane/tile/WebArticleContent';
import { LinkContent } from '@/components/layout/centerpane/tile/LinkContent';
import { TextContent } from '@/components/layout/centerpane/tile/TextContent';
import { DefaultContent } from '@/components/layout/centerpane/tile/DefaultContent';
import { TileContextMenu } from '@/components/layout/centerpane/tile/TileContextMenu';
import { TileDialogs } from '@/components/layout/centerpane/tile/TileDialogs';
import { RenameFileDialog } from '@/components/dialogs/RenameFileDialog';
import { openFilePath } from '@/platform';

type FocusRingEdge = 'top' | 'right' | 'bottom' | 'left';

interface FocusRingAnchor {
  edge: FocusRingEdge;
  edgeIndex: number;
  x: number;
  y: number;
}

const FOCUS_RING_DOTS_PER_EDGE = 3;
const FOCUS_RING_ANCHOR_DIAMETER = 8;
const FOCUS_RING_CENTER_OFFSET = TILE_RING.margin + (TILE_RING.strokeWidth / 2);

const buildFocusRingAnchors = (tileWidth: number, tileHeight: number, contentInset: number): FocusRingAnchor[] => {
  const safeContentWidth = Math.max(1, tileWidth - (contentInset * 2));
  const safeContentHeight = Math.max(1, tileHeight - (contentInset * 2));
  const ringLeft = contentInset - FOCUS_RING_CENTER_OFFSET;
  const ringTop = contentInset - FOCUS_RING_CENTER_OFFSET;
  const ringWidth = safeContentWidth + (FOCUS_RING_CENTER_OFFSET * 2);
  const ringHeight = safeContentHeight + (FOCUS_RING_CENTER_OFFSET * 2);
  const edgeFractions = Array.from(
    { length: FOCUS_RING_DOTS_PER_EDGE },
    (_, index) => (index + 1) / (FOCUS_RING_DOTS_PER_EDGE + 1)
  );

  const anchors: FocusRingAnchor[] = [];
  edgeFractions.forEach((fraction, edgeIndex) => {
    const edgeX = ringLeft + (ringWidth * fraction);
    const edgeY = ringTop + (ringHeight * fraction);

    anchors.push({ edge: 'top', edgeIndex, x: edgeX, y: ringTop });
    anchors.push({ edge: 'right', edgeIndex, x: ringLeft + ringWidth, y: edgeY });
    anchors.push({ edge: 'bottom', edgeIndex, x: edgeX, y: ringTop + ringHeight });
    anchors.push({ edge: 'left', edgeIndex, x: ringLeft, y: edgeY });
  });

  return anchors;
};

// Tile renders an individual canvas item (link/file/text) with drag/drop, context menu, and preview wiring.
export function Tile({
  id,
  type,
  title,
  x,
  y,
  url,
  description,
  channelName,
  faviconUrl,
  filePath,
  content,
  isSelected,
  onClick,
  onDoubleClick,
  onPositionChange: _onPositionChange,
  onDelete,
  onRefreshMetadata,
  onEdit,
  onEditLink,
}: TileProps) {
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [isInteractionLocked, setIsInteractionLocked] = useState(false);
  const [embedFailed, setEmbedFailed] = useState(false);
  const [tileBoxSize, setTileBoxSize] = useState({ width: 0, height: 0 });
  const tileContainerRef = useRef<HTMLDivElement | null>(null);

  const { isDragging, skipTransition, handleDragStart: rawHandleDragStart, handleDragEnd, dragRef } = useDragHandling(id, x, y);
  const { thumbnailUrl, setThumbnailUrl } = useThumbnail(type, filePath, title);
  const { imageMetadata } = useImageMetadata(type, filePath);
  const { ebookMetadata } = useEbookMetadata(type, filePath);
  const {
    showContextMenu,
    contextMenuPosition,
    handleContextMenu,
    handleCloseContextMenu,
    setShowContextMenu,
  } = useContextMenu();

  const {
    isRenaming,
    showRenameDialog,
    currentFileName,
    openRenameDialog,
    closeRenameDialog,
    handleRename,
  } = useFileRename({
    objectId: id,
    filePath: filePath || '',
    onSuccess: () => {
      // Trigger a refresh to get updated data
      window.location.reload();
    },
  });

  const openLinkExternally = async () => {
    if ((type !== 'link' && type !== 'web_article') || !url) return;
    // Simply open URL in external browser - no OAuth needed
    const { openExternalUrl } = await import('../../../../platform');
    openExternalUrl(url);
  };

  const openFileExternally = async () => {
    if (type !== 'file' || !filePath) return;
    await openFilePath(filePath);
  };

  const handleDoubleClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    onDoubleClick?.();

    if (type === 'text' && content !== undefined && onEdit) {
      onEdit(x, y, content, id);
      return;
    }

    if (type === 'file') {
      await openFileExternally();
      return;
    }

    await openLinkExternally();
  };

  const handleCopyPathClick = async () => {
    setShowContextMenu(false);
    const pathToCopy = filePath || url || '';
    if (pathToCopy) {
      try {
        await navigator.clipboard.writeText(pathToCopy);
        console.log('[Tile] Path copied to clipboard:', pathToCopy);
      } catch (err) {
        console.error('[Tile] Failed to copy path to clipboard:', err);
      }
    }
  };

  const handleDeleteClick = () => {
    setShowContextMenu(false);
    if (onDelete) {
      onDelete();
    }
  };

  const handleRefreshMetadataClick = () => {
    setShowContextMenu(false);
    if (onRefreshMetadata) {
      onRefreshMetadata();
    }
  };

  const handleShareClick = () => {
    setShowContextMenu(false);
    setShowShareDialog(true);
  };

  const handleOpenFullWindow = () => {
    setShowContextMenu(false);

    const event = new CustomEvent('open:fullwindow', {
      detail: {
        url,
        title,
        tileId: id,
        filePath,
        type,
        content,
      },
    });
    window.dispatchEvent(event);
  };

  const hoverScaleClass = isSelected ? 'scale-[1.02]' : 'group-hover:scale-[1.02]';
  const videoEmbed = type === 'link' ? getVideoEmbed(url) : null;
  const effectiveVideoEmbed = embedFailed ? null : videoEmbed;
  const fileCategory = type === 'file' && filePath ? detectFileType(filePath).category : null;
  const isAudioFile = fileCategory === 'audio';
  const isVideoFile = fileCategory === 'video';
  const isVideoLink = type === 'link' && !!effectiveVideoEmbed;
  const isWebArticle = type === 'web_article';
  const isGoogleIntegrationTile = type === 'gmail' || type === 'google_drive' || type === 'google_sheets' || type === 'google_docs' || type === 'google_slides';
  const isGmailTile = type === 'gmail';
  const isStandardFileTile = type === 'file' && !isAudioFile && !isVideoFile;
  const tilePadding = type === 'text' ? 0 : TILE.hoverSafePadding;
  const tileWidth = isWebArticle
    ? WEB_ARTICLE_EMBED.width
    : type === 'link'
      ? (isVideoLink ? EMBED_LINK.width : undefined)
      : (isAudioFile ? AUDIO_EMBED.width : isVideoFile ? VIDEO_EMBED.width : undefined);
  const tileHeight = isWebArticle
    ? WEB_ARTICLE_EMBED.height
    : type === 'link'
      ? (isVideoLink ? EMBED_LINK.height : undefined)
      : (isAudioFile ? AUDIO_EMBED.height : isVideoFile ? VIDEO_EMBED.height : undefined);
  // Keep drag handles functionally active while allowing visuals to be toggled during focus-ring iteration.
  const showDragHandles = false;
  const dragHandleHorizontalInset = TILE.hoverSafePadding + (isGmailTile ? 14 : 2);
  const dragHandleBarClass = showDragHandles
    ? 'h-1.5 w-full rounded-full bg-slate-400/70 transition-colors group-hover:bg-slate-500/80'
    : 'h-1.5 w-full rounded-full bg-transparent';
  const { thumbnailWidth, thumbnailHeight } = getThumbnailDimensions(type, thumbnailUrl, imageMetadata);
  const tooltipText = (() => {
    if (videoEmbed?.provider === 'youtube') {
      const parts: string[] = [];
      if (url) parts.push(url);
      const titleText = title?.trim();
      if (titleText) parts.push(titleText);
      const channelText = channelName?.trim();
      if (channelText) parts.push(channelText);
      return parts.join('\n');
    }

    return (
      description ||
      (type === 'file' && filePath ? filePath : undefined) ||
      (type === 'link' && url ? url : title)
    );
  })();

  useEffect(() => {
    setEmbedFailed(false);
  }, [url]);

  useEffect(() => {
    const node = tileContainerRef.current;
    if (!node) return;

    const updateSize = () => {
      setTileBoxSize({
        width: node.clientWidth,
        height: node.clientHeight,
      });
    };

    updateSize();

    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', updateSize);
      return () => window.removeEventListener('resize', updateSize);
    }

    const observer = new ResizeObserver(() => updateSize());
    observer.observe(node);
    return () => observer.disconnect();
  }, [tileHeight, tilePadding, tileWidth]);

  const focusRingAnchors = useMemo(() => {
    if (tileBoxSize.width <= 0 || tileBoxSize.height <= 0) return [];
    return buildFocusRingAnchors(tileBoxSize.width, tileBoxSize.height, tilePadding);
  }, [tileBoxSize.height, tileBoxSize.width, tilePadding]);

  const handleDragStart = (e: React.DragEvent) => {
    if (isInteractionLocked) {
      e.preventDefault();
      return;
    }
    rawHandleDragStart(e);
  };

  const renderContent = () => {
    if (type === 'web_article' && url) {
      return (
        <WebArticleContent
          id={id}
          url={url}
          title={title}
          isSelected={!!isSelected}
          hoverScaleClass={hoverScaleClass}
          onInteractionChange={setIsInteractionLocked}
        />
      );
    }

    if (type === 'link' && effectiveVideoEmbed) {
      return (
        <VideoEmbedContent
          videoEmbed={effectiveVideoEmbed}
          title={title}
          isSelected={!!isSelected}
          hoverScaleClass={hoverScaleClass}
          onInteractionChange={setIsInteractionLocked}
          onEmbedError={() => setEmbedFailed(true)}
        />
      );
    }

    if (type === 'file' && isVideoFile && filePath) {
      return (
        <VideoFileEmbedContent
          filePath={filePath}
          title={title}
          isSelected={!!isSelected}
          hoverScaleClass={hoverScaleClass}
          onInteractionChange={setIsInteractionLocked}
        />
      );
    }

    if (type === 'file' && isAudioFile && filePath) {
      return (
        <AudioEmbedContent
          filePath={filePath}
          title={title}
          hoverScaleClass={hoverScaleClass}
          onInteractionChange={setIsInteractionLocked}
        />
      );
    }

    if (type === 'link') {
      return (
        <LinkContent
          url={url}
          filePath={filePath}
          thumbnailUrl={thumbnailUrl}
          thumbnailWidth={thumbnailWidth}
          thumbnailHeight={thumbnailHeight}
          title={title}
          description={description}
          faviconUrl={faviconUrl}
          onThumbnailError={() => setThumbnailUrl(null)}
          isSelected={!!isSelected}
          hoverScaleClass={hoverScaleClass}
        />
      );
    }

    if (type === 'text' && content) {
      return (
        <TextContent
          content={content}
          hoverScaleClass={hoverScaleClass}
        />
      );
    }

    return (
      <DefaultContent
        type={type}
        url={url}
        filePath={filePath}
        thumbnailUrl={thumbnailUrl}
        thumbnailWidth={thumbnailWidth}
        thumbnailHeight={thumbnailHeight}
        title={title}
        faviconUrl={faviconUrl}
        onThumbnailError={() => setThumbnailUrl(null)}
        isSelected={!!isSelected}
        hoverScaleClass={hoverScaleClass}
        imageMetadata={imageMetadata}
        ebookMetadata={ebookMetadata}
      />
    );
  };

  return (
    <>
      <div
        data-icon-tile
        ref={(node) => {
          tileContainerRef.current = node;
          dragRef.current = node;
        }}
        onClick={(event) => onClick?.(event)}
        onDoubleClick={handleDoubleClick}
        onContextMenu={handleContextMenu}
        title={tooltipText}
        className={`
          group absolute select-none
          ${type === 'link' || type === 'web_article' || isAudioFile || isVideoFile || isGoogleIntegrationTile ? 'flex items-center justify-center' : type === 'text' ? '' : isStandardFileTile ? 'text-center' : 'text-center w-32'}
          outline-none focus:outline-none
          ${isDragging ? 'invisible' : ''}
        `}
        style={{
          top: y,
          left: x,
          transform: type === 'text' ? 'translate(0, 0)' : 'translate(-50%, -50%)',
          transition: skipTransition ? 'none' : 'all 0.2s',
          opacity: isDragging ? 0 : 1,
          userSelect: 'none',
          padding: tilePadding,
          border: 'none',
          background: 'transparent',
          width: tileWidth ? `${tileWidth}px` : type === 'text' ? 'auto' : undefined,
          height: tileHeight ? `${tileHeight}px` : type === 'text' ? 'auto' : undefined,
          zIndex: isSelected ? Z_INDEX.CONTENT_SELECTED : isDragging ? Z_INDEX.CONTENT_DRAGGING : Z_INDEX.CONTENT_DEFAULT
        } as any}
      >
        <div
          draggable={!isInteractionLocked}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          className={`absolute top-3 z-20 flex h-4 items-center justify-center rounded-full px-2 ${
            isInteractionLocked ? 'cursor-default' : 'cursor-grab active:cursor-grabbing'
          }`}
          style={{
            left: dragHandleHorizontalInset,
            right: dragHandleHorizontalInset,
          }}
        >
          <span className={dragHandleBarClass} />
        </div>
        <div
          draggable={!isInteractionLocked}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          className={`absolute top-1/2 z-20 flex h-4 -translate-y-1/2 items-center justify-center rounded-full px-2 ${
            isInteractionLocked ? 'cursor-default' : 'cursor-grab active:cursor-grabbing'
          }`}
          style={{
            left: dragHandleHorizontalInset,
            right: dragHandleHorizontalInset,
          }}
        >
          <span className={dragHandleBarClass} />
        </div>
        {renderContent()}
        <div
          className={`absolute inset-0 pointer-events-none transition-transform duration-150 ${hoverScaleClass}`}
          style={{ zIndex: 30 }}
        >
          {focusRingAnchors.map((anchor) => (
            <span
              key={`${anchor.edge}-${anchor.edgeIndex}`}
              data-focus-ring-anchor
              data-focus-ring-edge={anchor.edge}
              data-focus-ring-edge-index={anchor.edgeIndex}
              style={{
                position: 'absolute',
                left: `${anchor.x}px`,
                top: `${anchor.y}px`,
                width: `${FOCUS_RING_ANCHOR_DIAMETER}px`,
                height: `${FOCUS_RING_ANCHOR_DIAMETER}px`,
                transform: 'translate(-50%, -50%)',
                borderRadius: '9999px',
                border: '1px solid rgba(255,255,255,0.95)',
                background: 'rgba(56, 189, 248, 0.95)',
                boxShadow: '0 0 0 1px rgba(15, 23, 42, 0.65), 0 0 8px rgba(56, 189, 248, 0.85)',
              }}
            />
          ))}
        </div>
      </div>

      <TileContextMenu
        show={showContextMenu}
        position={contextMenuPosition}
        type={type}
        hasFileOrUrl={!!(filePath || url)}
        hasContent={!!(filePath || url || content)}
        url={url}
        onClose={handleCloseContextMenu}
        onOpenFullWindow={handleOpenFullWindow}
        onShare={handleShareClick}
        onCopyPath={handleCopyPathClick}
        onOpenExternal={() => {
          setShowContextMenu(false);
          void openLinkExternally();
        }}
        onRefreshMetadata={handleRefreshMetadataClick}
        onRenameFile={type === 'file' && filePath ? () => {
          setShowContextMenu(false);
          openRenameDialog();
        } : undefined}
        onEditLink={(type === 'link' || type === 'web_article') && onEditLink ? () => {
          setShowContextMenu(false);
          onEditLink();
        } : undefined}
        onDelete={handleDeleteClick}
      />

      <TileDialogs
        showShareDialog={showShareDialog}
        url={url}
        title={title}
        filePath={filePath}
        onShareDialogClose={() => setShowShareDialog(false)}
      />

      <RenameFileDialog
        isOpen={showRenameDialog}
        currentName={currentFileName}
        isLoading={isRenaming}
        onClose={closeRenameDialog}
        onRename={handleRename}
      />
    </>
  );
}

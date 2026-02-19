// Tile composes each canvas object shell and now exposes visible focus-ring anchor points for graph linking.
import React, { useEffect, useRef, useState } from 'react';
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
import { TILE, EMBED_LINK, AUDIO_EMBED, VIDEO_EMBED, WEB_ARTICLE_EMBED } from '@/constants/objectsDimensions';
import { getThumbnailDimensions } from '@/components/layout/centerpane/tile/thumbnailHelpers';
import { VideoEmbedContent } from '@/components/layout/centerpane/tile/VideoEmbedContent';
import { VideoFileEmbedContent } from '@/components/layout/centerpane/tile/VideoFileEmbedContent';
import { AudioEmbedContent } from '@/components/layout/centerpane/tile/AudioEmbedContent';
import { WebArticleContent } from '@/components/layout/centerpane/tile/WebArticleContent';
import { LinkContent } from '@/components/layout/centerpane/tile/LinkContent';
import { TextContent } from '@/components/layout/centerpane/tile/TextContent';
import { DefaultContent } from '@/components/layout/centerpane/tile/DefaultContent';
import { FocusRing } from '@/components/layout/centerpane/tile/FocusRing';
import { useTileResize } from '@/components/layout/centerpane/tile/useTileResize';
import { TileContextMenu } from '@/components/layout/centerpane/tile/TileContextMenu';
import { TileDialogs } from '@/components/layout/centerpane/tile/TileDialogs';
import { RenameFileDialog } from '@/components/dialogs/RenameFileDialog';
import { openFilePath } from '@/platform';
import { TILE_RING_COLORS, TEXT_NOTE_BOX } from '@/styles/tileStyles';

// Tile renders an individual canvas item (link/file/text) with drag/drop, context menu, and preview wiring.
export function Tile({
  id,
  type,
  title,
  x,
  y,
  width: propWidth,
  height: propHeight,
  zoom = 1,
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
  onSizeChange,
  onResizeInteractionEnd,
  onFocusRingPointerDown,
  suppressFocusRingGhostArrow,
  onMetricsChange,
}: TileProps) {
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [isInteractionLocked, setIsInteractionLocked] = useState(false);
  const [embedFailed, setEmbedFailed] = useState(false);
  const [tileBoxSize, setTileBoxSize] = useState({ width: 0, height: 0 });
  const [textMinWidth, setTextMinWidth] = useState(0);
  const tileContainerRef = useRef<HTMLDivElement | null>(null);
  const suppressClickUntilRef = useRef(0);

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

  const hoverScaleClass = '';
  const videoEmbed = type === 'link' ? getVideoEmbed(url) : null;
  const effectiveVideoEmbed = embedFailed ? null : videoEmbed;
  const fileCategory = type === 'file' && filePath ? detectFileType(filePath).category : null;
  const isAudioFile = fileCategory === 'audio';
  const isVideoFile = fileCategory === 'video';
  const isImageFile = fileCategory === 'image';
  const isVideoLink = type === 'link' && !!effectiveVideoEmbed;
  const isWebArticle = type === 'web_article';
  const isGoogleIntegrationTile = type === 'gmail' || type === 'google_drive' || type === 'google_sheets' || type === 'google_docs' || type === 'google_slides';
  const isLinkRingTile = type === 'link' || isWebArticle || isGoogleIntegrationTile;
  const isGmailTile = type === 'gmail';
  const isStandardFileTile = type === 'file' && !isAudioFile && !isVideoFile;
  const focusRingColor = type === 'text'
    ? TILE_RING_COLORS.text
    : isLinkRingTile
      ? TILE_RING_COLORS.link
      : TILE_RING_COLORS.file;
  const tilePadding = type === 'text' ? 0 : TILE.hoverSafePadding;
  const isCenteredTile = type !== 'text';
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
  const fallbackTextMinWidth = (TEXT_NOTE_BOX.padding.x * 2) + 14;
  const textMinBoxWidth = textMinWidth > 0 ? textMinWidth : fallbackTextMinWidth;
  const minBoxWidth = isWebArticle ? 200 : (isVideoLink || isAudioFile || isVideoFile) ? 160 : type === 'text' ? textMinBoxWidth : 80;
  const minBoxHeight = isWebArticle ? 200 : (isVideoLink || isAudioFile || isVideoFile) ? 120 : type === 'text' ? 40 : 60;
  const imageAspectRatio = isImageFile && imageMetadata && imageMetadata.height > 0
    ? imageMetadata.width / imageMetadata.height
    : undefined;

  const { isResizing, liveX, liveY, liveW, liveH, handleCornerPointerDown } = useTileResize({
    tileId: id,
    tileX: x,
    tileY: y,
    isCentered: isCenteredTile,
    zoom,
    minWidth: minBoxWidth,
    minHeight: minBoxHeight,
    lockAspectRatio: imageAspectRatio,
    lockAspectRatioInset: tilePadding,
    onResizeInteractionEnd: (didResize) => {
      suppressClickUntilRef.current = performance.now() + 250;
      onResizeInteractionEnd?.(didResize);
    },
    onResizeEnd: (tileId, newX, newY, newWidth, newHeight) => {
      onSizeChange?.(tileId, newX, newY, newWidth, newHeight);
    },
  });

  const handleTileClick = (event: React.MouseEvent) => {
    if (performance.now() < suppressClickUntilRef.current) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    onClick?.(event);
  };

  const displayX = isResizing ? liveX : x;
  const displayY = isResizing ? liveY : y;

  // Effective box dimensions: live during resize, stored prop if set, else type default
  const effectiveWidth = isResizing ? liveW : (propWidth ?? tileWidth);
  const effectiveHeight = isResizing ? liveH : (propHeight ?? tileHeight);
  const currentBoxWidth = isResizing ? liveW : (effectiveWidth ?? tileBoxSize.width);
  const currentBoxHeight = isResizing ? liveH : (effectiveHeight ?? tileBoxSize.height);
  const contentBoxWidth = currentBoxWidth > 0 ? Math.max(1, currentBoxWidth - (tilePadding * 2)) : undefined;
  const contentBoxHeight = currentBoxHeight > 0 ? Math.max(1, currentBoxHeight - (tilePadding * 2)) : undefined;

  // Keep drag handles functionally active while allowing visuals to be toggled during focus-ring iteration.
  const showDragHandles = false;
  const dragHandleHorizontalInset = TILE.hoverSafePadding + (isGmailTile ? 14 : 2);
  const dragHandleBarClass = showDragHandles
    ? 'h-1.5 w-full rounded-full bg-slate-400/70 transition-colors group-hover:bg-slate-500/80'
    : 'h-1.5 w-full rounded-full bg-transparent';
  const { thumbnailWidth, thumbnailHeight } = getThumbnailDimensions(type, thumbnailUrl, imageMetadata, {
    maxWidth: contentBoxWidth,
    maxHeight: contentBoxHeight,
  });
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

  useEffect(() => {
    if (!onMetricsChange) return;
    if (tileBoxSize.width <= 0 || tileBoxSize.height <= 0) return;
    onMetricsChange(id, {
      width: tileBoxSize.width,
      height: tileBoxSize.height,
      contentInset: tilePadding,
      isCentered: isCenteredTile,
    });
  }, [id, isCenteredTile, onMetricsChange, tileBoxSize.height, tileBoxSize.width, tilePadding]);

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
          onContextMenu={handleContextMenu}
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
          onMinWidthChange={setTextMinWidth}
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
        data-icon-tile-id={id}
        ref={(node) => {
          tileContainerRef.current = node;
          dragRef.current = node;
        }}
        onClick={handleTileClick}
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
          top: displayY,
          left: displayX,
          transform: isCenteredTile ? 'translate(-50%, -50%)' : 'translate(0, 0)',
          transition: (skipTransition || isResizing) ? 'none' : 'all 0.2s',
          opacity: isDragging ? 0 : 1,
          userSelect: 'none',
          padding: tilePadding,
          border: 'none',
          background: 'transparent',
          minWidth: `${minBoxWidth}px`,
          minHeight: `${minBoxHeight}px`,
          width: effectiveWidth ? `${effectiveWidth}px` : type === 'text' ? 'auto' : undefined,
          height: effectiveHeight ? `${effectiveHeight}px` : type === 'text' ? 'auto' : undefined,
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
          draggable={false}
          className="pointer-events-none absolute top-1/2 z-20 flex h-4 -translate-y-1/2 items-center justify-center rounded-full px-2 cursor-default"
          style={{
            left: dragHandleHorizontalInset,
            right: dragHandleHorizontalInset,
          }}
        >
          <span className={dragHandleBarClass} />
        </div>
        {renderContent()}
        <FocusRing
          tileId={id}
          tileWidth={isResizing ? liveW : tileBoxSize.width}
          tileHeight={isResizing ? liveH : tileBoxSize.height}
          contentInset={tilePadding}
          ringOutlineOffset={isImageFile ? 0 : undefined}
          ringColor={focusRingColor}
          hoverScaleClass={hoverScaleClass}
          onPointerDown={onFocusRingPointerDown}
          suppressGhostArrow={suppressFocusRingGhostArrow}
          onCornerPointerDown={onSizeChange ? (e, corner) => handleCornerPointerDown(e, corner, tileBoxSize.width, tileBoxSize.height) : undefined}
        />
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

import React, { useState } from 'react';
import { TileProps } from '../types';
import { authenticatedLinksService } from '../../../../services/authenticatedLinks';
import { getVideoEmbed } from '../../../../utils/videoEmbeds';
import { Z_INDEX } from '../../../../constants/zIndex';
import { useDragHandling } from './useDragHandling';
import { useThumbnail } from './useThumbnail';
import { useImageMetadata } from './useImageMetadata';
import { useRenaming } from './useRenaming';
import { useContextMenu } from './useContextMenu';
import { useAccountSelection } from './useAccountSelection';
import { HOVER_SAFE_PADDING, EMBED_LINK_WIDTH, EMBED_LINK_HEIGHT, NON_EMBED_LINK_SIZE, getThumbnailDimensions } from './dimensionHelpers';
import { VideoEmbedContent } from './VideoEmbedContent';
import { LinkContent } from './LinkContent';
import { TextContent } from './TextContent';
import { DefaultContent } from './DefaultContent';
import { TileContextMenu } from './TileContextMenu';
import { TileDialogs } from './TileDialogs';

// Tile renders an individual canvas item (link/file/text) with drag/drop, rename, context menu, and preview wiring.
export function Tile({
  id,
  type,
  title,
  x,
  y,
  url,
  description,
  faviconUrl,
  filePath,
  content,
  isSelected,
  onClick,
  onPositionChange: _onPositionChange,
  onDelete,
  onRename,
  onRefreshMetadata,
  onEdit
}: TileProps) {
  const [showShareDialog, setShowShareDialog] = useState(false);

  const { isDragging, skipTransition, handleDragStart, handleDragEnd } = useDragHandling(id, x, y);
  const { thumbnailUrl, setThumbnailUrl } = useThumbnail(type, filePath, title);
  const { imageMetadata } = useImageMetadata(type, filePath);
  const {
    isRenaming,
    renamingValue,
    renameInputRef,
    setRenamingValue,
    handleRenameClick,
    handleRenameSubmit,
    handleRenameKeyDown,
  } = useRenaming(title, onRename);
  const {
    showContextMenu,
    contextMenuPosition,
    handleContextMenu,
    handleCloseContextMenu,
    setShowContextMenu,
  } = useContextMenu();
  const {
    showAccountDialog,
    accountSelectionData,
    handleAccountSelect,
    handleAccountDialogClose,
    handleAddNewAccount,
    onAccountSelection,
  } = useAccountSelection();

  const openLinkExternally = async () => {
    if (type !== 'link' || !url) return;

    await authenticatedLinksService.openLink(
      url,
      id,
      async (service) => {
        console.log(`[Tile] OAuth needed for ${service}`);
        await authenticatedLinksService.triggerOAuth(service);
      },
      onAccountSelection
    );
  };

  const handleDoubleClick = async (e: React.MouseEvent) => {
    e.stopPropagation();

    if (type === 'text' && content !== undefined && onEdit) {
      onEdit(x, y, content, id);
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
  const tileWidth = type === 'link' ? (videoEmbed ? EMBED_LINK_WIDTH : NON_EMBED_LINK_SIZE) : undefined;
  const tileHeight = type === 'link' ? (videoEmbed ? EMBED_LINK_HEIGHT : NON_EMBED_LINK_SIZE) : undefined;
  const { thumbnailWidth, thumbnailHeight } = getThumbnailDimensions(type, thumbnailUrl, imageMetadata);

  const renderContent = () => {
    if (type === 'link' && videoEmbed) {
      return (
        <VideoEmbedContent
          videoEmbed={videoEmbed}
          title={title}
          isRenaming={isRenaming}
          renamingValue={renamingValue}
          setRenamingValue={setRenamingValue}
          handleRenameKeyDown={handleRenameKeyDown}
          handleRenameSubmit={handleRenameSubmit}
          renameInputRef={renameInputRef}
          isSelected={isSelected}
          hoverScaleClass={hoverScaleClass}
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
          isRenaming={isRenaming}
          renamingValue={renamingValue}
          setRenamingValue={setRenamingValue}
          handleRenameKeyDown={handleRenameKeyDown}
          handleRenameSubmit={handleRenameSubmit}
          renameInputRef={renameInputRef}
          isSelected={isSelected}
          hoverScaleClass={hoverScaleClass}
        />
      );
    }

    if (type === 'text' && content) {
      return (
        <TextContent
          content={content}
          isSelected={isSelected}
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
        isRenaming={isRenaming}
        renamingValue={renamingValue}
        setRenamingValue={setRenamingValue}
        handleRenameKeyDown={handleRenameKeyDown}
        handleRenameSubmit={handleRenameSubmit}
        renameInputRef={renameInputRef}
        isSelected={isSelected}
        hoverScaleClass={hoverScaleClass}
        imageMetadata={imageMetadata}
      />
    );
  };

  return (
    <>
      <button
        data-icon-tile
        draggable="true"
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onClick={(event) => onClick?.(event)}
        onDoubleClick={handleDoubleClick}
        onContextMenu={handleContextMenu}
        title={
          description ||
          (type === 'file' && filePath ? filePath : undefined) ||
          (type === 'link' && url ? url : title)
        }
        className={`
          group absolute select-none
          ${type === 'link' ? 'flex items-center justify-center' : type === 'text' ? '' : 'text-center w-32'} cursor-grab active:cursor-grabbing
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
          padding: type === 'text' ? 0 : HOVER_SAFE_PADDING,
          border: 'none',
          background: 'transparent',
          width: type === 'link' ? `${tileWidth}px` : type === 'text' ? 'auto' : undefined,
          height: type === 'link' ? `${tileHeight}px` : type === 'text' ? 'auto' : undefined,
          zIndex: isSelected ? Z_INDEX.CONTENT_SELECTED : isDragging ? Z_INDEX.CONTENT_DRAGGING : Z_INDEX.CONTENT_DEFAULT
        } as any}
      >
        {renderContent()}
      </button>

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
        onRename={handleRenameClick}
        onDelete={handleDeleteClick}
      />

      <TileDialogs
        showAccountDialog={showAccountDialog}
        accountSelectionData={accountSelectionData}
        showShareDialog={showShareDialog}
        url={url}
        title={title}
        filePath={filePath}
        onAccountSelect={handleAccountSelect}
        onAccountDialogClose={handleAccountDialogClose}
        onAddNewAccount={handleAddNewAccount}
        onShareDialogClose={() => setShowShareDialog(false)}
      />
    </>
  );
}

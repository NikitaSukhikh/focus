import React, { useState, useEffect, useRef } from 'react';
import { Grid3x3, Link, FileText, Edit2, Trash2, Copy, RefreshCw, ExternalLink } from 'lucide-react';
import { GmailIcon, DriveIcon, SheetsIcon, DocsIcon, SlidesIcon } from '../../icons/GoogleServiceIcons';
import { TelegramIcon } from '../../../features/telegram/TelegramIcon';
import { IntStorageIcon } from '../../../features/intstorage/IntStorageIcon';
import { FALLBACK_FAVICON } from '../../../utils/favicon';
import { Z_INDEX } from '../../../constants/zIndex';
import { detectFileType, canShowImageThumbnail } from '../../../utils/fileTypes';
import { getFileTypeIcon } from '../../icons/FileTypeIcons';
import { IconTileProps } from './types';
import { authenticatedLinksService, AccountInfo } from '../../../services/authenticatedLinks';
import { AccountSelectionDialog } from '../../dialogs/AccountSelectionDialog';
import { getVideoEmbed } from '../../../utils/videoEmbeds';

const HOVER_SAFE_PADDING = 12;
const EMBED_LINK_WIDTH = 360;
const EMBED_LINK_HEIGHT = 240;
const NON_EMBED_LINK_SIZE = 192;

export function IconTile({
  id,
  type,
  title,
  x,
  y,
  url,
  description,
  faviconUrl,
  filePath,
  isSelected,
  onClick,
  onPositionChange: _onPositionChange,
  onDelete,
  onRename,
  onRefreshMetadata
}: IconTileProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [skipTransition, setSkipTransition] = useState(false);
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [contextMenuPosition, setContextMenuPosition] = useState({ x: 0, y: 0 });
  const [isRenaming, setIsRenaming] = useState(false);
  const [renamingValue, setRenamingValue] = useState(title);
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const [showAccountDialog, setShowAccountDialog] = useState(false);
  const [accountSelectionData, setAccountSelectionData] = useState<{
    accounts: AccountInfo[];
    service: string;
    resolve: (_email: string | null) => void;
  } | null>(null);
  const renameInputRef = useRef<HTMLInputElement>(null);

  // Load thumbnail for image files
  useEffect(() => {
    console.log('[ICON TILE] Checking thumbnail for:', { type, filePath, title });
    if (type === 'file' && filePath && canShowImageThumbnail(filePath)) {
      // Build thumbnail URL
      const params = new URLSearchParams({
        file_path: filePath,
        max_width: '256',
        max_height: '256',
        quality: '85',
      });
      const url = `/api/thumbnails/image?${params.toString()}`;
      console.log('[ICON TILE] Setting thumbnail URL:', url);
      setThumbnailUrl(url);
    } else {
      console.log('[ICON TILE] No thumbnail needed:', {
        isFile: type === 'file',
        hasFilePath: !!filePath,
        canShowThumbnail: filePath ? canShowImageThumbnail(filePath) : false
      });
      setThumbnailUrl(null);
    }
  }, [type, filePath, title]);

  const handleDragStart = (e: React.DragEvent) => {

    // Store current icon position and cursor position
    const startCursorX = e.clientX;
    const startCursorY = e.clientY;

    // Set drag data including start positions
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('application/x-icon-id', id);
    e.dataTransfer.setData('application/x-drag-start', JSON.stringify({
      startCursorX,
      startCursorY,
      iconX: x,
      iconY: y
    }));

    // Get the button element (currentTarget is always the element with the event handler)
    const buttonElement = e.currentTarget as HTMLElement;

    // Calculate the offset from the button's top-left corner to the cursor
    const rect = buttonElement.getBoundingClientRect();
    const offsetX = e.clientX - rect.left;
    const offsetY = e.clientY - rect.top;

    // Create a custom drag image from the button element
    const dragImage = buttonElement.cloneNode(true) as HTMLElement;
    dragImage.style.opacity = '0.5';
    document.body.appendChild(dragImage);
    e.dataTransfer.setDragImage(dragImage, offsetX, offsetY);

    // Remove the drag image after the browser captures it
    requestAnimationFrame(() => {
      document.body.removeChild(dragImage);
    });

    // Hide the original icon immediately
    setIsDragging(true);
  };

  const handleDragEnd = (e: React.DragEvent) => {
    // Disable transition and wait for position update before showing icon
    setSkipTransition(true);

    // Delay making icon visible until after position update has been applied
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setIsDragging(false);
        // Re-enable transitions after a short delay
        setTimeout(() => {
          setSkipTransition(false);
        }, 50);
      });
    });

    // Remove focus to prevent blue ring after drop
    (e.target as HTMLElement).blur();
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenuPosition({ x: e.clientX, y: e.clientY });
    setShowContextMenu(true);
  };

  const handleCloseContextMenu = () => {
    setShowContextMenu(false);
  };

  const handleRenameClick = () => {
    setShowContextMenu(false);
    setIsRenaming(true);
    setRenamingValue(title);
    setTimeout(() => {
      renameInputRef.current?.focus();
      renameInputRef.current?.select();
    }, 0);
  };

  const handleCopyPathClick = async () => {
    setShowContextMenu(false);
    const pathToCopy = filePath || url || '';
    if (pathToCopy) {
      try {
        await navigator.clipboard.writeText(pathToCopy);
        console.log('[ICON TILE] Path copied to clipboard:', pathToCopy);
      } catch (err) {
        console.error('[ICON TILE] Failed to copy path to clipboard:', err);
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

  const openLinkExternally = async () => {
    if (type !== 'link' || !url) return;

    // Use authenticated links service for seamless opening
    await authenticatedLinksService.openLink(
      url,
      id,
      // onNeedsAuth callback
      async (service) => {
        console.log(`[IconTile] OAuth needed for ${service}`);
        await authenticatedLinksService.triggerOAuth(service);
      },
      // onAccountSelection callback
      async (accounts, service) => {
        console.log(`[IconTile] Multiple accounts available for ${service}:`, accounts);

        // Show account selection dialog
        return new Promise<string | null>((resolve) => {
          setAccountSelectionData({ accounts, service, resolve });
          setShowAccountDialog(true);
        });
      }
    );
  };

  const handleDoubleClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await openLinkExternally();
  };

  const handleAccountSelect = (email: string) => {
    if (accountSelectionData) {
      accountSelectionData.resolve(email);
      setShowAccountDialog(false);
      setAccountSelectionData(null);
    }
  };

  const handleAccountDialogClose = () => {
    if (accountSelectionData) {
      accountSelectionData.resolve(null); // User cancelled
      setShowAccountDialog(false);
      setAccountSelectionData(null);
    }
  };

  const handleAddNewAccount = async () => {
    if (accountSelectionData) {
      const { service } = accountSelectionData;
      await authenticatedLinksService.triggerOAuth(service);
      // Dialog will close, user can retry opening the link after OAuth
      handleAccountDialogClose();
    }
  };

  const isGoogleService = (url: string): boolean => {
    if (!url) return false;
    const urlLower = url.toLowerCase();
    return (
      urlLower.includes('mail.google.com') ||
      urlLower.includes('gmail.com') ||
      urlLower.includes('drive.google.com') ||
      urlLower.includes('docs.google.com') ||
      urlLower.includes('sheets.google.com') ||
      urlLower.includes('slides.google.com')
    );
  };

  const handleRenameSubmit = () => {
    const newTitle = renamingValue.trim();
    if (newTitle && newTitle !== title && onRename) {
      onRename(newTitle);
    }
    setIsRenaming(false);
  };

  const handleRenameKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleRenameSubmit();
    } else if (e.key === 'Escape') {
      setIsRenaming(false);
      setRenamingValue(title);
    }
  };

  useEffect(() => {
    setRenamingValue(title);
  }, [title]);

  const Icon =
    type === 'link'
      ? Link
      : type === 'file'
      ? FileText
      : type === 'gmail'
      ? GmailIcon
      : type === 'google_drive'
      ? DriveIcon
      : type === 'google_sheets'
      ? SheetsIcon
      : type === 'google_docs'
      ? DocsIcon
      : type === 'google_slides'
      ? SlidesIcon
      : type === 'telegram'
      ? TelegramIcon
      : type === 'intstorage'
      ? IntStorageIcon
      : type === 'text'
      ? FileText
      : Grid3x3;
  const videoEmbed = type === 'link' ? getVideoEmbed(url) : null;
  const tileWidth =
    type === 'link' ? (videoEmbed ? EMBED_LINK_WIDTH : NON_EMBED_LINK_SIZE) : undefined;
  const tileHeight =
    type === 'link' ? (videoEmbed ? EMBED_LINK_HEIGHT : NON_EMBED_LINK_SIZE) : undefined;

  const getGoogleServiceIcon = (url: string) => {
    if (!url) return null;
    const urlLower = url.toLowerCase();

    if (urlLower.includes('mail.google.com') || urlLower.includes('gmail.com')) {
      return <GmailIcon size={48} />;
    }
    if (urlLower.includes('drive.google.com')) {
      return <DriveIcon size={48} />;
    }
    if (urlLower.includes('docs.google.com/spreadsheets') || urlLower.includes('sheets.google.com')) {
      return <SheetsIcon size={48} />;
    }
    if (urlLower.includes('docs.google.com/document') || urlLower.includes('docs.google.com')) {
      return <DocsIcon size={48} />;
    }
    if (urlLower.includes('docs.google.com/presentation') || urlLower.includes('slides.google.com')) {
      return <SlidesIcon size={48} />;
    }

    return null;
  };

  const renderIcon = () => {
    // Show thumbnail for image files
    if (type === 'file' && thumbnailUrl) {
      return (
        <img
          src={thumbnailUrl}
          alt={title}
          className="w-24 h-24 rounded-md object-cover shadow-sm"
          draggable={false}
          onError={() => setThumbnailUrl(null)}
        />
      );
    }

    // Show file type icon for non-image files
    if (type === 'file' && filePath) {
      const fileTypeInfo = detectFileType(filePath);
      const FileTypeIconComponent = getFileTypeIcon(fileTypeInfo.extension);
      return <FileTypeIconComponent size={48} />;
    }

    // Show custom icons for Google services
    if (type === 'link' && url) {
      const googleIcon = getGoogleServiceIcon(url);
      if (googleIcon) {
        return googleIcon;
      }
    }

    // Show favicon for links (fallbacks to pixelated question mark)
    if (type === 'link') {
      return (
        <img
          src={faviconUrl || FALLBACK_FAVICON}
          alt=""
          className="w-10 h-10 rounded object-contain"
          draggable={false}
          onError={(e) => {
            if (e.currentTarget.src !== FALLBACK_FAVICON) {
              e.currentTarget.onerror = null;
              e.currentTarget.src = FALLBACK_FAVICON;
            }
          }}
        />
      );
    }

    // Default icon
    return <Icon size={48} />;
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
        title={description || (type === 'link' && url ? url : title)}
        className={`
          group absolute select-none
          ${type === 'link' ? 'flex items-center justify-center' : 'text-center w-32'} cursor-grab active:cursor-grabbing
          outline-none focus:outline-none
          ${isDragging ? 'invisible' : ''}
        `}
        style={{
          top: y,
          left: x,
          transform: 'translate(-50%, -50%)',
          transition: skipTransition ? 'none' : 'all 0.2s',
          opacity: isDragging ? 0 : 1,
          userSelect: 'none',
          padding: HOVER_SAFE_PADDING,
          border: 'none',
          background: 'transparent',
          width: type === 'link' ? `${tileWidth}px` : undefined,
          height: type === 'link' ? `${tileHeight}px` : undefined,
          width: type === 'link' ? `${tileWidth}px` : undefined,
          zIndex: isSelected ? Z_INDEX.CONTENT_SELECTED : isDragging ? Z_INDEX.CONTENT_DRAGGING : Z_INDEX.CONTENT_DEFAULT
        } as any}
      >
        {type === 'link' ? (
          videoEmbed ? (
            <div className="w-full h-full flex flex-col gap-3">
              <div
                className="w-full rounded-lg overflow-hidden bg-black shadow-inner"
                style={{
                  aspectRatio: '16 / 9',
                  boxShadow: '0 6px 14px rgba(0,0,0,0.18)',
                  flexShrink: 0,
                }}
              >
                <iframe
                  src={videoEmbed.embedUrl}
                  title={title || 'Video'}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                  allowFullScreen
                  style={{
                    width: '100%',
                    height: '100%',
                    border: 0,
                    display: 'block',
                    background: '#000',
                  }}
                />
              </div>
              <div className="w-full min-w-0 flex flex-col items-center gap-1 px-1">
                {isRenaming ? (
                  <input
                    ref={renameInputRef}
                    type="text"
                    value={renamingValue}
                    onChange={(e) => setRenamingValue(e.target.value)}
                    onKeyDown={handleRenameKeyDown}
                    onBlur={handleRenameSubmit}
                    className="w-full text-sm font-semibold text-slate-800 text-center bg-white border border-blue-400 rounded px-2 py-1 outline-none"
                    style={{ pointerEvents: 'auto' } as any}
                    onClick={(e) => e.stopPropagation()}
                    onMouseDown={(e) => e.stopPropagation()}
                  />
                ) : (
                  <div className={`text-sm font-semibold line-clamp-2 leading-tight text-center ${isSelected ? 'text-blue-700' : 'text-slate-800'}`}>
                    {title}
                  </div>
                )}
              </div>
            </div>
          ) : (
          <div
            className={`w-full h-full transition-all flex flex-col items-center justify-center gap-2 px-1 ${
              isSelected ? 'scale-[1.02]' : 'group-hover:scale-[1.01]'
            }`}
            style={{ pointerEvents: 'none' }}
          >
            <div className={`flex-shrink-0 ${isSelected ? 'drop-shadow-[0_4px_10px_rgba(59,130,246,0.25)]' : ''}`}>
              {renderIcon()}
            </div>
            <div className="w-full min-w-0 flex flex-col items-center gap-1">
              {isRenaming ? (
                <input
                  ref={renameInputRef}
                  type="text"
                  value={renamingValue}
                  onChange={(e) => setRenamingValue(e.target.value)}
                  onKeyDown={handleRenameKeyDown}
                  onBlur={handleRenameSubmit}
                  className="w-full text-sm font-semibold text-slate-800 text-center bg-white border border-blue-400 rounded px-2 py-1 outline-none"
                  style={{ pointerEvents: 'auto' } as any}
                  onClick={(e) => e.stopPropagation()}
                  onMouseDown={(e) => e.stopPropagation()}
                />
                ) : (
                  <>
                    <div className={`text-sm font-semibold line-clamp-2 leading-tight text-center ${isSelected ? 'text-blue-700' : 'text-slate-800'}`}>
                      {title}
                    </div>
                  {description && (
                    <div className="text-xs text-slate-500 line-clamp-3 mt-0.5 leading-snug text-center whitespace-pre-line">
                      {description}
                    </div>
                  )}
                  {url && !isGoogleService(url) && (
                    <div className={`text-xs mt-1 text-center whitespace-normal break-words leading-snug line-clamp-2 ${isSelected ? 'text-blue-500' : 'text-slate-400'}`}>
                      {url.replace(/^https?:\/\//, '').replace(/\/$/, '')}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
          )
        ) : (
          <div className="flex flex-col items-center gap-3" style={{ pointerEvents: 'none' }}>
            <div className={`text-slate-600 group-hover:text-blue-600 transition-all ${
              isSelected ? 'opacity-80' : ''
            }`}>
              {renderIcon()}
            </div>
            {isRenaming ? (
              <input
                ref={renameInputRef}
                type="text"
                value={renamingValue}
                onChange={(e) => setRenamingValue(e.target.value)}
                onKeyDown={handleRenameKeyDown}
                onBlur={handleRenameSubmit}
                className="text-sm text-slate-700 w-full text-center bg-white border border-blue-400 rounded px-2 py-1 outline-none"
                style={{ pointerEvents: 'auto' } as any}
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <div className="text-sm text-slate-700 truncate w-full px-1">{title}</div>
            )}
          </div>
        )}
      </button>

      {showContextMenu && (
        <>
          <div
            className="fixed inset-0"
            style={{ zIndex: Z_INDEX.CONTEXT_MENU_BACKDROP }}
            onClick={handleCloseContextMenu}
            onContextMenu={(e) => {
              e.preventDefault();
              handleCloseContextMenu();
            }}
          />
          <div
            className="fixed w-40 bg-white rounded-lg shadow-lg border border-slate-200 py-1"
            style={{
              zIndex: Z_INDEX.CONTEXT_MENU,
              left: `${contextMenuPosition.x}px`,
              top: `${contextMenuPosition.y}px`
            }}
          >
            {type === 'link' && url && (
              <button
                onClick={() => {
                  setShowContextMenu(false);
                  void openLinkExternally();
                }}
                title="Open in External Browser"
                className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-100 transition-colors flex items-center gap-2"
              >
                <ExternalLink size={18} />
                Open in external browser
              </button>
            )}
            {(filePath || url) && (
              <button
                onClick={handleCopyPathClick}
                className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-100 transition-colors flex items-center gap-2"
              >
                <Copy size={14} />
                Copy path
              </button>
            )}
            {type === 'link' && url && (
              <button
                onClick={handleRefreshMetadataClick}
                className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-100 transition-colors flex items-center gap-2"
              >
                <RefreshCw size={14} />
                Refresh metadata
              </button>
            )}
            <button
              onClick={handleRenameClick}
              className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-100 transition-colors flex items-center gap-2"
            >
              <Edit2 size={14} />
              Rename
            </button>
            <button
              onClick={handleDeleteClick}
              className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 transition-colors flex items-center gap-2"
            >
              <Trash2 size={14} />
              Delete
            </button>
          </div>
        </>
      )}

      {showAccountDialog && accountSelectionData && (
        <AccountSelectionDialog
          isOpen={showAccountDialog}
          onClose={handleAccountDialogClose}
          accounts={accountSelectionData.accounts.map((acc) => ({
            email: acc.email,
            scopes: acc.scopes || [],
            connected_at: new Date().toISOString(), // We don't have this info from the service
          }))}
          onSelectAccount={handleAccountSelect}
          onAddNewAccount={handleAddNewAccount}
        />
      )}
    </>
  );
}

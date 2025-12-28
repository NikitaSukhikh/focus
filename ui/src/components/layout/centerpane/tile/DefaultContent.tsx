import React from 'react';
import { TileIcon } from './Icon';
import { RenameInput } from './RenameInput';
import { truncateDisplayPath } from '../../../../utils/text';
import { ImageMetadata } from './useImageMetadata';

interface DefaultContentProps {
  type: string;
  url?: string;
  filePath?: string;
  thumbnailUrl: string | null;
  thumbnailWidth: number;
  thumbnailHeight: number;
  title: string;
  faviconUrl?: string;
  onThumbnailError: () => void;
  isRenaming: boolean;
  renamingValue: string;
  setRenamingValue: (value: string) => void;
  handleRenameKeyDown: (e: React.KeyboardEvent) => void;
  handleRenameSubmit: () => void;
  renameInputRef: React.RefObject<HTMLInputElement>;
  isSelected: boolean;
  hoverScaleClass: string;
  imageMetadata: ImageMetadata | null;
}

export function DefaultContent({
  type,
  url,
  filePath,
  thumbnailUrl,
  thumbnailWidth,
  thumbnailHeight,
  title,
  faviconUrl,
  onThumbnailError,
  isRenaming,
  renamingValue,
  setRenamingValue,
  handleRenameKeyDown,
  handleRenameSubmit,
  renameInputRef,
  isSelected,
  hoverScaleClass,
  imageMetadata,
}: DefaultContentProps) {
  return (
    <div className={`flex flex-col items-center transition-transform duration-150 ${hoverScaleClass}`} style={{ pointerEvents: 'none' }}>
      <div className={`text-slate-600 group-hover:text-blue-600 transition-all ${isSelected ? 'opacity-80' : ''}`}>
        <TileIcon
          type={type}
          url={url}
          filePath={filePath}
          thumbnailUrl={thumbnailUrl}
          thumbnailWidth={thumbnailWidth}
          thumbnailHeight={thumbnailHeight}
          title={title}
          faviconUrl={faviconUrl}
          onThumbnailError={onThumbnailError}
        />
      </div>
      {isRenaming ? (
        <input
          ref={renameInputRef}
          type="text"
          value={renamingValue}
          onChange={(e) => setRenamingValue(e.target.value)}
          onKeyDown={handleRenameKeyDown}
          onBlur={handleRenameSubmit}
          className="text-sm text-slate-700 w-full text-center bg-white border border-blue-400 rounded px-2 py-1 outline-none mt-1"
          style={{ pointerEvents: 'auto' } as any}
          onClick={(e) => e.stopPropagation()}
        />
      ) : (
        <>
          <div
            className={`text-sm text-slate-700 px-1 text-center mt-1 ${imageMetadata ? 'break-words' : title.length > 20 ? 'break-words' : 'truncate'}`}
            style={imageMetadata ? { width: `${thumbnailWidth}px` } : { width: '100%' }}
          >
            {title}
          </div>
          {filePath && !imageMetadata && (
            <div className="text-xs text-center whitespace-pre-line break-words leading-snug line-clamp-2 text-slate-400">
              {truncateDisplayPath(filePath)}
            </div>
          )}
        </>
      )}
    </div>
  );
}

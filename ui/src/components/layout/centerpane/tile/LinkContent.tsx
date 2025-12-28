import React from 'react';
import { TileIcon } from './Icon';
import { RenameInput } from './RenameInput';
import { truncateDisplayUrl } from '../../../../utils/text';
import { isGoogleService } from './iconHelpers';

interface LinkContentProps {
  url?: string;
  filePath?: string;
  thumbnailUrl: string | null;
  thumbnailWidth: number;
  thumbnailHeight: number;
  title: string;
  description?: string;
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
}

export function LinkContent({
  url,
  filePath,
  thumbnailUrl,
  thumbnailWidth,
  thumbnailHeight,
  title,
  description,
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
}: LinkContentProps) {
  return (
    <div
      className={`w-full h-full transition-transform duration-150 flex flex-col items-center justify-center gap-2 px-1 ${hoverScaleClass}`}
      style={{ pointerEvents: 'none' }}
    >
      <div className={`flex-shrink-0 ${isSelected ? 'drop-shadow-[0_4px_10px_rgba(59,130,246,0.25)]' : ''}`}>
        <TileIcon
          type="link"
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
      <div className="w-full min-w-0 flex flex-col items-center gap-1">
        {isRenaming ? (
          <RenameInput
            value={renamingValue}
            onChange={setRenamingValue}
            onKeyDown={handleRenameKeyDown}
            onBlur={handleRenameSubmit}
            inputRef={renameInputRef}
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
              <div className={`text-xs mt-1 text-center whitespace-pre-line break-words leading-snug line-clamp-2 ${isSelected ? 'text-blue-500' : 'text-slate-400'}`}>
                {truncateDisplayUrl(url)}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
